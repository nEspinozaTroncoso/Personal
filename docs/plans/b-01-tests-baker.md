# Plan B-01 — Tests unitarios de `baker.js` con Vitest

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-01** (P1) — "Tests unitarios de `baker.js` con Vitest".

## Contexto

La lógica de escalado por **porcentaje de panadero** vive en `src/lib/baker.js` y es el corazón
del cálculo de la app: `scaleRecipe(recipe, targetWeightG)` convierte los `pct` de cada ingrediente
a gramos/ml reales, y `formatAmount(n)` decide cómo se muestra cada cantidad. Todas las features
futuras (PWA, favoritos, compartir por URL) se apoyan en que este cálculo sea correcto. Antes de
construir encima, se blinda con tests unitarios deterministas.

Este plan cubre **solo** los tests de la lógica pura de `src/lib/baker.js`. No toca componentes
React, ni añade tests de integración/e2e, ni modifica la lógica existente.

### Implementación real a testear (copiada tal cual de `src/lib/baker.js`, no suponer)

```js
export function scaleRecipe(recipe, targetWeightG) {
  const totalPct = recipe.ingredients.reduce((sum, ing) => sum + ing.pct, 0);
  const factor = targetWeightG / totalPct;
  return recipe.ingredients.map((ing) => ({
    ...ing,
    amount: ing.pct * factor,
  }));
}

export function formatAmount(n) {
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}
```

Consecuencias reales que los tests deben respetar (no idealizar):
- `scaleRecipe` devuelve un **array nuevo** de objetos nuevos (`{...ing, amount}`); no muta el
  `recipe` original ni sus ingredientes (no había `amount` antes).
- La suma de `amount` es exactamente `totalPct * (targetWeight / totalPct)` = `targetWeight`, salvo
  error de coma flotante → comparar con `toBeCloseTo`.
- `formatAmount` devuelve **string**. Para `n < 10` usa `toFixed(1)` (1 decimal); para `n >= 10`
  usa `Math.round(n).toString()` (entero).
- **Observación (no arreglar en este plan):** por `toFixed(1)`, `formatAmount(9.96)` devuelve
  `"10.0"` (un valor < 10 que se muestra como "10.0"). Es el comportamiento real y el test lo fija
  como tal; si se considera indeseable, abrir un item de backlog aparte. No cambiar `baker.js` aquí.

## Archivos a tocar/crear

1. **`package.json`** (editar) — añadir Vitest como `devDependency` y los scripts `test` /
   `test:watch`. No tocar `dependencies` ni el resto de `devDependencies`.
2. **`src/lib/baker.test.js`** (crear) — archivo de tests Vitest. Convención: junto al módulo que
   prueba, mismo nombre con sufijo `.test.js` (Vitest lo detecta por defecto vía glob
   `**/*.{test,spec}.?(c|m)[jt]s?(x)`; no hace falta config extra).

No se crea `vitest.config.js`: Vite 5 ya está instalado y Vitest reutiliza la resolución por
defecto (entorno `node`, que es suficiente porque la lógica es pura JS sin DOM). No se necesita
`jsdom` ni `@testing-library`.

## Reutilización

- **`src/data/recipes.js`** → `export const RECIPES` (array de 6 recetas reales con sus `pct`). Se
  importa como **fixtures** en el test en vez de inventar datos. En particular:
  - `RECIPES[5]` = **Baguette Básica** (`id: "baguette"`): ingredientes con `pct`
    Harina 100, Levadura 1, Agua 68, Sal 2 → `totalPct = 171`. Es el ejemplo de paridad numérica.
  - `RECIPES[1]` = **Pan de Molde Tradicional** (`id: "molde-tradicional"`): segundo caso con más
    ingredientes para verificar suma y proporciones.
- **`src/lib/baker.js`** → funciones bajo test `scaleRecipe`, `formatAmount` (no se modifican).
- Se permite **un** fixture mínimo controlado inline (receta de 2 ingredientes, pct 100 y 100) solo
  para el test de proporción exacta 1:1 y de no-mutación; el resto usa `RECIPES`.

## Pasos

