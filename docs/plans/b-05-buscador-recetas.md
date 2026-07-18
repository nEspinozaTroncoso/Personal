# Plan B-05 — Buscador/filtro de recetas

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-05** (P2) — "Buscador/filtro de recetas". Nota: "Escala bien cuando haya más de 6 recetas".
> Requiere B-00 (hecho). No debe romper los 10 tests de B-01, la PWA/offline de B-02, la persistencia de
> B-03 ni el modo oscuro de B-04.

## Contexto

Hoy `RecipeSelector` pinta **todas** las recetas como tabs en una fila con `flex-wrap`. Con las 6
recetas actuales cabe, pero el item anticipa el crecimiento del catálogo (B-06 traería más desde una
API): a partir de ~7–8 tabs la fila se vuelve incómoda de escanear en el móvil. Se añade un **campo de
búsqueda/filtro** que reduce en tiempo real las tabs visibles según lo que el usuario escribe.

El filtrado es **puramente visual**: decide *qué tabs se muestran*, nada más. **No** cambia la receta
activa (`activeId`), **no** toca el peso ni el cálculo escalado, y **no** modifica la fuente de datos.
Es filtrado simple en cliente, sin fuzzy search ni librerías.

### Cómo funciona hoy el flujo (esto decide el enfoque)

Auditados `App.jsx`, `useRecipeScaling.js` y `RecipeSelector.jsx`:

- `useRecipeScaling()` (`src/hooks/useRecipeScaling.js`) es el dueño del estado de dominio: expone
  `recipes` (= `RECIPES` completo), `activeId`, `setActiveId`, `recipe` (derivada de `activeId` con
  `RECIPES.find`) y `scaled` (derivada de `recipe` + `targetWeight`). **La receta activa y el cálculo
  se derivan de `activeId`, no de lo que muestra `RecipeSelector`.**
- `App.jsx` (`src/App.jsx`) pasa `recipes`, `activeId`, `onSelect={setActiveId}` a `<RecipeSelector>`,
  y por separado pasa `recipe.*` a `<WeightControl>`, `<IngredientList>`, `<StepList>`. Es decir,
  **el panel de ingredientes/pasos NO depende de `RecipeSelector`**: aunque la tab activa se oculte
  por el filtro, el panel sigue mostrando la receta activa intacta. Esto es clave para el caso borde.
- `RecipeSelector` (`src/components/RecipeSelector.jsx`) es un componente de presentación "tonto":
  recibe `recipes`, mapea a `<button className="recipe-tab">` y marca la activa con `r.id === activeId`
  (borde con `r.accent`, fondo `colors.surface`, sombra `shadow.tab`). Muestra `r.name` (Fraunces) y
  `r.subtitle` (muted). El `<nav>` fija `maxWidth: layout.maxWidth`, `margin: 0 auto`, `padding: 0 1.5rem`.

### Decisión 1 — Dónde vive el estado del término de búsqueda: **estado local en `RecipeSelector`**

El término de búsqueda es un concern **exclusivamente de presentación** de este componente (qué tabs
pinta). No lo consume nadie más: ni el cálculo, ni la persistencia, ni el resto de paneles. Meterlo en
`App` o en `useRecipeScaling` lo elevaría innecesariamente y obligaría a tocar más archivos.

**Elección: `useState("")` dentro de `RecipeSelector`.** Es la opción menos invasiva:
`App.jsx`, `useRecipeScaling.js` y la fuente de datos **no se tocan**. El filtrado nunca llama a
`onSelect`, así que `activeId` y el cálculo quedan inalterados por definición.

> No se persiste el término de búsqueda (a diferencia de tema/receta/peso). Un filtro es un estado
> efímero de sesión; recargar con un filtro pegado sería confuso. Se documenta como decisión.

### Decisión 2 — Sobre qué campos filtra: **`name` + `subtitle`**, insensible a mayúsculas y acentos

Cada receta (`src/data/recipes.js`) tiene `name` (p. ej. "Pan de Molde 70/30") y `subtitle` (p. ej.
"Blanca y integral, miga suave"). Ambos son texto legible orientado al usuario, así que el filtro
busca en **los dos**: escribir "integral" encuentra por subtítulo aunque no esté en el nombre.

