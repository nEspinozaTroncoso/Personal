# Plan B-06 — Integración con API de recetas de pan (TheMealDB)

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-06** (P3) — "Integración con API de recetas de pan". Ver `docs/APIS_RECETAS.md`.
> Requiere B-00 (hecho). **No debe romper** los 10 tests de B-01 (`baker.js`), la PWA/offline de B-02,
> la persistencia de B-03, el modo oscuro de B-04 ni el buscador de B-05.
> **Proveedor ya decidido por el usuario: TheMealDB** (gratis, sin API key, sin proxy/Netlify Function —
> se consume directo desde el frontend por HTTPS y con CORS abierto).

## Contexto

Hoy la app trabaja con un catálogo **local y curado** de 6 recetas (`src/data/recipes.js`), cada una
expresada en **porcentaje de panadero** (`pct` respecto a la harina = 100%) y reescalada a un peso total
por `scaleRecipe` (`src/lib/baker.js`). Ese modelo es el corazón del proyecto y su precisión está
cubierta por tests.

B-06 añade una vía para **explorar recetas externas** desde TheMealDB (categoría `Bread`). El objetivo
es de descubrimiento/inspiración: mostrar panes que la app no trae de fábrica, con sus ingredientes y
procedimiento.

### La tensión de dominio (y cómo se resuelve)

Las recetas de TheMealDB vienen con **cantidades fijas en unidades libres** (`"1 cup"`, `"2 tbsp"`,
`"1 pinch"`, `"250 g"`…), **no** en porcentaje de panadero. Además, la categoría `Bread` de TheMealDB
mezcla panes de masa con cosas como *bread pudding* o *banana bread*, donde "la harina como base 100%"
ni siquiera aplica.

**Opciones evaluadas para integrarlas con el modelo:**

- **Opción A — Convertir a `pct` estimando la harina como base.** Habría que: parsear unidades
  heterogéneas (cups/tbsp/oz/pinch/cloves…), convertirlas a gramos con una tabla de densidades por
  ingrediente, **adivinar cuál ingrediente es "la harina"** y calcular el `pct` del resto respecto a
  ella. Es frágil (parser de unidades + heurística de detección de harina), requeriría lógica y datos
  nuevos considerables, fallaría en muchas recetas de la categoría, y produciría porcentajes
  **inventados** que contaminarían la promesa de precisión del calculador. Alto riesgo, alto costo.

- **Opción B — Mostrar la receta externa "tal cual", en una sección aparte de solo lectura.** Los
  ingredientes se muestran con su **medida original** (`name` + `measure`) y las instrucciones como
  pasos. **No** pasa por `scaleRecipe`, **no** usa el slider de peso, **no** inventa porcentajes. Se
  presenta claramente etiquetada como "receta externa, no escalable por porcentaje de panadero".

**Elección: Opción B.** Es la más simple, **no toca `baker.js` ni el modelo de dominio**, no necesita
parser de unidades, tablas de densidad ni dependencias nuevas, y es **honesta** con el usuario (no
fabrica datos). Encaja con la regla del proyecto de "no romper el porcentaje de panadero": la sección
externa vive en paralelo al calculador, no dentro de él. (Una futura conversión a `pct` — con revisión
humana— podría ser otro item; queda fuera de alcance.)

### Cómo funciona TheMealDB (esto fija los endpoints)

Base: `https://www.themealdb.com/api/json/v1/1`

- **Listado por búsqueda de nombre** — `GET /search.php?s=bread`
  Devuelve `{ meals: [{ idMeal, strMeal, strMealThumb, … }, …] }` (id, nombre, miniatura y más
  campos que se ignoran en el listado). Si no hay resultados devuelve `{ meals: null }`.
  **Corrección post-plan**: el plan original proponía `filter.php?c=Bread`, pero "Bread" **no es
  una categoría válida** de TheMealDB (las categorías reales son Beef, Chicken, Dessert, Lamb,
  Miscellaneous, Pasta, Pork, Seafood, Side, Starter, Vegan, Vegetarian, Breakfast, Goat) — ese
  endpoint siempre devuelve `{ meals: null }`. Detectado en verificación end-to-end (Playwright
  contra la API real) y corregido a `search.php?s=bread`, que sí trae panes reales.
