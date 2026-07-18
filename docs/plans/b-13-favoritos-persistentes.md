# B-13 — Favoritos persistentes (recetas locales + externas)

> Plan para el `implementador` (Sonnet 5). Parte 3/4 del grupo "Evolución recetas externas +
> favoritos" (B-11 → B-12 → **B-13** → B-14). Habilita B-14, que **no** se aborda aquí.

## Contexto

Hoy no hay forma de marcar una receta como favorita. El usuario quiere señalar sus recetas
preferidas — tanto las **locales** (`src/data/recipes.js`, `id` slug estable como `baguette`,
`molde-7030`) como las **externas** de TheMealDB (B-06/B-11/B-12, `id` = `idMeal`, string numérico
como `"52977"`) — y que esas marcas **sobrevivan entre sesiones** vía `localStorage`.

B-13 se limita a **marcar/desmarcar y persistir**. No reordena el selector ni añade una "sección de
favoritos" (eso es B-14). La marca se manifiesta como el estado visual de una estrella en las
tarjetas/pestañas que ya existen.

### Decisiones de diseño (resueltas en este plan)

**1. Esquema de almacenamiento — una sola clave, lista de registros con discriminador `kind`.**
Se usa **una** clave `localStorage`: `panapp-favorites`, cuyo valor es un array JSON de registros:

- Local: `{ "kind": "local", "id": "baguette" }`
- Externa: `{ "kind": "mealdb", "id": "52977", "name": "Bread pudding", "thumb": "https://…" }`

La pertenencia se comprueba con una **clave compuesta** `` `${kind}:${id}` ``. Ese discriminador
`kind` **es** el namespace: separa el espacio de slugs locales del de `idMeal` numéricos, de modo
que aunque algún día un `idMeal` coincidiera literalmente con un slug local, no colisionan. Se
prefiere un array de **objetos** (no una lista plana de strings) porque las externas necesitan
llevar una copia mínima inline (ver decisión 2), cosa que una lista de IDs no permite. El orden de
inserción se conserva de forma natural (lo aprovechará B-14; B-13 no depende del orden).

**2. Identidad de una receta externa favorita — copia mínima inline (id + name + thumb).**
Una local vive completa en `recipes.js`; basta su `id`. Una externa **no** vive en el repo: solo la
conocemos mientras está en los resultados de búsqueda o en el detalle abierto. Por eso el registro
de favorito externo guarda una **copia mínima** (`id`, `name`, `thumb`) tomada de la tarjeta/detalle
en el momento de marcar. Justificación:

- TheMealDB **no** tiene un endpoint de "traer estos N por id" ni una categoría "Bread"; el listado
  se obtiene por término de búsqueda. Un favorito podría **dejar de aparecer** en la búsqueda
  `"bread"` y volverse irrecuperable si solo guardáramos el `id`.
- Guardar `name`+`thumb` permite que B-14 pinte la tira de favoritos externos **sin red**.
- El **detalle completo** (ingredientes/pasos) se sigue pidiendo **a demanda** al abrir la receta,
  reutilizando el camino actual (`selectRecipe` → `fetchMealDetail`). No se guarda el detalle pesado.

**3. `usePersistentState` — NO se introduce el helper genérico en B-13.** Se evaluó el código real
de los tres sitios que persisten hoy y la conclusión es que **no** conviene unificar ahora:

- `useTheme` y `useI18n`: además de persistir, tienen efectos de DOM propios (`dataset.theme`,
  `meta[theme-color]`, `document.lang`, `document.title`) y una resolución inicial con
  `matchMedia`/`navigator.language`. No son "un valor plano persistido".
- `useRecipeScaling`: dos valores con **precedencia de URL** (`parseShareParams`), validación contra
  `RECIPES`, rango de peso y limpieza "de un solo uso" de la barra de direcciones. Muy especializado.

Un helper que absorbiera los cuatro casos necesitaría tantas opciones/callbacks que sería tan
complejo como lo que reemplaza, y retrofitearlo tocaría código ya verificado E2E (B-03/B-04/B-07)
sin ningún beneficio funcional. Además, favoritos es un caso distinto (lista/JSON, sin efectos de
DOM, sin precedencia de URL), no "casi idéntico" a los otros: una abstracción para un único
consumidor nuevo sería prematura. **Decisión:** persistencia **inline** en el nuevo hook
`useFavorites`, replicando el patrón ya probado de `useRecipeScaling` (init perezoso validado +
`try/catch` + `useEffect` que guarda al cambiar). La **lógica de lista pura** (pertenencia,
alta/baja, saneado de lo leído) **sí** se extrae a un módulo puro testeable (`src/lib/favorites.js`),
siguiendo la convención del proyecto "lógica en `src/lib/` con tests". Se deja anotado que si más
adelante aparece un 2.º consumidor de "valor-lista JSON persistido", ahí sí valdría el helper.

