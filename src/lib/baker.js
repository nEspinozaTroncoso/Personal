// Convierte la lista de %-panadero a gramos/ml reales dado un peso final deseado.
// Suma todos los pct (que ya incluyen 100 de harina + resto de ingredientes),
// obtiene el "factor" para que la masa total resultante sea igual a targetWeight.
export function scaleRecipe(recipe, targetWeightG) {
  const totalPct = recipe.ingredients.reduce((sum, ing) => sum + ing.pct, 0);
  const factor = targetWeightG / totalPct;
  return recipe.ingredients.map((ing) => ({
    ...ing,
    amount: ing.pct * factor,
  }));
}

export function formatAmount(n) {
  const rounded1 = Math.round(n * 10) / 10; // valor a 1 decimal
  if (rounded1 < 10) return rounded1.toFixed(1);
  return Math.round(n).toString();
}
