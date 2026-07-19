# B-18 — Crear/gestionar recetas locales del usuario (núcleo)

> Plan para el `implementador` (Sonnet 5). No modifica lógica del dominio (`scaleRecipe`/`formatAmount`
> quedan intactas). Captura por **`pct` directo** (la derivación desde g/ml es B-19, fuera de alcance).

## Contexto

Hoy las 6 recetas "de la casa" están hardcodeadas en `src/data/recipes.js` (`RECIPES`). El usuario
pidió poder **crear, editar y borrar sus propias recetas desde la UI**, sin tocar código. La app es
estática (Netlify, sin backend), así que las recetas del usuario deben persistir en `localStorage`
(precedente: `panapp-recipe`/`panapp-weight` en B-03, `panapp-favorites` en B-13).

El objetivo del núcleo (B-18) es que una receta custom sea **indistinguible en comportamiento** de
una built-in: se escala con `scaleRecipe`, aparece en el selector de lista (B-17), se puede buscar
(B-05), marcar como favorita (B-13) y ordena por favoritas al abrir (B-14). Solo se diferencia en la
UI por llevar controles de **editar/borrar** (que las built-in no tienen).

### Hechos verificados en el código (base de las decisiones)

- **`scaleRecipe` (`src/lib/baker.js`) NO asume que el primer ingrediente sea harina=100%.** Suma
  todos los `pct` y reparte proporcionalmente (`factor = targetWeight / totalPct`). Por tanto la
  convención "harina = 100%" es **blanda**: no hay que forzarla técnicamente, pero el formulario la
  sugiere como valor inicial de la primera fila.
- **`totalFlour` / `baseYieldG` NO se consumen en `src/`** (solo aparecen en `recipes.js` y en
  `BreadApp.jsx`, que está fuera del build). Ningún componente ni `baker.js` los lee. → Las custom
  **no necesitan `totalFlour`**; se omite del shape para no pedir un dato inútil al usuario.
- **`favorites.js` tiene `VALID_KINDS = new Set(["local", "mealdb"])`** y namespacea por `${kind}:${id}`.
  Las built-in usan `kind: "local"`. Para las custom se añade un **`kind` nuevo `"custom"`** (evita
  cualquier colisión de ids entre slugs built-in y ids generados, y deja el filtro/orden por
  favoritas funcionando sin cambios de lógica).
- **`useRecipeScaling` (`src/hooks/useRecipeScaling.js`) hoy busca `recipe` solo en `RECIPES`** y
  valida el id inicial contra `RECIPES`. Debe pasar a operar sobre la **lista combinada**
  (built-in + custom), y manejar el caso "la receta activa fue borrada".
- **`RecipeSelector.jsx` (B-17)** ya recibe `recipes` por prop y tiene `orderedRecipes` (B-14, orden
  congelado al montar), `filtered` (B-05) y el toggle de favorito hermano (B-13) hardcodeando
  `"local"`. Hay que: (a) pasarle la lista combinada, (b) hacer que el `kind` de favorito dependa de
  si la receta es custom, (c) añadir controles editar/borrar solo en las custom.

---

## Decisiones de diseño (las 6 que delega el backlog)

1. **Captura por `pct` directo.** El formulario pide para cada ingrediente: nombre, `pct` (número),
   unidad (`g`/`ml`). La primera fila arranca con `{ name: "", pct: 100, unit: "g" }` como sugerencia
   de harina, pero es editable/eliminable (no se fuerza). Filas de ingredientes y pasos se
   añaden/quitan dinámicamente. Conversión desde g/ml → **fuera de alcance (B-19)**.
2. **Persistencia.** Nueva clave `panapp-custom-recipes` con un **array** de recetas custom en el
   **mismo shape que `RECIPES`** + flag `custom: true` (para poder reutilizar `scaleRecipe`/
   `formatAmount` sin adaptarlos y distinguirlas en UI). La lista combinada
   `allRecipes = [...RECIPES, ...customRecipes]` se construye en `App.jsx` y se inyecta a los hooks/
   componentes que hoy usan `RECIPES`, **sin duplicar** `orderedRecipes`/`filtered` (siguen viviendo
   en `RecipeSelector`).
