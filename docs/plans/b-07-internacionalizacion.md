# Plan B-07 — Internacionalización (es/en)

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-07** (P3) — "Internacionalización (es/en)". Nota: "Extraer textos a diccionarios."
> No debe romper los tests actuales (baker 10 + mealdb 18/… = 28/28) ni la PWA (B-02) ni el modo
> oscuro (B-04).

## Contexto

Toda la interfaz está **hardcodeada en español** dentro de los componentes. Este item añade un
segundo idioma (**inglés**) y un mecanismo para alternar entre ambos, extrayendo los textos de la UI
a **diccionarios** (`{ es, en }`) y persistiendo la elección del usuario, siguiendo el mismo patrón
que ya usa el modo oscuro (`useTheme`).

### Auditoría: dónde vive el texto visible hoy

Se revisaron `App.jsx` y los componentes. `App.jsx` no contiene texto (solo estructura). Los strings
en español están en:

- **`Header.jsx`**: `aria-label` del toggle de tema ("Activar modo claro/oscuro"), etiqueta del botón
  ("Claro"/"Oscuro"), eyebrow ("Cuaderno de panadería"), `h1` ("Seis panes, un solo peso.") y
  párrafo introductorio.
- **`RecipeSelector.jsx`**: `placeholder` ("Buscar receta…"), `aria-label` del buscador, y mensaje
  "sin resultados" ("No hay recetas que coincidan con «{query}».").
- **`WeightControl.jsx`**: `label` ("Peso total de la masa"). Las etiquetas de rango ("200 g",
  "2.5 kg") y los presets son **numérico + unidad** (`g`/`kg`), universales → **no se traducen**.
- **`IngredientList.jsx`**: encabezado "Ingredientes — {recipeName}".
- **`StepList.jsx`**: encabezado "Procedimiento".
- **`Footer.jsx`**: nota sobre porcentaje de panadero.
- **`ExternalRecipes.jsx`** (B-06): encabezado, intro, mensajes de estado (cargando/errores/vacío),
  "Reintentar", `alt` de imagen, subtítulos "Ingredientes"/"Procedimiento", "Ver receta original".
- **`index.html`**: atributo `lang="es"`, `<title>`, `meta description`, `apple-mobile-web-app-title`.

### Alcance decidido (explícito): solo el "chrome" de la app

**En alcance:** todos los textos de **UI/chrome** listados arriba (los que produce la app), en es/en.

**Fuera de alcance — contenido de datos de recetas (`src/data/recipes.js`):** los `name`, `subtitle`,
nombres de ingredientes y `steps` de las 6 recetas **NO se traducen en este item**. Justificación:

1. Es **contenido, no strings de UI**. Son ~6 recetas × (nombre + subtítulo + ~7 ingredientes + ~9
   pasos) ≈ **cientos de líneas de prosa de dominio panadero** (técnicas, temperaturas, "test de la
   ventana", "greñar"), cuya traducción correcta es **autoría de contenido bilingüe**, no "extraer
   textos a diccionarios" (que es lo que pide la nota del backlog).
2. Traducirlo obligaría a **rediseñar el modelo de datos** (cada campo pasaría a `{ es, en }` o a un
   índice por idioma), un cambio estructural en `recipes.js` con más riesgo y superficie que el
   objetivo de este item.
3. `scaleRecipe`/`formatAmount` (`src/lib/baker.js`) solo consumen `pct`/`unit`/`id`, así que el
   cálculo **no se ve afectado**; los campos de texto son puramente de presentación.

**Consecuencia consciente:** en modo inglés, la **UI aparece en inglés** pero los **nombres/pasos de
las recetas locales permanecen en español**. Es un compromiso aceptable (UI vs. contenido) y se deja
documentado como **candidato a un item futuro** ("traducir contenido de recetas locales", que deberá
diseñar el modelo de datos bilingüe). La infraestructura que crea este plan (`useI18n` + diccionario)
es reutilizable por ese item futuro.

**Fuera de alcance — recetas externas de TheMealDB (B-06):** el **contenido** (nombres, ingredientes,
pasos, área/categoría) llega **en inglés desde una fuente externa no controlada** y **no se traduce**
(no tendría sentido; no lo controlamos). Sí se traduce el **chrome** que rodea esa sección (encabezado,
intro, mensajes de carga/error/vacío, botones, `alt`), porque esos textos los produce la app.

### Idioma: selección y persistencia (precedente: `useTheme`)

Se sigue **exactamente el patrón de `src/hooks/useTheme.js`**:
- Estado inicial: **`localStorage` (`panapp-locale`)** si existe y es válido → si no,
  **`navigator.language`** (`startsWith("es")` ⇒ `"es"`, en otro caso `"en"`) → default de respaldo
  `"es"` (la app es español-first).
- Persiste en `localStorage` en cada cambio (con `try/catch`, igual que `useTheme`).
- Efecto secundario: fija `document.documentElement.lang` (accesibilidad/hyphenation) y actualiza
  `document.title`. Es el equivalente de lo que `useTheme` hace con `data-theme` y `<meta theme-color>`.
- Alternancia binaria es/en mediante un **botón en el Header**, junto al toggle de tema.

### Enfoque técnico: diccionario plano de JS, **sin nueva dependencia**

Se evaluó añadir una librería i18n (`i18next`, `react-intl`):

- El catálogo es **pequeño (~30 claves)**, sin pluralización compleja, sin formato ICU de
  fechas/números, sin namespaces cargados de forma diferida. La única necesidad avanzada es
  **interpolación de variables** (`{query}`, `{recipeName}`, `{error}`, `{name}`), trivial de
  resolver con un `replace`.
- CLAUDE.md es estricto: **"no añadir dependencias sin justificación"**. `i18next`/`react-intl` suman
  peso al bundle (relevante en una PWA que se instala) y complejidad de configuración que **no aporta
  nada** a este tamaño de catálogo.
- **Decisión:** diccionario plano `{ es: {...}, en: {...} }` + una función pura `translate()` con
  interpolación + un hook `useI18n` que expone `t()`. **Cero dependencias nuevas.** Si el catálogo
  creciera mucho o hiciera falta pluralización/ICU, se reevaluaría en un item aparte.

### Cómo llegan las traducciones a los componentes: prop-drilling de `t` (no Context)

`App.jsx` renderiza los componentes de forma **plana** (todos son hijos directos, profundidad 1). Se
llama `useI18n()` **una sola vez en `App`** y se pasa **`t` como prop** a cada componente que muestra
texto. Se evita React Context de forma **coherente con B-04**, que rechazó Context para el tema por
"invasivo"; aquí no hay drilling profundo (no hay intermediarios), así que pasar `t` directo mantiene
los componentes "tontos" y el patrón de props ya usado (p. ej. `theme`/`onToggleTheme` al Header).

## Archivos a tocar/crear

1. **`src/i18n/messages.js`** (crear) — el diccionario `{ es: {...}, en: {...} }` con **las mismas
   claves** en ambos idiomas (dato, análogo a `recipes.js`).
2. **`src/i18n/translate.js`** (crear) — función **pura** `translate(messages, locale, key, params)`:
   busca `messages[locale][key]`; si falta, cae a `messages.es[key]`; si tampoco, devuelve `key`.
   Interpola `{param}` desde `params`. Sin React → testeable.
3. **`src/i18n/translate.test.js`** (crear) — tests Vitest de `translate` (interpolación, fallback de
   clave/idioma) + **test de paridad de claves** (todo `key` de `es` existe en `en` y viceversa).
4. **`src/hooks/useI18n.js`** (crear) — hook de estado del idioma (espejo de `useTheme`): estado
   inicial validado, persistencia en `panapp-locale`, efecto que fija `document.documentElement.lang`
   y `document.title`; expone `{ locale, toggle, t }` donde `t(key, params)` = `translate(messages,
   locale, key, params)`.
5. **`src/App.jsx`** (editar) — llamar `useI18n()`; pasar `t` a los componentes con texto y
   `locale`/`onToggleLocale` al `Header`.
6. **`src/components/Header.jsx`** (editar) — recibir `t`, `locale`, `onToggleLocale`; reemplazar los
   textos por `t(...)`; añadir el **botón de idioma** junto al toggle de tema.
7. **`src/components/RecipeSelector.jsx`** (editar) — recibir `t`; reemplazar placeholder, `aria-label`
   y mensaje "sin resultados" (con interpolación `{query}`).
8. **`src/components/WeightControl.jsx`** (editar) — recibir `t`; reemplazar solo el `label`.
9. **`src/components/IngredientList.jsx`** (editar) — recibir `t`; encabezado con `{recipeName}`.
10. **`src/components/StepList.jsx`** (editar) — recibir `t`; encabezado.
11. **`src/components/Footer.jsx`** (editar) — recibir `t`; nota.
12. **`src/components/ExternalRecipes.jsx`** (editar) — recibir `t`; reemplazar todo el chrome
    (encabezado, intro, estados, `alt`, subtítulos, "Ver receta original"). **No** se toca el
    contenido que viene de la API.

**No se tocan:** `src/lib/baker.js` + tests (B-01), `src/lib/mealdb.js` + tests (B-06/B-10),
`src/data/recipes.js` (decisión de alcance), `src/hooks/useRecipeScaling.js`, `src/hooks/useTheme.js`,
`src/hooks/useExternalRecipes.js`, `src/styles/*`, `vite.config.js`, PWA. Sin dependencias nuevas.

> `index.html` (editar, **opcional/mínimo**): se puede dejar `lang="es"` como valor por defecto y
> dejar que `useI18n` lo ajuste al montar. **No** se recomienda añadir un script anti-FOUC para el
> idioma (a diferencia del tema, un cambio de `lang` no produce parpadeo visible). El `<title>` y la
> `meta description` estáticos quedan en español como valor inicial; `useI18n` actualiza
> `document.title` en runtime. No modificar `index.html` es aceptable.

## Reutilización

- **`src/hooks/useTheme.js`** como **plantilla de diseño**: misma estructura de `getInitial*` con
  `try/catch`, misma forma de persistir en `useEffect`, misma exposición `{ estado, toggle }`. `useI18n`
  lo replica para el idioma (clave `panapp-locale`).
- **Patrón de props del Header** (`theme`/`onToggleTheme`) → se extiende con `locale`/`onToggleLocale`
  y `t`. El nuevo botón de idioma **reusa los tokens de `src/styles/theme.js`** (mismos estilos de
  píldora que el toggle de tema; nada hardcodeado).
- **Vitest** ya configurado (B-01): los tests de `translate` no necesitan setup nuevo.
- **`normalize()` de `RecipeSelector`** no cambia (el filtrado sigue operando sobre los datos en
  español, que no se traducen en este item).

## Diccionario de claves (catálogo completo, es/en)

Claves sugeridas (namespacing por punto, solo strings; el implementador puede ajustar nombres pero
**debe cubrir exactamente estos textos**). Interpolación con `{param}`.

| Clave | es | en |
|-------|----|----|
| `header.themeToDark` | Activar modo oscuro | Switch to dark mode |
| `header.themeToLight` | Activar modo claro | Switch to light mode |
| `header.themeLabelDark` | Oscuro | Dark |
| `header.themeLabelLight` | Claro | Light |
| `header.localeToggleAria` | Cambiar idioma a inglés | Switch language to Spanish |
| `header.localeLabel` | EN | ES |
| `header.eyebrow` | Cuaderno de panadería | Baker's notebook |
| `header.title` | Seis panes, un solo peso. | Six breads, one weight. |
| `header.subtitle` | Elige una receta, decide cuánto pan quieres hoy, y cada ingrediente se ajusta solo — en gramos y mililitros. | Pick a recipe, decide how much bread you want today, and each ingredient adjusts itself — in grams and milliliters. |
| `selector.searchPlaceholder` | Buscar receta… | Search recipe… |
| `selector.searchAria` | Buscar receta por nombre o descripción | Search recipe by name or description |
| `selector.noResults` | No hay recetas que coincidan con «{query}». | No recipes match “{query}”. |
| `weight.label` | Peso total de la masa | Total dough weight |
| `ingredients.heading` | Ingredientes — {recipeName} | Ingredients — {recipeName} |
| `steps.heading` | Procedimiento | Method |
| `footer.note` | Las cantidades se calculan por porcentaje de panadero, así que la proporción entre ingredientes se mantiene sin importar cuánto pan quieras hacer. | Amounts are computed with baker's percentages, so the ratio between ingredients stays the same no matter how much bread you make. |
| `external.heading` | Explorar más panes | Explore more breads |
| `external.intro` | Recetas de la comunidad vía TheMealDB. Vienen con cantidades fijas en sus unidades originales, así que no se escalan por porcentaje de panadero como las recetas de arriba. | Community recipes via TheMealDB. They come with fixed amounts in their original units, so they are not scaled by baker's percentage like the recipes above. |
| `external.loadingList` | Cargando panes… | Loading breads… |
| `external.listError` | No se pudo cargar el listado ({error}). | Couldn't load the list ({error}). |
| `external.retry` | Reintentar | Retry |
| `external.empty` | Ahora mismo no hay panes disponibles en TheMealDB. | No breads available on TheMealDB right now. |
| `external.photoAlt` | Foto de {name} | Photo of {name} |
| `external.loadingDetail` | Cargando receta… | Loading recipe… |
| `external.detailError` | No se pudo cargar la receta ({error}). | Couldn't load the recipe ({error}). |
| `external.ingredients` | Ingredientes | Ingredients |
| `external.method` | Procedimiento | Method |
| `external.viewOriginal` | Ver receta original | View original recipe |
| `doc.title` | Cuaderno de panadería | Baker's notebook |

> El `intro` de `external` menciona "porcentaje de panadero" en negrita (`<strong>no</strong>`). Al
> pasar a `t`, conservar el énfasis partiendo el texto o insertando el `<strong>` en el JSX alrededor
> de un fragmento; alternativamente, mantener el `<strong>` en el JSX y usar dos claves. El
> implementador elige la opción más limpia sin perder el énfasis visual.

## Pasos

1. **`src/i18n/messages.js`**: exportar `export const messages = { es: {...}, en: {...} }` con **todas**
   las claves de la tabla, idénticas en ambos idiomas. Un solo objeto plano por idioma (claves con
   puntos como string, p. ej. `"header.title"`), o anidado — elegir plano para simplificar `translate`.
2. **`src/i18n/translate.js`**: implementar `translate(messages, locale, key, params = {})`:
   - `const table = messages[locale] ?? messages.es;`
   - `let str = table[key];` si `str == null` → `str = messages.es[key];` si sigue `null` → `return key;`
   - Interpolar: reemplazar cada `{name}` por `params[name]` (si falta el param, dejar el literal o
     cadena vacía — decidir dejar el literal `{name}` para detectar olvidos en dev).
   - Retornar el string. Función pura, sin efectos.
3. **`src/i18n/translate.test.js`**: cubrir (a) interpolación de un `{param}`; (b) fallback a `es`
   cuando falta la clave en `en`; (c) devuelve la propia `key` si no existe en ningún idioma;
   (d) **paridad**: `Object.keys(messages.es)` y `Object.keys(messages.en)` son iguales (ordenar y
   comparar) — protege de olvidar una traducción.
4. **`src/hooks/useI18n.js`**: espejo de `useTheme`:
   - `const STORAGE_KEY = "panapp-locale";`
   - `getInitialLocale()`: `try` leer `localStorage`; si es `"es"|"en"` usarlo; si no, mirar
     `navigator.language?.toLowerCase().startsWith("es") ? "es" : "en"`; respaldo `"es"`.
   - `useState(getInitialLocale)`.
   - `useEffect([locale])`: `document.documentElement.lang = locale;` `try` persistir en
     `localStorage`; `document.title = translate(messages, locale, "doc.title");`.
   - `const toggle = () => setLocale(l => l === "es" ? "en" : "es");`
   - `const t = (key, params) => translate(messages, locale, key, params);`
   - `return { locale, toggle, t };`
5. **`src/App.jsx`**: `const { locale, toggle: toggleLocale, t } = useI18n();` (renombrar para no
   chocar con `toggle` de `useTheme`). Pasar:
   - `<Header theme={theme} onToggleTheme={toggle} locale={locale} onToggleLocale={toggleLocale} t={t} />`
   - `<RecipeSelector ... t={t} />`, `<WeightControl ... t={t} />`,
     `<IngredientList ... t={t} />`, `<StepList ... t={t} />`, `<Footer t={t} />`,
     `<ExternalRecipes t={t} />`.
6. **`Header.jsx`**: recibir `t, locale, onToggleLocale`. Sustituir:
   - `aria-label={isDark ? t("header.themeToLight") : t("header.themeToDark")}`
   - etiqueta botón tema: `isDark ? t("header.themeLabelDark") : t("header.themeLabelLight")` (ojo:
     hoy muestra "Oscuro" cuando NO es dark y "Claro" cuando es dark — **mantener la lógica actual**,
     solo cambiar el literal por su clave equivalente para no alterar comportamiento).
   - eyebrow → `t("header.eyebrow")`, `h1` → `t("header.title")`, `p` → `t("header.subtitle")`.
   - Añadir, en la fila superior (junto al toggle de tema), un **botón de idioma**: `type="button"`,
     `onClick={onToggleLocale}`, `aria-label={t("header.localeToggleAria")}`, texto `t("header.localeLabel")`
     (muestra el idioma **al que** se cambiaría: en `es` muestra "EN"), estilos = misma píldora que el
     toggle de tema usando tokens de `theme.js`.
7. **`RecipeSelector.jsx`**: recibir `t`. `placeholder={t("selector.searchPlaceholder")}`,
   `aria-label={t("selector.searchAria")}`, y el mensaje sin resultados
   `t("selector.noResults", { query: query.trim() })`. El resto (filtrado, tokens) intacto.
8. **`WeightControl.jsx`**: recibir `t`; `label` → `t("weight.label")`. Rangos/presets numéricos sin
   cambios.
9. **`IngredientList.jsx`**: recibir `t`; `h2` → `t("ingredients.heading", { recipeName })`.
10. **`StepList.jsx`**: recibir `t`; `h2` → `t("steps.heading")`.
11. **`Footer.jsx`**: recibir `t`; texto → `t("footer.note")`.
12. **`ExternalRecipes.jsx`**: recibir `t`; reemplazar encabezado, intro (conservando el `<strong>`),
    `t("external.loadingList")`, `t("external.listError", { error: listError })`, `t("external.retry")`,
    `t("external.empty")`, `alt={t("external.photoAlt", { name: m.name })}`,
    `t("external.loadingDetail")`, `t("external.detailError", { error: detailError })`,
    subtítulos `t("external.ingredients")` / `t("external.method")`, `t("external.viewOriginal")`.
    **No** tocar `detail.name`, `detail.ingredients`, `detail.steps`, `detail.area/category` (API).

## Verificación (end-to-end)

Desde la raíz del proyecto:

1. **Tests:** `npm test` → los tests previos siguen verdes **y** aparecen los nuevos de
   `src/i18n/translate.test.js` (incluida la **paridad de claves**). Total = 28 previos + los nuevos,
   todos en verde.
2. **Build:** `npm run build` → sin errores; `dist/` con `sw.js` + `manifest.webmanifest` (PWA de B-02
   intacta).
3. **Dev / comportamiento** (`npm run dev`, http://localhost:5173):
   - Se ve el **botón de idioma** en el Header, junto al toggle de tema.
   - Con la app en **es**, el botón muestra "EN"; al pulsarlo, **toda la UI** cambia a inglés (header,
     buscador, label de peso, encabezados "Ingredients"/"Method", footer, y todo el chrome de la
     sección "Explore more breads"). El botón pasa a mostrar "ES".
   - Los **nombres/pasos de las recetas locales siguen en español** en ambos idiomas (alcance
     documentado). El **contenido de TheMealDB sigue en inglés** en ambos idiomas.
   - Buscar algo inexistente en modo en → mensaje "No recipes match “…”." con el término interpolado.
4. **Persistencia + `lang`:**
   - Tras cambiar a en, DevTools → Application → Local Storage → `panapp-locale` = `"en"`; **F5**
     mantiene inglés. Borrar la clave y recargar → vuelve al default por `navigator.language`.
   - En Elements, `<html lang>` refleja el idioma activo (`en`/`es`) y cambia al alternar; la pestaña
     del navegador (`document.title`) también cambia.
5. **Accesibilidad:** el botón de idioma tiene `aria-label` traducido; los `aria-label` del buscador y
   del toggle de tema aparecen en el idioma activo; `prefers-reduced-motion` y el modo oscuro siguen
   funcionando sin cambios.
6. **No regresión visual:** en español, todos los textos son **idénticos** a los actuales (mismo copy),
   confirmando que la extracción a diccionario no alteró el contenido ni el layout.

## Fuera de alcance

- **Traducir el contenido de `src/data/recipes.js`** (nombres, subtítulos, ingredientes, pasos de las
  6 recetas locales): es autoría de contenido bilingüe + rediseño del modelo de datos → **item futuro
  propuesto**. La infraestructura `useI18n`/diccionario de este plan queda lista para reutilizarse.
- **Traducir el contenido de las recetas externas de TheMealDB** (B-06): viene en inglés de una fuente
  externa no controlada; solo se traduce el chrome que la rodea.
- **Añadir un tercer idioma o un selector desplegable** de idiomas: aquí es alternancia binaria es/en.
- **Detección/seguimiento en caliente de `navigator.language`**: solo decide el valor inicial cuando no
  hay preferencia guardada (igual criterio que `useTheme` con `prefers-color-scheme`).
- **Añadir dependencias de i18n** (`i18next`, `react-intl`, etc.): innecesarias para este catálogo.
- **Formato localizado de números/unidades** (separador decimal, `g`/`kg`): se mantienen tal cual;
  `formatAmount` (`baker.js`) no se toca.
- Cambios en `baker.js`, `mealdb.js`, PWA/service worker, `vite.config.js` o los tokens de diseño.
