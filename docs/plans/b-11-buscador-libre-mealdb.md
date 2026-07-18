# B-11 — Buscador libre de recetas externas (TheMealDB)

> Plan para el `implementador` (Sonnet 5). Parte 2/4 del grupo "Evolución recetas externas +
> favoritos". Proveedor cerrado: **TheMealDB** (decisión de B-06, no se reevalúa).

## Contexto

Hoy la sección "Explorar más panes" (`ExternalRecipes.jsx`) siempre pide el mismo término fijo:
`fetchBreadList` llama a `search.php?s=bread` (constante `BREAD_SEARCH_TERM` en `src/lib/mealdb.js`,
decisión corregida en B-06 tras descubrir que `filter.php?c=Bread` devuelve siempre `{meals:null}`).
El usuario solo ve el puñado de panes que TheMealDB devuelve para la palabra "bread" y no puede
descubrir otras recetas (focaccia, brioche, naan, etc.).

Objetivo de B-11: añadir un **input de búsqueda libre** que reescale la consulta a TheMealDB con el
término que el usuario escriba, con **debounce** (cada tecleo dispara una petición HTTP, hay que
espaciarlas) y **cancelación** de peticiones en vuelo. No se toca el modelo de porcentaje de
panadero: estas recetas externas siguen siendo de solo lectura y con cantidades fijas (eso lo
abordará B-12, fuera de alcance aquí).

## Decisiones de diseño (resueltas aquí)

1. **Término inicial = `"bread"` (comportamiento actual preservado).** Al montar, el input arranca
   pre-rellenado con `BREAD_SEARCH_TERM` y la búsqueda se dispara con ese valor. Justificación:
   arrancar con el input vacío dejaría la sección vacía al entrar (peor primera impresión y
   desaprovecha el estado ya funcional de B-06); pre-rellenar "bread" mantiene la utilidad actual,
   deja el resultado y el input **consistentes** entre sí, y sirve de ejemplo vivo del buscador. El
   término va en inglés a propósito: el contenido de TheMealDB es solo inglés (no se localiza).

2. **Debounce = 400 ms**, con `setTimeout` + `useRef`/cleanup a mano (sin librería nueva). Cada
   cambio de término programa la petición 400 ms después; si el usuario sigue tecleando, se cancela
   el timer anterior. La petición en vuelo se aborta con `AbortController` (mismo patrón que ya usa
   el `useEffect` de montaje del hook). El `.catch` que ya ignora `AbortError` cubre las cancelaciones.

3. **Estado "sin resultados"**: se reutiliza el patrón `role="status"` existente. Como con búsqueda
   libre un listado vacío siempre corresponde a un término concreto, el mensaje pasa a incluir el
   término (clave nueva `external.noResults`, calcada de `selector.noResults` de B-05). La clave
   genérica `external.empty` deja de usarse y se elimina (ver sección i18n).

