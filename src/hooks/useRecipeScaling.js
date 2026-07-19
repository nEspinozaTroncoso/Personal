import { useState, useMemo, useEffect } from "react";
import { RECIPES } from "../data/recipes.js";
import { scaleRecipe } from "../lib/baker.js";
import { parseShareParams } from "../lib/shareUrl.js";

const RECIPE_KEY = "panapp-recipe";
const WEIGHT_KEY = "panapp-weight";

// Rango y default del peso: mismos límites que el slider de WeightControl.jsx.
const MIN_WEIGHT = 200;
const MAX_WEIGHT = 2500;
const DEFAULT_WEIGHT = 1000;

// Lectura inicial validada de la receta activa.
// Precedencia: URL (?receta=<id>, si es válida) -> localStorage -> primera receta (B-08).
// Si no hay valor, o el id guardado ya no existe en `recipes` (built-in + custom, B-18), cae a la
// primera receta de la lista recibida.
function getInitialRecipeId(recipes) {
  if (typeof window !== "undefined") {
    const { recipeId } = parseShareParams(window.location.search, {
      recipeIds: recipes.map((r) => r.id),
      minWeight: MIN_WEIGHT,
      maxWeight: MAX_WEIGHT,
    });
    if (recipeId) return recipeId; // la URL gana si es válida
  }
  try {
    const stored = localStorage.getItem(RECIPE_KEY);
    if (stored && recipes.some((r) => r.id === stored)) return stored;
  } catch {
    // localStorage no disponible (modo privado): se ignora
  }
  return recipes[0].id;
}

// Lectura inicial validada del peso.
// Precedencia: URL (?peso=<g>, si es válido) -> localStorage -> default (B-08).
// Debe ser un número finito dentro de [MIN_WEIGHT, MAX_WEIGHT]; si no, cae al default (1000).
function getInitialWeight(recipes) {
  if (typeof window !== "undefined") {
    const { weight } = parseShareParams(window.location.search, {
      recipeIds: recipes.map((r) => r.id),
      minWeight: MIN_WEIGHT,
      maxWeight: MAX_WEIGHT,
    });
    if (weight !== null) return weight; // la URL gana si es válida
  }
  try {
    const stored = localStorage.getItem(WEIGHT_KEY);
    const n = Number(stored);
    if (Number.isFinite(n) && n >= MIN_WEIGHT && n <= MAX_WEIGHT) return n;
  } catch {
    // localStorage no disponible (modo privado): se ignora
  }
  return DEFAULT_WEIGHT;
}

// `recipes` es la lista combinada (built-in + custom, B-18). Los inicializadores perezosos corren
// una sola vez al montar; como useCustomRecipes también lee localStorage de forma síncrona antes
// del primer render, las custom ya están presentes en `recipes` para entonces.
export function useRecipeScaling(recipes = RECIPES) {
  const [activeId, setActiveId] = useState(() => getInitialRecipeId(recipes));
  const [targetWeight, setTargetWeight] = useState(() => getInitialWeight(recipes));

  // Deep link "de un solo uso" (B-08): tras leer receta/peso de la URL al montar (arriba, en los
  // inicializadores perezosos) se limpian de la barra de direcciones. El estado ya sembrado se
  // persiste con los useEffect de más abajo, así que un reload sin params mantiene lo sembrado.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("receta") || params.has("peso")) {
      params.delete("receta");
      params.delete("peso");
      const qs = params.toString();
      const url =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", url);
    }
  }, []);

  // Persistir la receta activa cada vez que cambia.
  useEffect(() => {
    try {
      localStorage.setItem(RECIPE_KEY, activeId);
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  }, [activeId]);

  // Persistir el peso cada vez que cambia (se guarda como string).
  useEffect(() => {
    try {
      localStorage.setItem(WEIGHT_KEY, String(targetWeight));
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  }, [targetWeight]);

  // Fallback si la receta activa fue borrada (custom eliminada, B-18): `find` devuelve undefined y
  // scaleRecipe crashearía. recipes[0] es siempre una built-in, nunca undefined.
  const recipe = useMemo(
    () => recipes.find((r) => r.id === activeId) ?? recipes[0],
    [recipes, activeId]
  );
  const scaled = useMemo(
    () => scaleRecipe(recipe, targetWeight),
    [recipe, targetWeight]
  );

  return {
    recipes,
    activeId,
    setActiveId,
    targetWeight,
    setTargetWeight,
    recipe,
    scaled,
  };
}
