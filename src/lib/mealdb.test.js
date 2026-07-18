import { describe, it, expect } from "vitest";
import { normalizeBreadList, normalizeMealDetail } from "./mealdb.js";

describe("normalizeBreadList", () => {
  it("mapea [{idMeal,strMeal,strMealThumb}] a {id,name,thumb}", () => {
    const json = {
      meals: [
        { idMeal: "1", strMeal: "Baguette", strMealThumb: "https://x/1.jpg" },
        { idMeal: "2", strMeal: "Focaccia", strMealThumb: "https://x/2.jpg" },
      ],
    };
    expect(normalizeBreadList(json)).toEqual([
      { id: "1", name: "Baguette", thumb: "https://x/1.jpg" },
      { id: "2", name: "Focaccia", thumb: "https://x/2.jpg" },
    ]);
  });

  it("con { meals: null } devuelve []", () => {
    expect(normalizeBreadList({ meals: null })).toEqual([]);
  });

  it("con objeto sin meals devuelve []", () => {
    expect(normalizeBreadList({})).toEqual([]);
    expect(normalizeBreadList(null)).toEqual([]);
    expect(normalizeBreadList(undefined)).toEqual([]);
  });
});

describe("normalizeMealDetail", () => {
  const rawMeal = {
    idMeal: "52961",
    strMeal: "Budino Di Ricotta",
    strMealThumb: "https://www.themealdb.com/images/media/meals/x.jpg",
    strCategory: "Bread",
    strArea: "Italian",
    strInstructions: "Mash the ricotta.\r\nAdd the eggs.\r\n\r\nBake 40 min.",
    strSource: "https://example.com/receta",
    strYoutube: "",
    strIngredient1: "Ricotta", strMeasure1: "500g",
    strIngredient2: "Eggs", strMeasure2: "4",
    strIngredient3: "", strMeasure3: "",
    strIngredient4: "   ", strMeasure4: "1 tbsp",
    strIngredient5: null, strMeasure5: null,
    // resto hasta 20 ausentes: el bucle los lee como undefined → "" → se descartan
  };

  it("empareja solo los pares con strIngredientN no vacío (descarta '', null y espacios)", () => {
    const detail = normalizeMealDetail(rawMeal);
    expect(detail.ingredients).toEqual([
      { name: "Ricotta", measure: "500g" },
      { name: "Eggs", measure: "4" },
    ]);
  });

  it("conserva la measure aunque venga vacía, si el ingrediente tiene nombre", () => {
    const raw = { ...rawMeal, strIngredient3: "Salt", strMeasure3: "" };
    const detail = normalizeMealDetail(raw);
    expect(detail.ingredients).toContainEqual({ name: "Salt", measure: "" });
  });

  it("divide strInstructions con \\r\\n/\\n en pasos y descarta líneas en blanco", () => {
    const detail = normalizeMealDetail(rawMeal);
    expect(detail.steps).toEqual([
      "Mash the ricotta.",
      "Add the eggs.",
      "Bake 40 min.",
    ]);
  });

  it("con entrada null/undefined devuelve null", () => {
    expect(normalizeMealDetail(null)).toBeNull();
    expect(normalizeMealDetail(undefined)).toBeNull();
  });

  it("conserva id, name, thumb, category, area, source y youtube", () => {
    const detail = normalizeMealDetail(rawMeal);
    expect(detail).toMatchObject({
      id: "52961",
      name: "Budino Di Ricotta",
      thumb: "https://www.themealdb.com/images/media/meals/x.jpg",
      category: "Bread",
      area: "Italian",
      source: "https://example.com/receta",
      youtube: null,
    });
  });
});
