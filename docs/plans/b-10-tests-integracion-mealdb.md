# B-10 — Reforzar tests de la integración TheMealDB (fetch + URL + errores)

> Plan para `implementador` (Sonnet 5). No escribir código de la app: solo se añade **un archivo de
> test nuevo**. No tocar `src/lib/mealdb.js` ni el hook.

## Contexto

En **B-06** (integración con TheMealDB) el plan original apuntaba a `filter.php?c=Bread`. "Bread" no
es una categoría válida de la API: ese endpoint responde siempre `{ meals: null }`. En la
verificación manual (Playwright + `curl`) se detectó el fallo y se corrigió a `search.php?s=bread`
(ya aplicado en `src/lib/mealdb.js`, línea 48).

El problema de fondo: **los tests no atraparon el bug**. `src/lib/mealdb.test.js` solo ejercita los
normalizadores puros (`normalizeBreadList`, `normalizeMealDetail`) con fixtures locales; nunca llama
a `fetchBreadList` / `fetchMealDetail` ni comprueba la URL que arman al invocar `fetch`. Un cambio de
endpoint como el de B-06 pasaría en verde.

Este item cierra ese hueco: añadir cobertura de los wrappers `fetch*` mockeando `global.fetch`, con
una **aserción explícita sobre la URL exacta** (para que cualquier regresión de endpoint rompa el
test), más los caminos de error (HTTP no-OK y rechazo de red). Sin red real y sin dependencias
nuevas.

## Estado actual relevante (ya explorado)

