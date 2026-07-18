# Plan B-03 — Persistir receta/peso favorito en `localStorage`

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-03** (P2) — "Persistir receta/peso favorito en `localStorage`; recordar la
> última selección al reabrir".
> Requiere B-00 (hecho). No debe romper los 10 tests de B-01, ni la PWA de B-02, ni el modo oscuro
> de B-04. Sin nuevas dependencias.

## Contexto

La app se usa desde el móvil en la cocina. Hoy, cada vez que se recarga o se reabre la PWA, vuelve
al estado por defecto: primera receta (`RECIPES[0]`, "Pan de Molde 70/30") y peso `1000 g`. Si el
usuario amasa siempre baguette a 750 g, tiene que reelegir todo cada vez. B-03 pide **recordar la
última selección**: la **receta activa** (`activeId`) y el **peso** (`targetWeight`), y restaurarlas
al reabrir.

Ya existe precedente exacto de este patrón en el proyecto: **`src/hooks/useTheme.js`** (B-04)
persiste el tema en `localStorage` bajo la clave `panapp-theme`, con **lectura inicial perezosa +
fallback** (`getInitialTheme` pasado a `useState`) y **escritura en un efecto** (`useEffect` que hace
`setItem`), todo envuelto en `try/catch` para tolerar `localStorage` no disponible (modo privado). El
punto central del estado de receta/peso es **`src/hooks/useRecipeScaling.js`**, que hoy inicializa
ambos valores de forma fija:

```js
const [activeId, setActiveId] = useState(RECIPES[0].id);
const [targetWeight, setTargetWeight] = useState(1000);
```

El plan consiste en **replicar el patrón de `useTheme` dentro de `useRecipeScaling`**: inicializar
ambos estados leyendo (y **validando**) desde `localStorage`, y persistirlos en efectos. La **API
pública del hook no cambia**, por lo que **`App.jsx` y los componentes no se tocan**.

### Decisión 1 — Claves: dos claves planas `panapp-recipe` y `panapp-weight` (elegida)

Se eligen **dos claves planas** con **valor string**, coherentes con el prefijo `panapp-*` y con el
estilo de `panapp-theme`:

| Clave | Valor guardado | Ejemplo |
|-------|----------------|---------|
| `panapp-recipe` | el `id` de la receta activa (string) | `"baguette"` |
| `panapp-weight` | el peso en gramos como string | `"750"` |

Motivo frente a un único objeto `panapp-selection` (JSON):

- `useTheme` guarda un **string plano** (`"dark"`), no JSON. Dos claves planas mantienen esa misma
  convención → coherencia total.
- Al no usar JSON, **no hay `JSON.parse`** y por tanto **no existe la clase de fallo "JSON inválido"**:
  la única robustez necesaria es (a) `try/catch` por `localStorage` no disponible y (b) validar el
  contenido (existencia de la receta / rango del peso). Menos superficie de error.
- Cada valor es una preocupación independiente y se escribe/lee por separado, sin acoplarlos en una
  estructura.

(Se documenta la alternativa `panapp-selection` como descartada en "Fuera de alcance".)

### Decisión 2 — Inline dentro de `useRecipeScaling`, NO extraer `usePersistentState` (elegida)

Se **replica el patrón inline** de `useTheme` dentro de `useRecipeScaling`, en lugar de extraer un
helper genérico `usePersistentState`. Justificación:

- **Coherencia**: `useTheme` ya resuelve el mismo problema inline. Hacer B-03 inline deja **dos hooks
  con el mismo patrón reconocible** y cero abstracción nueva que aprender.
- **La validación es específica de cada campo** y es la parte que importa: `activeId` se valida contra
  `RECIPES`; `targetWeight` se valida como número dentro de `[200, 2500]`. Un `usePersistentState`
  genérico tendría que recibir un `deserialize`/`validate` por parámetro y esa lógica seguiría
  viviendo en el llamador → el helper aportaría poco y añadiría indirección.
- **Alcance mínimo**: el encargo pide explícitamente **no** ampliar el alcance a refactorizar
  `useTheme`. Introducir `usePersistentState` solo tendría sentido si además se migrara `useTheme`
  para no dejar dos patrones distintos; eso es más riesgo del que justifica este item pequeño.

> **Observación para backlog (no se ejecuta aquí):** si en el futuro aparece un tercer valor
> persistido, conviene extraer `src/hooks/usePersistentState.js` y migrar `useTheme` +
> `useRecipeScaling` a él, unificando el patrón. Se deja anotado como posible item futuro; **este plan
> no lo hace**.

## Archivos a tocar/crear

1. **`src/hooks/useRecipeScaling.js`** (editar — **único archivo de código que cambia**):
   - Importar `useEffect` (además de `useState`, `useMemo` ya presentes).
   - Añadir constantes de claves y de rango/def del peso.
   - Añadir dos lectores perezosos validados: `getInitialRecipeId()` y `getInitialWeight()`.
   - Inicializar `useState` con esas funciones (lazy init, no efecto → sin parpadeo).
   - Añadir dos `useEffect` que persistan `activeId` y `targetWeight` en `localStorage`.
   - El `return` (API pública) **no cambia**.

