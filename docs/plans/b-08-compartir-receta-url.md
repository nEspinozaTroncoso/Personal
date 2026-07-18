# Plan B-08 — Compartir receta escalada por URL (query params)

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-08** (P3) — "Compartir receta escalada por URL (query params)".
> Nota del backlog: "`?receta=baguette&peso=1000`. Requiere el redirect SPA de Netlify (ya previsto)."
> No debe romper los tests existentes (33/33), la PWA/offline (B-02), la persistencia en `localStorage`
> (B-03), el modo oscuro (B-04), el buscador (B-05) ni la i18n (B-07).

## Contexto

Hoy el estado de dominio (receta activa + peso) vive en `useRecipeScaling` y se **persiste en
`localStorage`** (claves `panapp-recipe` / `panapp-weight`, B-03). No hay forma de **compartir** una
receta ya escalada: si abro "Baguette a 1000 g" en el móvil y quiero mandársela a alguien, no existe un
enlace que la reproduzca. Este item añade dos capacidades complementarias:

1. **Leer** parámetros de la URL al abrir la app (`?receta=<id>&peso=<g>`) para **sembrar** el estado
   inicial — un "deep link" que reproduce receta + peso.
2. **Generar y copiar** un enlace de ese tipo desde la app (botón "Compartir receta") a partir del
   estado actual, usando el portapapeles.

Encaja con la vocación PWA (abrir un link compartido desde el móvil) y su único habilitador de
infraestructura —el redirect SPA de Netlify— **ya existe** (ver sección netlify.toml). No se añaden
dependencias: `URLSearchParams` nativo alcanza para una SPA de una sola pantalla; **no** se introduce
React Router ni ninguna librería de rutas.

### Cómo funciona hoy el estado (esto decide el enfoque)

Auditados `src/hooks/useRecipeScaling.js`, `src/App.jsx`, `src/data/recipes.js`, `WeightControl.jsx`:

- **Las recetas ya tienen un `id` estable tipo slug** en `src/data/recipes.js`: `"molde-7030"`,
  `"molde-tradicional"`, `"brioche"`, `"hallulla"`, `"hamburguesa"`, `"baguette"`. **Es el identificador
  que se usa en la URL** — no hace falta inventar ni añadir ningún campo nuevo a los datos.
- `useRecipeScaling` inicializa el estado con **inicializadores perezosos validados**:
  `getInitialRecipeId()` (localStorage → si no existe/ inválido, primera receta) y `getInitialWeight()`
  (localStorage → si no es número finito en `[200, 2500]`, `DEFAULT_WEIGHT = 1000`). Ya define las
  constantes `MIN_WEIGHT = 200`, `MAX_WEIGHT = 2500`, `DEFAULT_WEIGHT = 1000` (mismos límites que el
  slider de `WeightControl.jsx`, `min={200} max={2500} step={50}`). **Aquí es donde se inyecta la lectura
  de la URL**, respetando el mismo patrón de validación defensiva ya existente.
- Dos `useEffect` persisten `activeId` y `targetWeight` en `localStorage` en cada cambio.
- `App.jsx` tiene disponibles `activeId` y `targetWeight` (los recibe de `useRecipeScaling`) → puede
  pasárselos al botón de compartir sin elevar estado nuevo.

### Decisión 1 — Contrato de la URL: `?receta=<id>&peso=<g>` (nombres de param en español, fijos)

Se usan **exactamente** los nombres del backlog: `receta` (valor = `id` de la receta) y `peso` (valor =
peso total en gramos, entero). Son un **contrato público** (como los nombres de un endpoint): **no** se
traducen aunque la app sea bilingüe (B-07) — un link compartido debe funcionar igual en `es` y `en`.
Ejemplo: `https://<sitio>/?receta=baguette&peso=1000`.

### Decisión 2 — La lógica de parseo/serialización va en un módulo puro nuevo: `src/lib/shareUrl.js`