Se **descartan** `ingredients[].name` y `steps` del ámbito de búsqueda: buscar "mantequilla" o
"hornea" devolvería casi todas las recetas y el resultado sería ruido, no señal. Mantener el filtro en
`name`+`subtitle` lo hace predecible. (Ampliar a ingredientes queda como posible item futuro.)

**Normalización**: la comparación es *case-insensitive* y *accent-insensitive* con
`String.prototype.normalize("NFD")` + descarte de marcas diacríticas (`/[̀-ͯ]/g`). Así
"molde", "MOLDE" y (si alguna receta llevara tilde) "báguette"/"baguette" coinciden igual. Es JS nativo,
sin dependencias. (Nota: `ñ` se descompone a `n`; aceptable para este catálogo.)

### Decisión 3 — Caso borde: receta activa fuera del filtro

Si el usuario filtra de forma que la **tab de la receta activa** queda excluida, **no se hace nada
especial**: la tab simplemente **no se muestra** mientras el filtro la excluya, pero:

- `activeId` **no cambia** (el filtro nunca llama a `onSelect`), así que
- `<WeightControl>`, `<IngredientList>` y `<StepList>` **siguen mostrando la receta activa completa**
  (dependen de `recipe`, no de `RecipeSelector`). El panel no se rompe ni se vacía.
- Al **borrar** el filtro, la tab activa reaparece resaltada como estaba.

Este es el comportamiento correcto y menos sorprendente: el filtro solo afecta a la lista de tabs,
nunca a lo que estás viendo. Se documenta explícitamente.

### Decisión 4 — Caso borde: sin resultados

Si ninguna receta coincide, en lugar del `<nav>` vacío se muestra un **mensaje "sin resultados"**
(`role="status"` para que lo anuncien los lectores de pantalla) que cita el término buscado. El input
permanece para poder corregir o borrar. Borrar el término restaura la lista completa.

### Decisión 5 — El input se muestra siempre

Se renderiza el buscador **de forma incondicional** (no solo cuando `recipes.length > N`). Ventajas:
comportamiento predecible, cero lógica de umbral, y el usuario lo encuentra siempre en el mismo sitio.
Con 6 recetas es igualmente útil; el item pide *preparar* para más, no ocultarlo con pocas. Un umbral
condicional queda fuera de alcance.

## Archivos a tocar/crear

1. **`src/components/RecipeSelector.jsx`** (editar) — único archivo de lógica que cambia. Añadir
   `useState` para el término, un helper `normalize`, el `<input type="search">`, la lista filtrada y
   el mensaje "sin resultados". Envolver el `<input>` + `<nav>` en un contenedor que herede el
   `maxWidth`/`margin`/`padding` que antes tenía el `<nav>`.
2. **`src/styles/global.css`** (editar) — añadir la clase `.recipe-search` para lo que los estilos
   inline no pueden cubrir: color del `::placeholder`, anillo de foco accesible (`:focus-visible`) con
   tokens del tema, y transición guardada por `prefers-reduced-motion`.

**No se tocan**: `src/lib/baker.js` ni sus tests (B-01), `src/data/recipes.js`, `src/App.jsx`,
`src/hooks/useRecipeScaling.js`, `useTheme.js`, `theme.js`, el resto de componentes, `index.html`,
`vite.config.js`, PWA/`sw.js`. **Sin nuevas dependencias.**

## Reutilización

- **Tokens de `src/styles/theme.js`** — el input usa `colors.surface` (fondo), `colors.ink` (texto),
  `colors.border` (borde), `radius.pill`, `fonts.sans`. Sin colores hardcodeados sueltos.
- **CSS custom properties de B-04** (`src/styles/global.css`, `:root` / `[data-theme="dark"]`) — como
  los tokens resuelven a `var(--color-*)`, el input hereda el modo oscuro **gratis**; `.recipe-search`
  usa `var(--color-faint)`, `var(--color-muted)`, `var(--shadow-tab)` para placeholder y foco.
- **Bloque `@media (prefers-reduced-motion: reduce)` ya existente** en `global.css` — se le añade
  `.recipe-search` para anular su transición de foco.
- **Estructura de tab existente** — el `<button className="recipe-tab">` y su estilo activo/idle **no
  cambian**; solo se itera sobre la lista filtrada en vez de sobre `recipes`.