2. **`docs/BACKLOG.md`** (editar — solo administrativo): tras la implementación, `gestor-backlog`
   moverá B-03 a "hecho" y enlazará este plan. *No lo hace el `implementador`*; se anota aquí solo
   para trazabilidad del flujo.

**No se tocan** (verificado leyendo cada uno):

- **`src/App.jsx`** — destructura la API del hook, que no cambia. Como `getInitialRecipeId()` siempre
  devuelve un `id` válido, `recipe` nunca será `undefined`; `recipe.accent` sigue seguro. **Sin cambios.**
- **`src/components/WeightControl.jsx`** y **`RecipeSelector.jsx`** — reciben valor + callback como
  props; nada cambia en su firma. **Sin cambios.**
- **`src/lib/baker.js`** y **`src/lib/baker.test.js`** (B-01) — no se toca la lógica pura.
- **`src/data/recipes.js`** — solo se **lee** `RECIPES` para validar; no se modifica.
- **`src/hooks/useTheme.js`** (B-04) — intacto (ver Decisión 2).
- **`index.html`** — **sin cambios**: el estado de receta/peso se restaura por lazy init de React
  antes del primer render, así que **no hay FOUC** que requiera un script anti-parpadeo (a diferencia
  del tema en B-04, que sí lo necesitó porque depende de `data-theme` en CSS).
- `vite.config.js`, PWA/`sw.js`, `netlify.toml`, dependencias.

## Reutilización

- **Patrón de `src/hooks/useTheme.js`** (B-04): estructura `getInitial*` + `useState(getInitial*)` +
  `useEffect(setItem)` + `try/catch`, y prefijo de clave `panapp-*`. Se replica verbatim en estilo.
- **`RECIPES` de `src/data/recipes.js`**: fuente de verdad para validar que un `activeId` guardado
  sigue existiendo, y para el fallback `RECIPES[0].id`.
- **Rango del slider** definido en `src/components/WeightControl.jsx` (`min={200} max={2500}`): se
  reutilizan esos límites como validación del peso guardado; el default `1000` es el que ya usa hoy el
  hook.
- La lógica de escalado (`scaleRecipe`, `useMemo` de `recipe`/`scaled`) **no cambia**.

## Pasos

### Paso 1 — Reescribir `src/hooks/useRecipeScaling.js`

Reemplazar el contenido completo del archivo por el siguiente. Es el único cambio de código del plan.
Respeta el patrón de `useTheme.js` (lazy init validado + persistencia en efecto + `try/catch`).

