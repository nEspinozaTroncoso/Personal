import { useState, useCallback } from "react";
import { importMealRecipe } from "../lib/importRecipe.js";

// Estado de sesión de la receta externa "cargada en el calculador". No se persiste (dato volátil).
export function useImportedRecipe() {
  const [imported, setImported] = useState(null);
  const importRecipe = useCallback((detail) => setImported(importMealRecipe(detail)), []);
  const clearImport = useCallback(() => setImported(null), []);
  return { imported, importRecipe, clearImport };
}