- **Detalle por id** — `GET /lookup.php?i=<idMeal>`
  Devuelve `{ meals: [ { idMeal, strMeal, strMealThumb, strCategory, strArea, strInstructions,
  strSource, strYoutube, strIngredient1..20, strMeasure1..20, … } ] }`. Los ingredientes vienen en
  **20 pares planos** `strIngredientN`/`strMeasureN`, muchos vacíos (`""`, `null` o solo espacios).

Flujo: al aparecer la sección se pide **el listado** (una petición); al pulsar un pan se pide **su
detalle** (una petición más).

## Archivos a tocar/crear

1. **`src/lib/mealdb.js`** (crear) — Módulo de acceso a TheMealDB, **sin dependencias de React**.
   Contiene: la URL base, dos **normalizadores puros** (`normalizeBreadList`, `normalizeMealDetail`)
   que traducen el JSON crudo (pares planos `strIngredientN`) al shape interno limpio, y dos wrappers
   `fetchBreadList` / `fetchMealDetail` que hacen `fetch` + normalización. Toda la "sabiduría" del
   formato de TheMealDB queda encapsulada aquí.
2. **`src/lib/mealdb.test.js`** (crear) — Tests Vitest de los **normalizadores puros** con fixtures
   JSON (sin red). Cubre: emparejado de ingredientes, descarte de pares vacíos/espacios/null, split de
   instrucciones en pasos, y `{ meals: null }` → lista vacía.
3. **`src/hooks/useExternalRecipes.js`** (crear) — Hook con el **estado + efectos**: carga del listado
   al montar, selección de un pan, carga de su detalle, y estados de red (`loading`/`error`/vacío) con
   `AbortController` para limpieza y una **caché en memoria de sesión** de detalles ya vistos.
4. **`src/components/ExternalRecipes.jsx`** (crear) — Sección de UI (presentación) que consume el hook
   y pinta listado, detalle y los estados de red, con estilos inline + tokens de `theme.js`.
5. **`src/App.jsx`** (editar) — Añadir un `import` y renderizar `<ExternalRecipes />` **entre** el
   `</main>` y `<Footer />`. Es la única edición a un archivo existente de lógica; la sección se
   autoabastece por su hook, así que **no** recibe props.
6. **`src/styles/global.css`** (editar) — Añadir clases (`.external-card`, imagen con `aspect-ratio`,
   hover/`:focus-visible`) para lo que el inline no cubre, con `var(--color-*)`, y sumarlas a la
   excepción `prefers-reduced-motion` ya existente.

**No se tocan**: `src/lib/baker.js` ni `src/lib/baker.test.js` (B-01), `src/data/recipes.js`,
`src/hooks/useRecipeScaling.js`, `useTheme.js`, `src/styles/theme.js`, `RecipeSelector.jsx`,
`WeightControl.jsx`, `IngredientList.jsx`, `StepList.jsx`, `Header.jsx`, `Footer.jsx`,
`vite.config.js`, PWA/`sw.js`. **Sin nuevas dependencias.**

## Reutilización

- **Tokens de `src/styles/theme.js`** — la sección usa `colors.surface`/`ink`/`inkSoft`/`subtext`/
  `muted`/`faint`/`border`/`divider`, `fonts.serif`/`sans`, `radius.card`/`tab`/`pill`,
  `shadow.card`/`cardSoft`/`tab`, `layout.maxWidth`. Cero colores/fuentes hardcodeados sueltos.
- **CSS custom properties de B-04** (`global.css`, `:root` / `[data-theme="dark"]`) — como los tokens
  resuelven a `var(--color-*)`, la sección **hereda el modo oscuro gratis**.
- **Patrón de estados accesibles de B-05** — mensajes con `role="status"` (loading / sin resultados);
  se añade `role="alert"` para errores de red, con botón de reintento.
- **Patrón visual de "tab/card" existente** (`.recipe-tab`, `radius.card`, `shadow.cardSoft`) — las
  tarjetas externas replican el mismo lenguaje visual (paleta terracota/crema, Fraunces para títulos).
- **Estructura de `App.jsx`** — se sigue el mismo estilo de composición: App llama hooks y compone
  secciones; la nueva sección es autónoma como lo son las demás.