**4. UI del toggle — estrella accesible, patrón B-04/B-06.** Botón-estrella icónico
(`★` activo / `☆` inactivo) con `aria-pressed` + `aria-label` dinámico (mismo patrón que el toggle
de tema de B-04 y el `aria-pressed` de las tarjetas externas de B-06). Alcance de colocación:

- **Recetas locales**: una estrella por pestaña en `RecipeSelector.jsx`.
- **Recetas externas**: una estrella por tarjeta en `ExternalRecipes.jsx` **y** una en el panel de
  detalle del pan seleccionado.
- **Receta importada**: una estrella en la cabecera de `ImportedRecipe.jsx` (el objeto `imported`
  ya trae `id`/`name`/`thumb`, ver `importMealRecipe`).

> **Cuidado con HTML inválido:** tanto la pestaña de `RecipeSelector` como la tarjeta de
> `ExternalRecipes` **ya son `<button>`** (selección / `aria-pressed`). **No** se puede anidar un
> `<button>` de favorito dentro. Hay que **envolver** cada uno en un contenedor `position: relative`
> y colocar la estrella como **hermano** absolutamente posicionado en una esquina. El botón de
> selección conserva su estilo actual; el wrapper solo posiciona la estrella y pasa a ser el item de
> flex/grid (hereda el `minWidth`/columna que hoy tiene el botón).

---

## Archivos a tocar / crear

| Archivo | Cambio |
|---|---|
| `src/lib/favorites.js` | **NUEVO.** Lógica pura de la lista de favoritos (sin React). |
| `src/lib/favorites.test.js` | **NUEVO.** Tests Vitest del módulo puro. |
| `src/hooks/useFavorites.js` | **NUEVO.** Hook: estado + persistencia inline (clave `panapp-favorites`). |
| `src/App.jsx` | Instanciar `useFavorites()` y pasar `isFavorite`/`toggleFavorite` a los 3 componentes. |
| `src/components/RecipeSelector.jsx` | Estrella por pestaña (con wrapper anti-anidado). Nuevas props. |
| `src/components/ExternalRecipes.jsx` | Estrella por tarjeta + en el detalle. Nuevas props. |
| `src/components/ImportedRecipe.jsx` | Estrella en la cabecera. Nuevas props. |
| `src/i18n/messages.js` | 2 claves nuevas (es/en), paridad obligatoria. |
| `src/styles/global.css` | Clase `.fav-toggle` (transición + `:focus-visible`) + entrada en `prefers-reduced-motion`. |

**No se tocan:** `src/lib/baker.js`, `src/data/recipes.js`, `src/lib/mealdb.js`,
`src/lib/importRecipe.js`, `src/hooks/useRecipeScaling.js`, `useTheme.js`, `useI18n.js`,
`useExternalRecipes.js`, `useImportedRecipe.js`.

## Reutilización (lo que ya existe)

- **Patrón de persistencia**: init perezoso validado + `try/catch` + `useEffect` de guardado, tal
  cual en `src/hooks/useRecipeScaling.js` (claves `panapp-recipe`/`panapp-weight`). Copiar ese
  patrón, no inventar otro.
- **Patrón de toggle accesible**: `aria-pressed` + `aria-label` dinámico del botón de tema en
  `src/components/Header.jsx` (B-04) y el `aria-pressed` de las tarjetas de `ExternalRecipes.jsx`
  (B-06). El glyph de la estrella va con `aria-hidden="true"`.
- **Tokens de diseño**: colores/fuentes/`radius` desde `src/styles/theme.js` (`colors.eyebrow`,
  `colors.faint`, `colors.surface`, `radius.pill`, etc.). Sin colores hardcodeados sueltos.
- **Copia mínima externa**: `name`/`thumb` ya disponibles en el shape de `normalizeBreadList`
  (`{ id, name, thumb }`), `normalizeMealDetail` y el objeto `imported` de `importMealRecipe`.
- **i18n**: `translate()` con interpolación `{name}` y el hook `useI18n` ya distribuido por
  prop-drilling (`t`) a todos los componentes.

---

## Pasos de implementación

### 1. Módulo puro `src/lib/favorites.js`
Sin dependencias de React. Exportar:

