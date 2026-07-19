# B-17 — Selector de recetas locales: de tarjetas a listado

> Plan para el implementador (`implementador`, Sonnet 5). No se toca la lógica de dominio
> (`baker.js`, `scaleRecipe`, porcentaje de panadero). Solo cambia el **formato de presentación**
> del selector de recetas locales.

## Contexto

Hoy `src/components/RecipeSelector.jsx` pinta las 6 recetas locales como una **grilla de tarjetas**
(`<nav>` con `display:flex; flex-wrap:wrap; gap`, cada tarjeta `flex: 1 1 150px`). El usuario quiere
seleccionar **desde una lista vertical**, porque piensa crecer el catálogo de recetas locales y una
grilla horizontal de cajas escala mal (se vuelve un mosaico difícil de escanear y ordenar).

El cambio es **de formato, no de funcionalidad ni de identidad visual**: se conservan la paleta
terracota/crema, las fuentes Fraunces/Inter, los tokens de `theme.js`, el buscador (B-05), el orden
por favoritas (B-14), el toggle ★/☆ por receta (B-13) y los mínimos táctiles móviles (B-16). No es un
rediseño; es pasar de "cajas en fila" a "filas apiladas en una columna".

## Decisiones de diseño (resueltas aquí, el implementador NO debe reabrirlas)

### 1. ¿`<select>` nativo? — Descartado
Un `<select>`/`<option>` nativo **no admite HTML dentro de `<option>`**: no se puede anidar el botón
de favorito ★/☆ por opción (rompe B-13). La única salida sería sacar los favoritos fuera del
desplegable (lista de estrellas aparte), lo que **duplica la lista** y empeora la UX. Además un
`<select>` esconde las recetas tras un clic y pierde el subtítulo y el color de acento por receta.
**No se usa `<select>`.**

### 2. Formato elegido — Lista vertical de filas (botones apilados en columna)
Se mantiene el patrón actual de **botones "tontos"** (cada fila es un `<button>` que llama a
`onSelect`), pero apilados en **una sola columna** (`flex-direction: column`) dentro de un `<ul>`
semántico. Se descarta `role="radiogroup"`/`role="listbox"` con navegación por flechas y roving
`tabindex`: añade complejidad de teclado y estado que el proyecto no tiene en ningún otro control, y
el patrón vigente (botón individual tabbable + estado visual activo) ya funciona y es coherente con el
resto de la app. Como **mejora de accesibilidad de bajo riesgo**, la fila activa lleva
`aria-current="true"` para que los lectores de pantalla anuncien cuál está seleccionada (hoy el estado
activo es solo visual).

Cada fila conserva: **color de acento** (como un pequeño swatch circular a la izquierda, para no
perder la identidad por receta), **nombre** (Fraunces) y **subtítulo** (Inter, muted), y el **toggle
★/☆** a la derecha. Queda más compacta que las tarjetas actuales pero **no** se reduce a texto pelado:
se mantiene el swatch de acento y el subtítulo.

### 3. Layout general (`App.jsx`) — Se mantiene una sola columna vertical
Se evaluó aprovechar que el selector ahora es más angosto para moverlo a una **columna lateral** junto
al calculador en desktop (dos columnas). **Se descarta en este plan** por coste/riesgo:
- Reestructurar `App.jsx` obligaría a re-coordinar el render condicional de `imported`
  (`WeightControl`/`ShareButton` se ocultan con receta importada), la zona `.recipe-main` (que ya es
  grid de 2 columnas para ingredientes/pasos) y el scroll-to-top al importar. Es un rediseño de layout
  mayor, fuera del alcance "cambiar el formato de selección".
- En móvil (caso de uso principal, ver B-16) **siempre** es una columna, así que el beneficio sería
  solo en desktop.
- La preocupación de "escalar con más recetas" se resuelve mejor con **scroll interno** en la lista
  (contenedor con `max-height` + `overflow-y:auto`) que con dos columnas.

Por tanto: el selector sigue **arriba, a lo ancho del contenedor** (`layout.maxWidth`, centrado), y el
calculador debajo, igual que hoy. Se deja anotado como candidato futuro (ver "Fuera de alcance").

## Archivos a tocar

### `src/components/RecipeSelector.jsx` (única lógica de presentación que cambia)
- **No tocar** las líneas 1–30: `normalize`, la firma del componente, el `useState(query)`, el
  `orderedRecipes` con inicializador perezoso (B-14) y el cálculo de `filtered`. El orden por
  favoritas y el buscador quedan **intactos** porque el `.map` sigue operando sobre `filtered`.
- **No tocar** el `<input type="search" className="recipe-search">` (líneas 40–60): buscador de B-05 y
  anti-zoom iOS de B-16 (`fontSize: "1rem"`) ya correctos.
- **No tocar** la rama `filtered.length === 0` (el `<p role="status">` de "sin resultados").
- **Reemplazar** solo el bloque `<nav>` … `</nav>` (líneas 75–132) por la **lista vertical** descrita
  abajo.

