import os
import re
import traceback
import anthropic
import requests
import spacy
import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from sentence_transformers import SentenceTransformer, util

import pyodbc

from config import ANTHROPIC_API_KEY, SQL_CONNECTION_STRING

class FoodData(BaseModel):
    key: int
    value: str

class Ingredient(BaseModel):
    ingredientName: str
    amount: float | None
    units: str | None

class RecipeIngredients(BaseModel):
    ingredients: list[Ingredient]

class FoodAmount(BaseModel):
    FoodId: int
    Amount: float

class Nutrient(BaseModel):
    Name: str
    Value: float
    Min: float
    Median: float
    Max: float
    NumberOfDeterminations: int

app = FastAPI()
claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Return the stack trace of unhandled exceptions in the 500 response body.
# On by default; set SHOW_STACK_TRACES=false to return only a generic error.
# HTTPExceptions raised by the endpoints keep their own status code and detail.
SHOW_STACK_TRACES = os.getenv("SHOW_STACK_TRACES", "true").lower() in ("1", "true", "yes")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    content = {"detail": "Internal Server Error"}
    if SHOW_STACK_TRACES:
        content.update({
            "error": f"{type(exc).__name__}: {exc}",
            "path": request.url.path,
            "traceback": traceback.format_exception(exc),
        })
    return JSONResponse(status_code=500, content=content)

nlp = spacy.load("da_core_news_sm")
model = SentenceTransformer('intfloat/multilingual-e5-small')

STOP_MODIFIERS = {
    "økologisk", "økologiske", "øko", "grov", "grove", "fin", "fine",
    "i vand", "i lage", "på dåse", "frost", "frosne", "frisk", "friske",
    "dansk", "danske", "hakket", "hakkede", "skåret", "hele"
}

def clean_food_name(text: str) -> str:
    text = text.lower().strip()
    
    # 1. Remove quantities/weights (e.g., "400g", "1 kg", "500 ml")
    text = re.sub(r'\b\d+\s*(g|kg|ml|cl|l|stk)\b', '', text)
    
    # 2. Remove explicit packaging/preparation phrases
    for phrase in STOP_MODIFIERS:
        text = re.sub(rf'\b{re.escape(phrase)}\b', '', text)
        
    # 3. Use Danish spaCy to strip remaining Adjectives (ADJ) & Brand Names (PROPN)
    # Note: Keep adjectives if removing them leaves nothing (e.g., "grønne ærter" -> if "grønne" is needed, keep it in an allowlist)
    doc = nlp(text)
    core_tokens = [
        token.text for token in doc 
        if token.pos_ not in {"ADJ", "PROPN", "PUNCT", "NUM"} and not token.is_stop
    ]
    
    cleaned = " ".join(core_tokens).strip()
    return cleaned if cleaned else text  # Fallback if everything was stripped

_pairs_cache = {"pairs": None, "cleaned_pairs": None, "db_embeddings": None}

def load_foods_from_db() -> list[FoodData]:
    with pyodbc.connect(SQL_CONNECTION_STRING) as conn:
        rows = conn.cursor().execute("SELECT [Id], [NameDanish] FROM [dbo].[Foods]").fetchall()
    return [FoodData(key=row.Id, value=row.NameDanish) for row in rows if row.NameDanish]

def get_pairs_and_embeddings(force: bool = False):
    if _pairs_cache["pairs"] is not None and not force:
        return _pairs_cache["pairs"], _pairs_cache["cleaned_pairs"], _pairs_cache["db_embeddings"]

    pairs = load_foods_from_db()
    cleaned_pairs = [FoodData(key=pair.key, value=clean_food_name(pair.value)) for pair in pairs]
    db_embeddings = model.encode([pair.value for pair in cleaned_pairs], convert_to_tensor=True, normalize_embeddings=True)

    _pairs_cache["pairs"] = pairs
    _pairs_cache["cleaned_pairs"] = cleaned_pairs
    _pairs_cache["db_embeddings"] = db_embeddings
    return pairs, cleaned_pairs, db_embeddings

