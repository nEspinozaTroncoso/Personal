# Plan de Implementación — Pan App

> Estado: **planificación aprobada, implementación pendiente**.
> Este documento describe la **implementación principal** (v1) y la infraestructura agéntica
> que se usará para las mejoras futuras. La planificación la hace un modelo potente (Opus); la
> implementación la ejecuta un modelo económico (Sonnet 5).

---

## 1. Contexto

Punto de partida: un único archivo `BreadApp.jsx` (~540 líneas), un componente React monolítico
con estilos inline que calcula recetas de pan por **porcentaje de panadero** (6 recetas, selector
de peso 200 g–2.5 kg). No hay build ni forma de desplegarlo.

Meta de la v1:
1. **Producto**: web app responsive, desplegable **gratis en Netlify**, usable desde el navegador
   de un teléfono. Refactor a **estructura modular escalable** (datos / lógica / UI separados).
2. **Aprendizaje agéntico**: dejar montada la infraestructura para trabajar con el patrón
   **Opus planifica → Sonnet implementa**, con backlog vivo y agentes especializados.

Decisiones confirmadas:
- Solo web responsive (PWA/offline queda en backlog).
- Modelo implementador: **Sonnet 5**. Planificación con **Opus**.
- Estructura modular escalable desde la v1.
- El repo git lo crea el usuario **después**, al tener la app funcional (sin `git init` ni commits
  en esta fase).

---

## 2. Stack

- **Vite + React 18** (`@vitejs/plugin-react`). Salida a `dist/`, autodetectado por Netlify.
- **Estilos**: se conserva el look actual (paleta terracota/crema, fuentes Fraunces + Inter). Los
  tokens de diseño se extraen a `src/styles/theme.js` y los estilos globales a
  `src/styles/global.css`. Los componentes siguen con estilos inline apoyados en los tokens →
  mismo aspecto, cero cambio visual.
- **Netlify** (tier gratuito) para el deploy.

Todo se scaffoldea en la raíz del directorio actual (`C:\Users\xxnic\workspace\Personal`), que
pasa a ser la carpeta del proyecto / futuro repo.

---

## 3. Estructura de carpetas objetivo

```
/
├── .claude/
│   ├── agents/
│   │   ├── plan-panadero.md      # Planificador          (model: opus)
│   │   ├── gestor-backlog.md     # Actualiza el backlog  (model: opus)
│   │   └── implementador.md      # Implementa del backlog (model: sonnet)
│   └── settings.json             # Config de proyecto (permisos básicos)
├── docs/
│   ├── IMPLEMENTATION_PLAN.md    # Este archivo
│   ├── AGENTIC_WORKFLOW.md       # Cómo trabajar Opus-plan / Sonnet-impl
│   ├── BACKLOG.md                # Trabajo futuro priorizado (vivo)
│   ├── APIS_RECETAS.md           # Investigación de APIs de recetas (SIN implementar)
│   └── plans/                    # Planes por feature que genera el planificador
│       └── .gitkeep
├── public/
│   └── favicon.svg
├── src/
│   ├── data/
│   │   └── recipes.js            # Array RECIPES extraído (fuente de datos)
│   ├── lib/
│   │   └── baker.js              # scaleRecipe() + formatAmount() (lógica pura, testeable)
│   ├── hooks/
│   │   └── useRecipeScaling.js   # Estado: receta activa + peso → ingredientes escalados
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── RecipeSelector.jsx
│   │   ├── WeightControl.jsx
│   │   ├── IngredientList.jsx
│   │   ├── StepList.jsx
│   │   └── Footer.jsx
│   ├── styles/
│   │   ├── theme.js
│   │   └── global.css
│   ├── App.jsx                   # Composición de la app (ex-BreadApp)
│   └── main.jsx                  # Punto de entrada React
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
├── .gitignore
├── CLAUDE.md                     # Contexto del proyecto para agentes
└── README.md
```

---

## 4. Parte A — Refactor del producto (mapa `BreadApp.jsx` → módulos)

El refactor **no cambia comportamiento ni aspecto**; solo reorganiza.

