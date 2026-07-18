# CLAUDE.md — Pan App

Contexto del proyecto para todos los agentes. **Fuente de verdad de las convenciones.**

## Qué es
App web (React + Vite) que muestra recetas de pan y **escala los ingredientes por porcentaje de
panadero**: cada ingrediente tiene un `pct` respecto a la harina (=100%), y todo se reescala
linealmente al **peso total de masa** que elija el usuario. Es una **PWA** (instalable + offline),
con **modo claro/oscuro**, y se despliega gratis en **Netlify** para usarse desde el móvil.

## Estado
- **v1 funcional y en git.** Repo inicializado (rama `main`). Completados: **B-00** (scaffold Vite +
  refactor modular), **B-01** (tests de `baker.js` con Vitest), **B-02** (PWA), **B-04** (modo
  oscuro). Ver `docs/BACKLOG.md` para lo pendiente y `docs/plans/` para el plan de cada item.
- `BreadApp.jsx` (componente monolítico original) se conserva en la raíz **solo como referencia
  histórica**; la app real vive en `src/`. No es parte del build.

## Modelo de dominio (no romper)
- **Porcentaje de panadero**: `src/lib/baker.js` contiene `scaleRecipe(recipe, targetWeightG)` y
  `formatAmount(n)` (movidas verbatim desde `BreadApp.jsx`). Reutilizarlas, no duplicarlas.
- `scaleRecipe` suma todos los `pct` (incluye 100 de harina + resto), calcula un `factor` para que
  la masa total = `targetWeight`, y devuelve cada ingrediente con su `amount` real en g/ml.
- **`baker.js` está cubierto por tests** (`src/lib/baker.test.js`). Cualquier cambio a esa lógica
  debe actualizar sus tests en el mismo item (ver B-09, observación sobre `formatAmount` cerca de 10).

## Estructura actual
```
src/
  data/recipes.js           # array RECIPES (fuente de datos)
  lib/baker.js              # lógica pura (scaleRecipe, formatAmount) — testeable
  lib/baker.test.js         # tests Vitest de la lógica pura
  hooks/useRecipeScaling.js # estado receta activa + peso → ingredientes escalados
  hooks/useTheme.js         # estado del tema claro/oscuro (persiste en localStorage)
  components/               # Header, RecipeSelector, WeightControl, IngredientList, StepList, Footer
  styles/theme.js          # tokens de diseño; los colores/sombras apuntan a var(--…) de CSS
  styles/global.css        # reset, @import fuentes, estilos del input range, y las variables de
                           #   tema en :root (claro) y [data-theme="dark"] (oscuro)
  App.jsx  main.jsx
```

## Convenciones de código
- **React funcional** con hooks. Componentes de presentación simples y "tontos".
- **Estilos inline** apoyados en los **tokens de `src/styles/theme.js`** (no reintroducir colores ni
  fuentes hardcodeados sueltos). Identidad visual: paleta terracota/crema, fuentes Fraunces
  (títulos) + Inter (texto).
- **Theming**: los colores en `theme.js` resuelven a **CSS custom properties** (`var(--color-*)`)
  definidas en `global.css` bajo `:root` y `[data-theme="dark"]`. Para agregar/cambiar colores,
  edita ambos bloques; así el modo oscuro se mantiene solo. El tema se controla con `useTheme` (clave
  localStorage `panapp-theme`, respeta `prefers-color-scheme`).
- **Lógica pura** (cálculo) vive en `src/lib/`, sin dependencias de React → fácil de testear. Añade
  tests para lógica nueva.
- **No añadir dependencias** sin justificación en el plan.
- **Accesibilidad**: respetar `prefers-reduced-motion`, `<label>` asociados y `aria-*` en controles
  (p. ej. el toggle de tema usa `aria-label` dinámico + `aria-pressed`).
- **PWA**: la app usa `vite-plugin-pwa` con `injectRegister: auto` (no se registra el SW a mano en
  `src/`). El modo instalable/offline solo se comprueba en `build` + `preview`, no en `dev`.

## Comandos
- `npm run dev` — servidor de desarrollo (Vite, http://localhost:5173). Sin service worker.
- `npm run build` — build de producción a `dist/` (genera también `sw.js` + `manifest.webmanifest`).
- `npm run preview` — sirve el build localmente (aquí sí se puede probar la PWA).
- `npm test` — tests con Vitest (`vitest run`). `npm run test:watch` para modo watch.

## Deploy
Netlify, tier gratuito. Config en `netlify.toml` (`publish = dist`, redirect SPA `/* → /index.html`,
headers de caché para `sw.js`/manifest). Ver `README.md` para las 3 formas de desplegar.

## Git / commits
El proyecto **ya es un repositorio git** (rama `main`). **El usuario gestiona los commits él mismo**
— los agentes NO deben hacer `git commit`/`push` ni `git init`. Limítate a dejar los cambios en el
working tree y reportar qué se modificó.

## Flujo agéntico
Ver `docs/AGENTIC_WORKFLOW.md` y `GUIA_DE_PROGRAMACION.md`. Resumen: `gestor-backlog` (Opus)
prioriza → `plan-panadero` (Opus) diseña el plan en `docs/plans/` → `implementador` (Sonnet 5)
ejecuta. Cada agente fija su modelo en el `model:` de `.claude/agents/`.