3. **Integración con features.** Favoritos con `kind: "custom"` (namespace nuevo). Búsqueda (B-05) y
   orden por favoritas (B-14) operan igual porque trabajan sobre la prop `recipes`. Compartir por URL
   (B-08) queda **fuera de alcance** (es B-20): el `ShareButton` seguirá construyendo enlaces solo con
   id+peso, que no reconstruyen una custom en otro navegador — ver "Fuera de alcance".
4. **Edición y borrado: SÍ.** Sin edición, un error de tipeo sería irrecuperable. Controles ✏️/🗑️
   junto a la estrella, **solo en filas custom**. Borrar pide confirmación (`window.confirm`).
   Las 6 built-in **no** tienen estos controles.
5. **Validación** (pura, testeable): nombre no vacío y **no duplicado contra el universo completo**
   (built-in + custom, normalizado sin acentos/mayúsculas — al editar, se excluye la propia receta);
   al menos **un ingrediente** con nombre no vacío y `pct > 0`; al menos **un paso** no vacío. Errores
   con `role="alert"`.
6. **UI de entrada: panel inline expandible** (no modal — el proyecto no usa modales). Un botón
   "＋ Nueva receta" sobre el selector despliega `RecipeForm` en la misma columna. Editar reusa el
   mismo formulario prellenado. Tokens de `theme.js`, paleta terracota/crema, Fraunces/Inter, labels
   asociados y `aria-*` como en el resto.

---

## Archivos a tocar / crear

### Nuevos

- **`src/lib/customRecipes.js`** (lógica pura, sin React — patrón `favorites.js`/`shareUrl.js`).
- **`src/lib/customRecipes.test.js`** (Vitest — obligatorio para lógica nueva, CLAUDE.md).
- **`src/hooks/useCustomRecipes.js`** (estado + persistencia `panapp-custom-recipes` + CRUD).
- **`src/components/RecipeForm.jsx`** (formulario de captura/edición, presentacional).

### Modificados

- **`src/hooks/useRecipeScaling.js`** — aceptar la lista combinada; manejar receta activa borrada.
- **`src/App.jsx`** — cablear `useCustomRecipes`, construir `allRecipes`, pasar CRUD al selector,
  montar `RecipeForm`.
- **`src/components/RecipeSelector.jsx`** — `kind` de favorito según `r.custom`; botón "Nueva
  receta"; controles editar/borrar en filas custom.
- **`src/lib/favorites.js`** — añadir `"custom"` a `VALID_KINDS` y sanear ese `kind` (id, sin
  `name`/`thumb`).
- **`src/lib/favorites.test.js`** — cubrir el nuevo `kind: "custom"`.
- **`src/i18n/messages.js`** — claves nuevas es/en (paridad exigida por `translate.test.js`).
- **`src/styles/global.css`** — clases del formulario y de los controles editar/borrar.

---

## Shape de datos exacto

### Receta custom (en `panapp-custom-recipes`, array)

```js
{
  id: "custom-1737158400000-a1b9",   // string único (ver createCustomId)
  custom: true,                       // flag discriminador (las built-in no lo tienen)
  name: "Pan de la casa",             // requerido, no vacío, no duplicado
  subtitle: "",                       // opcional (default "")
  accent: "#C17F3E",                  // color de acento; ver paleta más abajo
  ingredients: [
    { id: "ing-1", name: "Harina blanca", pct: 100, unit: "g" },
    { id: "ing-2", name: "Agua",          pct: 65,  unit: "ml" },
    { id: "ing-3", name: "Sal",           pct: 2,   unit: "g" },
  ],
  steps: [ "Mezclar…", "Amasar…" ],   // array de strings no vacíos
}
```

- **Compatibilidad con `scaleRecipe`**: idéntico shape a `RECIPES` en lo que consume `baker.js`
  (`ingredients[].pct`, `.name`, `.unit`, `.id`) y los componentes (`name`, `subtitle`, `accent`,
  `steps`). `totalFlour` se omite deliberadamente (nadie lo lee).