| Origen en `BreadApp.jsx` | Destino |
|---|---|
| `const RECIPES = [...]` (líneas 11–171) | `src/data/recipes.js` (export) |
| `scaleRecipe()` (176–183) y `formatAmount()` (185–188) | `src/lib/baker.js` (funciones puras) |
| `useState` de `activeId` + `targetWeight` y los `useMemo` (191–201) | `src/hooks/useRecipeScaling.js` |
| `<style>{...}` (214–256) — reset, fuentes, range | `src/styles/global.css` |
| Colores/fuentes repetidos inline | `src/styles/theme.js` (tokens reutilizados) |
| `<header>` (259–296) | `src/components/Header.jsx` |
| `<nav>` selector de recetas (299–343) | `src/components/RecipeSelector.jsx` |
| `<section>` control de peso (346–434) | `src/components/WeightControl.jsx` |
| Bloque ingredientes (447–495) | `src/components/IngredientList.jsx` |
| Bloque procedimiento (497–522) | `src/components/StepList.jsx` |
| `<footer>` (525–537) | `src/components/Footer.jsx` |
| El `return` que compone todo | `src/App.jsx` |

**Responsive móvil** (sin rediseñar): la app ya usa `clamp()`, `flex-wrap` y grid de una columna.
Se añade solo:
- `<meta name="viewport" content="width=device-width, initial-scale=1" />` en `index.html`.
- En pantallas >720px, `IngredientList` + `StepList` en **2 columnas**; en móvil apiladas.

**Reutilización clave**: `scaleRecipe` y `formatAmount` ya son correctas → se mueven tal cual a
`src/lib/baker.js`, no se reescriben. El modelo de porcentaje de panadero se respeta al 100%.

---

## 5. Parte B — Infraestructura agéntica

Se crean **tres agentes** en `.claude/agents/`. El campo `model:` del frontmatter es lo que decide
qué modelo ejecuta cada agente → así se implementa el ahorro de tokens (Opus donde importa razonar,
Sonnet para ejecutar).

### 5.1 `plan-panadero.md` — Planificador (`model: opus`)
- **Rol**: toma un item del `BACKLOG.md` y produce un plan detallado en `docs/plans/<feature>.md`.
- **Tools**: solo lectura (Read/Grep/Glob) + escritura del archivo de plan.
- **Instrucciones**: explorar el código, reutilizar utilidades existentes (`baker.js`, `theme.js`,
  `recipes.js`), respetar el modelo de porcentaje de panadero, entregar pasos concretos con
  archivos a tocar y una sección de verificación end-to-end.

### 5.2 `gestor-backlog.md` — Gestor del backlog (`model: opus`)  ⭐ nuevo
- **Rol**: mantener vivo `docs/BACKLOG.md`. Añade ideas nuevas, reprioriza, marca items como
  hechos/descartados, y desglosa items grandes en tareas más pequeñas.
- **Tools**: lectura del repo + edición de `docs/BACKLOG.md`.
- **Instrucciones**: mantener el formato de tabla (id, título, prioridad, estado, notas), evitar
  duplicados, justificar cambios de prioridad, y sugerir el siguiente item recomendado a
  planificar. No escribe código de features; solo gestiona el backlog.

### 5.3 `implementador.md` — Implementador (`model: sonnet`)
- **Rol**: recibe un plan de `docs/plans/` (o un item ya desglosado por el gestor de backlog) y lo
  ejecuta escribiendo el código.
- **Tools**: acceso completo (edición, Bash para build/test).
- **Instrucciones**: seguir el plan al pie de la letra, respetar convenciones de `CLAUDE.md`, no
  añadir dependencias sin justificar, correr `npm run build` (y tests si existen) al terminar, y
  reportar qué se hizo. Al cerrar, avisar al gestor de backlog para marcar el item como hecho.

