# B-14 — Ordenar recetas por favoritas al abrir la app

## Contexto
El selector de recetas locales (`src/components/RecipeSelector.jsx`) muestra hoy las recetas en el
orden fijo de `RECIPES` (`src/data/recipes.js`), sin tener en cuenta cuáles marcó el usuario como
favoritas. Con B-13 los favoritos ya persisten (`src/hooks/useFavorites.js` + `src/lib/favorites.js`)
y cada pestaña tiene su toggle ★/☆, pero B-13 **dejó a propósito intacto el orden** de renderizado
para que este item lo resuelva.

Objetivo de B-14: al abrir la app, las recetas **favoritas** aparecen primero en el selector, de
modo que el usuario encuentre lo que más usa sin buscar. Es un cambio pequeño, acotado a
`RecipeSelector.jsx`, sin lógica pura nueva relevante ni dependencias nuevas.

## Decisiones de diseño (delegadas a este plan)

1. **Orden secundario dentro de cada grupo → se mantiene el orden original de `RECIPES`.**
   Dentro de las favoritas y dentro de las no-favoritas se conserva el orden de aparición en
   `src/data/recipes.js`. Justificación: mínima sorpresa. El usuario ya conoce ese orden; reordenar
   además alfabéticamente introduciría dos cambios de disposición a la vez. La única reordenación es
   "las favoritas suben", nada más. Se implementa con un **sort estable** (garantizado por el estándar
   desde ES2019): al ordenar solo por el criterio favorita/no-favorita, los empates conservan su
   posición original.

2. **Interacción con el buscador de B-05 → el orden por favoritas se aplica siempre, encima del
   filtro.** El flujo es: primero se filtra por `query`, después el resultado se muestra en el orden
   "favoritas primero". Así el comportamiento es consistente con y sin búsqueda (las favoritas que
   coincidan con la búsqueda aparecen arriba). Es también lo más simple y predecible: un único orden
   canónico para la lista, se filtre o no.

3. **Reordenamiento solo al montar, NO en vivo.** El orden se calcula **una sola vez al montar** el
   componente (snapshot del conjunto de favoritas en ese instante) y no se recalcula al marcar/desmarcar.
   Justificación (el punto delicado que señala el backlog): si al desmarcar la receta que el usuario
   está viendo esta "saltara" de posición inmediatamente, el usuario —con el cursor/dedo aún sobre el
   botón que acaba de tocar— podría clickear otra receta por accidente. Congelando el orden al montar:
   - Las **estrellas ★/☆ sí siguen actualizándose en vivo** (el toggle marca/desmarca visualmente al
     instante), porque el render de cada estrella usa el estado vivo de favoritos.
   - Las **posiciones no se mueven** hasta la próxima carga/recarga de la app, momento en que el nuevo
     orden ya refleja los favoritos actuales.
   Esto casa con el modelo mental "al abrir la app veo mis favoritas arriba" sin penalizar la
   interacción durante la sesión.

4. **Alcance: solo recetas locales.** `RecipeSelector.jsx` únicamente renderiza `RECIPES` (favoritos
   `{kind:"local", id}`). Las recetas externas favoritas (`{kind:"mealdb", ...}`) NO viven en este
   selector: hoy solo aparecen en `ExternalRecipes.jsx` (listado que viene de la API de TheMealDB) y no
   existe una lista propia de "mis favoritas externas". Por tanto, **reordenar o destacar favoritas
   externas queda explícitamente fuera de alcance** de B-14; sería un item futuro si se decide añadir
   una sección dedicada de favoritos.

## Archivos a tocar/crear
- **`src/components/RecipeSelector.jsx`** (único archivo con cambios). Se calcula, una sola vez al
  montar, una lista `orderedRecipes` con las favoritas primero, y el filtrado de B-05 pasa a operar
  sobre esa lista ordenada en lugar de sobre `recipes` directamente.

No se crean archivos. No hay lógica pura nueva en `src/lib/` (ver "Fuera de alcance"). No se tocan
`App.jsx`, `useFavorites.js`, `favorites.js`, `messages.js`, ni CSS/estilos.

## Reutilización
- **`isFavorite("local", id)`** — prop que `RecipeSelector` ya recibe (viene de `useFavorites` vía
  `App.jsx`), respaldada por `isFavorite` de `src/lib/favorites.js`. Se reutiliza tal cual para saber
  si un id local es favorito; **no** se duplica la comprobación de pertenencia.
- **El filtrado de B-05** (`normalize` + `filtered`) se conserva íntegro; solo cambia la lista de
  entrada que filtra.
- **El toggle ★/☆ de B-13** (`onToggleFavorite`, `fav`, estrella con `aria-pressed`/`aria-label`) se
  conserva sin cambios: la estrella de cada pestaña sigue leyendo el estado vivo con
  `isFavorite("local", r.id)` dentro del `.map`.