- **`ingredients[].id`**: debe ser único **dentro de la receta** (lo usa `IngredientList` como `key`
  del `.map`). Generarlos secuencialmente al construir la receta (`ing-1`, `ing-2`, …) es suficiente.
- **`accent`**: seleccionable de una paleta fija (reusa los tonos terracota del proyecto) para no
  meter un color picker. Paleta sugerida (los mismos acentos ya usados en `recipes.js`):
  `["#C17F3E", "#B5652E", "#D9A441", "#A66B3F", "#CE8A3D", "#B87333"]`. Default: `"#C17F3E"`.

### Favorito de una custom (en `panapp-favorites`)

```js
{ kind: "custom", id: "custom-1737158400000-a1b9" }
```

Mismo formato mínimo que `kind: "local"` (solo `kind` + `id`; sin `name`/`thumb`).

---

## `src/lib/customRecipes.js` — API pura a implementar

```js
// Acentos permitidos (identidad terracota del proyecto).
export const ACCENTS = ["#C17F3E", "#B5652E", "#D9A441", "#A66B3F", "#CE8A3D", "#B87333"];

// Normaliza para comparación de nombres duplicados: trim + minúsculas + sin acentos.
// Reutilizar EXACTAMENTE el criterio de RecipeSelector.normalize (NFD + descarte diacríticos).
export function normalizeName(str) { /* … */ }

// Id único y estable para una receta custom.
export function createCustomId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// Valida un "draft" del formulario. Devuelve { valid: boolean, errors: string[] } donde cada
// error es una CLAVE i18n (no texto), para que el componente la traduzca con t().
// existingNames: array de nombres normalizados contra los que comprobar duplicados
//   (built-in + custom); al EDITAR, el llamador excluye el nombre de la propia receta.
export function validateDraft(draft, existingNames) {
  const errors = [];
  const name = (draft.name ?? "").trim();
  if (!name) errors.push("form.errorNameRequired");
  else if (existingNames.includes(normalizeName(name))) errors.push("form.errorNameDuplicate");

  const validIngredients = (draft.ingredients ?? []).filter(
    (i) => (i.name ?? "").trim() && Number(i.pct) > 0
  );
  if (validIngredients.length === 0) errors.push("form.errorNoIngredients");

  const validSteps = (draft.steps ?? []).filter((s) => (s ?? "").trim());
  if (validSteps.length === 0) errors.push("form.errorNoSteps");

  return { valid: errors.length === 0, errors };
}

// Convierte un draft VÁLIDO en una receta custom persistible (limpia filas vacías, castea pct a
// Number, asigna ids de ingrediente secuenciales, respeta id/accent existentes al editar).
// Si draft.id existe → conserva id (edición); si no → createCustomId() (alta).
export function draftToRecipe(draft) { /* … */ }

// Convierte una receta custom a draft editable para prellenar el formulario (inversa de arriba).
export function recipeToDraft(recipe) { /* … */ }

// Sanea lo leído de localStorage (ya JSON.parse-ado): descarta recetas malformadas, nunca lanza,
// devuelve [] si no es array. Cada receta válida DEBE tener: id string no vacío, name string no
// vacío, ingredients array con ≥1 item {name, pct>0, unit in ["g","ml"]}, steps array con ≥1
// string no vacío. Fuerza custom:true, subtitle:"" si falta, accent válido (si no está en ACCENTS
// → ACCENTS[0]).
export function sanitizeCustomRecipes(raw) { /* … */ }
```

### Tests mínimos (`customRecipes.test.js`)

- `validateDraft`: nombre vacío → error; nombre duplicado (case/acentos-insensible) → error; editar
  con el mismo nombre propio excluido → OK; 0 ingredientes válidos (todos vacíos o pct≤0) → error;
  pct negativo/0 no cuenta como válido → error; 0 pasos → error; draft correcto → `valid:true`.
- `draftToRecipe`: castea `pct` string→Number, descarta filas vacías, asigna `ing-1..n`, mantiene id
  al editar y genera uno nuevo en alta, fuerza `custom:true`.