### Flujo (documentado también en `AGENTIC_WORKFLOW.md`)
1. **Gestión** — `gestor-backlog` actualiza/prioriza `BACKLOG.md` y recomienda el siguiente item.
2. **Planificación (Opus)** — `plan-panadero` convierte el item en `docs/plans/<feature>.md`.
3. **Implementación (Sonnet)** — `implementador` ejecuta el plan.
4. **Revisión** — `/code-review` o revisión manual.
5. **Cierre** — `gestor-backlog` marca el item como hecho; commit + deploy en Netlify.

**Porqué del split de modelos**: Opus razona mejor el diseño y la priorización (caro, pero se usa
en ráfagas cortas); Sonnet ejecuta tareas bien especificadas (más barato, se usa mucho) →
optimiza tokens y costo total.

---

## 6. Parte C — Deploy en Netlify (gratis)

`netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
El redirect deja lista una futura SPA con rutas sin romper deep-links.

Formas de desplegar (se documentan en el README): (a) arrastrar `dist/` a **Netlify Drop**,
(b) `netlify deploy` con la **Netlify CLI**, o (c) conectar el repo de git cuando el usuario lo
cree. Todas dentro del tier gratuito. Netlify entrega una URL pública → se abre en el navegador del
teléfono (opcional: "Agregar a pantalla de inicio").

---

## 7. Backlog semilla (referencia — el detalle vivo va en `docs/BACKLOG.md`)

| Prioridad | Item |
|---|---|
| P1 | PWA instalable + offline (manifest + service worker) |
| P1 | Tests unitarios de `baker.js` (Vitest) — la lógica de escalado es el corazón |
| P2 | Persistir receta/peso favorito en `localStorage` |
| P2 | Modo oscuro con toggle (los tokens de `theme.js` lo facilitan) |
| P2 | Buscador/filtro de recetas |
| P3 | Integración con API de recetas (ver `APIS_RECETAS.md`) |
| P3 | i18n (es/en) |
| P3 | Compartir receta escalada por URL (query params) |

---

## 8. APIs de recetas de pan (solo informativo — NO se implementa en v1)

Candidatas identificadas para una futura integración (detalle en `docs/APIS_RECETAS.md`):
- **Spoonacular** — freemium (~150 req/día gratis), buen catálogo de pan. Requiere API key →
  necesita proxy (Netlify Functions) para no exponerla.
- **Edamam Recipe Search** — freemium, buena para búsqueda; también con key.
- **TheMealDB** — gratis, sin key para uso básico, pero catálogo de pan limitado.
- **Forkify API** — gratis y orientada a educación; ideal para practicar `fetch` sin key.

---

## 9. Secuencia de ejecución (post-plan)

Coherente con el patrón: **Opus ya planificó**; la implementación la ejecuta **Sonnet 5**.

1. Scaffold Vite: `package.json`, `vite.config.js`, `index.html`, `main.jsx`, `.gitignore`.
2. Refactor del producto (Parte A) — mover datos, lógica, hook y componentes.
3. `netlify.toml` + `README.md`.
4. Infraestructura agéntica (Parte B) — `.claude/`, `docs/`, `CLAUDE.md`.
5. `npm install` + verificación.

---

## 10. Verificación (end-to-end)

1. `npm install` sin errores.
2. `npm run dev` → `http://localhost:5173`:
   - Las 6 recetas aparecen y cambian al hacer click.
   - El slider (200 g–2.5 kg) reescala los ingredientes; los presets (500 g / 1 / 1.5 / 2 kg)
     funcionan.
   - Cálculo contra el original: Baguette a 1000 g debe dar los mismos gramos que `BreadApp.jsx`.
   - Responsive: en móvil (~375px) todo se apila y es legible; en escritorio ingredientes/pasos en
     2 columnas.
3. `npm run build` → genera `dist/` sin errores; `npm run preview` sirve el build.
4. (Cuando exista) `npm test` corre los tests de `baker.js`.
5. Deploy: arrastrar `dist/` a Netlify Drop → abrir la URL en el teléfono y confirmar que carga.
6. Sanity agéntico: los tres archivos de `.claude/agents/` tienen frontmatter válido
   (`model: opus` / `model: opus` / `model: sonnet`) y aparecen como agentes disponibles.
