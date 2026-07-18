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
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}