## Pasos

### Paso 1 — `src/components/RecipeSelector.jsx`: input, filtrado y "sin resultados"

Reemplazar **todo** el contenido del archivo por lo siguiente. Cambios respecto al actual: se añade
`import { useState }`, el helper `normalize`, el estado `query`, la lista `filtered`, el `<input>`, el
mensaje "sin resultados", y el antiguo `<nav>` se envuelve en un `<div>` que asume el
`maxWidth`/`margin`/`padding`. **El `<button>` de cada tab queda idéntico al actual.**

```jsx
import { useState } from "react";
import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";

// Normaliza para búsqueda: minúsculas y sin acentos (NFD + descarte de diacríticos).
// Ej: "Báguette" -> "baguette", "MOLDE" -> "molde". Sin dependencias.
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // descarta las marcas diacríticas combinantes
}

export default function RecipeSelector({ recipes, activeId, onSelect }) {
  const [query, setQuery] = useState("");

  // Filtrado en cliente sobre name + subtitle. Con query vacío se muestran todas.
  const q = normalize(query.trim());
  const filtered = q
    ? recipes.filter(
        (r) => normalize(r.name).includes(q) || normalize(r.subtitle).includes(q)
      )
    : recipes;

  return (
    <div
      style={{
        maxWidth: layout.maxWidth,
        margin: "0 auto",
        padding: "0 1.5rem",
      }}
    >
      <input
        type="search"
        className="recipe-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar receta…"
        aria-label="Buscar receta por nombre o descripción"
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginBottom: "0.9rem",
          padding: "0.7rem 1rem",
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          color: colors.ink,
          borderRadius: radius.pill,
          fontFamily: fonts.sans,
          fontSize: "0.95rem",
          outline: "none",
        }}
      />

      {filtered.length === 0 ? (
        <p
          role="status"
          style={{
            margin: "0.2rem 0 0",
            color: colors.muted,
            fontFamily: fonts.sans,
            fontSize: "0.9rem",
          }}
        >
          No hay recetas que coincidan con «{query.trim()}».
        </p>
      ) : (
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
          }}
        >
          {filtered.map((r) => {
            const active = r.id === activeId;
            return (
              <button
                key={r.id}
                className="recipe-tab"
                onClick={() => onSelect(r.id)}
                style={{
                  cursor: "pointer",
                  border: active ? `2px solid ${r.accent}` : "2px solid transparent",
                  background: active ? colors.surface : colors.tabIdle,
                  borderRadius: radius.tab,
                  padding: "0.9rem 1.1rem",
                  textAlign: "left",
                  minWidth: 150,
                  boxShadow: active ? shadow.tab : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.serif,
                    fontWeight: 600,
                    fontSize: "1.02rem",
                    color: colors.ink,
                  }}
                >
                  {r.name}
                </div>
                <div style={{ fontSize: "0.78rem", color: colors.muted, marginTop: 2 }}>
                  {r.subtitle}
                </div>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
```

Notas para el implementador:

- El `<nav>` **pierde** `maxWidth`/`margin`/`padding` (ahora los pone el `<div>` contenedor) y
  **conserva** `display: flex`, `flexWrap: "wrap"`, `gap: "0.6rem"`. No mover esas 3 props al `<div>`.
- El bloque `<button>…</button>` es **carbón-copia** del actual (no cambiar estilos de tab).
- No añadir `onSelect` en ningún punto del filtrado: el filtro jamás cambia la receta activa.

### Paso 2 — `src/styles/global.css`: estilos del input que el inline no cubre

Los estilos inline no pueden apuntar a `::placeholder` ni a `:focus-visible`. Añadir estas reglas.
Ubicarlas junto a las reglas de componentes existentes (p. ej. **después** del bloque `.recipe-tab`,
antes de `input[type="range"]`):

```css
.recipe-search {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.recipe-search::placeholder {
  color: var(--color-faint);
  opacity: 1; /* Firefox atenúa el placeholder por defecto */
}
.recipe-search:focus-visible {
  border-color: var(--color-muted);
  box-shadow: var(--shadow-tab);
}
```

Y añadir `.recipe-search` a la excepción de movimiento reducido **ya existente** al final del archivo:

```css
@media (prefers-reduced-motion: reduce) {
  .recipe-tab { transition: none; }
  body { transition: none; }
  .recipe-search { transition: none; }
}
```

> El foco usa `border-color` (var del tema) + `box-shadow: var(--shadow-tab)` como anillo visible; al
> resolver por CSS vars funciona en claro y oscuro sin lógica extra. El botón "limpiar" (la X nativa de
> `type="search"`) aparece según el navegador; no se estiliza a mano.

## Verificación (end-to-end)

Ejecutar desde la raíz del proyecto.

1. **Tests (no regresión B-01):**
   `npm test` → **10/10 en verde** (`baker.js` no se tocó).

2. **Build de producción (PWA B-02 intacta):**
   `npm run build` → termina **sin errores**; `dist/` sigue con `sw.js` + `manifest.webmanifest`.

3. **Dev / comportamiento del buscador:** `npm run dev`, abrir http://localhost:5173.
   - Sobre las tabs aparece un **input de búsqueda** con placeholder "Buscar receta…".
   - **Escribir filtra en vivo**: teclear `molde` deja solo "Pan de Molde 70/30" y "Pan de Molde
     Tradicional". Teclear `integral` deja "Pan de Molde 70/30" (coincide por **subtítulo**).
   - **Insensible a acentos/mayúsculas**: `BAGUETTE` y `baguette` dan el mismo resultado.
   - **Borrar restaura**: vaciar el input vuelve a mostrar las 6 tabs.
   - **Sin resultados**: teclear `zzz` oculta todas las tabs y muestra el mensaje
     "No hay recetas que coincidan con «zzz».". Borrar restaura la lista.

4. **Caso borde — receta activa fuera del filtro (crítico):**
   - Seleccionar "Baguette Básica" (panel de ingredientes/pasos muestra Baguette).
   - Escribir `molde` en el buscador → la tab de Baguette **desaparece de la lista**, pero
     **el panel de ingredientes/pasos y el peso siguen mostrando Baguette intactos** (nada se vacía ni
     lanza error). El slider y los ingredientes escalados no cambian.
   - Borrar el filtro → la tab "Baguette Básica" reaparece **resaltada** como activa.

5. **Interacción con activeId / cálculo:**
   - Con un filtro que sí muestre la receta activa, cambiar de tab funciona igual que antes y recalcula.
   - Verificar que filtrar **no** altera el peso ni la selección persistida (B-03): recargar con la
     receta activa fuera del filtro mantiene esa receta activa (el filtro no se persiste; el input abre
     vacío y muestra todas).

6. **Claro/oscuro (B-04):**
   - Con el toggle de tema, el input se ve coherente en **ambos**: fondo `surface`, texto `ink`, borde
     `border`, placeholder tenue; en oscuro no queda blanco ni ilegible.
   - **Foco por teclado**: `Tab` hasta el input muestra un anillo visible (`box-shadow`) en claro y en
     oscuro. Se puede escribir y borrar con teclado; `Tab` continúa hacia las tabs.

7. **Accesibilidad / reduced-motion:**
   - El input es `type="search"` con `aria-label="Buscar receta por nombre o descripción"`.
   - El mensaje "sin resultados" tiene `role="status"`.
   - Con "Emulate prefers-reduced-motion: reduce", el input no anima el foco.

## Fuera de alcance

- **Buscar en ingredientes o pasos**: el filtro cubre `name` + `subtitle`; ampliarlo sería otro item.
- **Fuzzy search / ranking / resaltado de coincidencias / debounce**: filtrado exacto por substring;
  con N pequeño-medio de recetas es instantáneo, no hace falta optimizar.
- **Persistir el término de búsqueda** en `localStorage` o URL (esto último es B-08): el filtro es
  estado efímero de sesión.
- **Mostrar el input solo por encima de un umbral** de recetas: se muestra siempre.
- **Ordenar/categorizar/agrupar recetas** o cambiar el layout de tabs: no se toca la estructura de tab.
- **Vaciar/cambiar la receta activa cuando queda fuera del filtro**: por diseño no se hace; el filtro
  solo afecta a las tabs visibles.
- Cambios en `baker.js`, datos de recetas, `App.jsx`, `useRecipeScaling.js`, PWA, dependencias.
