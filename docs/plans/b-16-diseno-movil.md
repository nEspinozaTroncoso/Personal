# Plan B-16 — Auditar y adaptar el diseño móvil

> Item: `docs/BACKLOG.md` B-16 (P2, pendiente). Ejecuta: `implementador` (Sonnet 5).
> Relacionado con B-17 (rediseño del selector local a listado) — **este plan NO rediseña el
> selector**; solo corrige touch-target/overflow puntuales, dejando el cambio de formato a B-17.

## Contexto

El caso de uso principal de la app es el **móvil** (`CLAUDE.md`: "se despliega gratis en Netlify
para usarse desde el móvil"), pero toda la sesión B-06 → B-14 (recetas externas, i18n, compartir
por URL, importar receta, favoritos) se implementó y verificó **solo en viewport de escritorio
(1200px)**. Al auditar el código real contra un viewport típico de teléfono (**360–390px** de ancho)
aparecen tres problemas transversales concretos:

1. **Touch targets por debajo de 44px** (mínimo recomendado): los toggles de favorito `★/☆`
   (`.fav-toggle` = 28×28px), los botones de idioma/tema del `Header`, los presets de peso
   (500g/1kg/1.5kg/2kg) y los botones de compartir/importar/limpiar/reintentar. Todos rondan
   24–30px de alto → difíciles de tocar con el pulgar.
2. **Zoom automático de iOS Safari**: los `<input type="search">` de `RecipeSelector.jsx` y
   `ExternalRecipes.jsx` usan `fontSize: "0.95rem"` (≈15.2px). Safari iOS hace zoom al enfocar
   cualquier input con fuente **< 16px**, descuadrando el layout.
3. **Overflow/reparto en viewport angosto**: la cabecera del detalle externo (título largo + estrella)
   no hace `wrap`; las tarjetas del selector local dejan hueco irregular; el grid externo conviene
   afinarlo para 320px.

**Lo que YA está bien** (no tocar): la zona `IngredientList` + `StepList` ya se apila en una sola
columna en móvil vía `.recipe-main` (`global.css`, breakpoint `@media (min-width: 721px)` para 2
columnas). El `<h1>` del Header ya usa `clamp(2.2rem, 5vw, 3.4rem)`. `layout.maxWidth: 960` con
gutters `padding: 0 1.5rem` se comporta correctamente en móvil (no hay overflow horizontal).

### Estrategia técnica (importante)

Los componentes usan **estilos inline** con tokens de `theme.js`. Un estilo inline **gana** a
cualquier regla de clase CSS, así que **no** se puede sobrescribir `padding`/`fontSize` inline desde
`global.css`. Por eso:

- Para los **touch targets** usamos `min-height` (y `display:inline-flex` de centrado) en clases CSS
  bajo `@media (pointer: coarse)`. Los estilos inline actuales **nunca** fijan `min-height` ni
  `display` en estos botones, así que **no hay conflicto de especificidad** y el desktop
  (puntero fino) queda **visualmente intacto**.
- Para el **zoom de iOS** (que sí depende de `font-size` inline) editamos el `fontSize` inline de los
  dos inputs a `"1rem"` (16px exactos).
- `.fav-toggle` ya define su tamaño en **CSS (clase, no inline)**, así que se agranda editando la
  clase directamente.

Breakpoint/condición elegida: **`@media (pointer: coarse)`** para los touch targets (dispositivos
táctiles reales, independiente del ancho) y se mantiene el breakpoint de ancho existente
`@media (min-width: 721px)` para el layout de columnas. No se introduce ningún breakpoint de ancho
nuevo. Sin dependencias nuevas.

## Archivos a tocar

1. `src/styles/global.css` — nuevas reglas `@media (pointer: coarse)`; agrandar `.fav-toggle`;
   `min-height` táctil para `.recipe-search`; opcional thumb del range.
2. `src/components/Header.jsx` — añadir `className="touch"` a los 2 botones (idioma, tema).
3. `src/components/WeightControl.jsx` — `className="touch"` a los 4 presets de peso.
4. `src/components/ShareButton.jsx` — `className` táctil al botón (junto a `share-button`);
   `fontSize` del input de respaldo a `1rem`.
5. `src/components/RecipeSelector.jsx` — `fontSize` del input a `1rem`; ampliar `paddingRight` del
   `.recipe-tab` para dejar sitio a la estrella agrandada; `flex` en el wrapper de cada tarjeta.
6. `src/components/ExternalRecipes.jsx` — `fontSize` del input a `1rem`; `className="touch"` a
   botones import/retry; `flexWrap` en la cabecera del detalle; afinar el `grid` a `minmax(140px,1fr)`.