- `sanitizeCustomRecipes`: no-array → `[]`; descarta receta sin ingredientes válidos; descarta name
  vacío; corrige accent inválido a `ACCENTS[0]`; ignora items no-objeto sin lanzar.
- `createCustomId`: prefijo `custom-` y unicidad razonable (dos llamadas ≠).

---

## `src/hooks/useCustomRecipes.js` — a implementar

Calcado del patrón de `useFavorites.js` (lectura inicial validada con `try/catch`, persistencia con
`useEffect`).

```js
const STORAGE_KEY = "panapp-custom-recipes";

function getInitial() {
  try { return sanitizeCustomRecipes(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return []; }
}

export function useCustomRecipes() {
  const [customRecipes, setCustomRecipes] = useState(getInitial);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(customRecipes)); } catch {}
  }, [customRecipes]);

  return {
    customRecipes,
    createRecipe: (recipe) => setCustomRecipes((l) => [...l, recipe]),        // recipe ya pasó draftToRecipe
    updateRecipe: (recipe) => setCustomRecipes((l) => l.map((r) => r.id === recipe.id ? recipe : r)),
    deleteRecipe: (id) => setCustomRecipes((l) => l.filter((r) => r.id !== id)),
  };
}
```

> Nota: el hook recibe recetas **ya convertidas** (`draftToRecipe`) y ya validadas; la validación vive
> en `RecipeForm` (que llama a `validateDraft`). Mantener el hook "tonto" en cuanto a reglas.

---

## Cambios en `src/hooks/useRecipeScaling.js`

Hoy asume `RECIPES` global. Refactor mínimo para operar sobre la lista combinada:

1. Firma: `export function useRecipeScaling(recipes = RECIPES)`. El resto de la lógica de peso/URL/
   persistencia queda igual (los límites de peso y `parseShareParams` no cambian).
2. `getInitialRecipeId` y las validaciones de id que hoy hacen `RECIPES.some(...)` deben validar
   contra **`recipes`** (la lista combinada que llega por argumento). Como los inicializadores
   perezosos corren una sola vez al montar, referenciar `recipes` del primer render es suficiente
   (las custom ya estarán cargadas: `useCustomRecipes` usa init perezoso síncrono desde localStorage,
   igual que este hook).
   - Cuidado: `parseShareParams(..., { recipeIds })` debe recibir `recipes.map(r => r.id)` (incluye
     custom). Una URL con id de una custom que existe en ese navegador seguirá funcionando; una que
     no exista degrada a localStorage/default como ya hace hoy.
3. **Receta activa borrada / no encontrada**: `recipe` se calcula con `recipes.find(r => r.id ===
   activeId)`. Si el usuario borra la receta activa, `find` devuelve `undefined` y `scaleRecipe`
   crasharía. Añadir fallback:
   ```js
   const recipe = useMemo(
     () => recipes.find((r) => r.id === activeId) ?? recipes[0],
     [recipes, activeId]
   );
   ```
   `recipes[0]` es siempre una built-in (`RECIPES[0]`), así que nunca es `undefined`. **No** cambiar
   `activeId` dentro del render; el fallback solo afecta el objeto usado para escalar/mostrar. (Opcional
   de bajo riesgo: en `App`, al borrar la receta activa, llamar `setActiveId(RECIPES[0].id)` para
   sincronizar la selección visible — recomendado, ver App.)
4. `recipes` que devuelve el hook: seguir devolviéndolo (ahora es la lista combinada) para que
   `RecipeSelector` la reciba desde `App` sin cambios de contrato.

> El `useMemo` de `scaled` ya depende de `recipe`; al editar la receta activa, el objeto cambia de
> identidad (nuevo array de `useCustomRecipes`) y `scaled` se recalcula solo. Correcto.

---

## Cambios en `src/App.jsx`

```jsx
const { customRecipes, createRecipe, updateRecipe, deleteRecipe } = useCustomRecipes();
const allRecipes = useMemo(() => [...RECIPES, ...customRecipes], [customRecipes]);
const { recipes, activeId, setActiveId, /* … */ } = useRecipeScaling(allRecipes);
```

