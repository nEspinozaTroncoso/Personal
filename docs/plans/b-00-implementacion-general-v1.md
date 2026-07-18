# Plan de ejecución — B-00: Implementación general v1

> Item de backlog: **B-00** — Implementación general v1 (scaffold Vite + refactor modular + deploy Netlify).
> Autor: `plan-panadero` (Opus). Ejecutor: `implementador` (Sonnet 5).
> Este plan es **prescriptivo**: sigue las instrucciones y el código literal indicado. No tomes
> decisiones de diseño abiertas. Donde se da contenido de archivo completo, escríbelo tal cual.

---

## Contexto

Punto de partida: un único archivo `BreadApp.jsx` (~540 líneas) en la raíz del proyecto. Es un
componente React monolítico con estilos inline que calcula recetas de pan por **porcentaje de
panadero** (6 recetas, slider de peso 200 g–2.5 kg). No hay build ni forma de desplegarlo.

Meta de la v1: convertir eso en una **web app responsive** con estructura modular (datos / lógica /
UI separados), buildable con **Vite + React 18** y desplegable **gratis en Netlify**. El refactor
**no cambia comportamiento ni aspecto**: mismos cálculos, misma paleta terracota/crema, mismas
fuentes (Fraunces + Inter). El único cambio funcional permitido es responsive: en pantallas
`>720px`, la lista de ingredientes y la de pasos van en **2 columnas**; en móvil, apiladas.

`BreadApp.jsx` **no se borra** en este plan; queda como referencia hasta validar la v1.

**Reglas duras de este plan:**
- NO ejecutar `git init` ni `git commit`/`push`.
- NO añadir dependencias fuera de las listadas (React 18, ReactDOM 18, Vite, `@vitejs/plugin-react`).
- NO tocar la lógica de `scaleRecipe`/`formatAmount` ni los `pct` de las recetas.
- NADA de PWA/service worker/manifest, tests, ni integración de APIs (backlog posterior).

---

## Archivos a tocar/crear

Rutas relativas a la raíz `C:\Users\xxnic\workspace\Personal`.

### Scaffold Vite (nuevos)
- `package.json` — deps y scripts `dev`/`build`/`preview`.
- `vite.config.js` — plugin React.
- `index.html` — HTML raíz con `<meta viewport>` y `<div id="root">`.
- `.gitignore` — ignora `node_modules`, `dist`, logs, `.DS_Store`.
- `public/favicon.svg` — favicon simple (emoji/glyph de pan en SVG).
- `src/main.jsx` — punto de entrada React que monta `<App/>` e importa `global.css`.

### Producto refactorizado (nuevos)
- `src/data/recipes.js` — array `RECIPES` movido tal cual desde `BreadApp.jsx`.
- `src/lib/baker.js` — `scaleRecipe` y `formatAmount` movidas tal cual.
- `src/styles/theme.js` — tokens de diseño (colores, fuentes, radios, sombras, layout).
- `src/styles/global.css` — reset, `@import` de fuentes, estilos del `input[type=range]`, la
  clase `.recipe-tab` y su hover, `prefers-reduced-motion`, y el grid responsive de la zona
  principal (`.recipe-main`).
- `src/hooks/useRecipeScaling.js` — estado (receta activa + peso) y los `useMemo`.
- `src/components/Header.jsx`
- `src/components/RecipeSelector.jsx`
- `src/components/WeightControl.jsx`
- `src/components/IngredientList.jsx`
- `src/components/StepList.jsx`
- `src/components/Footer.jsx`
- `src/App.jsx` — compone todo (ex-`BreadApp`, sin el `<style>` inline ni la lógica pura).

### Deploy y docs (nuevos)
- `netlify.toml` — `publish = dist`, build command, redirect SPA `/* → /index.html`.
- `README.md` — instrucciones de deploy (Netlify Drop / CLI / repo) y de uso en móvil.

### Se conserva sin tocar
- `BreadApp.jsx` (referencia).
- `CLAUDE.md`, `docs/*`, `.claude/*`, `GUIA_DE_PROGRAMACION.md`.

---

## Reutilización

Aprovechar el código que **ya existe** en `BreadApp.jsx` — copiar, no reescribir:

- **`scaleRecipe(recipe, targetWeightG)`** — `BreadApp.jsx` líneas 176–183. Se mueve **verbatim** a
  `src/lib/baker.js`. Es el corazón del modelo de % de panadero; no alterar.