- **NO se reutiliza `scaleRecipe`/`formatAmount`** a propósito: las recetas externas no llevan `pct`
  (ver Opción B). El módulo `mealdb.js` no importa `baker.js`.
- **Caché**: `useRecipeScaling`/`useTheme` persisten en `localStorage`; aquí **no** se persiste (ver
  Decisión de caché más abajo). Se usa solo una caché **en memoria** de sesión.

## Decisiones de diseño

### D1 — Dónde vive el `fetch`: `src/lib/mealdb.js` (datos) + `src/hooks/useExternalRecipes.js` (estado)
CLAUDE.md separa "lógica sin React → `lib/`" de "estado+efectos → `hooks/`". Se respeta:
- `lib/mealdb.js` **no importa React**; su núcleo son **funciones puras** (los normalizadores) más dos
  wrappers `fetch` finos. Es testeable (los normalizadores) y aísla todo el formato de TheMealDB.
- `useExternalRecipes.js` orquesta ciclo de vida (montaje, selección, abort, caché) y expone un estado
  listo para pintar. El componente queda "tonto".

### D2 — Cuándo se pide el listado: **al montar la sección**
`filter.php?c=Bread` es una sola petición barata. Se dispara en un `useEffect` al montar
`ExternalRecipes` (la sección vive bajo el contenido principal). No se añade lazy-load por scroll:
complejidad innecesaria para una petición ligera. (Optimización futura fuera de alcance.)

### D3 — Caché: **en memoria de sesión, no `localStorage`**
El detalle de cada pan seleccionado se guarda en un `useRef(new Map())` dentro del hook, para que
reseleccionar un pan ya visto **no vuelva a pedir red**. **No** se persiste en `localStorage`: a
diferencia de la receta/peso/tema (preferencias del usuario), el catálogo externo es dato remoto
volátil; persistirlo aportaría complejidad de invalidación sin beneficio claro. Se documenta.

### D4 — Offline (PWA): **degradación elegante, sin runtime caching**
La precache de `vite-plugin-pwa` (B-02) cubre los assets propios, **no** las llamadas cross-origin a
TheMealDB. Sin conexión, los `fetch` fallan y la sección muestra su **estado de error con reintento**;
el resto de la app (calculador local) sigue funcionando offline como hasta ahora. Añadir runtime
caching del API queda **fuera de alcance** (sería otro item, con su política de expiración).

### D5 — Estados de red y accesibilidad
Se modelan estados explícitos, siguiendo el patrón de B-05:
- **loading** (listado o detalle): mensaje con `role="status"` (`aria-live="polite"`).
- **error**: mensaje con `role="alert"` + botón "Reintentar" que relanza la petición.
- **sin resultados** (listado vacío, `{ meals: null }`): mensaje con `role="status"`.
- Imágenes con `alt` descriptivo y `loading="lazy"`; enlaces externos con `rel="noopener noreferrer"`
  y `target="_blank"`.

## Pasos

### Paso 1 — Crear `src/lib/mealdb.js`

Módulo sin React. Los normalizadores son puros (testeables); los wrappers hacen `fetch` + normalizan.