- `src/lib/mealdb.js`:
  - `const BASE = "https://www.themealdb.com/api/json/v1/1"` y `BREAD_SEARCH_TERM = "bread"`.
  - `fetchBreadList(signal)` → `fetch(`${BASE}/search.php?s=${BREAD_SEARCH_TERM}`, { signal })`; si
    `!res.ok` lanza `Error("TheMealDB (search) respondió " + res.status)`; devuelve
    `normalizeBreadList(await res.json())`.
  - `fetchMealDetail(id, signal)` → `fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`, { signal })`;
    si `!res.ok` lanza `Error("TheMealDB (lookup) respondió " + res.status)`; toma
    `json.meals[0]` (o `null`) y devuelve `normalizeMealDetail(raw)`.
- `src/lib/mealdb.test.js`: solo normalizadores puros; **sin mocks de red** (sería el primero).
- `package.json`: Vitest `^2.1.9`, sin `@testing-library/*`. Scripts `test` (`vitest run`) y
  `test:watch`.
- `vite.config.js`: **no** define bloque `test` → Vitest corre con environment por defecto
  (`node`). Es suficiente: `vi.stubGlobal("fetch", …)` funciona en node y no requiere jsdom.
- Estilo de test del proyecto (`baker.test.js`, `mealdb.test.js`): `import { describe, it, expect }
  from "vitest"`, fixtures locales, aserciones directas. Mantener ese estilo; añadir `vi` al import.

## Archivos a tocar/crear

- **Crear** `src/lib/mealdb.fetch.test.js` — nuevo archivo de test para los wrappers `fetch*`.
  - Se usa un archivo separado (en vez de ampliar `mealdb.test.js`) para no mezclar tests puros
    (sin mocks) con tests que instalan/retiran un `global.fetch` mockeado, y dejar claro en el nombre
    que cubre la capa de red. Alternativa válida: añadir un `describe` nuevo dentro de
    `mealdb.test.js`; se elige archivo aparte por higiene de setup/teardown del mock global.
- **No modificar** `src/lib/mealdb.js`, `src/hooks/useExternalRecipes.js`, `package.json`,
  `vite.config.js`. No añadir dependencias.

## Reutilización

- Se reimportan las funciones reales bajo test desde `./mealdb.js`: `fetchBreadList`,
  `fetchMealDetail` y la constante `BREAD_SEARCH_TERM` (para construir la URL esperada sin
  hardcodear el término y que el test siga la fuente de verdad del módulo — pero **la base/host y el
  path sí se escriben literales** en el test, que es justo lo que se quiere blindar).
- Se reutiliza el toolkit de Vitest ya presente (`vi.fn`, `vi.stubGlobal`, `vi.unstubAllGlobals`),
  el mismo del ecosistema usado en `baker.test.js` / `mealdb.test.js`. Sin dependencias nuevas.
- Los fixtures de payload de la API pueden inspirarse en los ya usados en `mealdb.test.js`
  (`{ meals: [{ idMeal, strMeal, strMealThumb }] }` y el `rawMeal` de detalle), pero basta un
  fixture mínimo: el objetivo aquí es la integración fetch→normalizador, no re-testear el
  normalizador (eso ya está cubierto).

## Pasos

1. **Crear `src/lib/mealdb.fetch.test.js`** con el encabezado:
   ```js
   import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
   import { fetchBreadList, fetchMealDetail, BREAD_SEARCH_TERM } from "./mealdb.js";
   ```

2. **Setup/teardown del mock global** (aplicado a todos los tests del archivo):
   - `beforeEach`: `vi.stubGlobal("fetch", vi.fn())`.
   - `afterEach`: `vi.unstubAllGlobals()` (restaura el `fetch` real y limpia el mock entre tests).
   - Helper local para respuestas OK, p. ej.:
     ```js
     const okJson = (data) => ({ ok: true, status: 200, json: async () => data });
     ```

3. **`describe("fetchBreadList")`** con estos casos:
   - **URL exacta** (blindaje del bug de B-06): configurar
     `fetch.mockResolvedValue(okJson({ meals: [] }))`, llamar `await fetchBreadList()` y aseverar:
     ```js
     expect(fetch).toHaveBeenCalledTimes(1);
     expect(fetch).toHaveBeenCalledWith(
       `https://www.themealdb.com/api/json/v1/1/search.php?s=${BREAD_SEARCH_TERM}`,
       { signal: undefined }
     );
     ```
     Escribir el host/path **literales** en el test (no derivarlos de `BASE`, que no se exporta), de
     modo que cambiar el endpoint en `mealdb.js` rompa esta aserción. Añadir además una comprobación
     defensiva de que la URL contiene `search.php` y **no** `filter.php` (documenta el bug histórico):
     `expect(fetch.mock.calls[0][0]).toContain("search.php?s=bread")` y
     `expect(fetch.mock.calls[0][0]).not.toContain("filter.php")`.
   - **Propaga el `signal`**: llamar `fetchBreadList(someSignal)` (un objeto sentinela, p. ej.
     `const signal = Symbol("sig")` o un `new AbortController().signal`) y aseverar que
     `fetch` recibió `{ signal }` con ese mismo valor como segundo argumento.
   - **Caso feliz (integración fetch→normalizeBreadList)**: `fetch.mockResolvedValue(okJson({
     meals: [{ idMeal: "1", strMeal: "Baguette", strMealThumb: "https://x/1.jpg" }] }))`; el
     resultado de `fetchBreadList()` debe ser `[{ id: "1", name: "Baguette", thumb: "https://x/1.jpg" }]`.
     (Solo se confirma que el JSON pasa por el normalizador; los casos exhaustivos del normalizador
     ya viven en `mealdb.test.js` — no duplicarlos.)
   - **HTTP no-OK**: `fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })`;
     `await expect(fetchBreadList()).rejects.toThrow("TheMealDB (search) respondió 500")`.
   - **Rechazo de red (no se traga el error)**: `fetch.mockRejectedValue(new Error("Network down"))`;
     `await expect(fetchBreadList()).rejects.toThrow("Network down")`.

4. **`describe("fetchMealDetail")`** con estos casos:
   - **URL exacta con `encodeURIComponent`**: usar un id que **requiera** escape, p. ej.
     `const id = "a b/52 961"`; `fetch.mockResolvedValue(okJson({ meals: [] }))`; tras
     `await fetchMealDetail(id)` aseverar:
     ```js
     expect(fetch).toHaveBeenCalledWith(
       `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`,
       { signal: undefined }
     );
     ```
     y comprobar explícitamente que la URL llamada contiene la forma escapada (p. ej.
     `a%20b%2F52%20961`) y **no** el id crudo con espacios/barra — así se fija que el
     `encodeURIComponent` está presente.
   - **Caso feliz (integración fetch→normalizeMealDetail)**: mock con
     `{ meals: [{ idMeal: "52961", strMeal: "Budino", strInstructions: "Paso 1.\nPaso 2.",
     strIngredient1: "Ricotta", strMeasure1: "500g" }] }`; aseverar que el resultado es el objeto
     normalizado (basta `toMatchObject({ id: "52961", name: "Budino" })` y que
     `ingredients`/`steps` no vengan vacíos), confirmando que `json.meals[0]` llegó al normalizador.
   - **`{ meals: null }` → `null`**: mock con `okJson({ meals: null })`; `fetchMealDetail("x")` debe
     resolver a `null` (el wrapper toma `raw = null` y `normalizeMealDetail(null)` devuelve `null`).
   - **HTTP no-OK**: `{ ok: false, status: 404 }`;
     `await expect(fetchMealDetail("x")).rejects.toThrow("TheMealDB (lookup) respondió 404")`.
   - **Rechazo de red**: `fetch.mockRejectedValue(new Error("boom"))`;
     `await expect(fetchMealDetail("x")).rejects.toThrow("boom")`.

5. **No** modificar los tests existentes ni la lógica. Ejecutar la verificación (abajo).

## Verificación

- `npm test` → deben pasar **todos** los tests: los 10 de `baker.test.js`, los de `mealdb.test.js`
  y los nuevos de `mealdb.fetch.test.js`. Observar que la salida de Vitest lista el archivo nuevo.
- Comprobación de que el test realmente blinda el endpoint (hacer y **deshacer**, no dejar el cambio):
  editar temporalmente `src/lib/mealdb.js` para volver a `filter.php?c=Bread` y confirmar que el
  test de "URL exacta" de `fetchBreadList` **falla** en rojo; luego revertir. Esto valida que el
  test cumple su propósito (habría atrapado el bug de B-06).
- `npm run build` → sigue construyendo sin regresión (el archivo `*.test.js` no entra al bundle).
- Confirmar que **no** hubo red real: los tests corren offline (todo pasa por el `fetch` mockeado);
  si algún test tarda o falla sin red, es que quedó una llamada sin mockear — revisar el
  `beforeEach`.

## Fuera de alcance

- **Tests del hook `useExternalRecipes` (estados loading/error/ready, caché de sesión,
  `AbortController`).** Probarlo requeriría renderizar/ejecutar un hook de React, lo que implica
  **añadir dependencias de test nuevas** (`@testing-library/react` y el runtime jsdom, más
  configurar `environment: "jsdom"` en Vitest). CLAUDE.md es estricto: no añadir dependencias sin
  justificación fuerte. **Decisión: no se añaden en este item.** Justificación: el bug real que
  motivó B-10 (endpoint incorrecto) vive en `mealdb.js`, y el punto 1 de este plan (aserción de URL
  exacta sobre `fetch` mockeado) **ya lo habría atrapado**. El hook solo orquesta esos wrappers y su
  estado de React; su valor de cobertura no compensa el costo de introducir toda la cadena de
  testing de componentes. Si en el futuro aparece lógica no trivial en el hook o se añade
  `@testing-library` por otro motivo, reconsiderar en un item aparte.
- No se modifica `src/lib/mealdb.js` (la corrección de endpoint de B-06 ya está aplicada) ni el
  comportamiento de la app. No hay cambios visuales.
- No se prueban integraciones contra la API real (eso ya se hizo manualmente en B-06 con `curl`);
  aquí todo es con `fetch` mockeado, determinista y offline.
- No se toca `formatAmount` cerca de 10 (eso es B-09) ni ningún otro item.
