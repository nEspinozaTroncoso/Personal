# Plan B-04 — Modo oscuro con toggle

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-04** (P2) — "Modo oscuro con toggle".
> Requiere B-00 (hecho). No debe romper los 10 tests de B-01 ni la PWA/offline de B-02.

## Contexto

La app se usa desde el teléfono en la cocina, muchas veces de noche o en luz baja. Un **modo
oscuro** con **toggle** visible mejora la comodidad y ahorra batería en pantallas OLED. La nota del
backlog es correcta: **los tokens de `src/styles/theme.js` lo facilitan**, porque hoy TODO el color
de la app pasa por el objeto `colors` de ese archivo.

### Cómo se consume el color HOY (esto decide el enfoque)

Se auditaron `App.jsx` y los 6 componentes. El patrón es uniforme:

- Cada componente hace `import { colors, ... } from "../styles/theme.js"` y usa **estilos inline**
  del tipo `background: colors.surface`, `color: colors.ink`, `boxShadow: shadow.card`, etc.
  (`App.jsx`, `Header.jsx`, `RecipeSelector.jsx`, `WeightControl.jsx`, `IngredientList.jsx`,
  `StepList.jsx`, `Footer.jsx`).
- `colors` es un **objeto estático de hex** (`src/styles/theme.js`). Nadie lee un tema "activo".
- El **acento por receta** (`recipe.accent`, hex definido en `src/data/recipes.js`) se pasa como
  prop (`accent`) y se usa para títulos `h2`, el número grande de peso y el borde de la tab activa.
  **No** vive en `theme.js`.
- `src/styles/global.css` tiene **hex hardcodeados** en los estilos del `input[type="range"]`
  (track `#d8ccb4`, thumb `#2B2119`, borde `#FAF6EF`).
- `index.html` tiene `<meta name="theme-color" content="#B5652E">` (lo puso B-02).

### Enfoque elegido: CSS custom properties detrás del MISMO objeto `colors` (opción a, optimizada)

Se evaluaron las dos opciones del encargo:

- **(b) ThemeContext/estado React que provee la paleta activa.** Obligaría a que cada componente
  reciba la paleta por contexto o prop y cambie sus imports. Diff grande en los 7 archivos y
  re-render de todo el árbol al cambiar de tema. Rechazada por invasiva.
- **(a) CSS custom properties con `[data-theme="dark"]`.** En su forma ingenua obligaría a reescribir
  cada `colors.ink` a `"var(--color-ink)"` en los 7 archivos. Pero hay una variante **mínima**:

**Decisión — variante mínima de (a):** mantener el objeto `colors` (y `shadow`) de `theme.js` como
**único punto de import**, pero cambiar el **valor** de cada token de un hex a una referencia
`var(--color-*)`. Los hex reales se definen UNA vez en `global.css` bajo `:root` (claro) y
`[data-theme="dark"]` (oscuro). **Resultado: los 7 componentes NO se tocan** — siguen escribiendo
`color: colors.ink`, que ahora resuelve a `"var(--color-ink)"` y el navegador aplica el hex del tema
activo. Es lo menos invasivo posible y respeta al 100% la convención de CLAUDE.md ("estilos inline
apoyados en los tokens de `theme.js`"): los tokens siguen ahí, solo cambian de vehículo.

Ventajas: cambio de tema **instantáneo y sin re-render de React** (lo hace el CSS al poner
`data-theme` en `<html>`); diff concentrado en 4 archivos + 1 nuevo; el `input[type=range]` se adapta
solo al pasar sus hex a `var()`.

**Acentos por receta (`recipe.accent`)**: se **mantienen tal cual** (identidad de marca). Son naranjas
terracota de tono medio que sobre la superficie oscura (`#251E17`) conservan contraste suficiente para
**texto grande** y **elementos de UI** (el más bajo, `#A66B3F`, da ~3.8:1 ≥ 3:1 AA para large text/UI).
No entran en las CSS vars ni cambian. Se documenta como decisión consciente.

**`prefers-color-scheme`**: se respeta en la primera carga por JS (script inline en `index.html` +
inicializador del hook), no por media query en CSS. Así se evita duplicar el bloque de tokens oscuros
y una única fuente de verdad decide el tema. Un `@media (prefers-color-scheme)` en CSS solo serviría
con JS desactivado, caso en que una SPA React no renderiza igualmente; por eso se omite.

## Archivos a tocar/crear

1. **`src/styles/theme.js`** (editar) — cambiar los **valores** de `colors.*` y `shadow.*` de hex a
   `var(--color-*)` / `var(--shadow-*)`. `fonts`, `radius` y `layout` no cambian.
2. **`src/styles/global.css`** (editar) — añadir el bloque de variables `:root` (claro) y
   `[data-theme="dark"]` (oscuro) con TODOS los hex; declarar `color-scheme`; poner
   `background`/`color` en `body`; y reemplazar los hex hardcodeados del `input[type=range]` por
   `var(--...)`. Transición suave opcional guardada por `prefers-reduced-motion`.
3. **`src/hooks/useTheme.js`** (crear) — hook que gestiona el estado del tema: lee estado inicial
   (localStorage `panapp-theme` → si no, `prefers-color-scheme`), aplica `data-theme` a `<html>`,
   persiste, y sincroniza el `<meta name="theme-color">`. Expone `{ theme, toggle }`.
4. **`src/App.jsx`** (editar) — llamar `useTheme()` y pasar `theme` + `onToggleTheme` a `<Header>`.
5. **`src/components/Header.jsx`** (editar) — recibir `theme` + `onToggleTheme` y renderizar el
   **botón toggle** accesible arriba a la derecha del header.
6. **`index.html`** (editar) — añadir un **script inline anti-parpadeo (FOUC)** en `<head>` que fija
   `data-theme` antes de que React monte. El `<meta name="theme-color">` ya existe; no se duplica.

**No se tocan**: `src/lib/baker.js` ni sus tests (B-01), `src/data/recipes.js`, los componentes
`RecipeSelector`, `WeightControl`, `IngredientList`, `StepList`, `Footer` (heredan el color por los
tokens sin cambios), `vite.config.js`, PWA/`sw.js` (B-02). Sin nuevas dependencias.

## Reutilización

- **`src/styles/theme.js`** — se conserva como capa de tokens y único import de color de los
  componentes. Solo cambia el vehículo del valor (hex → `var()`).
- **Objeto `colors`/`shadow`** — los 5 componentes que no se editan (`RecipeSelector`,
  `WeightControl`, `IngredientList`, `StepList`, `Footer`) adoptan el modo oscuro **sin cambios**,
  gracias a que ya consumen los tokens.
- **`<meta name="theme-color">`** de B-02 (en `index.html`) — se reutiliza; el hook solo actualiza su
  atributo `content`.
- **Patrón de accesibilidad existente** (`prefers-reduced-motion`, `<label>` asociados) — se respeta;
  la transición de tema se guarda con la media query ya presente en `global.css`.

## Paleta oscura concreta (valores hex definitivos)

Identidad terracota/crema **invertida**: fondo marrón muy oscuro cálido, texto crema. Contrastes
verificados WCAG (AA): texto normal ≥ 4.5:1, texto grande/UI ≥ 3:1, sobre su fondo real.

| Token (CSS var)       | Claro `:root`               | Oscuro `[data-theme="dark"]` | Uso / fondo real         | Contraste oscuro |
|-----------------------|-----------------------------|------------------------------|--------------------------|------------------|
| `--color-bg`          | `#EDE4D3`                   | `#1A1511`                    | fondo de página          | —                |
| `--color-surface`     | `#FAF6EF`                   | `#251E17`                    | paneles/tarjetas         | —                |
| `--color-ink`         | `#2B2119`                   | `#F3EADB`                    | texto ppal / cifras      | ~15:1 s/ bg      |
| `--color-ink-soft`    | `#3B3226`                   | `#E0D5C4`                    | ítems (ingred./pasos)    | ~11:1 s/ surface |
| `--color-subtext`     | `#5A4E3F`                   | `#C3B7A2`                    | labels/subtítulos        | ~8:1 s/ surface  |
| `--color-eyebrow`     | `#6B7860`                   | `#8FA383`                    | "eyebrow" verde (s/ bg)  | ~6.7:1 s/ bg     |
| `--color-muted`       | `#837662`                   | `#A2947E`                    | subtítulo de tab         | ~5.5:1 s/ surface|
| `--color-faint`       | `#9A8D78`                   | `#9B8D74`                    | footer / rangos slider   | ~5:1 s/ surface  |
| `--color-border`      | `#d8ccb4`                   | `#3A3128`                    | bordes píldora / track   | UI               |
| `--color-divider`     | `#ECE3D0`                   | `#322A20`                    | línea entre ingredientes | UI               |
| `--color-tab-idle`    | `rgba(255,255,255,0.4)`     | `rgba(255,255,255,0.06)`     | fondo tab inactiva       | UI               |
| `--shadow-card`       | `0 6px 24px rgba(43,33,25,0.08)` | `0 6px 24px rgba(0,0,0,0.45)` | panel de peso       | —                |
| `--shadow-card-soft`  | `0 6px 24px rgba(43,33,25,0.06)` | `0 6px 24px rgba(0,0,0,0.35)` | paneles ingred./pasos | —              |
| `--shadow-tab`        | `0 4px 14px rgba(43,33,25,0.12)` | `0 4px 14px rgba(0,0,0,0.5)`  | tab activa          | —                |

`theme-color` (barra del navegador): claro `#B5652E` (valor actual, sin cambio); oscuro `#1A1511`.

## Pasos

### Paso 1 — `src/styles/theme.js`: tokens a `var()`

Reemplazar el objeto `colors` y el objeto `shadow` por versiones que apunten a variables CSS. Dejar
el hex original como comentario para trazabilidad. `fonts`, `radius`, `layout` **sin cambios**.

```js
export const colors = {
  bg: "var(--color-bg)",           // claro #EDE4D3
  surface: "var(--color-surface)", // claro #FAF6EF
  ink: "var(--color-ink)",         // claro #2B2119
  inkSoft: "var(--color-ink-soft)",// claro #3B3226
  subtext: "var(--color-subtext)", // claro #5A4E3F
  eyebrow: "var(--color-eyebrow)", // claro #6B7860
  muted: "var(--color-muted)",     // claro #837662
  faint: "var(--color-faint)",     // claro #9A8D78
  border: "var(--color-border)",   // claro #d8ccb4
  divider: "var(--color-divider)", // claro #ECE3D0
  tabIdle: "var(--color-tab-idle)",// claro rgba(255,255,255,0.4)
};

// fonts, radius: sin cambios

export const shadow = {
  card: "var(--shadow-card)",
  cardSoft: "var(--shadow-card-soft)",
  tab: "var(--shadow-tab)",
};

// layout: sin cambios
```

> Nota: los nombres de propiedad del objeto (`inkSoft`, `cardSoft`, `tabIdle`) **no cambian**, así
> los componentes siguen igual. Solo cambia el string valor.

### Paso 2 — `src/styles/global.css`: definir variables y adaptar el slider

Añadir al **inicio** del archivo (después del `@import` de fuentes) los bloques de variables:

```css
:root {
  color-scheme: light;
  --color-bg: #EDE4D3;
  --color-surface: #FAF6EF;
  --color-ink: #2B2119;
  --color-ink-soft: #3B3226;
  --color-subtext: #5A4E3F;
  --color-eyebrow: #6B7860;
  --color-muted: #837662;
  --color-faint: #9A8D78;
  --color-border: #d8ccb4;
  --color-divider: #ECE3D0;
  --color-tab-idle: rgba(255,255,255,0.4);
  --shadow-card: 0 6px 24px rgba(43,33,25,0.08);
  --shadow-card-soft: 0 6px 24px rgba(43,33,25,0.06);
  --shadow-tab: 0 4px 14px rgba(43,33,25,0.12);
}

[data-theme="dark"] {
  color-scheme: dark;
  --color-bg: #1A1511;
  --color-surface: #251E17;
  --color-ink: #F3EADB;
  --color-ink-soft: #E0D5C4;
  --color-subtext: #C3B7A2;
  --color-eyebrow: #8FA383;
  --color-muted: #A2947E;
  --color-faint: #9B8D74;
  --color-border: #3A3128;
  --color-divider: #322A20;
  --color-tab-idle: rgba(255,255,255,0.06);
  --shadow-card: 0 6px 24px rgba(0,0,0,0.45);
  --shadow-card-soft: 0 6px 24px rgba(0,0,0,0.35);
  --shadow-tab: 0 4px 14px rgba(0,0,0,0.5);
}
```

Actualizar la regla `body` para que el fondo detrás del árbol React también siga el tema (evita
blanco en overscroll) y añadir transición guardada:

```css
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-ink);
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

Reemplazar los hex hardcodeados del slider por variables (el resto de la regla igual):

```css
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);   /* antes #d8ccb4 */
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-ink);              /* antes #2B2119 */
  border: 4px solid var(--color-surface);    /* antes #FAF6EF */
  box-shadow: 0 0 0 1px var(--color-ink);    /* antes #2B2119 */
  cursor: pointer;
}
input[type="range"]::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-ink);              /* antes #2B2119 */
  box-shadow: 0 0 0 1px var(--color-ink);    /* antes #2B2119 */
  cursor: pointer;
  border: none;
}
```

Añadir la transición de `body` a la excepción de movimiento reducido ya existente:

```css
@media (prefers-reduced-motion: reduce) {
  .recipe-tab { transition: none; }
  body { transition: none; }
}
```

### Paso 3 — `src/hooks/useTheme.js` (nuevo)

```js
import { useEffect, useState } from "react";