```js
// Acceso a TheMealDB (categoría "Bread"). Sin dependencias de React.
// Núcleo puro: normalizeBreadList / normalizeMealDetail (testeados en mealdb.test.js).
// Los wrappers fetch* aíslan la red y devuelven ya el shape interno normalizado.

const BASE = "https://www.themealdb.com/api/json/v1/1";
export const BREAD_CATEGORY = "Bread";

// filter.php devuelve { meals: [{ idMeal, strMeal, strMealThumb }] } o { meals: null }.
export function normalizeBreadList(json) {
  const meals = json && Array.isArray(json.meals) ? json.meals : [];
  return meals.map((m) => ({
    id: m.idMeal,
    name: m.strMeal,
    thumb: m.strMealThumb || null,
  }));
}

// lookup.php trae ingredientes en 20 pares planos strIngredientN / strMeasureN;
// muchos vacíos (""/null/espacios). Emparejamos y descartamos los vacíos.
export function normalizeMealDetail(raw) {
  if (!raw) return null;
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (raw[`strIngredient${i}`] || "").trim();
    const measure = (raw[`strMeasure${i}`] || "").trim();
    if (name) ingredients.push({ name, measure });
  }
  const steps = (raw.strInstructions || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: raw.idMeal,
    name: raw.strMeal,
    thumb: raw.strMealThumb || null,
    category: raw.strCategory || null,
    area: raw.strArea || null,
    source: raw.strSource || null,
    youtube: raw.strYoutube || null,
    ingredients,
    steps,
  };
}

export async function fetchBreadList(signal) {
  const res = await fetch(`${BASE}/filter.php?c=${BREAD_CATEGORY}`, { signal });
  if (!res.ok) throw new Error(`TheMealDB (filter) respondió ${res.status}`);
  return normalizeBreadList(await res.json());
}

export async function fetchMealDetail(id, signal) {
  const res = await fetch(`${BASE}/lookup.php?i=${encodeURIComponent(id)}`, { signal });
  if (!res.ok) throw new Error(`TheMealDB (lookup) respondió ${res.status}`);
  const json = await res.json();
  const raw = json && Array.isArray(json.meals) ? json.meals[0] : null;
  return normalizeMealDetail(raw);
}
```

Notas para el implementador:
- **No** importar `baker.js` ni React aquí.
- Mantener el rango `1..20` (TheMealDB fija ese máximo).
- El split de pasos usa `/\r?\n/` porque `strInstructions` suele traer saltos `\r\n`; si no hay saltos,
  queda un único paso con todo el texto (aceptable).

### Paso 2 — Crear `src/lib/mealdb.test.js`

Tests de los normalizadores puros con fixtures inline (sin red). Casos mínimos:
- `normalizeBreadList`: mapea `[{idMeal,strMeal,strMealThumb}]` a `{id,name,thumb}`; con
  `{ meals: null }` → `[]`; con objeto sin `meals` → `[]`.
- `normalizeMealDetail`:
  - empareja solo los pares con `strIngredientN` no vacío; descarta `""`, `null` y `"   "`.
  - conserva la `measure` (aunque venga vacía, el ingrediente entra si tiene nombre).
  - divide `strInstructions` con `\r\n`/`\n` en pasos y descarta líneas en blanco.
  - `null`/`undefined` de entrada → `null`.

Ejemplo de fixture para el detalle (representativo del formato real):
```js
const rawMeal = {
  idMeal: "52961",
  strMeal: "Budino Di Ricotta",
  strMealThumb: "https://www.themealdb.com/images/media/meals/x.jpg",
  strCategory: "Bread",
  strArea: "Italian",
  strInstructions: "Mash the ricotta.\r\nAdd the eggs.\r\n\r\nBake 40 min.",
  strSource: "https://example.com/receta",
  strYoutube: "",
  strIngredient1: "Ricotta", strMeasure1: "500g",
  strIngredient2: "Eggs",    strMeasure2: "4",
  strIngredient3: "",        strMeasure3: "",
  strIngredient4: "   ",     strMeasure4: "1 tbsp",
  strIngredient5: null,      strMeasure5: null,
  // …resto hasta 20 ausentes en el fixture: el bucle los lee como undefined → "" → se descartan
};
```
Se espera: 2 ingredientes (`Ricotta`/`500g`, `Eggs`/`4`), 3 pasos (línea vacía descartada), `youtube`
y demás campos coherentes.

> Estos tests **se suman** a los 10 de B-01; el total sube. `baker.test.js` no se toca.

### Paso 3 — Crear `src/hooks/useExternalRecipes.js`

Estado + efectos. Expone lo justo para que el componente sea presentacional.

