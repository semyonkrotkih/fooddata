export type FoodMatch = {
  food_id: number;
  food_name: string;
  score: number;
};

export type FindFoodsResponse = {
  cleaned_query: string;
  matches: FoodMatch[];
};

// Request item for /FoodData/FoodNutrients: food id -> amount in grams.
export type FoodAmount = {
  key: number;
  value: number;
};

export type Nutrient = {
  componentId: number;
  name: string;
  sortKey: number;
  resVal: number;
  min: number;
  max: number;
  median: number;
  numberOfDeterminations: number;
};

// One saved row: the recipe ingredient and the food chosen for it (if any).
export type IngredientSelection = {
  ingredient: string;
  amount: number | null;
  units: string | null;
  foodId: number | null;
  foodName: string | null;
};
