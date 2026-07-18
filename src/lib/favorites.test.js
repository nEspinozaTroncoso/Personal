import { describe, it, expect } from "vitest";
import { favoriteKey, isFavorite, toggleFavorite, sanitizeFavorites } from "./favorites.js";

describe("favoriteKey", () => {
  it("compone kind e id con ':' como separador", () => {
    expect(favoriteKey("local", "baguette")).toBe("local:baguette");
    expect(favoriteKey("mealdb", "52977")).toBe("mealdb:52977");
  });

  it("normaliza id numérico a string", () => {
    expect(favoriteKey("mealdb", 52977)).toBe("mealdb:52977");
  });

  it("el namespace kind evita colisión entre un slug local y un idMeal numérico iguales", () => {
    expect(favoriteKey("local", "52977")).not.toBe(favoriteKey("mealdb", "52977"));
  });
});

describe("isFavorite", () => {
  const list = [
    { kind: "local", id: "baguette" },
    { kind: "mealdb", id: "52977", name: "Bread pudding", thumb: "https://example.com/x.jpg" },
  ];

  it("true si el registro está presente (local)", () => {
    expect(isFavorite(list, "local", "baguette")).toBe(true);
  });

  it("true si el registro está presente (mealdb)", () => {
    expect(isFavorite(list, "mealdb", "52977")).toBe(true);
  });

  it("false si el registro está ausente", () => {
    expect(isFavorite(list, "local", "molde-7030")).toBe(false);
    expect(isFavorite(list, "mealdb", "99999")).toBe(false);
  });

  it("false en lista vacía", () => {
    expect(isFavorite([], "local", "baguette")).toBe(false);
  });
});

describe("toggleFavorite", () => {
  it("da de alta un registro nuevo al final", () => {
    const list = [{ kind: "local", id: "baguette" }];
    const next = toggleFavorite(list, { kind: "local", id: "molde-7030" });
    expect(next).toEqual([
      { kind: "local", id: "baguette" },
      { kind: "local", id: "molde-7030" },
    ]);
  });

  it("da de baja un registro existente (mismo kind+id)", () => {
    const list = [
      { kind: "local", id: "baguette" },
      { kind: "mealdb", id: "52977", name: "Bread pudding", thumb: "t.jpg" },
    ];
    const next = toggleFavorite(list, { kind: "local", id: "baguette" });
    expect(next).toEqual([
      { kind: "mealdb", id: "52977", name: "Bread pudding", thumb: "t.jpg" },
    ]);
  });

  it("no muta la lista de entrada", () => {
    const list = [{ kind: "local", id: "baguette" }];
    const snapshot = JSON.stringify(list);
    toggleFavorite(list, { kind: "local", id: "molde-7030" });
    expect(JSON.stringify(list)).toBe(snapshot);
  });

  it("no colisiona un local y un mealdb con el mismo id literal", () => {
    const list = [{ kind: "local", id: "52977" }];
    const next = toggleFavorite(list, { kind: "mealdb", id: "52977", name: "X", thumb: "" });
    // se añade, no reemplaza al local existente
    expect(next).toEqual([
      { kind: "local", id: "52977" },
      { kind: "mealdb", id: "52977", name: "X", thumb: "" },
    ]);
  });
});

describe("sanitizeFavorites", () => {
  it("array vacío -> array vacío", () => {
    expect(sanitizeFavorites([])).toEqual([]);
  });

  it("no-array -> array vacío, nunca lanza", () => {
    expect(sanitizeFavorites(null)).toEqual([]);
    expect(sanitizeFavorites(undefined)).toEqual([]);
    expect(sanitizeFavorites("nope")).toEqual([]);
    expect(sanitizeFavorites({ kind: "local", id: "x" })).toEqual([]);
    expect(sanitizeFavorites(42)).toEqual([]);
  });

  it("descarta registros malformados: no-objeto, sin kind válido, sin id", () => {
    const raw = [
      null,
      "string",
      42,
      { id: "baguette" }, // sin kind
      { kind: "otro", id: "baguette" }, // kind inválido
      { kind: "local" }, // sin id
      { kind: "local", id: "" }, // id vacío
    ];
    expect(sanitizeFavorites(raw)).toEqual([]);
  });

  it("descarta un registro mealdb sin name (string)", () => {
    const raw = [
      { kind: "mealdb", id: "52977", thumb: "t.jpg" }, // sin name
      { kind: "mealdb", id: "52978", name: 123, thumb: "t.jpg" }, // name no-string
    ];
    expect(sanitizeFavorites(raw)).toEqual([]);
  });

  it("normaliza id numérico a string y conserva registros válidos", () => {
    const raw = [
      { kind: "local", id: "baguette" },
      { kind: "mealdb", id: 52977, name: "Bread pudding", thumb: "https://x/y.jpg" },
    ];
    expect(sanitizeFavorites(raw)).toEqual([
      { kind: "local", id: "baguette" },
      { kind: "mealdb", id: "52977", name: "Bread pudding", thumb: "https://x/y.jpg" },
    ]);
  });
});
