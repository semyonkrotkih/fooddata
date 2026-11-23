import type { FindFoodsResponse, FoodAmount, Nutrient } from '../types/food';
import { getJson, postJson } from './client';

export function findFoods(query: string, threshold = 0.85): Promise<FindFoodsResponse> {
  return getJson<FindFoodsResponse>('/FoodData/FindFoods', {
    query,
    threshold: String(threshold),
  });
}

export function getFoodNutrients(foods: FoodAmount[]): Promise<Nutrient[]> {
  return postJson<Nutrient[]>('/FoodData/FoodNutrients', foods);
}