```js
import { useState, useMemo, useEffect } from "react";
import { RECIPES } from "../data/recipes.js";
import { scaleRecipe } from "../lib/baker.js";

const RECIPE_KEY = "panapp-recipe";
const WEIGHT_KEY = "panapp-weight";

// Rango y default del peso: mismos límites que el slider de WeightControl.jsx.
const MIN_WEIGHT = 200;
const MAX_WEIGHT = 2500;
const DEFAULT_WEIGHT = 1000;

// Lectura inicial validada de la receta activa.
// Si no hay valor, o el id guardado ya no existe en RECIPES, cae a la primera receta.
function getInitialRecipeId() {
  try {
    const stored = localStorage.getItem(RECIPE_KEY);
    if (stored && RECIPES.some((r) => r.id === stored)) return stored;
  } catch {
    // localStorage no disponible (modo privado): se ignora
  }
  return RECIPES[0].id;
}

// Lectura inicial validada del peso.
// Debe ser un número finito dentro de [MIN_WEIGHT, MAX_WEIGHT]; si no, cae al default (1000).
function getInitialWeight() {
  try {
    const stored = localStorage.getItem(WEIGHT_KEY);
    const n = Number(stored);
    if (Number.isFinite(n) && n >= MIN_WEIGHT && n <= MAX_WEIGHT) return n;
  } catch {
    // localStorage no disponible (modo privado): se ignora
  }
  return DEFAULT_WEIGHT;
}

export function useRecipeScaling() {
  const [activeId, setActiveId] = useState(getInitialRecipeId);
  const [targetWeight, setTargetWeight] = useState(getInitialWeight);

  // Persistir la receta activa cada vez que cambia.
  useEffect(() => {
    try {
      localStorage.setItem(RECIPE_KEY, activeId);
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  }, [activeId]);

  // Persistir el peso cada vez que cambia (se guarda como string).
  useEffect(() => {
    try {
      localStorage.setItem(WEIGHT_KEY, String(targetWeight));
    } catch {
      // sin persistencia si localStorage no está disponible
    }
  }, [targetWeight]);

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

Notas de implementación (para no introducir ambigüedad):

- **Lazy init**: se pasa la **referencia** de la función a `useState(getInitialRecipeId)` — **sin
  paréntesis** — igual que `useTheme` hace `useState(getInitialTheme)`. Así React la ejecuta una sola
  vez en el montaje y no hay parpadeo (no se usa un `useEffect` para leer el valor inicial).
- **`Number(stored)`** convierte `null`/`""` a `0` (que queda fuera de rango → cae al default) y
  strings no numéricos a `NaN` (rechazado por `Number.isFinite`). Cubre "peso corrupto" sin JSON.
- **No** se fuerza que el peso guardado sea múltiplo de 50 (el `step` del slider). Cualquier valor que
  la app escribe ya es múltiplo de 50 (slider con `step={50}` y botones 500/1000/1500/2000); un valor
  intermedio dentro de rango es igualmente válido y funcional. Decisión consciente para no añadir
  lógica de "snapping" no pedida.
- **Sin `JSON.parse`**: al ser valores string planos no hay ruta de "JSON inválido"; la robustez es la
  validación de existencia/rango + el `try/catch` por `localStorage` no disponible.

## Verificación (end-to-end)

Ejecutar desde la raíz del proyecto (`C:\Users\xxnic\workspace\Personal`).

1. **Tests (no regresión B-01):**
   `npm test` → **10/10 en verde** (`baker.js` y su test no se tocaron).

2. **Build de producción (PWA B-02 intacta):**
   `npm run build` → termina **sin errores**; `dist/` incluye `sw.js` + `manifest.webmanifest`.

3. **Persistencia básica (dev):** `npm run dev`, abrir http://localhost:5173.
   - Elegir una receta distinta a la primera (p. ej. "Baguette Básica") y mover el slider a un peso
     distinto de 1000 (p. ej. 750 g).
   - DevTools → Application → Local Storage → http://localhost:5173: existen `panapp-recipe`
     (= `"baguette"`) y `panapp-weight` (= `"750"`). (Y sigue existiendo `panapp-theme` de B-04.)
   - **Recargar (F5)**: la app abre directamente en **Baguette Básica a 750 g**, sin parpadeo previo
     al estado por defecto. La lista de ingredientes escalados corresponde a esa receta/peso.

4. **Restauración al "reabrir":** cerrar la pestaña y volver a abrir http://localhost:5173 → mantiene
   la última receta y peso. (En build+preview con la PWA instalada, mismo resultado al reabrir.)

5. **Robustez — receta inexistente:** en Local Storage, editar `panapp-recipe` a un id basura (p. ej.
   `"receta-que-no-existe"`) y recargar → la app abre en la **primera receta** (`RECIPES[0]`, "Pan de
   Molde 70/30") sin errores en consola.

6. **Robustez — peso inválido / fuera de rango:** poner `panapp-weight` a `"abc"`, luego a `"50"`,
   luego a `"9999"`, recargando cada vez → en los tres casos la app abre con el **peso por defecto
   1000 g** (fuera de rango o no numérico → fallback). Con `"750"` (válido) abre a 750 g.

7. **Robustez — `localStorage` no disponible:** abrir en una ventana donde `localStorage` esté
   bloqueado, o simularlo en la consola antes de cargar el módulo, p. ej.:
   ```js
   // DevTools console (o modo incógnito con almacenamiento de sitios bloqueado)
   Object.defineProperty(window, 'localStorage', {
     get() { throw new Error('bloqueado'); }
   });
   ```
   Recargar → la app **arranca con los valores por defecto** (Pan de Molde 70/30, 1000 g) y **no
   crashea** (los `try/catch` absorben el fallo de lectura y de escritura).

8. **Convivencia con B-04 (modo oscuro):** el toggle de tema sigue funcionando y `panapp-theme`
   convive con `panapp-recipe`/`panapp-weight` en Local Storage sin interferencias. Cambiar receta/peso
   no altera el tema y viceversa.

## Fuera de alcance

- **Un único objeto `panapp-selection` en JSON**: descartado (Decisión 1) a favor de dos claves planas
  coherentes con `panapp-theme` y sin `JSON.parse`.
- **Extraer un helper `usePersistentState`** y/o **refactorizar `useTheme`** para usarlo: descartado
  aquí (Decisión 2). Queda anotado como posible item futuro de backlog si aparece un tercer valor
  persistido; **este plan mantiene `useTheme` intacto**.
- **Persistir cualquier otra cosa**: historial de recetas, múltiples favoritos, unidades, últimos
  pesos usados, orden de recetas, etc. Solo se guardan **la receta activa y el peso actual**.
- **"Snapping" del peso guardado al `step` de 50** o migración/versionado del formato de las claves.
- **Sincronización entre pestañas** (evento `storage`) o entre dispositivos.
- Cambios en `baker.js`/tests (B-01), PWA/`sw.js` (B-02), modo oscuro (B-04), `App.jsx`, componentes,
  `vite.config.js`, `netlify.toml` o dependencias.
- **Commits**: el usuario gestiona los commits; el `implementador` solo deja los cambios en el working
  tree y reporta.
