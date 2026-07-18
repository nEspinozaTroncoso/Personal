// Acceso a TheMealDB (categoría "Bread"). Sin dependencias de React.
// Núcleo puro: normalizeBreadList / normalizeMealDetail (testeados en mealdb.test.js).
// Los wrappers fetch* aíslan la red y devuelven ya el shape interno normalizado.

const BASE = "https://www.themealdb.com/api/json/v1/1";
export const BREAD_SEARCH_TERM = "bread";

// search.php devuelve { meals: [{ idMeal, strMeal, strMealThumb, ... }] } o { meals: null }.
// (TheMealDB no tiene una categoría "Bread" — filter.php?c=Bread siempre da null. Se busca
// por nombre "bread" en su lugar, que sí trae panes reales.)
export function normalizeBreadList(json) {
  const meals = json && Array.isArray(json.meals) ? json.meals : [];
  return meals.map((m) => ({
    id: m.idMeal,
    name: m.strMeal,
    thumb: m.strMealThumb || null,
  }));
}

// lookup.php trae ingredientes en 20 pares planos strIngredientN / strMeasureN;
// muchos vacíos (""/null/espacios). Emparejamos y descartamos los vacíos.
export function normalizeMealDetail(raw) {
  if (!raw) return null;
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (raw[`strIngredient${i}`] || "").trim();
    const measure = (raw[`strMeasure${i}`] || "").trim();
    if (name) ingredients.push({ name, measure });
  }
  const steps = (raw.strInstructions || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: raw.idMeal,
    name: raw.strMeal,
    thumb: raw.strMealThumb || null,
    category: raw.strCategory || null,
    area: raw.strArea || null,
    source: raw.strSource || null,
    youtube: raw.strYoutube || null,
    ingredients,
    steps,
  };
}

export async function fetchBreadList(term = BREAD_SEARCH_TERM, signal) {
  const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(term)}`, { signal });
  if (!res.ok) throw new Error(`TheMealDB (search) respondió ${res.status}`);
  return normalizeBreadList(await res.json());
}

export async function fetchMealDetail(id, signal) {
  const res = await fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`, { signal });
  if (!res.ok) throw new Error(`TheMealDB (lookup) respondió ${res.status}`);
  const json = await res.json();
  const raw = json && Array.isArray(json.meals) ? json.meals[0] : null;
  return normalizeMealDetail(raw);
}