7. `src/components/ImportedRecipe.jsx` — `className="touch"` a los botones clear/retry si aplica
   (la estrella ya usa `.fav-toggle`, se agranda sola).

No se toca: `src/lib/*` (nada de lógica ni `baker.js`), `src/data/recipes.js`, `src/i18n/*`,
`theme.js` (no hacen falta tokens nuevos), hooks. **Sin cambios de texto/i18n** (solo estilos).

## Reutilización

- **`.fav-toggle`** (ya existe en `global.css`, B-13): se reutiliza como único punto para agrandar
  TODAS las estrellas (selector local, tarjetas y detalle externos, receta importada) de una sola
  edición.
- **`.recipe-search`** (ya existe, B-05): se reutiliza para el `min-height` táctil de ambos inputs
  de búsqueda.
- **`.recipe-main`** (ya existe): el apilado en 1 columna en móvil ya está resuelto; no se duplica.
- **Bloque `@media (prefers-reduced-motion: reduce)`** ya presente: no requiere cambios; las reglas
  nuevas solo afectan tamaño, no animación.
- Tokens de `theme.js` (`colors`, `radius`, `fonts`) se siguen usando; no se hardcodea color/fuente.

## Pasos de implementación

### Paso 1 — `global.css`: utilidad táctil + estrellas más grandes

Añadir un bloque `@media (pointer: coarse)` (puede ir junto a las demás media queries, antes del
bloque de `prefers-reduced-motion`):

```css
/* Targets táctiles ≥44px solo en dispositivos de puntero grueso (móvil/tablet).
   El desktop (pointer: fine) queda igual. min-height/display no chocan con los
   estilos inline (que solo fijan padding/border/font). */
@media (pointer: coarse) {
  .touch {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .fav-toggle {
    width: 44px;
    height: 44px;
    font-size: 1.35rem;
  }
  .recipe-search {
    min-height: 44px;
  }
  /* Opcional pero recomendado: pulgar del slider más fácil de arrastrar */
  input[type="range"]::-webkit-slider-thumb { width: 30px; height: 30px; }
  input[type="range"]::-moz-range-thumb { width: 30px; height: 30px; }
}
```

Nota: `.fav-toggle` en el bloque base sigue en 28px (desktop). Solo crece en táctil.

### Paso 2 — `Header.jsx`: touch en idioma y tema

A cada uno de los **dos** `<button>` (líneas ~8 y ~30) añadir `className="touch"`. No tienen
`className` hoy, así que es un atributo nuevo. Los botones ya son `display:inline-flex` inline; la
clase reafirma el centrado en táctil sin efecto en desktop.

(Opcional de legibilidad vertical, bajo tu criterio: reducir el `padding` superior del `<header>` de
`"3rem 1.5rem 1.5rem"` a `"2.2rem 1.5rem 1.5rem"` para ganar altura útil en pantallas cortas. No es
imprescindible.)

### Paso 3 — `WeightControl.jsx`: presets tocables

A cada uno de los 4 `<button>` del `.map([500,1000,1500,2000])` (línea ~63) añadir
`className="touch"`. Hoy no tienen clase. Con `min-height:44px` + inline-flex centrado en táctil,
crecen a 44px de alto conservando su `padding`/pill actuales.

**No** modificar el centrado/márgenes de la `<section>` del slider: el hueco percibido del slider es
**B-15** (item aparte) y queda **fuera de alcance** aquí.

### Paso 4 — `ShareButton.jsx`

- Botón principal (línea ~47): pasar `className="share-button"` a `className="share-button touch"`.
- Input de respaldo (el `readOnly` del bloque de error, línea ~95): cambiar `fontSize: "0.85rem"` a
  `fontSize: "1rem"` para evitar zoom de iOS al enfocarlo.

### Paso 5 — `RecipeSelector.jsx`

- Input de búsqueda (línea ~57): cambiar `fontSize: "0.95rem"` → `fontSize: "1rem"` (anti-zoom iOS).
- Tarjeta `.recipe-tab` (estilo inline, línea ~95): cambiar el `padding` de
  `"0.9rem 2.2rem 0.9rem 1.1rem"` a `"0.9rem 3.2rem 0.9rem 1.1rem"`. Motivo: la estrella crece a 44px
  en táctil (`right:8`), y el padding derecho debe reservarle sitio para no solaparse con nombres
  largos. En desktop la estrella sigue en 28px; el sobrante de padding es leve y aceptable (se
  reordenará del todo en B-17).
- Wrapper de cada tarjeta (el `<div>` con `position:"relative", minWidth:150`, línea ~86): añadir
  `flex: "1 1 150px"` para que en filas angostas las tarjetas **rellenen** el ancho de forma pareja
  en lugar de dejar un hueco a la derecha. Es un ajuste de reparto, **no** el rediseño de formato
  (tarjetas→lista) que corresponde a **B-17**; déjalo anotado como tal en el commit.

