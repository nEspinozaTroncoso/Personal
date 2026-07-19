// Lógica pura de recetas custom (creadas por el usuario). Sin dependencias de React.
// Shape idéntico a RECIPES (src/data/recipes.js) en lo que consumen baker.js y los componentes
// (name, subtitle, accent, ingredients[].{id,name,pct,unit}, steps), más el flag `custom: true`.
// totalFlour se omite deliberadamente: nadie lo lee en src/ (ver plan B-18).

// Acentos permitidos (identidad terracota del proyecto, mismos tonos ya usados en recipes.js).
export const ACCENTS = ["#C17F3E", "#B5652E", "#D9A441", "#A66B3F", "#CE8A3D", "#B87333"];

// Normaliza para comparación de nombres duplicados: trim + minúsculas + sin acentos
// (mismo criterio que RecipeSelector.normalize: NFD + descarte de diacríticos).
export function normalizeName(str) {
  return (str ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Id único y estable para una receta custom.
export function createCustomId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Valida un "draft" del formulario. Devuelve { valid, errors } donde cada error es una CLAVE
// i18n (no texto), para que el componente la traduzca con t().
// existingNames: array de nombres normalizados contra los que comprobar duplicados (built-in +
// custom); al EDITAR, el llamador excluye el nombre de la propia receta.
export function validateDraft(draft, existingNames) {
  const errors = [];
  const name = (draft.name ?? "").trim();
  if (!name) errors.push("form.errorNameRequired");
  else if ((existingNames ?? []).includes(normalizeName(name))) {
    errors.push("form.errorNameDuplicate");
  }

  const validIngredients = (draft.ingredients ?? []).filter(
    (i) => (i.name ?? "").trim() && Number(i.pct) > 0
  );
  if (validIngredients.length === 0) errors.push("form.errorNoIngredients");

  const validSteps = (draft.steps ?? []).filter((s) => (s ?? "").trim());
  if (validSteps.length === 0) errors.push("form.errorNoSteps");

  return { valid: errors.length === 0, errors };
}

// Convierte un draft VÁLIDO en una receta custom persistible: limpia filas vacías, castea pct a
// Number, asigna ids de ingrediente secuenciales, respeta id/accent existentes al editar.
// Si draft.id existe -> conserva id (edición); si no -> createCustomId() (alta).
export function draftToRecipe(draft) {
  const ingredients = (draft.ingredients ?? [])
    .filter((i) => (i.name ?? "").trim() && Number(i.pct) > 0)
    .map((i, idx) => ({
      id: `ing-${idx + 1}`,
      name: i.name.trim(),
      pct: Number(i.pct),
      unit: i.unit === "ml" ? "ml" : "g",
    }));

  const steps = (draft.steps ?? []).map((s) => (s ?? "").trim()).filter(Boolean);

  return {
    id: draft.id ?? createCustomId(),
    custom: true,
    name: (draft.name ?? "").trim(),
    subtitle: (draft.subtitle ?? "").trim(),
    accent: ACCENTS.includes(draft.accent) ? draft.accent : ACCENTS[0],
    ingredients,
    steps,
  };
}

// Convierte una receta custom a draft editable para prellenar el formulario (inversa de arriba).
export function recipeToDraft(recipe) {
  return {
    id: recipe.id,
    name: recipe.name ?? "",
    subtitle: recipe.subtitle ?? "",
    accent: ACCENTS.includes(recipe.accent) ? recipe.accent : ACCENTS[0],
    ingredients: (recipe.ingredients ?? []).map((i) => ({
      name: i.name ?? "",
      pct: String(i.pct ?? ""),
      unit: i.unit === "ml" ? "ml" : "g",
    })),
    steps: (recipe.steps ?? []).length ? [...recipe.steps] : [""],
  };
}

// Sanea lo leído de localStorage (ya JSON.parse-ado): descarta recetas malformadas, nunca lanza,
// devuelve [] si no es array. Cada receta válida DEBE tener: id string no vacío, name string no
// vacío, ingredients array con >=1 item {name, pct>0, unit in ["g","ml"]}, steps array con >=1
// string no vacío. Fuerza custom:true, subtitle:"" si falta, accent válido (si no está en ACCENTS
// -> ACCENTS[0]).
export function sanitizeCustomRecipes(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { id, name, subtitle, accent, ingredients, steps } = item;
    if (typeof id !== "string" || !id) continue;
    if (typeof name !== "string" || !name.trim()) continue;

    if (!Array.isArray(ingredients)) continue;
    const validIngredients = ingredients.filter(
      (i) =>
        i &&
        typeof i === "object" &&
        typeof i.name === "string" &&
        i.name.trim() &&
        Number(i.pct) > 0 &&
        (i.unit === "g" || i.unit === "ml")
    );
    if (validIngredients.length === 0) continue;

    if (!Array.isArray(steps)) continue;
    const validSteps = steps.filter((s) => typeof s === "string" && s.trim());
    if (validSteps.length === 0) continue;

    result.push({
      id,
      custom: true,
      name,
      subtitle: typeof subtitle === "string" ? subtitle : "",
      accent: ACCENTS.includes(accent) ? accent : ACCENTS[0],
      ingredients: validIngredients.map((i, idx) => ({
        id: `ing-${idx + 1}`,
        name: i.name,
        pct: Number(i.pct),
        unit: i.unit,
      })),
      steps: validSteps,
    });
  }
  return result;
}
