// Parseo y construcción de la URL de "compartir receta escalada".
// Puro (sin React, sin importar RECIPES): las restricciones se inyectan. Nunca lanza.
// Contrato de params (fijo, no traducible): receta=<id>&peso=<gramos>.

export function parseShareParams(search, { recipeIds, minWeight, maxWeight }) {
  const params = new URLSearchParams(search || "");

  const rawRecipe = params.get("receta");
  const recipeId =
    rawRecipe && recipeIds.includes(rawRecipe) ? rawRecipe : null;

  const rawWeight = params.get("peso");
  let weight = null;
  if (rawWeight != null && rawWeight !== "") {
    const n = Number(rawWeight);
    if (Number.isFinite(n) && n >= minWeight && n <= maxWeight) weight = n;
  }

  return { recipeId, weight };
}

export function buildShareUrl(baseUrl, recipeId, weight) {
  const params = new URLSearchParams();
  params.set("receta", recipeId);
  params.set("peso", String(Math.round(weight)));
  return `${baseUrl}?${params.toString()}`;
}