### Paso 6 — `ExternalRecipes.jsx`

- Input de búsqueda (línea ~58): `fontSize: "0.95rem"` → `fontSize: "1rem"` (anti-zoom iOS).
- Grid del listado (línea ~89): cambiar `minmax(150px, 1fr)` → `minmax(140px, 1fr)`. Con gutters de
  1.5rem y ancho útil ≈342px (viewport 390) el grid ya da **2 columnas**; bajar a 140px asegura que
  también entren 2 columnas cómodas en teléfonos de 320px sin apretar el nombre. La estrella de las
  tarjetas se superpone sobre la imagen (`top:8 right:8`), no sobre texto, así que su crecimiento a
  44px no genera solape.
- Botón "Cargar en el calculador" (`importBtnStyle`, aplicado en línea ~194): añadir
  `className="touch"` al `<button>`.
- Botones "Reintentar" (`retryStyle`, líneas ~76 y ~162): añadir `className="touch"`.
- Cabecera del detalle: el `<div>` con `display:"flex", alignItems:"center", gap:"0.6rem"` que
  envuelve el `<h3>` + estrella (línea ~167) **no** hace wrap. Añadir `flexWrap: "wrap"` para que
  con nombres largos + estrella de 44px no haya overflow horizontal.

### Paso 7 — `ImportedRecipe.jsx`

- La estrella ya usa `.fav-toggle` → se agranda sola (Paso 1). La cabecera ya tiene `flexWrap:"wrap"`.
- Botón "Descartar/limpiar" (`clearStyle`, línea ~43): añadir `className="touch"`.

## Verificación end-to-end

El proyecto **no** tiene un flujo de prueba móvil documentado (README/scripts) más allá de que la
PWA se prueba con `build`+`preview`. Verificar así:

1. `npm test` — deben seguir en **verde** todos los tests (este plan no toca lógica; sirve de red de
   seguridad ante ediciones accidentales fuera de estilos).
2. `npm run build` — sin errores/regresiones.
3. `npm run dev` (o `npm run preview`) y abrir con **DevTools de Chrome → Device Toolbar**, o con
   **Playwright**, en dos viewports:
   - **390×844 (iPhone 12/13)** — viewport principal a validar.
   - **320px de ancho** (teléfono pequeño) — comprobar que nada hace overflow horizontal.
   En DevTools activar emulación táctil para que aplique `@media (pointer: coarse)` (Playwright:
   lanzar el contexto con `isMobile: true` / `hasTouch: true`, p.ej. `devices['iPhone 13']`).

Qué observar concretamente:
- **Touch targets**: medir con el inspector que estrellas `★/☆`, botones idioma/tema, presets de
  peso, compartir, importar, limpiar y reintentar miden **≥44px** de alto en el viewport táctil.
- **Zoom iOS**: enfocar cada input de búsqueda (selector local y externo) y el input de respaldo de
  compartir → la página **no** debe hacer zoom (font ≥16px). En DevTools se verifica que el
  `font-size` computado sea 16px.
- **Sin overflow horizontal**: la página no debe permitir scroll lateral en 320px ni 390px; la
  cabecera del detalle externo con un nombre largo debe **envolver** en vez de desbordar.
- **Layout de columnas**: `IngredientList`/`StepList` apilados en 1 columna en móvil y lado a lado
  en ≥721px (sin cambios respecto a hoy).
- **Grid externo**: 2 columnas de tarjetas legibles en 390px y en 320px.
- **Regresión desktop**: en un viewport de escritorio (puntero fino, p.ej. 1200px) las estrellas y
  botones deben verse **igual que antes** (28px, tamaños originales) — confirmar que
  `@media (pointer: coarse)` no aplicó.
- **Modo oscuro + i18n**: repetir un vistazo rápido con tema oscuro y con idioma EN para confirmar
  que ningún ajuste rompió el theming (todo sigue usando `var(--color-*)`), sin errores de consola.

## Fuera de alcance

- **Rediseño del selector de recetas locales** (tarjetas → listado): es **B-17**. Aquí solo se
  corrigen touch-target/overflow y reparto de las tarjetas actuales.
- **Centrar la barra de peso** (hueco percibido del slider): es **B-15**.
- Cambios de **lógica** (`baker.js`, `useRecipeScaling`, importación, favoritos), de **datos**
  (`recipes.js`) o de **textos/i18n** (`messages.js`).
- Traducción de contenido de recetas (candidato futuro anotado en B-06/B-07).
- Rediseño visual de la paleta, tipografías o jerarquía (se mantiene la identidad terracota/crema).
- Nuevas dependencias.