- Importar `RECIPES` y `useMemo` (hoy `App` no los importa directamente; `RECIPES` vive en el hook).
- Estado de UI del formulario en `App` (o en `RecipeSelector`; se recomienda **en `App`** para poder
  situar el panel donde convenga y coordinar con `setActiveId`):
  ```jsx
  const [formState, setFormState] = useState(null);
  // null = cerrado | { mode: "create" } | { mode: "edit", recipe }
  ```
- Handlers:
  - `onNewRecipe = () => setFormState({ mode: "create" })`
  - `onEditRecipe = (recipe) => setFormState({ mode: "edit", recipe })`
  - `onDeleteRecipe = (id) => { deleteRecipe(id); if (id === activeId) setActiveId(RECIPES[0].id); }`
  - `onSubmitForm = (recipe) => { formState.mode === "edit" ? updateRecipe(recipe) : createRecipe(recipe); setActiveId(recipe.id); setFormState(null); }`
  - `onCancelForm = () => setFormState(null)`
- Montar `<RecipeForm>` condicionalmente (cuando `formState` no es `null`), **encima o debajo del
  `RecipeSelector`** en la misma columna. Pasarle: `mode`, `initialRecipe` (para editar),
  `existingNames` (nombres normalizados de `allRecipes`, excluyendo la propia al editar), `onSubmit`,
  `onCancel`, `t`.
- Pasar a `RecipeSelector` los nuevos props: `onNewRecipe`, `onEditRecipe`, `onDeleteRecipe`
  (además de los actuales; `recipes` ya es la combinada).

> `handleSelectLocal` (que limpia la importación) sigue igual; seleccionar una custom también debe
> limpiar la importada, así que reutiliza el mismo handler.

---

## Cambios en `src/components/RecipeSelector.jsx`

Mínimos y quirúrgicos; **no** duplicar `orderedRecipes`/`filtered`.

1. **`kind` de favorito por receta**: reemplazar los literales `"local"` por una derivación:
   ```js
   const favKind = r.custom ? "custom" : "local";
   const fav = isFavorite(favKind, r.id);
   // …
   onClick={() => onToggleFavorite({ kind: favKind, id: r.id })}
   ```
   Y en `orderedRecipes`, el `rank` debe usar el kind correcto:
   ```js
   const rank = (r) => (isFavorite(r.custom ? "custom" : "local", r.id) ? 0 : 1);
   ```
2. **Botón "Nueva receta"**: sobre el buscador (o junto a él), `<button type="button" className="touch"
   onClick={onNewRecipe}>` con texto `t("form.newRecipe")`. Estilo pill como `share-button`.
3. **Controles editar/borrar solo en custom**: dentro del `<li>`, cuando `r.custom`, renderizar dos
   botones hermanos (no anidados en el botón de fila, mismo motivo que la estrella en B-13) con
   `aria-label` traducido:
   - ✏️ `t("form.editAria", { name: r.name })` → `onEditRecipe(r)`
   - 🗑️ `t("form.deleteAria", { name: r.name })` → confirmar y `onDeleteRecipe(r.id)`
   Ubicarlos a la izquierda de la estrella. El padding derecho del botón de fila
   (`padding: "0.7rem 3.4rem 0.7rem 1rem"`) debe **ampliarse cuando la fila es custom** para dejar
   sitio a 3 controles (estrella + editar + borrar); usar un padding derecho mayor (p. ej. `6.4rem`)
   solo si `r.custom`. Posicionar los 3 controles en fila con `position:absolute; right` escalonados,
   o envolverlos en un contenedor flex absolutamente posicionado a la derecha (recomendado: un
   `<span>` wrapper `position:absolute; top:50%; right:10px; transform:translateY(-50%); display:flex;
   gap:6px`). Reutilizar la clase `.fav-toggle` para los tres (misma caja 28px / 44px táctil, misma
   estética) — añadir un modificador visual mínimo si se quiere, pero no es necesario.
4. **Confirmación de borrado**: usar `window.confirm(t("form.deleteConfirm", { name: r.name }))`
   antes de llamar `onDeleteRecipe`. (Simple, sin componente de diálogo nuevo; coherente con el uso
   de APIs del navegador en el proyecto — `navigator.clipboard`, etc.)

