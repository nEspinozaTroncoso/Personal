import { useState, useEffect } from "react";
import { sanitizeCustomRecipes } from "../lib/customRecipes.js";

const STORAGE_KEY = "panapp-custom-recipes";

// Lectura inicial validada de las recetas custom (mismo patrón que useFavorites.js).
// El try/catch cubre localStorage no disponible (modo privado estricto) o un JSON corrupto.
function getInitial() {
  try {
    return sanitizeCustomRecipes(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return [];
  }
}

export function useCustomRecipes() {
  const [customRecipes, setCustomRecipes] = useState(getInitial);

  // Persistir la lista completa cada vez que cambia.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customRecipes));
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  }, [customRecipes]);

  return {
    customRecipes,
    // Las recetas que llegan a estos métodos ya pasaron por draftToRecipe + validateDraft
    // (en RecipeForm); el hook se mantiene "tonto" en cuanto a reglas.
    createRecipe: (recipe) => setCustomRecipes((list) => [...list, recipe]),
    updateRecipe: (recipe) =>
      setCustomRecipes((list) => list.map((r) => (r.id === recipe.id ? recipe : r))),
    deleteRecipe: (id) => setCustomRecipes((list) => list.filter((r) => r.id !== id)),
  };
}
