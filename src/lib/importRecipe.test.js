import { describe, it, expect } from "vitest";
import { convertMeasure, importMealRecipe } from "./importRecipe.js";

describe("convertMeasure — masa exacta", () => {
  it("convierte gramos", () => {
    expect(convertMeasure("200g")).toEqual({ converted: true, amount: 200, unit: "g" });
    expect(convertMeasure("200 g")).toEqual({ converted: true, amount: 200, unit: "g" });
  });

  it("convierte kilogramos", () => {
    expect(convertMeasure("1kg")).toEqual({ converted: true, amount: 1000, unit: "g" });
    expect(convertMeasure("1 kg")).toEqual({ converted: true, amount: 1000, unit: "g" });
  });

  it("convierte onzas", () => {
    const r = convertMeasure("2 oz");
    expect(r.converted).toBe(true);
    expect(r.unit).toBe("g");
    expect(r.amount).toBeCloseTo(56.7);
  });

  it("convierte libras", () => {
    const r = convertMeasure("1 lb");
    expect(r.converted).toBe(true);
    expect(r.unit).toBe("g");
    expect(r.amount).toBeCloseTo(453.6);
  });

  it("convierte 'grams' en plural", () => {
    expect(convertMeasure("500 grams")).toEqual({ converted: true, amount: 500, unit: "g" });
  });
});

describe("convertMeasure — volumen exacto", () => {
  it("convierte mililitros", () => {
    expect(convertMeasure("250ml")).toEqual({ converted: true, amount: 250, unit: "ml" });
  });

  it("convierte litros", () => {
    expect(convertMeasure("1 litre")).toEqual({ converted: true, amount: 1000, unit: "ml" });
    expect(convertMeasure("1 l")).toEqual({ converted: true, amount: 1000, unit: "ml" });
  });

  it("convierte centilitros", () => {
    expect(convertMeasure("2 cl")).toEqual({ converted: true, amount: 20, unit: "ml" });
  });
});

describe("convertMeasure — fracciones", () => {
  it("fracciones ascii", () => {
    expect(convertMeasure("1/2 kg")).toEqual({ converted: true, amount: 500, unit: "g" });
  });

  it("fracciones unicode", () => {
    expect(convertMeasure("½ l")).toEqual({ converted: true, amount: 500, unit: "ml" });
  });

  it("mixtas ascii", () => {
    expect(convertMeasure("1 1/2 kg")).toEqual({ converted: true, amount: 1500, unit: "g" });
  });

  it("mixtas unicode pegadas", () => {
    expect(convertMeasure("1½ kg")).toEqual({ converted: true, amount: 1500, unit: "g" });
  });
});

describe("convertMeasure — ambiguas / no convertidas", () => {
  it.each([
    "1 cup",
    "2 tbsp",
    "1 tsp",
    "1 pinch",
    "2 cloves garlic",
    "1 fl oz",
    "2",
    "to taste",
  ])("deja %s sin convertir", (measure) => {
    expect(convertMeasure(measure)).toEqual({ converted: false, original: measure.trim() });
  });
});

describe("convertMeasure — vacío", () => {
  it("string vacío", () => {
    expect(convertMeasure("")).toEqual({ converted: false, original: "" });
  });

  it("solo espacios", () => {
    expect(convertMeasure("   ")).toEqual({ converted: false, original: "" });
  });
});

describe("importMealRecipe", () => {
  const detail = {
    id: "52977",
    name: "Test Bread",
    thumb: "https://example.com/thumb.jpg",
    area: "British",
    category: "Bread",
    source: "https://example.com/recipe",
    steps: ["Mix.", "Bake."],
    ingredients: [
      { name: "Flour", measure: "200g" },
      { name: "Sugar", measure: "1 cup" },
      { name: "Salt", measure: "1 tsp" },
      { name: "Water", measure: "250ml" },
    ],
  };

  it("mapea ingredientes convertidos y no convertidos con ids incrementales", () => {
    const result = importMealRecipe(detail);
    expect(result.id).toBe("52977");
    expect(result.name).toBe("Test Bread");
    expect(result.hasUnconverted).toBe(true);
    expect(result.ingredients).toEqual([
      { id: 0, name: "Flour", converted: true, amount: 200, unit: "g" },
      { id: 1, name: "Sugar", converted: false, original: "1 cup" },
      { id: 2, name: "Salt", converted: false, original: "1 tsp" },
      { id: 3, name: "Water", converted: true, amount: 250, unit: "ml" },
    ]);
  });

  it("hasUnconverted es false si todo se convirtió", () => {
    const allConverted = {
      ...detail,
      ingredients: [
        { name: "Flour", measure: "200g" },
        { name: "Water", measure: "250ml" },
      ],
    };
    expect(importMealRecipe(allConverted).hasUnconverted).toBe(false);
  });

  it("devuelve null si detail es null", () => {
    expect(importMealRecipe(null)).toBeNull();
  });
});