> El buscador (B-05) y el orden congelado (B-14) siguen intactos: operan sobre `orderedRecipes`, que
> ahora incluye custom porque `recipes` es la lista combinada. **Consecuencia esperada de B-14**: una
> receta custom recién creada aparece al final hasta el próximo reload (el orden se congela al montar
> el selector). Es coherente con el comportamiento ya documentado de B-14 y **aceptable** para el
> núcleo; no se cambia. Tras seleccionar la nueva receta (`setActiveId`), queda activa y visible aunque
> esté al final.

---

## `RecipeForm.jsx` — especificación

Componente presentacional. Props: `mode` (`"create"|"edit"`), `initialRecipe` (o `null`),
`existingNames` (array normalizado, ya excluye la propia al editar), `onSubmit(recipe)`, `onCancel()`,
`t`.

### Estado local (draft)

- Inicializar con `recipeToDraft(initialRecipe)` si edita, o un draft por defecto si crea:
  ```js
  {
    id: null,                // null en alta
    name: "", subtitle: "",
    accent: ACCENTS[0],
    ingredients: [{ name: "Harina", pct: 100, unit: "g" }],  // sugerencia editable
    steps: [""],
  }
  ```
- `pct` se guarda como **string** en el input (`type="number"`, `min="0"`, `step="0.1"`,
  `inputMode="decimal"`) y se castea a Number en `draftToRecipe`.

### Interacciones

- **Ingredientes**: lista de filas; cada fila = input nombre + input pct + `<select>` unidad (`g`/`ml`)
  + botón "quitar fila" (`aria-label` `t("form.removeIngredient")`). Botón "＋ Añadir ingrediente"
  (`t("form.addIngredient")`) agrega `{ name:"", pct:"", unit:"g" }`.
- **Pasos**: lista de `<textarea>`/`<input>` de una línea + botón quitar; "＋ Añadir paso"
  (`t("form.addStep")`).
- **Nombre** (requerido), **subtítulo** (opcional), **acento** (grupo de swatches como radios:
  `role="radiogroup"` o `<input type="radio">` con `aria-label` de color; el seleccionado con
  `aria-checked`/`aria-pressed`).
- **Guardar** (`t("form.save")`): llamar `validateDraft(draft, existingNames)`. Si `!valid`, poner
  `errors` en estado y renderizar un bloque `role="alert"` con la lista de mensajes traducidos
  (`errors.map(k => t(k))`); **no** cerrar. Si `valid`, `onSubmit(draftToRecipe(draft))`.
- **Cancelar** (`t("form.cancel")`): `onCancel()` sin guardar.

### Accesibilidad y estilo

- Cada control con `<label>` asociado (`htmlFor`/`id`) o `aria-label`. Bloque de errores con
  `role="alert"` (patrón de `ShareButton`). Un `role="status"` opcional al guardar con éxito no es
  necesario (el panel se cierra).
- Estilos inline con tokens de `theme.js` (`colors.surface`, `colors.border`, `radius.card`,
  `fonts.serif` para el título del panel, `fonts.sans` para inputs). Contenedor tipo tarjeta como
  `IngredientList` (`background: colors.surface`, `borderRadius: radius.card`, `boxShadow:
  shadow.cardSoft`, padding análogo). Inputs con la estética del `.recipe-search`
  (`border: 1px solid colors.border`, `borderRadius: radius.tab`, `fontSize:"1rem"` para evitar zoom
  iOS — ver B-16). Botones con `className="touch"`.
- Respetar `prefers-reduced-motion` implícitamente (no introducir animaciones nuevas fuera de las
  clases ya cubiertas).

---

## Cambios en `src/lib/favorites.js` (+ test)

- `VALID_KINDS = new Set(["local", "mealdb", "custom"])`.
- En `sanitizeFavorites`, tratar `"custom"` **igual que `"local"`** (guardar solo `{ kind, id:String(id) }`,
  sin exigir `name`/`thumb`). Ajustar la condición: la rama que exige `name` es solo para `"mealdb"`;
  la rama de guardado mínimo cubre `"local"` **y** `"custom"`.