def match_food(cleaned_pairs: list[FoodData], db_embeddings, query: str, threshold: float = 0.7, top_count: int = 5):
    cleaned_q = clean_food_name(query)
    query_emb = model.encode(f"query: {cleaned_q}", convert_to_tensor=True, normalize_embeddings=True)

    # Fast dot-product similarity (works for tens of thousands of rows in < 5ms)
    scores = util.cos_sim(query_emb, db_embeddings)[0]
    k = min(top_count, scores.shape[0])
    top_scores, top_indices = torch.topk(scores, k)

    matches = [
        (cleaned_pairs[idx.item()].key, score.item(), idx.item())
        for score, idx in zip(top_scores, top_indices)
        if score.item() >= threshold
    ]
    return matches, cleaned_q


@app.get("/get_matches")
def get_matches(query: str, threshold: float = 0.7, top_count: int = 5, force: bool = False):
    pairs, cleaned_pairs, db_embeddings = get_pairs_and_embeddings(force)
    matches, cleaned_query = match_food(cleaned_pairs, db_embeddings, query, threshold, top_count)
    return {
        "cleaned_query": cleaned_query,
        "matches": [
            {"food_id": key, "food_name": pairs[idx].value, "score": score}
            for key, score, idx in matches
        ],
    }


@app.get("/extract_ingredients")
def extract_ingredients(url: str) -> list[Ingredient]:
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    try:
        page = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        page.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch URL: {e}")

    # Scripts and styles carry no recipe content and can be most of the page's tokens
    html = re.sub(r"<(script|style|svg)\b[^>]*>.*?</\1>", "", page.text, flags=re.DOTALL | re.IGNORECASE)

    response = claude.beta.messages.parse(
        model="claude-opus-5-5",
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=(
            "You extract recipe ingredients from HTML pages. Return every ingredient in the recipe, "
            "keeping ingredient names and units in the page's original language. "
            "amount is a number (convert fractions like 1/2 to 0.5); use null for amount or units "
            "when the recipe gives none (e.g. 'salt to taste'); try to convert units to grams when possible. "
            "If the page contains no recipe, return an empty list."
        ),
        messages=[{"role": "user", "content": html}],
        output_format=RecipeIngredients,
    )

    if response.stop_reason == "refusal":
        raise HTTPException(status_code=422, detail="Claude declined to process this page")
    return response.parsed_output.ingredients


@app.post("/nutrients")
def get_nutrients(foods: list[FoodAmount]) -> list[Nutrient]:
    amounts: dict[int, float] = {}
    for food in foods:
        amounts[food.FoodId] = amounts.get(food.FoodId, 0) + food.Amount
    if not amounts:
        return []

    placeholders = ",".join("?" * len(amounts))
    sql = f"""
        SELECT c.NameDanish, fc.ComponentId, fc.FoodId,
               ISNULL(fc.ResVal, 0) val, ISNULL(fc.Min, 0) min_val,
               ISNULL(fc.Median, 0) median_val, ISNULL(fc.Max, 0) max_val,
               ISNULL(fc.NumberOfDeterminations, 0) NumberOfDeterminations
        FROM [dbo].[FoodComponents] fc
        INNER JOIN [dbo].[Components] c ON c.Id = fc.ComponentId
        WHERE fc.FoodId IN ({placeholders})
    """
    with pyodbc.connect(SQL_CONNECTION_STRING) as conn:
        rows = conn.cursor().execute(sql, *amounts.keys()).fetchall()

    # DB values are per 100 g, so each food contributes value * grams / 100
    totals: dict[int, Nutrient] = {}
    for row in rows:
        factor = amounts[row.FoodId] / 100
        total = totals.setdefault(row.ComponentId, Nutrient(
            Name=row.NameDanish, Value=0, Min=0, Median=0, Max=0, NumberOfDeterminations=0))
        total.Value += float(row.val) * factor
        total.Min += float(row.min_val) * factor
        total.Median += float(row.median_val) * factor
        total.Max += float(row.max_val) * factor
        total.NumberOfDeterminations += int(row.NumberOfDeterminations)

    return [totals[component_id] for component_id in sorted(totals)]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
