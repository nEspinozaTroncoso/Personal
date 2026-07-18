import { describe, it, expect } from "vitest";
import { parseShareParams, buildShareUrl } from "./shareUrl.js";
import { RECIPES } from "../data/recipes.js";

const recipeIds = RECIPES.map((r) => r.id);
const minWeight = 200;
const maxWeight = 2500;
const constraints = { recipeIds, minWeight, maxWeight };

describe("parseShareParams", () => {
  it("params válidos devuelve recipeId y weight", () => {
    expect(
      parseShareParams("?receta=baguette&peso=1000", constraints)
    ).toEqual({ recipeId: "baguette", weight: 1000 });
  });

  it("solo receta válido -> weight null", () => {
    expect(parseShareParams("?receta=brioche", constraints)).toEqual({
      recipeId: "brioche",
      weight: null,
    });
  });

  it("solo peso válido -> recipeId null", () => {
    expect(parseShareParams("?peso=500", constraints)).toEqual({
      recipeId: null,
      weight: 500,
    });
  });

  it("receta inexistente -> recipeId null (weight sí válido)", () => {
    expect(
      parseShareParams("?receta=noexiste&peso=800", constraints)
    ).toEqual({ recipeId: null, weight: 800 });
  });

  it("peso fuera de rango -> weight null", () => {
    expect(parseShareParams("?peso=50", constraints).weight).toBeNull();
    expect(parseShareParams("?peso=9999", constraints).weight).toBeNull();
  });

  it("peso no numérico -> weight null", () => {
    expect(parseShareParams("?peso=abc", constraints).weight).toBeNull();
  });

  it("search vacío -> ambos null", () => {
    expect(parseShareParams("", constraints)).toEqual({
      recipeId: null,
      weight: null,
    });
  });

  it("search sin nuestros params -> ambos null", () => {
    expect(parseShareParams("?otro=valor", constraints)).toEqual({
      recipeId: null,
      weight: null,
    });
  });

  it("params extra desconocidos se ignoran sin afectar el resultado", () => {
    expect(
      parseShareParams("?receta=hallulla&peso=700&foo=bar", constraints)
    ).toEqual({ recipeId: "hallulla", weight: 700 });
  });

  it("nunca lanza con entradas raras", () => {
    expect(() => parseShareParams(null, constraints)).not.toThrow();
    expect(() => parseShareParams(undefined, constraints)).not.toThrow();
  });
});

describe("buildShareUrl", () => {
  it("incluye receta y peso en la URL resultante", () => {
    const url = buildShareUrl("https://x.app/", "baguette", 1000);
    expect(url).toContain("receta=baguette");
    expect(url).toContain("peso=1000");
    expect(url.startsWith("https://x.app/?")).toBe(true);
  });

  it("redondea peso no entero", () => {
    const url = buildShareUrl("https://x.app/", "baguette", 1000.4);
    expect(url).toContain("peso=1000");
  });

  it("ida y vuelta: parsear lo que produce buildShareUrl devuelve los mismos valores", () => {
    const url = buildShareUrl("https://x.app/", "brioche", 1500);
    const search = url.slice(url.indexOf("?"));
    expect(parseShareParams(search, constraints)).toEqual({
      recipeId: "brioche",
      weight: 1500,
    });
  });
});
