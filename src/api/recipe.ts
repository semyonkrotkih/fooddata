import type { Recipe } from '../types/recipe';
import { getJson } from './client';

export function readRecipe(url: string, language = 'da'): Promise<Recipe> {
  return getJson<Recipe>('/Recipe/ReadRecipe', { url, language });
}
