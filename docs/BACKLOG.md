# Backlog — Pan App

Backlog vivo del proyecto. Lo mantiene el agente **`gestor-backlog`** (model: opus).
Prioridades: `P1` alto · `P2` medio · `P3` bajo. Estados: `pendiente` · `en progreso` · `hecho` · `descartado`.

> Convención: los IDs son estables y no se reutilizan. Los items `hecho`/`descartado` se conservan
> para trazabilidad. Cuando un item necesita diseño, se pasa a `plan-panadero`; su plan queda en
> `docs/plans/<slug>.md` y se enlaza en la columna Notas.

## Activo

| ID | Título | Prioridad | Estado | Notas |
|----|--------|-----------|--------|-------|
| B-06 | Integración con API de recetas de pan | P3 | pendiente | Solo tras decidir proveedor. Ver `docs/APIS_RECETAS.md`. |
| B-07 | Internacionalización (es/en) | P3 | pendiente | Extraer textos a diccionarios. |
| B-08 | Compartir receta escalada por URL (query params) | P3 | pendiente | `?receta=baguette&peso=1000`. Requiere el redirect SPA de Netlify (ya previsto). |
| B-09 | Normalizar redondeo de `formatAmount` cerca de 10 | P3 | pendiente | Rareza detectada en B-01: `formatAmount(9.96) === "10.0"` (rama `toFixed(1)` redondea a "10.0" con decimal, incoherente con el corte en 10). Decidir regla deseada y actualizar `src/lib/baker.js` + su test. El test de B-01 fija el comportamiento actual, así que cambiarlo será un cambio consciente. |

## Historial (hecho / descartado)

| ID | Título | Estado | Notas |
|----|--------|--------|-------|
| B-00 | Implementación general v1 (scaffold Vite + refactor modular + deploy Netlify) | hecho | Plan: `docs/plans/b-00-implementacion-general-v1.md`. `npm install` + `npm run build` ok; paridad de cálculo verificada. `BreadApp.jsx` conservado como referencia. |
| B-01 | Tests unitarios de `baker.js` con Vitest | hecho | Plan: `docs/plans/b-01-tests-baker.md`. 10 tests en verde (`npm test`), build sin regresión. Observación anotada: `formatAmount(9.96) === "10.0"` fijado como comportamiento real. |
| B-02 | PWA instalable + offline (manifest + service worker) | hecho | Plan: `docs/plans/b-02-pwa.md`. `vite-plugin-pwa` ^0.20.5, íconos PNG generados, precache de 17 entradas. Tests 10/10, build ok, `sw.js`+`manifest.webmanifest` en `dist/`. `src/` intacto. |
| B-04 | Modo oscuro con toggle | hecho | Plan: `docs/plans/b-04-modo-oscuro.md`. CSS custom properties (`:root` / `[data-theme="dark"]`); hook `useTheme` (persiste en `panapp-theme`, respeta `prefers-color-scheme`); toggle accesible en Header; anti-FOUC + `theme-color` runtime. Tests 10/10, build ok, PWA intacta. |
| B-03 | Persistir receta/peso favorito en `localStorage` | hecho | Plan: `docs/plans/b-03-persistencia-localstorage.md`. Persistencia inline en `useRecipeScaling` (claves `panapp-recipe`/`panapp-weight`), lazy init validado + `try/catch`. API del hook sin cambios; `App.jsx`/componentes intactos. Tests 10/10, build ok. Observación: si aparece un 3.º valor persistido, extraer helper `usePersistentState` y unificar con `useTheme`. |
| B-05 | Buscador/filtro de recetas | hecho | Plan: `docs/plans/b-05-buscador-recetas.md`. Estado local en `RecipeSelector`; filtra `name`+`subtitle` con `normalize("NFD")` (insensible a acentos), `type="search"` accesible, "sin resultados" con `role="status"`. No cambia `activeId`. Solo toca `RecipeSelector.jsx` + `global.css`. Tests 10/10, build ok. |

---

### Siguiente item recomendado
**B-08** (compartir receta escalada por URL) — cierra el set P2/P3 de UX y aprovecha el redirect
SPA ya previsto. Alternativas P3: **B-06** (API de recetas), **B-07** (i18n), **B-09** (redondeo).