1. **Añadir Vitest a `package.json`.**
   En `devDependencies` agregar `"vitest": "^2.1.9"`. Razón de versión: Vite instalado es `^5.4.2`;
   Vitest 2.1.x es la línea estable compatible con Vite 5 (Vitest comparte el motor de Vite). No
   usar Vitest 3.x para no arriesgar un salto de major frente a Vite 5. Dejar el bloque así:

   ```json
   "devDependencies": {
     "@vitejs/plugin-react": "^4.3.1",
     "vite": "^5.4.2",
     "vitest": "^2.1.9"
   }
   ```

2. **Añadir scripts** en el bloque `"scripts"` de `package.json`, sin borrar los existentes:

   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview",
     "test": "vitest run",
     "test:watch": "vitest"
   }
   ```
   (`vitest run` = una pasada y termina, ideal para CI y para `npm test`; `vitest` = modo watch.)

3. **Instalar la dependencia**: `npm install` (genera/actualiza `package-lock.json` y baja Vitest).

4. **Crear `src/lib/baker.test.js`** con exactamente el contenido de la sección
   "Contenido de `src/lib/baker.test.js`" de abajo.

5. **Ejecutar `npm test`** y comprobar que todos los tests pasan (ver Verificación).

6. **No** modificar `baker.js`, `recipes.js` ni ningún componente. **No** hacer commit salvo que se
   pida (convención de `CLAUDE.md`).

## Contenido de `src/lib/baker.test.js`

El implementador debe crear el archivo con este contenido literal:

```js
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

  it("borde alrededor de 10: la rama depende de n<10, no del valor mostrado", () => {
    // 9.96 < 10 -> toma la rama toFixed(1), que redondea a "10.0"
    expect(formatAmount(9.96)).toBe("10.0");
    // exactamente 10 -> rama Math.round -> "10"
    expect(formatAmount(10)).toBe("10");
    // 10.4 -> "10", 10.6 -> "11"
    expect(formatAmount(10.4)).toBe("10");
    expect(formatAmount(10.6)).toBe("11");
  });
});
```

> Nota para el implementador: los tres tests de `formatAmount(9.96) === "10.0"` y compañía fijan el
> comportamiento **real** (incluida la rareza de "10.0"). No cambiar `baker.js` para "corregirlo";
> si se quisiera cambiar, es otro item de backlog.

## Verificación end-to-end

1. **Instalar Vitest** (una vez):
   ```
   npm install
   ```
   Esperado: instala `vitest@2.1.x`, sin errores; `package-lock.json` actualizado.

2. **Correr los tests**:
   ```
   npm test
   ```
   Equivale a `vitest run`. Salida esperada: Vitest descubre `src/lib/baker.test.js`, ejecuta los
   dos bloques `describe` (`scaleRecipe`, `formatAmount`) y reporta **todos los tests en verde**
   (aprox. 7 + 3 = 10 tests, "Test Files 1 passed", "Tests 10 passed"). Código de salida `0`.

3. **(Opcional) Modo watch** para desarrollo:
   ```
   npm run test:watch
   ```
   Debe quedar observando; se corta con `q` o Ctrl+C.

4. **No regresión de la app**: `npm run build` debe seguir compilando igual que antes (no se tocó
   código de la app). Esperado: build a `dist/` sin errores.

5. **Sanidad manual del ejemplo canónico** (opcional, para el revisor humano): Baguette a 1000 g →
   factor `1000/171 ≈ 5.84795`; Harina ≈ 584.80 → `formatAmount` "585"; Levadura ≈ 5.85 → "5.8";
   Agua ≈ 397.66 → "398"; Sal ≈ 11.70 → "12". Suma ≈ 1000.

## Fuera de alcance

- Tests de componentes React (`Header`, `IngredientList`, etc.), hooks (`useRecipeScaling`) o e2e.
- Cualquier modificación de la lógica de `src/lib/baker.js` o de los datos de `src/data/recipes.js`
  (incluida la rareza `formatAmount(9.96) === "10.0"`: se documenta como observación, no se toca).
- Configuración de cobertura (`vitest --coverage`), CI, o `vitest.config.js` dedicado. No se
  necesitan para este item; se dejan para un futuro item si se pide.
- Añadir `jsdom`, `@testing-library` u otras dependencias más allá de `vitest`.
- Cambios visuales, de estilos o de dependencias de runtime.
```
