import { describe, it, expect } from "vitest";
import { scaleRecipe, formatAmount } from "./baker.js";
import { RECIPES } from "../data/recipes.js";

// Fixtures reales
const baguette = RECIPES.find((r) => r.id === "baguette");
const molde = RECIPES.find((r) => r.id === "molde-tradicional");

// Fixture mínimo controlado (2 ingredientes, proporción 1:1)
const dos = {
  id: "test-dos",
  name: "Test 2 ingredientes",
  ingredients: [
    { id: "a", name: "A", pct: 100, unit: "g" },
    { id: "b", name: "B", pct: 100, unit: "g" },
  ],
};

const sum = (arr) => arr.reduce((s, ing) => s + ing.amount, 0);

describe("scaleRecipe", () => {
  it("la suma de los amount escalados es igual al peso objetivo", () => {
    for (const target of [500, 1000, 1234]) {
      const scaled = scaleRecipe(baguette, target);
      expect(sum(scaled)).toBeCloseTo(target, 6);
    }
  });

  it("mantiene las proporciones entre ingredientes (amount_i/amount_j == pct_i/pct_j)", () => {
    const scaled = scaleRecipe(baguette, 1000);
    const harina = scaled.find((i) => i.id === "harina-blanca");
    const agua = scaled.find((i) => i.id === "agua");
    const sal = scaled.find((i) => i.id === "sal");
    // pct: harina 100, agua 68, sal 2
    expect(agua.amount / harina.amount).toBeCloseTo(68 / 100, 10);
    expect(sal.amount / harina.amount).toBeCloseTo(2 / 100, 10);
  });

  it("paridad numérica con Baguette a 1000 g (totalPct=171, factor=1000/171)", () => {
    const factor = 1000 / 171;
    const scaled = scaleRecipe(baguette, 1000);
    const byId = Object.fromEntries(scaled.map((i) => [i.id, i.amount]));
    expect(byId["harina-blanca"]).toBeCloseTo(100 * factor, 10); // ~584.7953
    expect(byId["levadura"]).toBeCloseTo(1 * factor, 10);        // ~5.8480
    expect(byId["agua"]).toBeCloseTo(68 * factor, 10);           // ~397.6608
    expect(byId["sal"]).toBeCloseTo(2 * factor, 10);             // ~11.6959
  });

  it("escala linealmente: duplicar el peso duplica cada amount", () => {
    const a = scaleRecipe(baguette, 500);
    const b = scaleRecipe(baguette, 1000);
    for (let k = 0; k < a.length; k++) {
      expect(b[k].amount).toBeCloseTo(a[k].amount * 2, 8);
    }
  });

  it("funciona con una receta de más ingredientes (molde tradicional) y conserva pct/unit/id", () => {
    const scaled = scaleRecipe(molde, 900);
    expect(sum(scaled)).toBeCloseTo(900, 6);
    // conserva los campos originales de cada ingrediente
    scaled.forEach((ing, idx) => {
      expect(ing.id).toBe(molde.ingredients[idx].id);
      expect(ing.pct).toBe(molde.ingredients[idx].pct);
      expect(ing.unit).toBe(molde.ingredients[idx].unit);
      expect(typeof ing.amount).toBe("number");
    });
  });

  it("no muta el objeto receta original ni sus ingredientes", () => {
    const snapshot = JSON.stringify(dos);
    const scaled = scaleRecipe(dos, 200);
    // el original no gana la propiedad amount
    expect(dos.ingredients[0]).not.toHaveProperty("amount");
    expect(JSON.stringify(dos)).toBe(snapshot);
    // y el resultado es un array nuevo de objetos nuevos
    expect(scaled).not.toBe(dos.ingredients);
    expect(scaled[0]).not.toBe(dos.ingredients[0]);
    // proporción 1:1 → cada uno la mitad del peso
    expect(scaled[0].amount).toBeCloseTo(100, 10);
    expect(scaled[1].amount).toBeCloseTo(100, 10);
  });

  it("devuelve array vacío si la receta no tiene ingredientes", () => {
    // caso borde defensivo: totalPct=0 -> factor Infinity, pero el map sobre [] no ejecuta nada
    const scaled = scaleRecipe({ id: "vacia", ingredients: [] }, 1000);
    expect(scaled).toEqual([]);
  });
});

describe("formatAmount", () => {
  it("valores < 10 se muestran con un decimal (toFixed(1)) como string", () => {
    expect(formatAmount(5.847953216374269)).toBe("5.8");
    expect(formatAmount(0)).toBe("0.0");
    expect(formatAmount(2)).toBe("2.0");
    expect(formatAmount(9.94)).toBe("9.9");
  });

  it("valores >= 10 se redondean a entero (Math.round) como string", () => {
    expect(formatAmount(10)).toBe("10");
    expect(formatAmount(11.695906432748538)).toBe("12"); // sal baguette 1000 g
    expect(formatAmount(584.7953216374269)).toBe("585"); // harina baguette 1000 g
    expect(formatAmount(397.6608187134503)).toBe("398"); // agua baguette 1000 g
  });

  it("borde alrededor de 10: la rama se decide con el valor ya redondeado a 1 decimal", () => {
    // justo por debajo: rounded1 = 9.9 < 10 -> decimal
    expect(formatAmount(9.949999)).toBe("9.9");
    // borde inferior conflictivo: rounded1 = 10 -> entero
    expect(formatAmount(9.95)).toBe("10");
    // antes era "10.0"; ahora rounded1 = 10 -> entero
    expect(formatAmount(9.96)).toBe("10");
    // borde superior conflictivo: rounded1 = 10 -> entero
    expect(formatAmount(9.999)).toBe("10");
    // exactamente 10 -> rama Math.round -> "10"
    expect(formatAmount(10)).toBe("10");
    // 10.4 -> "10", 10.6 -> "11"
    expect(formatAmount(10.4)).toBe("10");
    expect(formatAmount(10.6)).toBe("11");
    // bien por debajo y bien por encima: comportamiento sin cambios
    expect(formatAmount(3.456)).toBe("3.5");
    expect(formatAmount(234.6)).toBe("235");
  });
});
