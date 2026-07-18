# CLAUDE.md — Pan App

Contexto del proyecto para todos los agentes. **Fuente de verdad de las convenciones.**

## Qué es
App web (React + Vite) que muestra recetas de pan y **escala los ingredientes por porcentaje de
panadero**: cada ingrediente tiene un `pct` respecto a la harina (=100%), y todo se reescala
linealmente al **peso total de masa** que elija el usuario. Se despliega gratis en **Netlify** y se
usa desde el navegador del teléfono.

## Estado
- **Fase actual**: planificación e infraestructura agéntica listas; **implementación general v1
  pendiente** (ver `docs/IMPLEMENTATION_PLAN.md`, item `B-00`).
- El archivo original `BreadApp.jsx` (componente monolítico) es la referencia a refactorizar; no se
  borra hasta que la v1 modular funcione.

## Modelo de dominio (no romper)
- **Porcentaje de panadero**: `src/lib/baker.js` contendrá `scaleRecipe(recipe, targetWeightG)` y
  `formatAmount(n)`, movidas tal cual desde `BreadApp.jsx`. Reutilizarlas, no duplicarlas.
- `scaleRecipe` suma todos los `pct` (incluye 100 de harina + resto), calcula un `factor` para que
  la masa total = `targetWeight`, y devuelve cada ingrediente con su `amount` real en g/ml.

## Estructura objetivo (cuando exista la v1)
```
src/
  data/recipes.js          # array RECIPES (fuente de datos)
  lib/baker.js             # lógica pura (scaleRecipe, formatAmount) — testeable
  hooks/useRecipeScaling.js
  components/               # Header, RecipeSelector, WeightControl, IngredientList, StepList, Footer
  styles/theme.js          # tokens de diseño (colores, fuentes, radios, sombras)
  styles/global.css        # reset + @import fuentes + estilos del input range
  App.jsx  main.jsx
```

## Convenciones de código
- **React funcional** con hooks. Componentes de presentación simples y "tontos".
- **Estilos inline** apoyados en los **tokens de `src/styles/theme.js`** (no reintroducir colores
  ni fuentes hardcodeados sueltos). Mismo aspecto que el original: paleta terracota/crema, fuentes
  Fraunces (títulos) + Inter (texto).
- **Lógica pura** (cálculo) vive en `src/lib/`, sin dependencias de React → fácil de testear.
- No añadir dependencias sin justificación en el plan.
- Accesibilidad: respetar `prefers-reduced-motion` y `<label>` asociados (ya presentes en el
  original).

## Comandos
- `npm run dev` — servidor de desarrollo (Vite, http://localhost:5173)
- `npm run build` — build de producción a `dist/`
- `npm run preview` — sirve el build localmente
- `npm test` — tests (cuando se agregue Vitest, item B-01)

## Deploy
Netlify, tier gratuito. Config en `netlify.toml` (`publish = dist`, redirect SPA `/* → /index.html`).
El repo git lo crea el usuario cuando la app esté funcional; **no** hacer `git commit`/`push` salvo
que se pida explícitamente.

## Flujo agéntico
Ver `docs/AGENTIC_WORKFLOW.md`. Resumen: `gestor-backlog` (Opus) prioriza → `plan-panadero` (Opus)
diseña el plan en `docs/plans/` → `implementador` (Sonnet 5) ejecuta. Cada agente fija su modelo en
el `model:` de `.claude/agents/`.