4. **Mínimo 2 caracteres.** Con 0–1 caracteres no se dispara la búsqueda: `search.php?s=<1 letra>`
   en TheMealDB devuelve todos los platos que empiezan por esa letra (ruido, no panes) y satura la
   API por cada pulsación. Debajo del umbral se muestra un aviso `external.typePrompt` ("escribe al
   menos 2 letras"), sin red. El término se compara ya recortado (`.trim()`), así que espacios en
   blanco cuentan como vacío.

## Archivos a tocar

### `src/lib/mealdb.js`
- Parametrizar `fetchBreadList` para recibir el término:
  ```js
  export async function fetchBreadList(term = BREAD_SEARCH_TERM, signal) {
    const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(term)}`, { signal });
    if (!res.ok) throw new Error(`TheMealDB (search) respondió ${res.status}`);
    return normalizeBreadList(await res.json());
  }
  ```
  - `term` tiene **default `BREAD_SEARCH_TERM`** para no romper llamadas sin argumentos y preservar
    el blindaje de B-06/B-10.
  - Se añade `encodeURIComponent(term)` (antes la constante "bread" no lo necesitaba; ahora el
    término es libre y puede traer espacios/`&`/acentos). `encodeURIComponent("bread") === "bread"`,
    así que la URL por defecto no cambia.
- No tocar `normalizeBreadList`, `normalizeMealDetail`, `fetchMealDetail` ni `BASE`.

### `src/hooks/useExternalRecipes.js`
- Añadir estado del término: `const [query, setQuery] = useState(BREAD_SEARCH_TERM);` (importar
  `BREAD_SEARCH_TERM` desde `../lib/mealdb.js`).
- Añadir constantes locales al módulo: `const DEBOUNCE_MS = 400;` y `const MIN_QUERY_LENGTH = 2;`.
- Cambiar `loadList` para recibir el término: `loadList(term, signal)` → `fetchBreadList(term, signal)`
  (resto igual: setea `loading`/`ready`/`error`, ignora `AbortError`).
- Reemplazar el `useEffect` de montaje por uno que reacciona a `query`, con debounce + abort:
  ```js
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      setList([]);
      setListStatus("prompt");
      setListError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => loadList(term, ctrl.signal), DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, loadList]);
  ```
  - `"prompt"` es un nuevo valor de `listStatus` (loading | error | ready | **prompt**).
  - En el montaje `query` = "bread" (≥2), así que dispara la búsqueda por defecto tras el debounce;
    el `listStatus` inicial sigue siendo `"loading"`, de modo que no hay parpadeo vacío.
- `retryList`: pasar el término actual → `useCallback(() => loadList(query.trim()), [loadList, query])`.
- Exponer en el objeto de retorno: `query`, `setQuery` (además de lo ya existente).
- No tocar la lógica de detalle (`selectRecipe`/`clearSelection`/`retryDetail`/`detailCache`). La
  selección/detalle **persiste** aunque cambie la búsqueda (no se auto-limpia; fuera de alcance).

### `src/components/ExternalRecipes.jsx`
- Consumir `query`, `setQuery` del hook (además de lo que ya usa).
- Insertar un `<input type="search">` entre el `<p>` de intro y el bloque de estados del listado.
  Reutilizar la **clase `recipe-search`** (ya estilada en `global.css`: placeholder, `:focus-visible`,
  `prefers-reduced-motion`) y el mismo objeto de estilos inline que `RecipeSelector.jsx` (borde
  pill, `colors.surface`, `fonts.sans`, etc.), para mantener identidad visual y accesibilidad:
  ```jsx
  <input
    type="search"
    className="recipe-search"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder={t("external.searchPlaceholder")}
    aria-label={t("external.searchAria")}
    style={{ /* mismo estilo pill que RecipeSelector */ }}
  />
  ```
- Actualizar las ramas de estado del listado:
  - `listStatus === "prompt"` → `<p role="status" style={statusStyle}>{t("external.typePrompt")}</p>`.
  - `listStatus === "loading"` → sin cambios (`external.loadingList`).
  - `listStatus === "error"` → sin cambios (`external.listError` + retry).
  - `listStatus === "ready" && list.length === 0` → cambiar el mensaje a
    `{t("external.noResults", { query: query.trim() })}` (antes `external.empty`).
  - `listStatus === "ready" && list.length > 0` → grid sin cambios.
- No tocar el bloque de detalle ni los estilos `statusStyle`/`retryStyle`/`subheadStyle`.

### `src/i18n/messages.js`
Añadir en **es y en** (respetar paridad, ver `translate.test.js`). Tono calcado de las claves de
B-05 (`selector.searchPlaceholder`/`selector.noResults`):
- `external.searchPlaceholder`: "Buscar pan…" / "Search bread…"
- `external.searchAria`: "Buscar recetas en TheMealDB por nombre" / "Search TheMealDB recipes by name"
- `external.noResults`: "No se encontraron recetas para «{query}» en TheMealDB." /
  "No recipes found for “{query}” on TheMealDB."
- `external.typePrompt`: "Escribe al menos 2 letras para buscar panes." /
  "Type at least 2 letters to search for breads."

**Eliminar** `external.empty` en ambos idiomas (ya no se referencia; su único uso pasa a
`external.noResults`). La paridad es/en se mantiene porque se quita de los dos.

### `src/lib/mealdb.fetch.test.js`
Extender sin romper la cobertura existente de URL/errores:
- El test "URL exacta de search.php (blindaje del bug de B-06)" llama `fetchBreadList()` sin args →
  gracias al default `BREAD_SEARCH_TERM`, la URL sigue siendo `search.php?s=bread`. **Se mantiene tal
  cual** (sigue validando `.not.toContain("filter.php")`).
- El test "propaga el signal recibido tal cual" hoy pasa el `signal` como **primer** argumento; con
  la nueva firma el primer argumento es el término. **Actualizarlo** a
  `await fetchBreadList("bread", signal);` para que el `signal` viaje en su nueva posición.
- **Añadir** un test nuevo: `fetchBreadList` con término libre construye la URL con el término
  **codificado**. Usar un término con caracteres que exijan escape, p. ej. `"olive & herb"`:
  ```js
  await fetchBreadList("olive & herb");
  const url = fetch.mock.calls[0][0];
  expect(url).toContain(`search.php?s=${encodeURIComponent("olive & herb")}`);
  expect(url).not.toContain("olive & herb"); // sin escapar no debe aparecer
  ```
- Los tests de `fetchMealDetail`, caso feliz, HTTP no-OK y rechazo de red **no cambian**.

## Reutilización (no reinventar)

- `fetchBreadList` / `normalizeBreadList` / `fetchMealDetail` de `src/lib/mealdb.js` — solo se
  parametriza la primera; el resto se reutiliza intacto.
- Patrón `AbortController` + `.catch` que ignora `AbortError` — ya presente en el `useEffect` actual
  del hook; se extiende, no se reescribe.
- Input `type="search"` + `aria-label` + clase `recipe-search` (estilos/focus en `global.css`) —
  copiados de `RecipeSelector.jsx` (B-05).
- Patrón `role="status"` para vacío/aviso y `role="alert"` para error — ya usados en esta misma
  sección (B-06) y en `RecipeSelector` (B-05).
- `external.noResults` calcado de `selector.noResults` (interpolación `{query}` vía `translate.js`).

## Pasos

1. `src/lib/mealdb.js`: parametrizar `fetchBreadList(term = BREAD_SEARCH_TERM, signal)` con
   `encodeURIComponent(term)`.
2. `src/hooks/useExternalRecipes.js`: añadir `query`/`setQuery`, constantes `DEBOUNCE_MS`/
   `MIN_QUERY_LENGTH`, cambiar `loadList(term, signal)`, sustituir el efecto de montaje por el efecto
   con debounce + abort + rama `"prompt"`, ajustar `retryList`, exponer `query`/`setQuery`.
3. `src/components/ExternalRecipes.jsx`: consumir `query`/`setQuery`, añadir el `<input>`, añadir la
   rama `"prompt"` y cambiar la rama de listado vacío a `external.noResults`.
4. `src/i18n/messages.js`: añadir las 4 claves nuevas (es/en) y eliminar `external.empty` de ambos.
5. `src/lib/mealdb.fetch.test.js`: ajustar el test de propagación de `signal`, añadir el test de
   término codificado, dejar el resto intacto.

## Verificación

- **`npm test`** en verde, incluyendo:
  - los tests de `mealdb.fetch.test.js` (URL por defecto sigue `search.php?s=bread`, propagación de
    signal con la nueva firma, término libre codificado, errores);
  - la **paridad de claves es/en** de `translate.test.js` (tras añadir 4 y quitar `external.empty`).
- **`npm run build`** sin regresiones.
- **`npm run dev`** (http://localhost:5173), sección "Explorar más panes", con la pestaña Network
  abierta:
  1. Al cargar: input pre-rellenado con "bread" y grid de panes (una sola petición `search.php?s=bread`).
  2. Escribir "focaccia": tras ~400 ms de pausa se dispara **una** petición; teclear rápido no
     genera una petición por letra (se ven canceladas/omitidas en Network).
  3. Borrar el input hasta 0–1 caracteres: aparece el aviso `external.typePrompt`, **sin** petición.
  4. Buscar algo inexistente (p. ej. "zzzzz"): mensaje `external.noResults` con el término.
  5. Simular error (offline en DevTools) y comprobar que sale `external.listError` + botón
     Reintentar, y que Reintentar relanza la búsqueda del término actual.
  6. Seleccionar un pan y ver su detalle sigue funcionando (sin cambios).
  7. Toggle de idioma (es/en) y de tema (claro/oscuro): placeholder/avisos traducen y el input
     respeta la paleta. Sin errores en consola.

## Fuera de alcance

- Importar/convertir recetas externas al calculador principal ni a g/ml ni a `pct` → **B-12**.
- Favoritos / persistencia del término de búsqueda en `localStorage` → **B-13**.
- Cambiar de proveedor de API (sigue TheMealDB, decisión de B-06).
- Auto-limpiar la selección de detalle al cambiar de búsqueda (el detalle persiste; no es requisito).
- Paginación o filtros avanzados del listado externo.
- Traducir el contenido de las recetas de TheMealDB (es solo inglés en origen).