### `src/styles/global.css`
- Añadir una clase `.recipe-row` (hover apropiado para fila) y ajustes menores. Ver detalle abajo.
- Añadir `.recipe-row` a los bloques `@media (prefers-reduced-motion: reduce)` y — si aplica — dejar
  que el `.touch` existente (B-16) cubra el mínimo de 44px en móvil.

### Sin cambios
- `src/App.jsx` (el montaje de `<RecipeSelector>` y sus props no cambian).
- `src/i18n/messages.js` (se reutilizan `selector.searchPlaceholder/searchAria/noResults` y
  `favorite.addAria/removeAria`; **no se crean claves nuevas**).
- `src/lib/baker.js`, `src/data/recipes.js`, `src/hooks/*`, `theme.js` (tokens): sin cambios.

## Reutilización (no duplicar)

- `orderedRecipes` + `filtered` ya existentes en el componente (B-14 + B-05): el nuevo `.map` itera
  sobre `filtered` igual que hoy.
- `isFavorite("local", r.id)` y `onToggleFavorite({ kind: "local", id: r.id })` (B-13): se reusan tal
  cual para el toggle ★/☆.
- Clase `.fav-toggle` de `global.css` (B-13 + B-16): se reutiliza sin cambios; solo cambia su
  **posición** dentro de la fila (centrada verticalmente).
- Clase `.touch` (B-16, `min-height:44px` en `@media (pointer: coarse)`): se añade a cada fila para
  garantizar el target táctil, sin inventar patrón nuevo.
- Tokens de `theme.js`: `colors.surface`, `colors.tabIdle`, `colors.ink`, `colors.muted`,
  `colors.border`, `fonts.serif`, `fonts.sans`, `radius.tab`, `shadow.tab`, `layout.maxWidth`.
- `r.accent` de `recipes.js`: color de acento por receta (swatch + borde activo).

## Markup final (estructura concreta a implementar)

Sustituir el `<nav>…</nav>` por un contenedor con **scroll interno opcional** y un `<ul>` en columna:

```jsx
<div
  style={{
    maxHeight: "min(60vh, 560px)",   // solo entra en scroll cuando el catálogo crezca
    overflowY: "auto",
    paddingRight: "0.2rem",           // aire para que la barra no tape las estrellas
  }}
>
  <ul
    style={{
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    }}
  >
    {filtered.map((r) => {
      const active = r.id === activeId;
      const fav = isFavorite("local", r.id);
      return (
        <li key={r.id} style={{ position: "relative" }}>
          <button
            className="recipe-row touch"
            onClick={() => onSelect(r.id)}
            aria-current={active ? "true" : undefined}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              width: "100%",
              textAlign: "left",
              border: active ? `2px solid ${r.accent}` : "2px solid transparent",
              background: active ? colors.surface : colors.tabIdle,
              borderRadius: radius.tab,
              padding: "0.7rem 3.4rem 0.7rem 1rem", // right holgado para el ★
              boxShadow: active ? shadow.tab : "none",
            }}
          >
            {/* Swatch de acento: conserva la identidad por receta en formato compacto */}
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: r.accent,
              }}
            />
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontFamily: fonts.serif,
                  fontWeight: 600,
                  fontSize: "1.02rem",
                  color: colors.ink,
                }}
              >
                {r.name}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  color: colors.muted,
                  marginTop: 2,
                }}
              >
                {r.subtitle}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="fav-toggle"
            aria-pressed={fav}
            aria-label={
              fav
                ? t("favorite.removeAria", { name: r.name })
                : t("favorite.addAria", { name: r.name })
            }
            onClick={() => onToggleFavorite({ kind: "local", id: r.id })}
            style={{
              position: "absolute",
              top: "50%",
              right: 10,
              transform: "translateY(-50%)",
            }}
          >
            <span aria-hidden="true">{fav ? "★" : "☆"}</span>
          </button>
        </li>
      );
    })}
  </ul>
</div>
```

Notas de implementación:
- El `<button>` de la fila y el `<button>` de favorito siguen siendo **hermanos** dentro del `<li>`
  (no anidados), igual que hoy con el `<div position:relative>` — respeta la restricción de B-13 de no
  meter `<button>` dentro de `<button>`.
- `minWidth: 0` en el contenedor de texto permite que nombres/subtítulos largos **elipsen o wrapeen**
  sin desbordar la fila (importante al crecer el catálogo). Si se quiere una línea con elipsis, se
  puede añadir `whiteSpace/overflow/textOverflow` al subtítulo; **no es obligatorio** en este plan
  (con wrap natural basta).
- `aria-current="true"` en la fila activa: mejora de accesibilidad, no cambia el comportamiento.

## Cambios en `src/styles/global.css`

1. Añadir la clase de la fila (análoga a `.recipe-tab`, pero con hover apropiado para una lista:
   un realce sutil de sombra en vez del "lift" vertical de las tarjetas):

```css
.recipe-row {
  transition: box-shadow 0.15s ease, background-color 0.15s ease;
}
.recipe-row:hover {
  box-shadow: var(--shadow-tab);
}
.recipe-row:focus-visible {
  outline: none;
  box-shadow: var(--shadow-tab);
}
```