const STORAGE_KEY = "panapp-theme";

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage no disponible (modo privado): se ignora
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // sin persistencia si localStorage no está disponible
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#1A1511" : "#B5652E");
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
```

> Frontera con **B-03** (persistir receta/peso): este hook persiste **solo el tema** bajo su propia
> clave `panapp-theme`. No toca receta ni peso. B-03 usará su(s) propia(s) clave(s) (p. ej.
> `panapp-recipe`, `panapp-weight`) y su propio hook. No hay solape ni dependencia.

### Paso 4 — `src/App.jsx`: cablear el hook y pasar props al Header

Añadir el import y la llamada; pasar `theme` y `onToggleTheme` a `<Header>`. El `<div>` raíz no
cambia (sigue usando `colors.bg`/`colors.ink`, ahora variables).

```jsx
import { useTheme } from "./hooks/useTheme.js";
// ...imports existentes...

export default function App() {
  const { recipes, activeId, setActiveId, targetWeight, setTargetWeight, recipe, scaled } =
    useRecipeScaling();
  const { theme, toggle } = useTheme();

  return (
    <div style={{ /* igual que ahora */ }}>
      <Header theme={theme} onToggleTheme={toggle} />
      {/* ...resto igual... */}
    </div>
  );
}
```

### Paso 5 — `src/components/Header.jsx`: botón toggle accesible

Recibir las dos props y añadir una fila superior con el botón alineado a la derecha (encima del
"eyebrow"). Usar tokens existentes para el estilo (nada hardcodeado). Emoji como icono + `aria-label`
descriptivo de la acción + `aria-pressed`.

```jsx
import { colors, fonts, layout } from "../styles/theme.js";