- `favoriteKey(kind, id)` → `` `${kind}:${String(id)}` ``.
- `isFavorite(list, kind, id)` → `boolean` (busca por `favoriteKey`).
- `toggleFavorite(list, record)` → **nueva** lista: si ya existe un item con el mismo
  `kind`+`id`, lo **quita**; si no, lo **añade** al final. `record` es
  `{ kind: "local", id }` o `{ kind: "mealdb", id, name, thumb }`. No mutar la lista de entrada.
- `sanitizeFavorites(raw)` → dado lo leído de `localStorage` (ya `JSON.parse`-ado), devolver un
  array **válido**: descartar lo que no sea objeto, sin `kind` en `{"local","mealdb"}`, sin `id`, o
  `mealdb` sin `name` (string). Normalizar `id` a string. Nunca lanzar; si `raw` no es array → `[]`.

Mantener funciones pequeñas y puras (fácil de testear).

### 2. Tests `src/lib/favorites.test.js`
Cubrir: `favoriteKey` (namespace evita colisión slug vs idMeal numérico igual), `isFavorite`
presente/ausente, `toggleFavorite` alta y baja (y que no muta la entrada), `sanitizeFavorites`
(array vacío, no-array, registros malformados descartados, `mealdb` sin `name` descartado, `id`
numérico normalizado a string). Sin dependencias nuevas.

### 3. Hook `src/hooks/useFavorites.js`
- `const STORAGE_KEY = "panapp-favorites";`
- `getInitialFavorites()`: `try { JSON.parse(localStorage.getItem(KEY)) } catch → null`, luego
  `sanitizeFavorites(parsed)`. Comentario aclarando el `try/catch` (modo privado).
- Estado con init perezoso: `useState(getInitialFavorites)`.
- `useEffect([favorites])`: `try { localStorage.setItem(KEY, JSON.stringify(favorites)) } catch {}`.
- API devuelta:
  - `isFavorite: (kind, id) => isFavorite(favorites, kind, id)`
  - `toggleFavorite: (record) => setFavorites((l) => toggleFavorite(l, record))`
  - (`favorites` no es necesario exponerlo en B-13; exponerlo es opcional/inocuo para B-14.)

### 4. Cableado en `src/App.jsx`
- `const { isFavorite, toggleFavorite } = useFavorites();`
- Pasar `isFavorite={isFavorite} onToggleFavorite={toggleFavorite}` a `RecipeSelector`,
  `ExternalRecipes` e `ImportedRecipe`. No cambiar `handleSelectLocal`/`handleImport`.

### 5. `RecipeSelector.jsx` — estrella por pestaña
- Nuevas props: `isFavorite`, `onToggleFavorite`.
- Envolver cada pestaña en un `<div style={{ position: "relative", minWidth: 150 }}>` (mover ahí el
  `minWidth` que hoy está en el botón; el botón pasa a `width: "100%"`). El `<button className="recipe-tab">`
  se conserva con su estilo actual (dejar `paddingRight` holgado para no solapar el texto con la estrella).
- Añadir, como **hermano** del botón, la estrella:
  ```jsx
  const fav = isFavorite("local", r.id);
  <button
    type="button"
    className="fav-toggle"
    aria-pressed={fav}
    aria-label={fav ? t("favorite.removeAria", { name: r.name }) : t("favorite.addAria", { name: r.name })}
    onClick={() => onToggleFavorite({ kind: "local", id: r.id })}
    style={{ position: "absolute", top: 8, right: 8, /* icon-button, ver §8 */ }}
  >
    <span aria-hidden="true">{fav ? "★" : "☆"}</span>
  </button>
  ```
- La estrella **no** debe disparar la selección (es hermano, no está dentro del botón de selección;
  al no anidar no hay propagación al `onSelect`).

### 6. `ExternalRecipes.jsx` — estrella por tarjeta y en el detalle
- Nuevas props: `isFavorite`, `onToggleFavorite`.
- **Tarjetas** (`list.map`): igual patrón anti-anidado. Envolver la `<button className="external-card">`
  en un `<div style={{ position: "relative" }}>` (el wrapper toma la celda del grid). Estrella
  hermana, esquina superior derecha, sobre el thumb:
  ```jsx
  onClick={() => onToggleFavorite({ kind: "mealdb", id: m.id, name: m.name, thumb: m.thumb })}
  aria-pressed={isFavorite("mealdb", m.id)}
  ```
- **Panel de detalle** (`detailStatus === "ready" && detail`): una estrella junto al `<h3>` del
  nombre, con `{ kind: "mealdb", id: detail.id, name: detail.name, thumb: detail.thumb }`. Aquí el
  detalle **no** es un `<button>`, así que puede ir inline sin wrapper especial.