- `favorites.test.js`: añadir casos de `kind:"custom"` (alta/baja, namespace no colisiona con `"local"`
  del mismo id, saneo conserva `{kind,id}` sin `name`).

---

## Claves i18n nuevas (`src/i18n/messages.js`, es + en — paridad obligatoria)

| clave | es | en |
|-------|----|----|
| `form.newRecipe` | `＋ Nueva receta` | `＋ New recipe` |
| `form.headingCreate` | `Nueva receta` | `New recipe` |
| `form.headingEdit` | `Editar receta` | `Edit recipe` |
| `form.nameLabel` | `Nombre` | `Name` |
| `form.subtitleLabel` | `Subtítulo (opcional)` | `Subtitle (optional)` |
| `form.accentLabel` | `Color` | `Color` |
| `form.ingredientsLabel` | `Ingredientes (% de panadero)` | `Ingredients (baker's %)` |
| `form.ingredientNameLabel` | `Ingrediente` | `Ingredient` |
| `form.pctLabel` | `%` | `%` |
| `form.unitLabel` | `Unidad` | `Unit` |
| `form.addIngredient` | `Añadir ingrediente` | `Add ingredient` |
| `form.removeIngredient` | `Quitar ingrediente` | `Remove ingredient` |
| `form.stepsLabel` | `Pasos` | `Steps` |
| `form.addStep` | `Añadir paso` | `Add step` |
| `form.removeStep` | `Quitar paso` | `Remove step` |
| `form.save` | `Guardar receta` | `Save recipe` |
| `form.cancel` | `Cancelar` | `Cancel` |
| `form.editAria` | `Editar {name}` | `Edit {name}` |
| `form.deleteAria` | `Borrar {name}` | `Delete {name}` |
| `form.deleteConfirm` | `¿Borrar la receta «{name}»? Esta acción no se puede deshacer.` | `Delete recipe "{name}"? This can't be undone.` |
| `form.errorNameRequired` | `El nombre es obligatorio.` | `Name is required.` |
| `form.errorNameDuplicate` | `Ya existe una receta con ese nombre.` | `A recipe with that name already exists.` |
| `form.errorNoIngredients` | `Añade al menos un ingrediente con % mayor que 0.` | `Add at least one ingredient with a % greater than 0.` |
| `form.errorNoSteps` | `Añade al menos un paso.` | `Add at least one step.` |

> Ajustar textos si se prefiere, pero **mantener las mismas claves en `es` y `en`** (el test de
> paridad `translate.test.js` falla si difieren). No romper claves existentes.

---

## `src/styles/global.css` — añadidos

- Clase(s) para inputs del formulario si se quiere hover/focus consistente (opcional; se puede reusar
  la estética inline). Recomendado: una regla `.recipe-form-input:focus-visible` análoga a
  `.recipe-search:focus-visible` (borde `--color-muted` + `--shadow-tab`).
- Asegurar que los botones editar/borrar reutilizan `.fav-toggle` (ya cubierta por `@media (pointer:
  coarse)` → 44px táctil, y por `prefers-reduced-motion`). Si se agrupan en un wrapper flex, no hace
  falta CSS nuevo para el táctil.
- No introducir colores hardcodeados: usar `var(--color-*)`.

---

## Pasos de implementación (orden sugerido)

1. **`src/lib/customRecipes.js`** con la API pura + **`customRecipes.test.js`**. Correr `npm test`.
2. **`src/lib/favorites.js`**: añadir `"custom"` a `VALID_KINDS` + saneo; ampliar `favorites.test.js`.
3. **`src/hooks/useCustomRecipes.js`** (persistencia + CRUD).
4. **`src/hooks/useRecipeScaling.js`**: aceptar `recipes` por argumento; validar ids contra la lista
   combinada; fallback de receta activa borrada.
5. **`src/i18n/messages.js`**: añadir claves es/en. Correr `npm test` (paridad).
6. **`src/components/RecipeForm.jsx`** (formulario captura/edición + validación en submit).
7. **`src/components/RecipeSelector.jsx`**: `favKind`, botón "Nueva receta", controles editar/borrar
   en custom.
