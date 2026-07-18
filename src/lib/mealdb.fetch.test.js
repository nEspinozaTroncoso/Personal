// Tests de integración fetch→normalizador para los wrappers fetch* de mealdb.js.
// Se aísla en un archivo aparte (vs. mealdb.test.js) por higiene de setup/teardown del
// mock global de fetch: mealdb.test.js solo ejercita normalizadores puros, sin red.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBreadList, fetchMealDetail, BREAD_SEARCH_TERM } from "./mealdb.js";

const okJson = (data) => ({ ok: true, status: 200, json: async () => data });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBreadList", () => {
  it("llama a fetch con la URL exacta de search.php (blindaje del bug de B-06)", async () => {
    fetch.mockResolvedValue(okJson({ meals: [] }));

    await fetchBreadList();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${BREAD_SEARCH_TERM}`,
      { signal: undefined }
    );
    expect(fetch.mock.calls[0][0]).toContain("search.php?s=bread");
    expect(fetch.mock.calls[0][0]).not.toContain("filter.php");
  });

  it("propaga el signal recibido tal cual", async () => {
    fetch.mockResolvedValue(okJson({ meals: [] }));
    const signal = new AbortController().signal;

    await fetchBreadList("bread", signal);

    expect(fetch).toHaveBeenCalledWith(expect.any(String), { signal });
  });

  it("con término libre construye la URL con el término codificado", async () => {
    fetch.mockResolvedValue(okJson({ meals: [] }));

    await fetchBreadList("olive & herb");

    const url = fetch.mock.calls[0][0];
    expect(url).toContain(`search.php?s=${encodeURIComponent("olive & herb")}`);
    expect(url).not.toContain("olive & herb"); // sin escapar no debe aparecer
  });

  it("caso feliz: el JSON de fetch pasa por normalizeBreadList", async () => {
    fetch.mockResolvedValue(
      okJson({ meals: [{ idMeal: "1", strMeal: "Baguette", strMealThumb: "https://x/1.jpg" }] })
    );

    const result = await fetchBreadList();

    expect(result).toEqual([{ id: "1", name: "Baguette", thumb: "https://x/1.jpg" }]);
  });

  it("HTTP no-OK lanza un error con el status", async () => {
    fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    await expect(fetchBreadList()).rejects.toThrow("TheMealDB (search) respondió 500");
  });

  it("un rechazo de red no se traga el error", async () => {
    fetch.mockRejectedValue(new Error("Network down"));

    await expect(fetchBreadList()).rejects.toThrow("Network down");
  });
});

describe("fetchMealDetail", () => {
  const id = "a b/52 961";

  it("llama a fetch con la URL exacta de lookup.php, escapando el id con encodeURIComponent", async () => {
    fetch.mockResolvedValue(okJson({ meals: [] }));

    await fetchMealDetail(id);

    expect(fetch).toHaveBeenCalledWith(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`,
      { signal: undefined }
    );
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain("a%20b%2F52%20961");
    expect(calledUrl).not.toContain("a b/52 961");
  });

  it("caso feliz: el JSON de fetch pasa por normalizeMealDetail", async () => {
    fetch.mockResolvedValue(
      okJson({
        meals: [
          {
            idMeal: "52961",
            strMeal: "Budino",
            strInstructions: "Paso 1.\nPaso 2.",
            strIngredient1: "Ricotta",
            strMeasure1: "500g",
          },
        ],
      })
    );

    const result = await fetchMealDetail("52961");

    expect(result).toMatchObject({ id: "52961", name: "Budino" });
    expect(result.ingredients).not.toHaveLength(0);
    expect(result.steps).not.toHaveLength(0);
  });

  it("con { meals: null } devuelve null", async () => {
    fetch.mockResolvedValue(okJson({ meals: null }));

    const result = await fetchMealDetail("x");

    expect(result).toBeNull();
  });

  it("HTTP no-OK lanza un error con el status", async () => {
    fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(fetchMealDetail("x")).rejects.toThrow("TheMealDB (lookup) respondió 404");
  });

  it("un rechazo de red no se traga el error", async () => {
    fetch.mockRejectedValue(new Error("boom"));

    await expect(fetchMealDetail("x")).rejects.toThrow("boom");
  });
});
