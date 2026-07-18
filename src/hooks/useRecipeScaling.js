import { useState, useMemo } from "react";
import { RECIPES } from "../data/recipes.js";
import { scaleRecipe } from "../lib/baker.js";

export function useRecipeScaling() {
  const [activeId, setActiveId] = useState(RECIPES[0].id);
  const [targetWeight, setTargetWeight] = useState(1000);

  const recipe = useMemo(
    () => RECIPES.find((r) => r.id === activeId),
    [activeId]
  );
  const scaled = useMemo(
    () => scaleRecipe(recipe, targetWeight),
    [recipe, targetWeight]
  );

  return {
    recipes: RECIPES,
    activeId,
    setActiveId,
    targetWeight,
    setTargetWeight,
    recipe,
    scaled,
  };
}