### 7. `ImportedRecipe.jsx` — estrella en la cabecera
- Nuevas props: `isFavorite`, `onToggleFavorite`.
- En el bloque de cabecera (junto al botón `imported.clear`), añadir la estrella con
  `{ kind: "mealdb", id: recipe.id, name: recipe.name, thumb: recipe.thumb }` (el objeto `imported`
  ya trae esos campos). `aria-pressed={isFavorite("mealdb", recipe.id)}`.

### 8. Estilos e i18n
- **`src/i18n/messages.js`** — añadir en **es** y **en** (paridad obligatoria; hay test de paridad):
  - `favorite.addAria`: es `"Añadir {name} a favoritos"` · en `"Add {name} to favorites"`
  - `favorite.removeAria`: es `"Quitar {name} de favoritos"` · en `"Remove {name} from favorites"`
- **`src/styles/global.css`** — clase `.fav-toggle`: botón icónico circular pequeño
  (`background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 999px`,
  ~28px, `cursor: pointer`, glyph con `line-height:1`), `transition` suave y regla
  `.fav-toggle:focus-visible { box-shadow: var(--shadow-tab); }`. Añadir `.fav-toggle { transition: none; }`
  dentro del bloque `@media (prefers-reduced-motion: reduce)`. Color del glyph: activo con
  `var(--color-eyebrow)` (o el `accent` de la receta local si se pasa como prop — opcional), inactivo
  `var(--color-faint)`. Mantener la identidad visual terracota/crema; no alterar el resto del aspecto.

---

## Verificación end-to-end

1. `npm test` → **toda la suite existente en verde** (72/72 actuales) **más** los nuevos tests de
   `favorites.test.js`. Ningún test previo debe cambiar (no se tocó lógica existente).
2. `npm run build` → sin regresiones (genera `dist/` con `sw.js` + manifest).
3. `npm run dev` (http://localhost:5173) y comprobar en el navegador:
   - **Local**: marcar la estrella de una receta local → pasa a `★`. Recargar → **sigue** marcada
     (persistencia). Desmarcar → vuelve a `☆` y recargar lo mantiene desmarcado.
   - **Externa**: buscar `"bread"`, marcar la estrella de una tarjeta → `★`. En DevTools →
     Application → Local Storage → `panapp-favorites`, confirmar que el registro externo guardó
     `{ kind:"mealdb", id, name, thumb }` (copia mínima, **no** ingredientes/pasos). Recargar y
     volver a buscar `"bread"`: la tarjeta reaparece con la estrella **marcada** (la pertenencia
     sobrevivió al reload sin depender de re-pedir detalle).
   - **Detalle externo** e **importada**: la estrella refleja el mismo estado que la tarjeta para el
     mismo `id` (mismo `kind:id`), y togglear en uno se ve reflejado en el otro.
   - **Sin colisión**: comprobar mentalmente/con datos que un `id` local y uno externo con el mismo
     string no se pisan (claves `local:x` vs `mealdb:x`).
   - **Accesibilidad**: la estrella tiene `aria-pressed` correcto y `aria-label` que cambia entre
     "Añadir…/Quitar…"; togglear con teclado (foco + Enter/Espacio) funciona y **no** dispara la
     selección de la receta.
   - **Sin `localStorage`** (modo privado estricto / bloquear la API): la app **no** crashea; los
     favoritos simplemente no persisten.
   - Sin errores en consola.

## Fuera de alcance (esto es B-14 / futuro)

- **Reordenar el selector** para mostrar las favoritas primero: es **B-14** y **no** se hace aquí.
  B-13 solo marca/desmarca y persiste; no cambia el orden de `RecipeSelector` ni de las tarjetas
  externas, ni la interacción con el filtro de B-05.
- **Sección/tira dedicada de "Favoritos"** (pintar los favoritos externos aunque no estén en la
  búsqueda actual): no se añade en B-13. La copia mínima (`name`+`thumb`) se guarda **ahora** como
  groundwork para que B-14 pueda pintarla sin red, pero el render de esa lista es de B-14. Limitación
  conocida y aceptada de B-13: un favorito externo solo muestra su estrella marcada mientras aparece
  en los resultados de búsqueda / esté abierto en detalle.
- **Helper genérico `usePersistentState`** y retrofit de `useTheme`/`useI18n`/`useRecipeScaling`
  (ver decisión 3): descartado por ahora.
- **Traducir el contenido** de recetas (locales o externas): fuera de alcance como en B-07.