```js
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchBreadList, fetchMealDetail } from "../lib/mealdb.js";

export function useExternalRecipes() {
  const [list, setList] = useState([]);
  const [listStatus, setListStatus] = useState("loading"); // loading | error | ready
  const [listError, setListError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailStatus, setDetailStatus] = useState("idle"); // idle | loading | error | ready
  const [detailError, setDetailError] = useState(null);

  const detailCache = useRef(new Map()); // id -> detalle normalizado (caché de sesión)

  // Carga del listado al montar.
  const loadList = useCallback((signal) => {
    setListStatus("loading");
    setListError(null);
    fetchBreadList(signal)
      .then((items) => { setList(items); setListStatus("ready"); })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setListError(err.message || "Error de red");
        setListStatus("error");
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadList(ctrl.signal);
    return () => ctrl.abort();
  }, [loadList]);

  // Selección + carga de detalle (con caché de sesión).
  const selectRecipe = useCallback((id) => {
    setSelectedId(id);
    if (detailCache.current.has(id)) {
      setDetail(detailCache.current.get(id));
      setDetailStatus("ready");
      setDetailError(null);
      return;
    }
    setDetail(null);
    setDetailStatus("loading");
    setDetailError(null);
    fetchMealDetail(id)
      .then((d) => {
        detailCache.current.set(id, d);
        setDetail(d);
        setDetailStatus("ready");
      })
      .catch((err) => {
        setDetailError(err.message || "Error de red");
        setDetailStatus("error");
      });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailStatus("idle");
    setDetailError(null);
  }, []);

  const retryList = useCallback(() => loadList(), [loadList]);
  const retryDetail = useCallback(() => { if (selectedId) selectRecipe(selectedId); },
    [selectedId, selectRecipe]);

  return {
    list, listStatus, listError, retryList,
    selectedId, detail, detailStatus, detailError,
    selectRecipe, clearSelection, retryDetail,
  };
}
```

Notas:
- El `AbortController` solo cubre el listado del montaje (evita `setState` tras desmontar). El detalle
  no se aborta porque la selección es explícita y breve; `retryDetail` reintenta.
- La caché es `useRef` (no dispara render y sobrevive re-renders durante la sesión). No se persiste.

### Paso 4 — Crear `src/components/ExternalRecipes.jsx`

Componente de presentación que consume el hook. Estilos inline + tokens; estados accesibles. Estructura
representativa (el implementador puede ajustar detalles de estilo manteniendo tokens y roles ARIA):