export default function Header({ theme, onToggleTheme }) {
  const isDark = theme === "dark";
  return (
    <header style={{ padding: "3rem 1.5rem 1.5rem", maxWidth: layout.maxWidth, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
          aria-pressed={isDark}
          style={{
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.subtext,
            borderRadius: "999px",
            padding: "0.4rem 0.85rem",
            fontFamily: fonts.sans,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
          {isDark ? "Claro" : "Oscuro"}
        </button>
      </div>
      {/* eyebrow, h1 y p: EXACTAMENTE como están ahora, sin cambios */}
    </header>
  );
}
```

> El resto del contenido del header (eyebrow, `h1`, `p`) se mantiene idéntico; solo se envuelve por
> encima con la fila del botón.

### Paso 6 — `index.html`: script anti-parpadeo (FOUC)

Insertar en `<head>`, **antes** de `<script type="module" src="/src/main.jsx">` (puede ir justo antes
de `</head>` o tras el `<title>`), un script inline que fija `data-theme` en `<html>` antes de pintar,
usando la misma lógica que el hook. Así no hay flash de tema claro al cargar en modo oscuro.

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('panapp-theme');
      if (t !== 'light' && t !== 'dark') {
        t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  })();
</script>
```

El `<meta name="theme-color" content="#B5652E">` **ya existe** (B-02); no se duplica. El hook lo
actualiza en runtime según el tema.

## Verificación (end-to-end)

Ejecutar desde la raíz del proyecto:

1. **Tests (no regresión B-01):**
   `npm test` → deben pasar **10/10** (baker.js no se tocó).

2. **Build de producción:**
   `npm run build` → termina **sin errores** y genera `dist/` (PWA de B-02 intacta:
   `sw.js` + `manifest.webmanifest` presentes).

3. **Dev / comportamiento del toggle:** `npm run dev`, abrir http://localhost:5173.
   - Se ve el **botón toggle** arriba a la derecha del header.
   - Click → la app pasa a **oscuro** (fondo marrón muy oscuro, texto crema); segundo click → vuelve
     a **claro**. El cambio es inmediato y afecta a header, tabs, panel de peso, listas y footer.
   - El **slider** (track + thumb) se ve correcto en ambos temas (thumb claro sobre track oscuro en
     dark).
   - Los **acentos de receta** (títulos, número de peso, borde de tab activa) siguen en su naranja de
     marca y se leen bien sobre el panel oscuro.

4. **Persistencia (clave propia, frontera B-03):**
   - Con la app en oscuro, DevTools → Application → Local Storage → existe `panapp-theme` = `"dark"`.
   - **Recargar** (F5): la app abre directamente en oscuro, **sin parpadeo** claro (gracias al script
     de `index.html`).

5. **`prefers-color-scheme` en primera carga:**
   - Borrar `panapp-theme` (Local Storage) → DevTools → Rendering → "Emulate CSS
     prefers-color-scheme: dark" → recargar: la app abre en **oscuro** por defecto.
   - Cambiar la emulación a `light` y recargar (con la clave aún borrada): abre en **claro**.

6. **`theme-color` de la PWA:**
   - En Elements, inspeccionar `<meta name="theme-color">`: su `content` es `#1A1511` en oscuro y
     `#B5652E` en claro, y **cambia al pulsar el toggle**.

7. **Contraste / accesibilidad:**
   - Texto principal e ítems legibles en oscuro (ver tabla de contrastes; todo ≥ AA en su fondo).
   - El botón toggle tiene `aria-label` que cambia según el estado y `aria-pressed` refleja el tema.
   - Con "Emulate prefers-reduced-motion: reduce", el cambio de tema no anima el `body`.

## Fuera de alcance

- **B-03** (persistir receta/peso favoritos en `localStorage`): item separado. Aquí solo se persiste
  el **tema** bajo `panapp-theme`; no se toca la selección de receta ni el peso.
- **Recolorear los acentos por receta** para dark: se mantienen los hex de `src/data/recipes.js` por
  identidad de marca (cumplen contraste de texto grande/UI). Un ajuste fino de acentos sería otro item.
- **Selector de 3 estados** (claro/oscuro/"sistema" explícito) o seguir cambios de
  `prefers-color-scheme` en caliente: aquí es toggle binario claro/oscuro; el sistema solo decide el
  valor inicial cuando no hay preferencia guardada.
- **Migrar el resto de estilos inline a CSS** o refactorizar componentes: no se toca su estructura.
- Cambios en `baker.js`, datos de recetas, PWA/service worker, `vite.config.js` o dependencias.