- **`formatAmount(n)`** — `BreadApp.jsx` líneas 185–188. Se mueve **verbatim** a `src/lib/baker.js`.
- **`const RECIPES = [...]`** — `BreadApp.jsx` líneas 11–171. Se mueve **verbatim** a
  `src/data/recipes.js` (solo se le antepone `export`). No cambiar ningún `pct`, `accent`, `name`,
  `steps`, etc.
- **Estado + `useMemo`** — `BreadApp.jsx` líneas 191–201. Se encapsulan en
  `src/hooks/useRecipeScaling.js`.
- **Bloque `<style>`** — `BreadApp.jsx` líneas 214–256. Se mueve a `src/styles/global.css`.
- **Estilos inline y valores de color/fuente** — se factorizan en `src/styles/theme.js` y se
  referencian desde los componentes, manteniendo exactamente los mismos valores visuales.

---

## Pasos

Ejecuta en orden. El contenido de archivo dado es literal salvo donde diga "copiar de BreadApp.jsx".

### Paso 1 — `package.json`

```json
{
  "name": "pan-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
```

### Paso 2 — `vite.config.js`

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

### Paso 3 — `index.html`

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Cuaderno de panadería</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Paso 4 — `.gitignore`

```gitignore
node_modules
dist
dist-ssr
*.local
.DS_Store
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### Paso 5 — `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#EDE4D3"/>
  <text x="32" y="44" font-size="36" text-anchor="middle">🍞</text>
</svg>
```

### Paso 6 — `src/data/recipes.js`

Copiar **verbatim** el array `RECIPES` de `BreadApp.jsx` (líneas 11–171, incluye el comentario de
cabecera de las líneas 3–9 si se desea documentar). Anteponer `export` a la declaración:

```js
export const RECIPES = [
  // ... contenido idéntico a BreadApp.jsx líneas 12–171 (los 6 objetos de receta) ...
];
```

No modificar ningún valor. Verificar que quedan las 6 recetas: `molde-7030`, `molde-tradicional`,
`brioche`, `hallulla`, `hamburguesa`, `baguette`.

### Paso 7 — `src/lib/baker.js`

Copiar **verbatim** las dos funciones de `BreadApp.jsx` (líneas 176–188), exportándolas:

```js
// Convierte la lista de %-panadero a gramos/ml reales dado un peso final deseado.
// Suma todos los pct (que ya incluyen 100 de harina + resto de ingredientes),
// obtiene el "factor" para que la masa total resultante sea igual a targetWeight.
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

### Paso 8 — `src/styles/theme.js`

Tokens con los valores exactos usados en `BreadApp.jsx`. Escribir literal:

```js
export const colors = {
  bg: "#EDE4D3",         // fondo de página
  surface: "#FAF6EF",    // paneles/tarjetas (crema)
  ink: "#2B2119",        // texto principal
  inkSoft: "#3B3226",    // texto de ítems
  subtext: "#5A4E3F",    // subtítulos/labels
  eyebrow: "#6B7860",    // "eyebrow" verde del header
  muted: "#837662",      // subtítulo de receta
  faint: "#9A8D78",      // texto tenue (rangos, footer)
  border: "#d8ccb4",     // bordes de píldoras / pista del slider
  divider: "#ECE3D0",    // línea divisoria entre ingredientes
  tabIdle: "rgba(255,255,255,0.4)", // fondo de tab inactiva
};

export const fonts = {
  serif: "'Fraunces', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

export const radius = {
  tab: "14px",
  card: "18px",
  pill: "999px",
};

export const shadow = {
  card: "0 6px 24px rgba(43,33,25,0.08)",     // panel de peso
  cardSoft: "0 6px 24px rgba(43,33,25,0.06)", // paneles ingredientes/pasos
  tab: "0 4px 14px rgba(43,33,25,0.12)",      // tab activa
};

export const layout = {
  maxWidth: 960,
};
```

### Paso 9 — `src/styles/global.css`

Mover el bloque `<style>` de `BreadApp.jsx` (líneas 214–256) y **añadir** el grid responsive de la
zona principal. Contenido completo:

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }
body { margin: 0; }

.recipe-tab {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.recipe-tab:hover {
  transform: translateY(-2px);
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #d8ccb4;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2B2119;
  border: 4px solid #FAF6EF;
  box-shadow: 0 0 0 1px #2B2119;
  cursor: pointer;
}
input[type="range"]::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2B2119;
  box-shadow: 0 0 0 1px #2B2119;
  cursor: pointer;
  border: none;
}