Siguiendo la convención del proyecto ("lógica pura vive en `src/lib/`, sin dependencias de React →
fácil de testear", igual que `baker.js` y `i18n/translate.js`), el parseo y la construcción de la URL
**no** viven en el hook ni en el componente, sino en un módulo puro nuevo con **tests propios**. Expone:

- `parseShareParams(search, { recipeIds, minWeight, maxWeight })` → `{ recipeId, weight }`.
  - Recibe el string de búsqueda (`window.location.search`) y las restricciones de dominio **inyectadas**
    (así el módulo no importa `RECIPES` ni conoce los límites por su cuenta → 100% puro y testeable).
  - `recipeId`: el valor de `receta` **solo si** está en `recipeIds`; si falta o no existe → `null`.
  - `weight`: `Number(peso)` **solo si** es finito y está en `[minWeight, maxWeight]`; si no → `null`.
  - Params desconocidos se ignoran. **Nunca lanza**: entrada inválida degrada a `null`.
- `buildShareUrl(baseUrl, recipeId, weight)` → string.
  - Compone `` `${baseUrl}?${params}` `` con `URLSearchParams` (encodea correctamente). `baseUrl` lo pasa
    el componente como `window.location.origin + window.location.pathname` (mantiene el módulo puro, sin
    tocar `window`).

### Decisión 3 — Precedencia: **URL (si es válida) → localStorage → default**, por parámetro independiente

Al abrir la app, si la URL trae un parámetro **válido**, gana sobre lo persistido; si no, se mantiene el
comportamiento actual (localStorage → default). La precedencia es **independiente por parámetro**: un
link que solo trae `?receta=brioche` fija la receta desde la URL y deja el **peso** en lo que diga
localStorage/default (y viceversa). Esto se implementa **dentro de los inicializadores perezosos** de
`useRecipeScaling` (`getInitialRecipeId` / `getInitialWeight`): primero consultan la URL vía
`parseShareParams`, y solo si devuelve `null` caen a la lógica de localStorage/default **ya existente**.

### Decisión 4 — La URL es "de un solo uso": tras sembrar el estado se limpia con `history.replaceState`

Una vez leídos los params al montar, se **eliminan de la barra de direcciones** (solo `receta` y `peso`;
se preservan otros params y el hash) con `window.history.replaceState`. Razón: el estado sembrado se
persiste inmediatamente en `localStorage` (los `useEffect` de B-03 corren al montar), así que **al
recargar, localStorage ya refleja los valores del link** y no hace falta que la URL siga imponiéndolos.
Sin esta limpieza, si el usuario abriera un link y luego cambiara de receta, un reload volvería a
forzar la receta del link (confuso). Con la limpieza el flujo es: *abrir link → aplica y persiste → la
app se comporta normal*. Es un efecto secundario → va en un `useEffect(…, [])` de montaje, no en el
inicializador perezoso (que debe ser puro). Nota: params **inválidos** también se eliminan (no deben
quedar colgando en la barra).

### Decisión 5 — El botón de compartir es un componente nuevo `src/components/ShareButton.jsx`

Encapsula: construir la URL (con `buildShareUrl` + `window.location`), copiar al portapapeles
(`navigator.clipboard.writeText`) y dar **feedback accesible** de éxito/error, siguiendo el patrón
`role="status"` / `role="alert"` ya usado en B-05/B-06 (`ExternalRecipes.jsx`). Se mantiene "tonto":
recibe `activeId`, `targetWeight` y `t` por props (App ya los tiene), sin conocer el hook. Se elige un
componente propio (en vez de meterlo dentro de `WeightControl`) para no acoplar el control de peso a la
lógica de portapapeles y mantener `WeightControl.jsx` intacto.

**Ubicación:** se renderiza en `App.jsx` **justo después de `<WeightControl>`**, dentro de un contenedor
que replica el ancho/márgenes de esa tarjeta (`layout.maxWidth`, márgenes laterales `1.5rem`), de modo
que quede visualmente asociado al bloque "receta + peso" que representa. No se altera el aspecto del
resto de la app.

**Portapapeles y degradación:** en producción (Netlify HTTPS) y en `localhost` (`dev`/`preview`) el
contexto es *seguro*, así que `navigator.clipboard` está disponible. Aun así se maneja con gracia el
caso en que no exista o la promesa se rechace: se muestra el estado de error (`role="alert"`) y, como
respaldo, la **URL en un campo de solo lectura seleccionable** para copiarla a mano. El mensaje de éxito
se auto-oculta tras unos segundos con un `setTimeout` (limpiado en `useEffect`/`unmount`).

## Archivos a tocar/crear

1. **`src/lib/shareUrl.js`** (crear) — módulo puro: `parseShareParams` + `buildShareUrl`. Sin React,
   sin importar `RECIPES` (restricciones inyectadas por parámetro).
2. **`src/lib/shareUrl.test.js`** (crear) — tests Vitest del módulo puro (ver Paso 2).
3. **`src/hooks/useRecipeScaling.js`** (editar) — importar `parseShareParams`; hacer que
   `getInitialRecipeId` / `getInitialWeight` consulten la URL **antes** de localStorage; añadir un
   `useEffect` de montaje que limpie `receta`/`peso` de la URL con `history.replaceState`. API pública del
   hook **sin cambios** (mismos returns).
4. **`src/components/ShareButton.jsx`** (crear) — botón "Compartir receta" + feedback accesible +
   fallback de URL. Recibe `activeId`, `targetWeight`, `t`.
5. **`src/App.jsx`** (editar) — importar y renderizar `<ShareButton activeId={activeId}
   targetWeight={targetWeight} t={t} />` tras `<WeightControl>`.
6. **`src/i18n/messages.js`** (editar) — añadir claves de compartir en **ambos** idiomas (`es` y `en`),
   manteniendo la paridad que exige `translate.test.js`.
7. **`src/styles/global.css`** (editar, menor) — clase `.share-button` para `:focus-visible` y
   `transition`, con su excepción en el bloque `prefers-reduced-motion` (mismo patrón que `.recipe-search`
   de B-05). Opcional pero recomendado por coherencia de accesibilidad.

**No se tocan:** `src/lib/baker.js` ni sus tests, `src/data/recipes.js` (los `id` ya sirven),
`WeightControl.jsx`, `RecipeSelector.jsx`, `useTheme.js`, `useI18n.js`, `theme.js`, PWA/`sw.js`,
`netlify.toml` (ver más abajo por qué no requiere cambios). **Sin nuevas dependencias.**

## Reutilización

- **`id` de receta ya existentes** en `src/data/recipes.js` — identificador estable para la URL; no se
  crea ningún slug nuevo.
- **Inicializadores perezosos validados y constantes de rango** en `src/hooks/useRecipeScaling.js`
  (`MIN_WEIGHT`, `MAX_WEIGHT`, `DEFAULT_WEIGHT`, `getInitialRecipeId`, `getInitialWeight`) — se extienden,
  no se reescriben; la lectura de URL se **antepone** a la lógica de localStorage ya probada.
- **Patrón de lógica pura testeable** de `src/lib/baker.js` e `src/i18n/translate.js` — `shareUrl.js` lo
  replica (pura + `*.test.js` propio con fixtures reales de `RECIPES`).
- **Patrón de feedback accesible** `role="status"` / `role="alert"` de `ExternalRecipes.jsx` (B-05/B-06)
  — reutilizado en `ShareButton`.
- **Sistema i18n** de B-07 (`messages.js` + `translate` + `t` por prop-drilling) — los textos del botón y
  del feedback pasan por `t(...)`, no se hardcodean.
- **Tokens de `src/styles/theme.js`** (`colors.*`, `radius.pill`, `fonts.sans`) y **CSS custom properties**
  de B-04 — el botón hereda modo claro/oscuro sin lógica extra (como en B-05).

## Pasos

### Paso 1 — `src/lib/shareUrl.js` (módulo puro nuevo)

Crear con dos funciones puras. Guía de implementación (el implementador ajusta detalles menores):

```js
// Parseo y construcción de la URL de "compartir receta escalada".
// Puro (sin React, sin importar RECIPES): las restricciones se inyectan. Nunca lanza.
// Contrato de params (fijo, no traducible): receta=<id>&peso=<gramos>.

export function parseShareParams(search, { recipeIds, minWeight, maxWeight }) {
  const params = new URLSearchParams(search || "");

  const rawRecipe = params.get("receta");
  const recipeId =
    rawRecipe && recipeIds.includes(rawRecipe) ? rawRecipe : null;

  const rawWeight = params.get("peso");
  let weight = null;
  if (rawWeight != null && rawWeight !== "") {
    const n = Number(rawWeight);
    if (Number.isFinite(n) && n >= minWeight && n <= maxWeight) weight = n;
  }

  return { recipeId, weight };
}

export function buildShareUrl(baseUrl, recipeId, weight) {
  const params = new URLSearchParams();
  params.set("receta", recipeId);
  params.set("peso", String(Math.round(weight)));
  return `${baseUrl}?${params.toString()}`;
}
```

Notas:
- `peso` se serializa como **entero** (`Math.round`) — el estado real ya viene en pasos de 50, así que
  no hay pérdida; evita `?peso=1000.0000001` por flotantes.
- El peso se **acepta** en cualquier valor finito dentro de `[min, max]` (no se fuerza al `step` de 50),
  por coherencia con `getInitialWeight` de B-03, que ya admite pesos persistidos fuera de paso.

### Paso 2 — `src/lib/shareUrl.test.js` (tests del módulo puro)

Crear siguiendo el estilo de `baker.test.js` (Vitest, fixtures reales de `RECIPES`). Casos mínimos:

`parseShareParams` (con `recipeIds = RECIPES.map(r => r.id)`, `minWeight = 200`, `maxWeight = 2500`):
- Params válidos → `{ recipeId: "baguette", weight: 1000 }` para `"?receta=baguette&peso=1000"`.
- Solo `receta` válido → `{ recipeId: "brioche", weight: null }`.
- Solo `peso` válido → `{ recipeId: null, weight: 500 }`.
- `receta` inexistente (`"?receta=noexiste&peso=800"`) → `recipeId: null` (weight sí válido).
- `peso` fuera de rango (`50`, `9999`) → `weight: null`.
- `peso` no numérico (`"?peso=abc"`) → `weight: null`.
- Search vacío (`""`) o sin nuestros params → `{ recipeId: null, weight: null }`.
- Params extra desconocidos se ignoran sin afectar el resultado.

`buildShareUrl`:
- `buildShareUrl("https://x.app/", "baguette", 1000)` incluye `receta=baguette` y `peso=1000`.
- Redondea peso no entero (`1000.4 → 1000`).
- **Ida y vuelta**: parsear lo que produce `buildShareUrl` devuelve el `recipeId`/`weight` originales.

### Paso 3 — `src/hooks/useRecipeScaling.js` (leer URL + limpiar)

- Importar `parseShareParams` de `../lib/shareUrl.js`.
- En `getInitialRecipeId()`: **antes** de leer localStorage, consultar la URL:

  ```js
  function getInitialRecipeId() {
    if (typeof window !== "undefined") {
      const { recipeId } = parseShareParams(window.location.search, {
        recipeIds: RECIPES.map((r) => r.id),
        minWeight: MIN_WEIGHT,
        maxWeight: MAX_WEIGHT,
      });
      if (recipeId) return recipeId; // la URL gana si es válida
    }
    try {
      const stored = localStorage.getItem(RECIPE_KEY);
      if (stored && RECIPES.some((r) => r.id === stored)) return stored;
    } catch {}
    return RECIPES[0].id;
  }
  ```

- En `getInitialWeight()`: análogo — si `parseShareParams(...).weight` no es `null`, devolverlo; si no,
  seguir con la lógica actual de localStorage/default.
- Añadir un `useEffect(() => {...}, [])` de montaje que **limpie** los params de la URL:

  ```js
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("receta") || params.has("peso")) {
      params.delete("receta");
      params.delete("peso");
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", url);
    }
  }, []);
  ```

- **No cambiar** los returns del hook ni los dos `useEffect` de persistencia (siguen escribiendo el
  valor sembrado desde la URL a localStorage → reload consistente).

### Paso 4 — `src/i18n/messages.js` (claves nuevas, es + en)

Añadir en **ambos** bloques (respetar la paridad de claves que valida `translate.test.js`):

```
// es
"share.button": "Compartir receta",
"share.copied": "Enlace copiado al portapapeles.",
"share.error": "No se pudo copiar. Copia el enlace manualmente:",
"share.ariaLabel": "Copiar enlace para compartir esta receta escalada",

// en
"share.button": "Share recipe",
"share.copied": "Link copied to clipboard.",
"share.error": "Couldn't copy. Copy the link manually:",
"share.ariaLabel": "Copy a link to share this scaled recipe",
```

### Paso 5 — `src/components/ShareButton.jsx` (componente nuevo)

Componente de presentación con estado local mínimo (`status`: `"idle" | "copied" | "error"` y la
`url` a mostrar en el fallback). Comportamiento:

- Al hacer clic: `const base = window.location.origin + window.location.pathname;` →
  `const url = buildShareUrl(base, activeId, targetWeight);`
- Intentar `navigator.clipboard?.writeText(url)`:
  - éxito → `status = "copied"` y programar `setTimeout` (~3 s) para volver a `"idle"`.
  - sin API o promesa rechazada → `status = "error"` y guardar `url` para el fallback.
- Render:
  - `<button type="button" className="share-button" aria-label={t("share.ariaLabel")}
    onClick={...}>{t("share.button")}</button>`.
  - Cuando `status === "copied"`: `<span role="status">{t("share.copied")}</span>`.
  - Cuando `status === "error"`: `<div role="alert">{t("share.error")} <input readOnly value={url}
    onFocus={e => e.target.select()} /></div>` (URL seleccionable para copiar a mano).
- Estilos con **tokens** (`colors.border`, `colors.surface`/`colors.ink`, `radius.pill`, `fonts.sans`,
  `colors.subtext`), coherentes con los botones-pill existentes de `WeightControl`. Sin colores
  hardcodeados. Limpiar el `setTimeout` en el cleanup del `useEffect` para evitar fugas.

### Paso 6 — `src/App.jsx` (montar el botón)

- `import ShareButton from "./components/ShareButton.jsx";`
- Renderizar **después** de `<WeightControl … />` (y antes de `<main>`):

  ```jsx
  <ShareButton activeId={activeId} targetWeight={targetWeight} t={t} />
  ```

  El propio `ShareButton` se envuelve en un contenedor con `maxWidth: layout.maxWidth`, `margin: 0 auto`
  y padding/márgenes laterales de `1.5rem` para alinearse con la tarjeta de peso (App ya importa
  `layout`). No cambia el layout del resto.

### Paso 7 — `src/styles/global.css` (foco accesible del botón, menor)

Añadir junto a las reglas de componentes (p. ej. tras `.recipe-search`):

```css
.share-button {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.share-button:focus-visible {
  border-color: var(--color-muted);
  box-shadow: var(--shadow-tab);
}
```

Y sumar `.share-button { transition: none; }` al bloque `@media (prefers-reduced-motion: reduce)` ya
existente.

## netlify.toml — por qué NO requiere cambios (confirmación explícita)

El redirect SPA actual es:

```
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Los **query params no forman parte del path** que Netlify evalúa en `from`: una petición a
`https://<sitio>/?receta=baguette&peso=1000` matchea `/*`, se sirve `index.html` (rewrite 200) y **el
query string se preserva** intacto hasta el cliente, donde `useRecipeScaling` lo lee vía
`window.location.search`. Por tanto el enlace compartido funciona tal cual con la config existente y
**no hay que tocar `netlify.toml`**. (El caso típico del enlace es la ruta raíz `/` con query, que
igualmente cae en `/*`.)

## Verificación (end-to-end)

Ejecutar desde la raíz del proyecto.

1. **Tests (no regresión + lógica nueva):**
   `npm test` → verde. Se suman los casos de `src/lib/shareUrl.test.js`; `baker.test.js` y
   `translate.test.js` (incl. **paridad de claves es/en** con las nuevas `share.*`) siguen pasando.

2. **Build de producción (PWA B-02 intacta):**
   `npm run build` → **sin errores**; `dist/` conserva `sw.js` + `manifest.webmanifest`.

3. **Leer URL al abrir (deep link) — `npm run dev`, http://localhost:5173:**
   - Abrir `http://localhost:5173/?receta=baguette&peso=1000` → la app arranca con **Baguette Básica**
     activa y el peso en **1000 g** (ingredientes escalados en consecuencia).
   - Tras cargar, la **barra de direcciones queda limpia** (`/`, sin `?receta…`): confirma la limpieza
     con `history.replaceState`.
   - Probar otra: `?receta=brioche&peso=1500` → Brioche a 1.5 kg.

4. **Precedencia URL > localStorage:**
   - Sin URL, seleccionar Hallulla a 500 g (se persiste). Recargar sin params → mantiene Hallulla/500
     (comportamiento B-03 intacto).
   - Abrir ahora `?receta=baguette&peso=2000` → **gana la URL** (Baguette/2000), pese a lo persistido.
   - Recargar **sin** params → ahora muestra Baguette/2000 (la URL sembró y se persistió: consistente).

5. **Precedencia por parámetro independiente:**
   - `?receta=hamburguesa` (sin `peso`) → receta = Pan de Hamburguesa, peso = lo de localStorage/default.
   - `?peso=800` (sin `receta`) → peso = 800, receta = lo de localStorage/default.

6. **Degradación con gracia (params inválidos, no rompe):**
   - `?receta=noexiste&peso=1000` → ignora la receta inválida (cae a localStorage/default), aplica peso
     1000. Sin errores en consola. Barra limpiada igual.
   - `?receta=baguette&peso=999999` → aplica Baguette, ignora el peso fuera de rango (cae a
     localStorage/default). `?peso=abc` → peso ignorado. La app nunca se rompe ni queda en blanco.

7. **Botón Compartir + portapapeles (usar `npm run preview` para contexto seguro real, o `dev` en
   localhost que también lo es):**
   - Con Baguette/1000 seleccionados, click en **"Compartir receta"** → aparece feedback
     `role="status"` "Enlace copiado al portapapeles." (auto-oculta ~3 s).
   - Pegar el portapapeles → debe ser `…/?receta=baguette&peso=1000`. Abrir ese enlace en otra
     pestaña reproduce receta + peso (cierra el ciclo build→parse).
   - Cambiar de receta/peso y volver a copiar → el enlace refleja el **estado actual**.
   - **Fallback:** simular clipboard no disponible (o denegar permiso) → aparece `role="alert"` con el
     texto de error y la **URL seleccionable** en un input de solo lectura para copiar a mano.

8. **i18n (B-07):** con el toggle de idioma, el botón y los mensajes cambian es/en. Los **nombres de
   param** (`receta`/`peso`) NO cambian con el idioma (contrato fijo): un link generado en `en` sigue
   diciendo `?receta=…&peso=…` y se abre bien en `es`.

9. **Claro/oscuro (B-04) + foco/reduced-motion:** el botón se ve coherente en ambos temas (tokens);
   `Tab` hasta él muestra anillo de foco visible; con "prefers-reduced-motion: reduce" no anima.

10. **Netlify (opcional, si hay deploy):** abrir el enlace compartido apuntando al dominio real →
    carga la SPA y aplica los params (confirma que el redirect `/*` preserva el query string).

## Fuera de alcance

- **Sincronizar la URL en vivo** con cada cambio de receta/peso (URL siempre "actualizada"): se decidió
  el modelo "deep link de un solo uso" (Decisión 4); no se reescribe la URL en cada interacción.
- **Web Share API** (`navigator.share`, hoja de compartir nativa del móvil): posible mejora futura; aquí
  solo se copia al portapapeles con fallback manual.
- **Códigos QR, acortadores de enlaces o compartir imagen/PDF** de la receta.
- **Compartir recetas externas de TheMealDB** (B-06): el contrato `receta=<id>` cubre solo el catálogo
  local `RECIPES`. Las externas tienen su propio flujo y quedan fuera.
- **Serializar más estado** en la URL (idioma, tema, filtro de búsqueda): solo receta + peso.
- **Forzar el peso al `step` de 50** al parsear: se acepta cualquier valor finito en rango, como B-03.
- Cambios en `baker.js`, datos de recetas, `netlify.toml`, PWA o dependencias nuevas.