```jsx
import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";
import { useExternalRecipes } from "../hooks/useExternalRecipes.js";

export default function ExternalRecipes() {
  const {
    list, listStatus, listError, retryList,
    selectedId, detail, detailStatus, detailError,
    selectRecipe, retryDetail,
  } = useExternalRecipes();

  return (
    <section
      style={{
        maxWidth: layout.maxWidth,
        margin: "3rem auto 0",
        padding: "0 1.5rem",
      }}
    >
      <h2 style={{ fontFamily: fonts.serif, fontSize: "1.4rem", margin: "0 0 0.4rem", color: colors.ink }}>
        Explorar más panes
      </h2>
      <p style={{ margin: "0 0 1.2rem", fontSize: "0.9rem", color: colors.muted, lineHeight: 1.5 }}>
        Recetas de la comunidad vía TheMealDB. Vienen con cantidades fijas en sus unidades originales,
        así que <strong>no</strong> se escalan por porcentaje de panadero como las recetas de arriba.
      </p>

      {/* Estados del listado */}
      {listStatus === "loading" && (
        <p role="status" style={statusStyle}>Cargando panes…</p>
      )}
      {listStatus === "error" && (
        <div role="alert" style={statusStyle}>
          No se pudo cargar el listado ({listError}).{" "}
          <button type="button" onClick={retryList} style={retryStyle}>Reintentar</button>
        </div>
      )}
      {listStatus === "ready" && list.length === 0 && (
        <p role="status" style={statusStyle}>Ahora mismo no hay panes disponibles en TheMealDB.</p>
      )}

      {/* Grid del listado */}
      {listStatus === "ready" && list.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          }}
        >
          {list.map((m) => {
            const active = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                className="external-card"
                onClick={() => selectRecipe(m.id)}
                aria-pressed={active}
                style={{
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                  overflow: "hidden",
                  border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                  background: colors.surface,
                  borderRadius: radius.card,
                  boxShadow: active ? shadow.tab : shadow.cardSoft,
                }}
              >
                {m.thumb && (
                  <img
                    className="external-card__img"
                    src={m.thumb}
                    alt={`Foto de ${m.name}`}
                    loading="lazy"
                  />
                )}
                <div style={{ padding: "0.7rem 0.85rem", fontFamily: fonts.serif, fontWeight: 600,
                              fontSize: "0.98rem", color: colors.ink }}>
                  {m.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detalle del pan seleccionado */}
      {selectedId && (
        <div
          style={{
            marginTop: "1.6rem",
            background: colors.surface,
            borderRadius: radius.card,
            padding: "1.6rem 1.8rem",
            boxShadow: shadow.cardSoft,
          }}
        >
          {detailStatus === "loading" && <p role="status" style={statusStyle}>Cargando receta…</p>}
          {detailStatus === "error" && (
            <div role="alert" style={statusStyle}>
              No se pudo cargar la receta ({detailError}).{" "}
              <button type="button" onClick={retryDetail} style={retryStyle}>Reintentar</button>
            </div>
          )}
          {detailStatus === "ready" && detail && (
            <>
              <h3 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0 0 0.2rem", color: colors.ink }}>
                {detail.name}
              </h3>
              {(detail.area || detail.category) && (
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: colors.faint }}>
                  {[detail.area, detail.category].filter(Boolean).join(" · ")}
                </p>
              )}

              <h4 style={subheadStyle}>Ingredientes</h4>
              <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.2rem" }}>
                {detail.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", padding: "0.4rem 0",
                    borderBottom: `1px solid ${colors.divider}` }}>
                    <span style={{ fontSize: "0.97rem", color: colors.inkSoft }}>{ing.name}</span>
                    <span style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: "1rem",
                      whiteSpace: "nowrap", marginLeft: "1rem", color: colors.ink }}>
                      {ing.measure || "—"}
                    </span>
                  </div>
                ))}
              </div>

              <h4 style={subheadStyle}>Procedimiento</h4>
              <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.6rem" }}>
                {detail.steps.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.96rem", color: colors.inkSoft, lineHeight: 1.5 }}>{s}</li>
                ))}
              </ol>

              {detail.source && (
                <p style={{ marginTop: "1.2rem", fontSize: "0.82rem" }}>
                  <a href={detail.source} target="_blank" rel="noopener noreferrer"
                     style={{ color: colors.eyebrow }}>
                    Ver receta original
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

const statusStyle = { margin: "0.4rem 0", fontFamily: fonts.sans, fontSize: "0.9rem", color: colors.muted };
const retryStyle = { cursor: "pointer", border: `1px solid ${colors.border}`, background: "transparent",
  color: colors.subtext, borderRadius: radius.pill, padding: "0.25rem 0.8rem", fontSize: "0.8rem",
  fontWeight: 600, marginLeft: "0.3rem" };
const subheadStyle = { fontFamily: fonts.serif, fontSize: "1.05rem", margin: "0 0 0.6rem", color: colors.subtext };
```

Notas:
- **Mantener** los `role="status"` / `role="alert"` y `aria-pressed` indicados (accesibilidad B-05).
- **Solo tokens** de `theme.js`; nada de hex sueltos. El accent aquí es `colors.ink` (neutro), para no
  competir con el `accent` por-receta del catálogo local.
- El texto de la nota deja explícito que estas recetas **no** usan porcentaje de panadero (coherencia
  con la Opción B y con el mensaje del `Footer`).

### Paso 5 — Editar `src/App.jsx`

Añadir el import y renderizar la sección **entre** `</main>` y `<Footer />` (una línea):

```jsx
import ExternalRecipes from "./components/ExternalRecipes.jsx";
// …
      </main>
      <ExternalRecipes />
      <Footer />
```
No se pasan props (la sección se autoabastece por su hook). No se toca nada más de `App.jsx`.

### Paso 6 — Editar `src/styles/global.css`

Añadir reglas para lo que el inline no cubre (hover, foco accesible, aspecto de la imagen). Ubicarlas
junto a los otros bloques de componentes (p. ej. tras `.recipe-search`, antes de `input[type="range"]`):

```css
.external-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.external-card:hover {
  transform: translateY(-2px);
}
.external-card:focus-visible {
  outline: none;
  box-shadow: var(--shadow-tab);
}
.external-card__img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}
```

Y sumar `.external-card` a la excepción de movimiento reducido **ya existente** al final del archivo:

