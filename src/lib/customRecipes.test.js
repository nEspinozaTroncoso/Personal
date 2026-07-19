import { describe, it, expect } from "vitest";
import {
  ACCENTS,
  normalizeName,
  createCustomId,
  validateDraft,
  draftToRecipe,
  recipeToDraft,
  sanitizeCustomRecipes,
} from "./customRecipes.js";

describe("normalizeName", () => {
  it("quita acentos, espacios y normaliza mayúsculas", () => {
    expect(normalizeName("  Báguette  ")).toBe("baguette");
    expect(normalizeName("PAN DE MOLDE")).toBe("pan de molde");
  });

  it("string vacío/nulo -> string vacío", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("createCustomId", () => {
  it("empieza con el prefijo custom-", () => {
    expect(createCustomId()).toMatch(/^custom-/);
  });

  it("dos llamadas dan ids distintos", () => {
    expect(createCustomId()).not.toBe(createCustomId());
  });
});

describe("validateDraft", () => {
  const validDraft = {
    name: "Pan de la casa",
    ingredients: [{ name: "Harina", pct: "100" }],
    steps: ["Mezclar"],
  };

  it("draft correcto -> valid true, sin errores", () => {
    expect(validateDraft(validDraft, [])).toEqual({ valid: true, errors: [] });
  });

  it("nombre vacío -> error errorNameRequired", () => {
    const { valid, errors } = validateDraft({ ...validDraft, name: "  " }, []);
    expect(valid).toBe(false);
    expect(errors).toContain("form.errorNameRequired");
  });

  it("nombre duplicado (case/acentos-insensible) -> error errorNameDuplicate", () => {
    const { valid, errors } = validateDraft(
      { ...validDraft, name: "BÁGUETTE" },
      ["baguette"]
    );
    expect(valid).toBe(false);
    expect(errors).toContain("form.errorNameDuplicate");
  });

  it("editar con el mismo nombre propio excluido de existingNames -> OK", () => {
    const { valid } = validateDraft(validDraft, ["otra receta"]);
    expect(valid).toBe(true);
  });

  it("0 ingredientes válidos (todos vacíos o pct<=0) -> error errorNoIngredients", () => {
    const draft = {
      ...validDraft,
      ingredients: [
        { name: "", pct: "100" },
        { name: "Sal", pct: "0" },
        { name: "Agua", pct: "-5" },
      ],
    };
    const { valid, errors } = validateDraft(draft, []);
    expect(valid).toBe(false);
    expect(errors).toContain("form.errorNoIngredients");
  });

  it("0 pasos -> error errorNoSteps", () => {
    const draft = { ...validDraft, steps: ["   "] };
    const { valid, errors } = validateDraft(draft, []);
    expect(valid).toBe(false);
    expect(errors).toContain("form.errorNoSteps");
  });
});

describe("draftToRecipe", () => {
  it("castea pct string->Number, descarta filas vacías, asigna ing-1..n", () => {
    const draft = {
      id: null,
      name: "Pan simple",
      subtitle: "",
      accent: ACCENTS[0],
      ingredients: [
        { name: "Harina", pct: "100", unit: "g" },
        { name: "", pct: "50", unit: "g" }, // fila vacía por nombre -> descartada
        { name: "Sal", pct: "0", unit: "g" }, // pct<=0 -> descartada
        { name: "Agua", pct: "65", unit: "ml" },
      ],
      steps: ["Mezclar", "  ", "Amasar"],
    };
    const recipe = draftToRecipe(draft);
    expect(recipe.custom).toBe(true);
    expect(recipe.ingredients).toEqual([
      { id: "ing-1", name: "Harina", pct: 100, unit: "g" },
      { id: "ing-2", name: "Agua", pct: 65, unit: "ml" },
    ]);
    expect(recipe.steps).toEqual(["Mezclar", "Amasar"]);
  });

  it("mantiene id al editar (draft.id existente)", () => {
    const draft = {
      id: "custom-123-abcd",
      name: "Pan editado",
      ingredients: [{ name: "Harina", pct: "100", unit: "g" }],
      steps: ["Paso"],
    };
    expect(draftToRecipe(draft).id).toBe("custom-123-abcd");
  });

  it("genera un id nuevo en alta (draft.id null/ausente)", () => {
    const draft = {
      name: "Pan nuevo",
      ingredients: [{ name: "Harina", pct: "100", unit: "g" }],
      steps: ["Paso"],
    };
    expect(draftToRecipe(draft).id).toMatch(/^custom-/);
  });
});

describe("recipeToDraft", () => {
  it("es la inversa razonable de draftToRecipe", () => {
    const recipe = draftToRecipe({
      name: "Pan de prueba",
      subtitle: "Sub",
      accent: ACCENTS[1],
      ingredients: [{ name: "Harina", pct: "100", unit: "g" }],
      steps: ["Paso 1"],
    });
    const draft = recipeToDraft(recipe);
    expect(draft.id).toBe(recipe.id);
    expect(draft.name).toBe("Pan de prueba");
    expect(draft.accent).toBe(ACCENTS[1]);
    expect(draft.ingredients).toEqual([{ name: "Harina", pct: "100", unit: "g" }]);
    expect(draft.steps).toEqual(["Paso 1"]);
  });
});

describe("sanitizeCustomRecipes", () => {
  it("no-array -> []", () => {
    expect(sanitizeCustomRecipes(null)).toEqual([]);
    expect(sanitizeCustomRecipes(undefined)).toEqual([]);
    expect(sanitizeCustomRecipes("nope")).toEqual([]);
    expect(sanitizeCustomRecipes(42)).toEqual([]);
  });

  it("ignora items no-objeto sin lanzar", () => {
    expect(() => sanitizeCustomRecipes([null, "x", 1, undefined])).not.toThrow();
    expect(sanitizeCustomRecipes([null, "x", 1, undefined])).toEqual([]);
  });

  it("descarta receta sin ingredientes válidos", () => {
    const raw = [
      {
        id: "custom-1",
        name: "Sin ingredientes",
        ingredients: [{ name: "", pct: 0, unit: "g" }],
        steps: ["Paso"],
      },
    ];
    expect(sanitizeCustomRecipes(raw)).toEqual([]);
  });

  it("descarta receta con name vacío", () => {
    const raw = [
      {
        id: "custom-1",
        name: "   ",
        ingredients: [{ name: "Harina", pct: 100, unit: "g" }],
        steps: ["Paso"],
      },
    ];
    expect(sanitizeCustomRecipes(raw)).toEqual([]);
  });

  it("corrige accent inválido a ACCENTS[0]", () => {
    const raw = [
      {
        id: "custom-1",
        name: "Pan válido",
        accent: "#000000",
        ingredients: [{ name: "Harina", pct: 100, unit: "g" }],
        steps: ["Paso"],
      },
    ];
    const [recipe] = sanitizeCustomRecipes(raw);
    expect(recipe.accent).toBe(ACCENTS[0]);
  });

  it("conserva una receta válida completa, forzando custom:true y subtitle:''", () => {
    const raw = [
      {
        id: "custom-1",
        name: "Pan válido",
        ingredients: [
          { name: "Harina", pct: 100, unit: "g" },
          { name: "Sal", pct: 0, unit: "g" }, // descartada individualmente
        ],
        steps: ["Paso 1", "   "],
      },
    ];
    const [recipe] = sanitizeCustomRecipes(raw);
    expect(recipe.custom).toBe(true);
    expect(recipe.subtitle).toBe("");
    expect(recipe.ingredients).toEqual([{ id: "ing-1", name: "Harina", pct: 100, unit: "g" }]);
    expect(recipe.steps).toEqual(["Paso 1"]);
  });
});