8. **`src/App.jsx`**: `useCustomRecipes`, `allRecipes`, `useRecipeScaling(allRecipes)`, estado del
   formulario, handlers, montar `RecipeForm`.
9. **`src/styles/global.css`**: focus de inputs del formulario (si aplica).
10. `npm test` y `npm run build` en verde. Verificación E2E manual (abajo).

---

## Verificación end-to-end

Comandos:
- `npm test` — todos los suites en verde, incluyendo los nuevos de `customRecipes.test.js` y los
  añadidos a `favorites.test.js`, y **paridad i18n** intacta.
- `npm run build` — sin errores ni warnings de resolución.
- `npm run dev` (o `npm run preview` para probar también PWA) y comprobar en navegador:

Checklist manual:
1. **Crear**: "＋ Nueva receta" abre el panel; rellenar nombre + 3 ingredientes (harina 100/g, agua
   65/ml, sal 2/g) + 2 pasos; Guardar. Aparece en el selector, queda **activa**, y `IngredientList`
   la escala correctamente al peso del slider (proporción coherente con el `pct`).
2. **Persistencia**: recargar la página → la receta custom sigue ahí; `localStorage` tiene
   `panapp-custom-recipes` con el array esperado (shape con `custom:true`, sin `totalFlour`).
3. **Búsqueda (B-05)**: escribir parte del nombre custom → aparece filtrada; sin coincidencia →
   `role="status"` "sin resultados".
4. **Favorito (B-13/B-14)**: marcar la custom como favorita (estrella) → **no** cambia la receta
   activa; `panapp-favorites` guarda `{kind:"custom", id}`; tras recargar aparece arriba (orden por
   favoritas), y su estrella sigue marcada. Confirmar que un favorito custom **no** colisiona con
   uno built-in aunque se fuercen ids parecidos.
5. **Editar**: ✏️ abre el formulario prellenado; cambiar un pct y el nombre; Guardar → se refleja en
   la lista y en el escalado. Editar manteniendo el mismo nombre **no** dispara "duplicado".
6. **Validación**: intentar guardar sin nombre, sin ingredientes con pct>0, o sin pasos → bloque
   `role="alert"` con los mensajes correspondientes; nombre igual a una built-in ("Brioche") →
   error de duplicado.
7. **Borrar**: 🗑️ pide confirmación; al aceptar desaparece de la lista. Si era la **activa**, la app
   cae a la primera built-in sin crashear (sin pantalla en blanco, sin error de consola).
8. **Built-in intactas**: las 6 recetas de la casa **no** muestran editar/borrar; siguen escalando
   igual; el modo oscuro y el idioma (es/en) siguen funcionando en todo el formulario/controles.
9. Sin errores en consola en ningún flujo.

---

## Fuera de alcance (explícito)

- **Derivación de `pct` desde cantidades g/ml** (captura por peso real) → **B-19**.
- **Compartir por URL una receta custom** → **B-20**. El `ShareButton` (B-08) seguirá generando
  `?receta=<id>&peso=<g>`; si se comparte el enlace de una custom, en otro navegador ese id no existe
  y `useRecipeScaling` degrada a localStorage/default (comportamiento ya existente, sin cambios). No
  se toca `shareUrl.js` ni `ShareButton.jsx`.
- **Modificar `scaleRecipe`/`formatAmount`** o el modelo de porcentaje de panadero. Intactos.
- **Límite de cantidad de recetas custom**: no se impone en el núcleo (localStorage da margen amplio);
  si en el futuro se ve necesario, es un ajuste menor en `useCustomRecipes`.
- **Color picker libre**: se usa una paleta fija de acentos (evita dependencia y mantiene identidad).
- **Traducción del contenido** (nombre/pasos) de las recetas custom: se guardan en el idioma que
  escriba el usuario (igual que el contenido built-in, que ya está fuera del alcance de i18n en B-07).
- **Reordenar en vivo** al crear una custom: por B-14 el orden se congela al montar; la nueva receta
  se ordena al próximo reload. Aceptado, no se cambia.
