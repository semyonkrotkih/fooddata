import { useSyncExternalStore } from 'react';
import type { IngredientSelection } from '../types/food';
import type { Recipe } from '../types/recipe';

// Minimal app-wide store shared between pages.
type State = {
  recipe: Recipe | null;
  selections: IngredientSelection[];
};

let state: State = { recipe: null, selections: [] };
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setRecipe(recipe: Recipe | null) {
  // A new recipe invalidates earlier selections.
  update({ recipe, selections: [] });
}

export function getRecipe() {
  return state.recipe;
}

export function useRecipe() {
  return useSyncExternalStore(subscribe, getRecipe, getRecipe);
}

export function setSelections(selections: IngredientSelection[]) {
  update({ selections });
}

export function getSelections() {
  return state.selections;
}

export function useSelections() {
  return useSyncExternalStore(subscribe, getSelections, getSelections);
}