```css
@media (prefers-reduced-motion: reduce) {
  .recipe-tab { transition: none; }
  body { transition: none; }
  .recipe-search { transition: none; }
  .external-card { transition: none; }
}
```

## Verificación (end-to-end)

Ejecutar desde la raíz del proyecto.

1. **Tests:** `npm test` →
   - Los **10 tests de B-01 siguen en verde** (`baker.js` intacto).
   - Los **nuevos tests de `mealdb.test.js`** pasan (normalizadores). El total de tests sube.

2. **Build (PWA B-02 intacta):** `npm run build` → termina **sin errores**; `dist/` conserva `sw.js` +
   `manifest.webmanifest`.

3. **Dev / comportamiento (con red):** `npm run dev`, abrir http://localhost:5173.
   - Bajo el calculador aparece la sección **"Explorar más panes"** con la nota de que **no** se escalan
     por porcentaje de panadero.
   - Al cargar se ve **"Cargando panes…"** (`role="status"`) y luego un **grid de tarjetas** con foto +
     nombre (categoría `Bread` de TheMealDB).
   - **Seleccionar** una tarjeta muestra **"Cargando receta…"** y luego el detalle: **ingredientes con
     su medida original** (`name` — `measure`), **procedimiento** en pasos, y enlace "Ver receta
     original" si existe. La tarjeta activa queda resaltada (`aria-pressed`).
   - **Reseleccionar** un pan ya visto es **instantáneo** (caché de sesión; sin nueva petición — se
     puede confirmar en la pestaña Network).
   - **El calculador local (arriba) no cambia en nada**: slider, ingredientes escalados y recetas
     locales siguen idénticos. La sección externa nunca llama a `scaleRecipe`.

4. **Estados de error (sin red):** en DevTools → Network → "Offline", recargar:
   - El listado muestra **`role="alert"`** con el error y botón **"Reintentar"**; al volver a "Online"
     y pulsar, carga.
   - Forzar offline tras cargar el listado y seleccionar un pan nuevo → el **detalle** muestra su alerta
     + "Reintentar". El resto de la app (calculador) **sigue funcionando** (degradación elegante, D4).

5. **Sin resultados:** (difícil de forzar con la API real) verificar por el test de `normalizeBreadList`
   que `{ meals: null }` → `[]`; en UI ese caso pinta el `role="status"` "no hay panes disponibles".

6. **Claro/oscuro (B-04):** con el toggle de tema, la sección se ve coherente en ambos modos (fondos
   `surface`, texto `ink`/`inkSoft`, bordes `border`, sombras del tema). Nada queda blanco/ilegible.

7. **Accesibilidad / reduced-motion:**
   - Loading y "sin resultados" con `role="status"`; errores con `role="alert"`; tarjetas con
     `aria-pressed`; imágenes con `alt`; enlaces con `rel="noopener noreferrer"`.
   - Con "Emulate prefers-reduced-motion: reduce", las tarjetas no animan hover/foco.
   - Navegación por teclado: `Tab` recorre tarjetas y botones; el foco es visible (`box-shadow`).

## Fuera de alcance

- **Convertir las recetas externas a porcentaje de panadero** (Opción A): no se hace; se muestran tal
  cual (Opción B). Un parser de unidades + detección de harina sería otro item, con revisión humana.
- **Integrar las recetas externas en el calculador** (slider de peso, `scaleRecipe`, `IngredientList`):
  la sección externa vive en paralelo, de solo lectura.
- **Persistir en `localStorage`** el listado/detalle externos (D3): solo caché en memoria de sesión.
- **Runtime caching / offline del API de TheMealDB** en el service worker (D4): degradación elegante,
  no cacheo; sería otro item con política de expiración.
- **Otros proveedores** (Spoonacular/Edamam/Forkify) y cualquier **proxy/Netlify Function**: la decisión
  fijó TheMealDB, que no necesita key ni proxy (ver `docs/APIS_RECETAS.md`).
- **Buscar/filtrar/paginación** dentro de las recetas externas, **favoritos** externos, o traducción de
  su contenido (viene en inglés): posibles items futuros.
- **Lazy-load por scroll** de la sección: se pide el listado al montar.
- Cambios en `baker.js`, sus tests, datos locales, `useRecipeScaling`, `useTheme`, PWA o dependencias.