## Pasos
1. En `src/components/RecipeSelector.jsx`, dentro del componente, calcular **una sola vez al montar**
   la lista ordenada. Usar un inicializador perezoso de `useState` (se ejecuta solo en el primer
   render, expresa con claridad la intención de "snapshot al montar" y evita ruido de
   `exhaustive-deps`):
   ```jsx
   // Orden congelado al montar: favoritas primero, preservando el orden de RECIPES dentro de cada
   // grupo (sort estable). No se recalcula al marcar/desmarcar, para evitar que una receta "salte"
   // de posición mientras el usuario interactúa (ver plan B-14, decisión 3).
   const [orderedRecipes] = useState(() => {
     const rank = (r) => (isFavorite("local", r.id) ? 0 : 1);
     return [...recipes].sort((a, b) => rank(a) - rank(b));
   });
   ```
   - Importar `useState` ya está hecho (la línea 1 del archivo ya lo importa para `query`).
   - Nota para el implementador: NO pasar `recipes`/`isFavorite` como deps ni convertirlo en `useMemo`
     con deps sobre favoritos; el congelado al montar es intencional (decisión 3). Copiar el array con
     `[...recipes]` para no mutar la prop.
2. Cambiar la fuente del filtrado de B-05 para que opere sobre `orderedRecipes` en vez de `recipes`:
   ```jsx
   const filtered = q
     ? orderedRecipes.filter(
         (r) => normalize(r.name).includes(q) || normalize(r.subtitle).includes(q)
       )
     : orderedRecipes;
   ```
   Así, con o sin búsqueda, el resultado respeta el orden "favoritas primero". El `.filter` preserva
   el orden de `orderedRecipes`.
3. **No tocar nada más** dentro del `.map`: cada pestaña sigue calculando `const fav = isFavorite("local", r.id)`
   con el estado vivo para pintar la estrella y el `aria-*`; `active`, estilos, `onSelect` y
   `onToggleFavorite` quedan igual. Con esto la estrella se actualiza en vivo pero la posición no.
4. Verificar que el estado vacío del buscador (`filtered.length === 0`) sigue funcionando: no cambia,
   porque `filtered` sigue siendo un array (ahora derivado de `orderedRecipes`).

## Verificación end-to-end
1. `npm test` — debe seguir en verde (no se añade ni modifica lógica pura; los tests de `baker`,
   `favorites`, etc. no se ven afectados). Confirmar que no hay regresiones.
2. `npm run build` — sin errores (verifica que el componente compila y que no se rompió ESLint).
3. `npm run dev` y comprobar manualmente en el navegador:
   - **Orden al abrir con favoritas guardadas:** con al menos una receta marcada ★ en una sesión
     previa (persistida en `localStorage` clave `panapp-favorites`), recargar la app: las recetas
     favoritas aparecen **primero** en el selector; dentro de las favoritas y dentro del resto se
     mantiene el orden de `src/data/recipes.js`.
   - **Sin favoritas:** con `panapp-favorites` vacío, el selector muestra el orden original de
     `RECIPES` sin cambios respecto a antes de B-14.
   - **No hay salto en vivo (decisión 3):** marcar/desmarcar una receta con el toggle ★/☆ — la
     estrella cambia al instante, pero la pestaña **no cambia de posición**. En particular, desmarcar
     la receta activa mientras se ve NO la mueve.
   - **El nuevo orden aplica tras recargar:** después de marcar una receta que estaba abajo, recargar
     (F5): ahora sí aparece arriba, junto al resto de favoritas.
   - **Interacción con el buscador (decisión 2):** escribir en el buscador un término que coincida con
     varias recetas incluyendo alguna favorita — dentro de los resultados filtrados, las favoritas
     aparecen primero; borrar la búsqueda restaura la lista completa ordenada. El estado "sin
     resultados" sigue mostrándose cuando no hay coincidencias.
   - **Sin errores en consola.**

## Fuera de alcance
- **Favoritas externas** (`{kind:"mealdb"}`): no se reordena ni destaca nada en `ExternalRecipes.jsx`;
  ese listado viene de la API y no tiene una sección propia de favoritos (posible item futuro).
- **Reordenamiento en vivo / animaciones de transición** al marcar/desmarcar: descartado por decisión
  de UX (decisión 3).
- **Orden alfabético** u otros criterios secundarios: se mantiene el orden de `RECIPES` (decisión 1).
- **Lógica pura nueva en `src/lib/` y tests nuevos:** el "comparador" es una línea trivial acoplada al
  snapshot de favoritos en el componente; extraerlo a `favorites.js` con sus tests sería
  sobre-ingeniería para este alcance. No se añaden tests.
- **Cambios visuales** (colores, estilos de pestaña, badge de favorito): no se toca la identidad visual;
  solo cambia el orden.
- **Cambios en `App.jsx`, hooks, i18n o CSS.**
