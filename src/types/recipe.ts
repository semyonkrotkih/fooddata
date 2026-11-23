// Field names (incl. "ingridient" spelling) mirror the backend response.
export type Ingredient = {
  ingridient: string;
  amount: number | null;
  units: string | null;
};

export type Recipe = {
  id: number;
  name: string;
  nameDanish: string;
  sourceUrl: string;
  ingridients: Ingredient[];
};