/* Zona principal: 1 columna en móvil, 2 columnas en pantallas anchas */
.recipe-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}
@media (min-width: 721px) {
  .recipe-main {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .recipe-tab { transition: none; }
}
```

> Nota: en el original el `::-moz-range-thumb` traía `border: 4px solid #FAF6EF` seguido de
> `border: none;` (el segundo gana). Aquí se deja solo `border: none;` para preservar el resultado
> visual real. No es un cambio de aspecto.

### Paso 10 — `src/hooks/useRecipeScaling.js`

Encapsula el estado y los `useMemo` de `BreadApp.jsx` (líneas 191–201):

```js
import { useState, useMemo } from "react";
import { RECIPES } from "../data/recipes.js";
import { scaleRecipe } from "../lib/baker.js";

export function useRecipeScaling() {
  const [activeId, setActiveId] = useState(RECIPES[0].id);
  const [targetWeight, setTargetWeight] = useState(1000);

  const recipe = useMemo(
    () => RECIPES.find((r) => r.id === activeId),
    [activeId]
  );
  const scaled = useMemo(
    () => scaleRecipe(recipe, targetWeight),
    [recipe, targetWeight]
  );

  return {
    recipes: RECIPES,
    activeId,
    setActiveId,
    targetWeight,
    setTargetWeight,
    recipe,
    scaled,
  };
}
```

### Paso 11 — Componentes

Todos usan estilos inline apoyados en `theme.js`. Los valores visuales deben coincidir con el
original. Escribir cada archivo tal como se indica.

**`src/components/Header.jsx`** (de `BreadApp.jsx` 259–296, textos idénticos):

```jsx
import { colors, fonts, layout } from "../styles/theme.js";

export default function Header() {
  return (
    <header style={{ padding: "3rem 1.5rem 1.5rem", maxWidth: layout.maxWidth, margin: "0 auto" }}>
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: "0.85rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: colors.eyebrow,
          marginBottom: "0.5rem",
          fontWeight: 600,
        }}
      >
        Cuaderno de panadería
      </div>
      <h1
        style={{
          fontFamily: fonts.serif,
          fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
          fontWeight: 700,
          margin: 0,
          lineHeight: 1.05,
        }}
      >
        Seis panes, un solo peso.
      </h1>
      <p
        style={{
          marginTop: "0.9rem",
          fontSize: "1.05rem",
          color: colors.subtext,
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        Elige una receta, decide cuánto pan quieres hoy, y cada ingrediente se ajusta solo — en
        gramos y mililitros.
      </p>
    </header>
  );
}
```

**`src/components/RecipeSelector.jsx`** (de `BreadApp.jsx` 299–343). Props:
`{ recipes, activeId, onSelect }`.

```jsx
import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";

export default function RecipeSelector({ recipes, activeId, onSelect }) {
  return (
    <nav
      style={{
        maxWidth: layout.maxWidth,
        margin: "0 auto",
        padding: "0 1.5rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.6rem",
      }}
    >
      {recipes.map((r) => {
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
  );
}
```

**`src/components/WeightControl.jsx`** (de `BreadApp.jsx` 346–434). Props:
`{ targetWeight, onChange, accent }`. `onChange` recibe un `number`.

```jsx
import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";

export default function WeightControl({ targetWeight, onChange, accent }) {
  return (
    <section
      style={{
        maxWidth: layout.maxWidth,
        margin: "2.2rem auto 0",
        padding: "1.6rem 1.8rem",
        background: colors.surface,
        borderRadius: radius.card,
        marginLeft: "1.5rem",
        marginRight: "1.5rem",
        boxShadow: shadow.card,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.9rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <label
          htmlFor="weight-slider"
          style={{ fontFamily: fonts.serif, fontSize: "1rem", fontWeight: 600, color: colors.subtext }}
        >
          Peso total de la masa
        </label>
        <div style={{ fontFamily: fonts.serif, fontSize: "2rem", fontWeight: 700, color: accent }}>
          {targetWeight >= 1000
            ? `${(targetWeight / 1000).toFixed(targetWeight % 1000 === 0 ? 0 : 1)} kg`
            : `${targetWeight} g`}
        </div>
      </div>
      <input
        id="weight-slider"
        type="range"
        min={200}
        max={2500}
        step={50}
        value={targetWeight}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: colors.faint,
          marginTop: "0.4rem",
        }}
      >
        <span>200 g</span>
        <span>2.5 kg</span>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
        {[500, 1000, 1500, 2000].map((w) => (
          <button
            key={w}
            onClick={() => onChange(w)}
            style={{
              cursor: "pointer",
              border: `1px solid ${colors.border}`,
              background: targetWeight === w ? colors.ink : "transparent",
              color: targetWeight === w ? colors.surface : colors.subtext,
              borderRadius: radius.pill,
              padding: "0.35rem 0.9rem",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {w >= 1000 ? `${w / 1000} kg` : `${w} g`}
          </button>
        ))}
      </div>
    </section>
  );
}
```

**`src/components/IngredientList.jsx`** (de `BreadApp.jsx` 447–495). Props:
`{ recipeName, accent, scaled }`. Importa `formatAmount` de `baker.js`.

```jsx
import { colors, fonts, radius, shadow } from "../styles/theme.js";
import { formatAmount } from "../lib/baker.js";

export default function IngredientList({ recipeName, accent, scaled }) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radius.card,
        padding: "1.6rem 1.8rem",
        boxShadow: shadow.cardSoft,
      }}
    >
      <h2 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0 0 1rem", color: accent }}>
        Ingredientes — {recipeName}
      </h2>
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {scaled.map((ing) => (
          <div
            key={ing.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "0.5rem 0",
              borderBottom: `1px solid ${colors.divider}`,
            }}
          >
            <span style={{ fontSize: "0.98rem", color: colors.inkSoft }}>{ing.name}</span>
            <span
              style={{
                fontFamily: fonts.serif,
                fontWeight: 600,
                fontSize: "1.05rem",
                whiteSpace: "nowrap",
                marginLeft: "1rem",
                color: colors.ink,
              }}
            >
              {formatAmount(ing.amount)} {ing.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**`src/components/StepList.jsx`** (de `BreadApp.jsx` 497–522). Props: `{ steps, accent }`.

```jsx
import { colors, fonts, radius, shadow } from "../styles/theme.js";

export default function StepList({ steps, accent }) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radius.card,
        padding: "1.6rem 1.8rem",
        boxShadow: shadow.cardSoft,
      }}
    >
      <h2 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0 0 1rem", color: accent }}>
        Procedimiento
      </h2>
      <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.65rem" }}>
        {steps.map((step, i) => (
          <li key={i} style={{ fontSize: "0.97rem", color: colors.inkSoft, lineHeight: 1.5 }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

**`src/components/Footer.jsx`** (de `BreadApp.jsx` 525–537, texto idéntico):

```jsx
import { colors, layout } from "../styles/theme.js";

export default function Footer() {
  return (
    <footer
      style={{
        maxWidth: layout.maxWidth,
        margin: "2.5rem auto 0",
        padding: "0 1.5rem",
        fontSize: "0.8rem",
        color: colors.faint,
      }}
    >
      Las cantidades se calculan por porcentaje de panadero, así que la proporción entre
      ingredientes se mantiene sin importar cuánto pan quieras hacer.
    </footer>
  );
}
```

### Paso 12 — `src/App.jsx`

Compone todo. El contenedor raíz mantiene el fondo/tipografía del original. La zona principal usa
`className="recipe-main"` (grid responsive definido en `global.css`) en vez del grid inline.

```jsx
import Header from "./components/Header.jsx";
import RecipeSelector from "./components/RecipeSelector.jsx";
import WeightControl from "./components/WeightControl.jsx";
import IngredientList from "./components/IngredientList.jsx";
import StepList from "./components/StepList.jsx";
import Footer from "./components/Footer.jsx";
import { useRecipeScaling } from "./hooks/useRecipeScaling.js";
import { colors, fonts, layout } from "./styles/theme.js";

export default function App() {
  const { recipes, activeId, setActiveId, targetWeight, setTargetWeight, recipe, scaled } =
    useRecipeScaling();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: fonts.sans,
        paddingBottom: "4rem",
      }}
    >
      <Header />
      <RecipeSelector recipes={recipes} activeId={activeId} onSelect={setActiveId} />
      <WeightControl targetWeight={targetWeight} onChange={setTargetWeight} accent={recipe.accent} />
      <main
        className="recipe-main"
        style={{
          maxWidth: layout.maxWidth,
          margin: "2rem auto 0",
          padding: "0 1.5rem",
        }}
      >
        <IngredientList recipeName={recipe.name} accent={recipe.accent} scaled={scaled} />
        <StepList steps={recipe.steps} accent={recipe.accent} />
      </main>
      <Footer />
    </div>
  );
}
```

### Paso 13 — `src/main.jsx`

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Paso 14 — `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Paso 15 — `README.md`

Crear con estas secciones (contenido guía; mantener claro y en español):

- **Pan App** — 1 línea: recetas de pan que se escalan por porcentaje de panadero.
- **Requisitos**: Node 18+ y npm.
- **Desarrollo**:
  - `npm install`
  - `npm run dev` → abre `http://localhost:5173`
  - `npm run build` → genera `dist/`
  - `npm run preview` → sirve el build local
- **Deploy en Netlify (gratis)** — describir las 3 vías:
  1. **Netlify Drop**: correr `npm run build` y arrastrar la carpeta `dist/` a
     `https://app.netlify.com/drop`.
  2. **Netlify CLI**: `npm i -g netlify-cli`, luego `netlify deploy` (borrador) y
     `netlify deploy --prod` (producción); publish dir = `dist`.
  3. **Repo Git**: cuando el usuario cree el repo, conectar en Netlify; toma la config de
     `netlify.toml` automáticamente (build `npm run build`, publish `dist`).
- **Uso en el móvil**: abrir la URL pública de Netlify en el navegador del teléfono; opcionalmente
  "Agregar a pantalla de inicio". La app es responsive: en el teléfono los bloques se apilan; en
  pantallas anchas (`>720px`) ingredientes y procedimiento van en 2 columnas.

### Paso 16 — Instalar y verificar

Ejecutar `npm install` en la raíz y luego seguir la sección **Verificación**.

---

## Verificación (end-to-end)

Ejecutar en la raíz `C:\Users\xxnic\workspace\Personal`.

1. **Instalación**
   - `npm install` → termina sin errores; se crea `node_modules/` y `package-lock.json`.

2. **Build de producción**
   - `npm run build` → termina con éxito, sin errores de import ni de sintaxis; genera `dist/` con
     `index.html` y assets. Es la comprobación mínima obligatoria antes de dar por hecho el item.

3. **Servidor de desarrollo** (`npm run dev`, abrir `http://localhost:5173`)
   - Aparecen las **6 recetas** en el selector; al hacer click cambia la receta activa (borde y
     sombra con su `accent`, y cambia el título "Ingredientes — …" y los pasos).
   - El **slider** (200 g–2.5 kg, paso 50) reescala los ingredientes en vivo. Los **presets**
     (500 g / 1 kg / 1.5 kg / 2 kg) fijan el peso y quedan resaltados.
   - **Paridad de cálculo con el original**: seleccionar **Baguette** con peso **1000 g**. Con
     `pct` = harina 100 + levadura 1 + agua 68 + sal 2 = **171**; `factor = 1000/171 ≈ 5.848`.
     Debe mostrar aprox.: Harina **585 g**, Levadura **5.8 g**, Agua **398 ml**, Sal **11.7 g**
     (redondeo de `formatAmount`: <10 → 1 decimal, ≥10 → entero). Debe coincidir con lo que produce
     `BreadApp.jsx`.

4. **Responsive**
   - Con DevTools en ~**375px** (móvil): todo se apila en una columna y es legible; el header,
     selector, control de peso, ingredientes y pasos se ven completos sin scroll horizontal.
   - En ancho **>720px** (p. ej. 1000px): **IngredientList** y **StepList** aparecen lado a lado en
     **2 columnas** (clase `.recipe-main`).

5. **Preview del build**
   - `npm run preview` → sirve `dist/` localmente; la app se ve idéntica a `npm run dev`.

6. **Deploy (manual, opcional en esta fase)**
   - Arrastrar `dist/` a Netlify Drop → abrir la URL pública en el teléfono y confirmar que carga y
     es usable. El redirect SPA de `netlify.toml` evita 404 en rutas.

7. **Sin cambio de aspecto**
   - Comparación visual rápida contra el render de `BreadApp.jsx`: misma paleta terracota/crema,
     mismas fuentes (Fraunces títulos / Inter texto), mismos radios y sombras. Único cambio: las 2
     columnas en escritorio.

---

## Fuera de alcance

- **PWA / offline** (manifest, service worker) — item B-02.
- **Tests unitarios** (Vitest sobre `baker.js`) — item B-01. No añadir Vitest ni el script
  `npm test` en este plan.
- **Integración de APIs de recetas** — item B-06.
- **localStorage**, **modo oscuro**, **buscador**, **i18n**, **compartir por URL** — B-03…B-08.
- **`git init` / commits / push** — lo hará el usuario después.
- **Rediseño visual** o cambios de contenido de recetas/pasos.
- **Borrar `BreadApp.jsx`** — se conserva como referencia hasta validar la v1.
