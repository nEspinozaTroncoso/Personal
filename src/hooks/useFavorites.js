import { useState, useEffect } from "react";
import { isFavorite as isFavoriteInList, toggleFavorite as toggleFavoriteInList, sanitizeFavorites } from "../lib/favorites.js";

const STORAGE_KEY = "panapp-favorites";

// Lectura inicial validada de la lista de favoritos (mismo patrón que useRecipeScaling.js).
// El try/catch cubre localStorage no disponible (modo privado estricto) o un JSON corrupto.
function getInitialFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return sanitizeFavorites(parsed);
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(getInitialFavorites);

  // Persistir la lista completa cada vez que cambia.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  }, [favorites]);

  return {
    favorites,
    isFavorite: (kind, id) => isFavoriteInList(favorites, kind, id),
    toggleFavorite: (record) => setFavorites((list) => toggleFavoriteInList(list, record)),
  };
}