2. Añadir `.recipe-row` al bloque de `prefers-reduced-motion` (junto a `.recipe-tab` etc.):

```css
@media (prefers-reduced-motion: reduce) {
  .recipe-tab { transition: none; }
  .recipe-row { transition: none; }
  /* …resto igual… */
}
```

3. **No** hace falta tocar el bloque `@media (pointer: coarse)`: la clase `.touch` ya aplica
   `min-height:44px` a la fila, y `.fav-toggle` ya pasa a 44×44px en móvil. Verificar que la estrella,
   ahora centrada con `translateY(-50%)`, no se solape con el texto en móvil (el `padding-right` de
   `3.4rem` en la fila deja hueco suficiente; si en `pointer:coarse` la estrella crece a 44px, subir
   ese padding a `3.6rem` si se observa solape).

4. La regla `.recipe-tab` puede quedarse en el CSS aunque ya no se use (bajo coste); **opcionalmente**
   se puede eliminar `.recipe-tab` y sus reglas de hover/reduced-motion si el implementador confirma
   por `Grep` que no queda ningún consumidor tras el cambio. No es obligatorio.

## Pasos de implementación

1. En `RecipeSelector.jsx`, dejar intactas las líneas 1–74 (imports, normalize, estados,
   `orderedRecipes`, `filtered`, input de búsqueda, rama "sin resultados").
2. Reemplazar el bloque `<nav>…</nav>` (la rama `else` del ternario, líneas ~75–132) por el
   contenedor con scroll + `<ul>` de filas descrito arriba.
3. Confirmar que se siguen usando `filtered`, `isFavorite`, `onToggleFavorite`, `activeId`, `t` y
   `r.accent` exactamente como antes (solo cambia el envoltorio visual).
4. En `global.css`: añadir `.recipe-row` (+ hover + focus-visible) y sumarla al bloque
   `prefers-reduced-motion`.
5. `Grep` de `recipe-tab` para decidir si se elimina o se conserva (opcional).
6. `npm test` y `npm run build`.

## Verificación end-to-end

Automática:
- `npm test` → **88/88 en verde** (no cambia lógica pura; si el número base cambió, debe seguir el
  total previo sin regresiones).
- `npm run build` → sin errores ni warnings nuevos.

Manual (`npm run dev`, http://localhost:5173):
1. **Formato lista**: las recetas aparecen apiladas en **una columna vertical**, no en grilla; cada
   fila muestra swatch de acento + nombre + subtítulo + estrella a la derecha.
2. **Selección**: clic en una fila la marca activa (borde de color de acento + fondo surface + sombra)
   y actualiza el calculador/ingredientes abajo. La fila activa expone `aria-current="true"`
   (inspeccionar en DevTools).
3. **Orden por favoritas (B-14)**: marcar una favorita **no reordena** en vivo; tras recargar, las
   favoritas quedan arriba preservando el orden relativo de `RECIPES`.
4. **Buscador (B-05)**: escribir en el buscador filtra las filas por nombre y subtítulo (insensible a
   acentos); sin coincidencias muestra el `role="status"` de "sin resultados".
5. **Favoritos (B-13)**: la estrella ★/☆ marca/desmarca **sin** cambiar la receta activa; persiste
   tras recargar. Clic en la estrella no dispara la selección de la fila (verificar que solo cambia el
   favorito).
6. **Tema**: alternar claro/oscuro; los colores de fila (surface, tabIdle, border, ink, muted) y el
   swatch de acento se ven correctos en ambos.
7. **Móvil (B-16)**: en DevTools con emulación táctil (o `pointer: coarse`), cada fila mide ≥44px de
   alto, la estrella 44×44px, el buscador conserva `font-size:16px` (sin zoom de iOS) y no hay overflow
   horizontal; la estrella centrada no se solapa con el texto.
8. **Crecimiento (scroll)**: opcional — añadir temporalmente recetas de prueba a `RECIPES` para
   confirmar que, superada la `max-height`, aparece scroll interno vertical y la barra no tapa las
   estrellas (revertir la prueba antes de cerrar).

## Fuera de alcance

- **Layout de dos columnas en desktop** (mover el selector a una barra lateral junto al calculador):
  reestructuración de `App.jsx` de mayor riesgo; se deja como candidato futuro (nuevo item de backlog
  si el usuario lo quiere).
- **B-15** (centrar el slider de peso en `WeightControl.jsx`): item aparte.
- Formato del selector de **recetas externas** (TheMealDB, `ExternalRecipes.jsx`): sigue siendo grilla
  de tarjetas; este plan solo afecta las recetas **locales**.
- Cambios en la **lógica de dominio** (`baker.js`, `scaleRecipe`, porcentaje de panadero), en
  `recipes.js` o en el modelo de datos.
- Traducir el contenido de las recetas (nombre/subtítulo) — ver B-07.
- Nuevas dependencias: **ninguna**.
