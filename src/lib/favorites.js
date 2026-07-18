// Lógica pura de la lista de favoritos (locales + externas). Sin dependencias de React.
// Un registro es { kind: "local", id } o { kind: "mealdb", id, name, thumb }.
// La pertenencia se comprueba con una clave compuesta `${kind}:${id}` (favoriteKey), que
// funciona como namespace: separa el espacio de slugs locales del de idMeal numéricos.

const VALID_KINDS = new Set(["local", "mealdb"]);

// Clave compuesta que identifica un favorito de forma única entre local/mealdb.
export function favoriteKey(kind, id) {
  return `${kind}:${String(id)}`;
}

// ¿Está `kind`+`id` en la lista?
export function isFavorite(list, kind, id) {
  const key = favoriteKey(kind, id);
  return list.some((item) => favoriteKey(item.kind, item.id) === key);
}

// Devuelve una nueva lista con `record` alternado: si ya existe (mismo kind+id), lo quita;
// si no, lo añade al final. No muta la lista de entrada.
export function toggleFavorite(list, record) {
  const key = favoriteKey(record.kind, record.id);
  const exists = list.some((item) => favoriteKey(item.kind, item.id) === key);
  if (exists) {
    return list.filter((item) => favoriteKey(item.kind, item.id) !== key);
  }
  return [...list, record];
}

// Sanea lo leído de localStorage (ya JSON.parse-ado): descarta registros inválidos y nunca
// lanza. Si `raw` no es un array, devuelve [].
export function sanitizeFavorites(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { kind, id, name, thumb } = item;
    if (!VALID_KINDS.has(kind)) continue;
    if (id === undefined || id === null || id === "") continue;
    if (kind === "mealdb" && typeof name !== "string") continue;
    if (kind === "local") {
      result.push({ kind, id: String(id) });
    } else {
      result.push({ kind, id: String(id), name, thumb });
    }
  }
  return result;
}
