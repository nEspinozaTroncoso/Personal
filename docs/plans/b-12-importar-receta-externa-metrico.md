# Plan B-12 — Importar receta externa al calculador principal (métrico g/ml)

> Estado: propuesto por `plan-panadero` (Opus). A ejecutar por `implementador` (Sonnet 5).
> Item de backlog: **B-12** (P2) — "Importar receta externa al calculador principal (métrico g/ml)".
> Parte **2/4** del grupo "Evolución recetas externas + favoritos" (B-11 → **B-12** → B-13 → B-14).
> Requiere B-06/B-10/B-11 (hechos): `src/lib/mealdb.js`, `useExternalRecipes.js`, `ExternalRecipes.jsx`.
> **No debe romper** los tests de `baker.js`/`mealdb`/`shareUrl`/`translate` (B-01/B-08/B-09/B-10/B-11),
> la PWA (B-02), la persistencia (B-03/B-08), el modo oscuro (B-04), el buscador (B-05) ni la i18n (B-07).

## Contexto

Hoy la sección "Explorar más panes" (`src/components/ExternalRecipes.jsx`, B-06/B-10/B-11) muestra
recetas de **TheMealDB** en **solo lectura**: ingredientes con su medida original (`name` + `measure`,
un string libre como `"1 cup"`, `"2 tbsp"`, `"200g"`, `"1"`, `"to taste"`) y el procedimiento en pasos.
Esas recetas **no** entran en el calculador principal, que trabaja solo con el catálogo local
(`src/data/recipes.js`) expresado en **porcentaje de panadero** (`pct`) y reescalado por `scaleRecipe`
(`src/lib/baker.js`).

B-12 pide una acción de **"cargar en el calculador"** una receta externa ya visible, **convertida al
sistema métrico internacional (g/ml)**. El reto real: las medidas de TheMealDB son heterogéneas y no
siempre métricas, y convertir "1 cup de harina" a gramos exige densidades por ingrediente (una `cup`
de harina ≈ 120 g, pero de azúcar ≈ 200 g). El plan de B-06 (`docs/plans/b-06-integracion-api-recetas.md`)
ya evaluó y **descartó por frágil** convertir las externas a `pct` (parser de unidades + tabla de
densidades + heurística de "cuál es la harina base" → porcentajes inventados). B-12 hereda esa tensión.

### Las tres decisiones de diseño (resueltas aquí, no en el backlog)

**(b) — Alcance de la conversión: solo unidades exactas; los volúmenes/medidas ambiguas se dejan tal
cual, marcadas.** Se convierten **únicamente** las unidades traducibles **sin densidad** (misma
dimensión física): masa (g, kg, oz, lb, mg) → **g**, y volumen (ml, l, cl, dl) → **ml**. Todo lo que
exigiría una densidad por ingrediente o es un conteo/medida vaga — `cup`, `tbsp`, `tsp`, `pinch`,
`dash`, `clove`, unidades sueltas (`"2"`, como en "2 eggs"), `"to taste"`, `""` — se **deja sin
convertir**, mostrando la medida original con una **advertencia visual**. Justificación: inventar una
tabla de densidades por ingrediente sería enorme, incompleta y poco confiable (choca con lo ya decidido
en B-06); convertir solo lo exacto es **honesto** y cubre la parte de las recetas que sí trae gramos/ml.

**(a) — ¿Preguntar al usuario o adivinar con densidades? Ninguna de las dos.** Como la decisión (b)
elimina de raíz las conversiones ambiguas, **no hay nada que adivinar ni que confirmar**: no se pide al
usuario ajustar valores (fricción innecesaria) ni se estiman gramos con una tabla de densidades (datos
inventados). Cada ingrediente cae en uno de dos casos deterministas: **convertible exacto** (se
convierte) o **no convertible** (se muestra su medida original con una nota). El usuario ve con claridad
qué es dato duro y qué quedó en su unidad de origen.

**(c) — Encaje en `pct`/`scaleRecipe`: pesos fijos, sin recálculo por porcentaje. NO se calcula `pct`.**
Detectar "cuál ingrediente es la harina" para calcular `pct` es arriesgado y ambiguo — más aún porque
`search.php?s=bread` (B-11) devuelve resultados que **no** son panes de horno (bread pudding, banana
bread…), donde "harina = 100%" ni siquiera aplica. Coherente con B-06 (no fingir precisión que no se
tiene), la receta importada se guarda como **pesos fijos convertidos** y **no** pasa por `scaleRecipe`,
**no** usa el slider de peso y **no** se reescala. `src/lib/baker.js`, `src/data/recipes.js` y el modelo
`pct` quedan **intactos**. La receta importada se muestra **dentro de la sección principal** (reemplaza
las tarjetas del calculador local mientras está activa), claramente etiquetada como no reescalable.

> Consecuencia de (c) en la UI: mientras hay una receta importada activa, el `WeightControl` (slider) y
> el `ShareButton` se **ocultan** (solo aplican a recetas locales escalables). El `RecipeSelector` sigue
> visible: elegir una receta de la casa **descarta** la importada y vuelve al calculador normal.

## Archivos a tocar/crear

1. **`src/lib/importRecipe.js`** (crear) — Lógica **pura, sin React**. Parser de la `measure` libre +
   tabla de conversión exacta unidad→g/ml + `importMealRecipe(detail)` que mapea el shape de
   `normalizeMealDetail` a una "receta importada". Toda la conversión vive aquí (testeable).
2. **`src/lib/importRecipe.test.js`** (crear) — Tests Vitest del parser/conversión (sin red), con
   fixtures inline. Cubre unidades exactas, ambiguas, fracciones, conteos, vacíos y `importMealRecipe`.
3. **`src/hooks/useImportedRecipe.js`** (crear) — Estado mínimo de la receta importada activa
   (`imported`, `importRecipe(detail)`, `clearImport()`). Sin persistencia (dato volátil, ver Decisión D3).
4. **`src/components/ImportedRecipe.jsx`** (crear) — Presentación de la receta importada en la zona
   principal: ingredientes convertidos (g/ml) y no convertidos (medida original + badge), banner de
   advertencia si hay no convertidos, botón "volver", y reutiliza `StepList` para el procedimiento.
5. **`src/components/ExternalRecipes.jsx`** (editar) — Añadir prop `onImport` y un botón "Cargar en el
   calculador" en el bloque de detalle ya existente (`detailStatus === "ready"`).
6. **`src/App.jsx`** (editar) — Instanciar `useImportedRecipe`; render condicional en `<main>`
   (importada vs. local); ocultar `WeightControl`/`ShareButton` con importada activa; envolver el
   `onSelect` del `RecipeSelector` para limpiar la importada; pasar `onImport` a `ExternalRecipes`.
7. **`src/i18n/messages.js`** (editar) — 6 claves nuevas en **es y en** (paridad obligatoria, ver
   `translate.test.js`). Se **reutilizan** claves existentes donde el significado coincide.

**No se tocan**: `src/lib/baker.js` ni `baker.test.js`, `src/data/recipes.js`,
`src/hooks/useRecipeScaling.js`, `useTheme.js`, `useI18n.js`, `src/lib/mealdb.js`,
`useExternalRecipes.js`, `src/lib/shareUrl.js`, `src/styles/theme.js`, `WeightControl.jsx`,
`IngredientList.jsx`, `StepList.jsx` (se **usa** sin modificar), `RecipeSelector.jsx`, `Header.jsx`,
`Footer.jsx`, `ShareButton.jsx`, `global.css`, `vite.config.js`, PWA/`sw.js`. **Sin dependencias nuevas.**

## Reutilización

- **`normalizeMealDetail` (`src/lib/mealdb.js`)** — la receta importada parte de su salida ya normalizada
  (`{ id, name, thumb, area, category, source, ingredients:[{name,measure}], steps }`). `importRecipe.js`
  **no** vuelve a tocar el formato crudo de TheMealDB ni importa `mealdb.js`; recibe el detalle ya limpio.
- **`formatAmount` (`src/lib/baker.js`)** — para renderizar los montos **convertidos** (`120 g`, `57 g`)
  con el mismo redondeo que el calculador local (B-09). Es la única dependencia de `baker.js`, y es de
  **solo lectura** (no se modifica). `scaleRecipe` **no** se usa a propósito (ver Decisión c).
- **`StepList` (`src/components/StepList.jsx`)** — se reutiliza **verbatim** para el procedimiento de la
  receta importada (`steps` + `accent` neutro + `t`); usa `t("steps.heading")`.
- **Tokens de `src/styles/theme.js`** — `colors.surface/ink/inkSoft/subtext/muted/faint/border/divider/
  eyebrow`, `fonts.serif/sans`, `radius.card/pill`, `shadow.cardSoft`, `layout.maxWidth`. Cero hex sueltos
  → hereda el modo oscuro (B-04) gratis. La advertencia usa **tokens existentes** (`faint`/`border` +
  símbolo ⚠), **sin** introducir un color nuevo (se mantiene el aspecto visual, no lo pide el item).
- **Patrón de estados accesibles (B-05/B-06)** — el banner de "hay ingredientes sin convertir" usa
  `role="status"`; los botones son `<button type="button">`.
- **Estilo de botón "pill" existente** (`retryStyle` en `ExternalRecipes.jsx`, botones de `WeightControl`)
  — el botón "Cargar en el calculador" y el "volver" replican ese lenguaje con tokens, sin CSS nuevo.
- **Hook mínimo de sesión (patrón de `useExternalRecipes`)** — `useImportedRecipe` es un hook diminuto de
  estado en memoria; **no** persiste (igual criterio que la caché de sesión de B-06, D3).

## Decisiones de diseño

### D1 — La conversión vive en `lib/` (pura), el estado en `hooks/`, la pintura en `components/`
Respeta CLAUDE.md: `importRecipe.js` no importa React → testeable y aislado; `useImportedRecipe.js`
guarda el estado; `ImportedRecipe.jsx` queda presentacional. Misma separación que B-06.

### D2 — Alcance de la conversión = solo unidades exactas (decisión b)
Ver tabla en el Paso 1. Regla determinista: se convierte **solo** si (i) se puede leer una cantidad
numérica al inicio de la `measure` **y** (ii) la unidad está en la tabla de masa/volumen. En cualquier
otro caso se conserva la `measure` original marcada como no convertida. Sin densidades, sin heurísticas.

### D3 — La receta importada NO se persiste (solo sesión)
A diferencia de receta/peso/tema (preferencias del usuario), es dato remoto volátil; persistirlo
aportaría complejidad de invalidación sin beneficio (mismo criterio que la caché de B-06). Un reload
vuelve al calculador local. (La persistencia de favoritos es otro item: **B-13**.)

### D4 — La importada reemplaza el contenido principal; slider/compartir se ocultan (decisión c)
Mostrar el slider sobre una receta que no se reescala sería confuso y deshonesto. Con importada activa,
`<main>` muestra `ImportedRecipe` en vez de `IngredientList`+`StepList`, y `WeightControl`/`ShareButton`
se ocultan. El estado local (`activeId`/`targetWeight`) se conserva intacto por debajo; al volver, todo
reaparece idéntico. Es un render condicional en `App.jsx`: **no** toca el modelo `pct`.

### D5 — Contenido en inglés (sin traducir)
Los `name` de ingredientes y los pasos vienen de TheMealDB en inglés y se muestran **tal cual**, igual
que en la sección externa de B-06/B-07 (traducir contenido de datos quedó fuera de alcance en B-07).
Solo el **chrome** (títulos, botones, advertencias) usa i18n.

## Pasos

### Paso 1 — Crear `src/lib/importRecipe.js` (parser + tabla de conversión + mapeo)

Módulo puro. **Tabla de conversión exacta** (sin densidad). Las claves son el token de unidad ya
normalizado (minúsculas, singularizado — ver `normalizeUnit`):

| Dimensión | Unidad de origen (tokens aceptados) | Factor a base | `unit` resultante |
|-----------|-------------------------------------|---------------|-------------------|
| Masa      | `mg`                                | ×0.001        | `g`  |
| Masa      | `g`, `gr`, `gram`                    | ×1            | `g`  |
| Masa      | `kg`, `kilo`, `kilogram`             | ×1000         | `g`  |
| Masa      | `oz`, `ounce`                        | ×28.35        | `g`  |
| Masa      | `lb`, `pound`                        | ×453.6        | `g`  |
| Volumen   | `ml`, `milliliter`, `millilitre`     | ×1            | `ml` |
| Volumen   | `cl`                                 | ×10           | `ml` |
| Volumen   | `dl`                                 | ×100          | `ml` |
| Volumen   | `l`, `liter`, `litre`                | ×1000         | `ml` |

**Fuera de la tabla → NO se convierten** (se muestran con su medida original + advertencia): `cup`,
`tbsp`/`tablespoon`, `tsp`/`teaspoon`, `fl oz`/`fluid ounce` (volumen pero confundible con la `oz` de
peso; se excluye a propósito para que "oz = peso" sea inequívoco), `pinch`, `dash`, `handful`, `sprig`,
`clove`, `stick`, `slice`, cualquier **conteo sin unidad** (`"2"`, `"1"` → "2 eggs"), y las medidas
vagas sin número (`"to taste"`, `"as needed"`, `""`).

Implementación de referencia (el implementador puede reordenar, pero **debe respetar la tabla y los
casos**):

```js
// src/lib/importRecipe.js
// Convierte una receta de TheMealDB (shape de normalizeMealDetail) a una receta "importada"
// con cantidades en g/ml SOLO cuando la unidad original es traducible de forma exacta (misma
// dimensión, sin densidad). Los volúmenes/medidas ambiguas (cup, tbsp, tsp, unidades sueltas,
// "to taste"...) se dejan tal cual, marcadas como NO convertidas. NO calcula porcentaje de
// panadero: son pesos fijos, sin reescalado. Sin dependencias de React.

// Fracciones unicode comunes en las measures de TheMealDB.
const UNICODE_FRACTIONS = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅚": 5 / 6,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// Unidad normalizada -> { factor a base (g o ml), unit }. Solo conversiones EXACTAS (sin densidad).
const UNIT_TABLE = {
  // masa -> g
  mg: { factor: 0.001, unit: "g" },
  g: { factor: 1, unit: "g" }, gr: { factor: 1, unit: "g" }, gram: { factor: 1, unit: "g" },
  kg: { factor: 1000, unit: "g" }, kilo: { factor: 1000, unit: "g" }, kilogram: { factor: 1000, unit: "g" },
  oz: { factor: 28.35, unit: "g" }, ounce: { factor: 28.35, unit: "g" },
  lb: { factor: 453.6, unit: "g" }, pound: { factor: 453.6, unit: "g" },
  // volumen -> ml
  ml: { factor: 1, unit: "ml" }, milliliter: { factor: 1, unit: "ml" }, millilitre: { factor: 1, unit: "ml" },
  cl: { factor: 10, unit: "ml" }, dl: { factor: 100, unit: "ml" },
  l: { factor: 1000, unit: "ml" }, liter: { factor: 1000, unit: "ml" }, litre: { factor: 1000, unit: "ml" },
};

// Reemplaza fracciones unicode por su decimal, rodeado de espacios ("1½" -> "1 0.5 ").
function replaceUnicodeFractions(s) {
  let out = "";
  for (const ch of s) out += UNICODE_FRACTIONS[ch] != null ? ` ${UNICODE_FRACTIONS[ch]} ` : ch;
  return out;
}

// Suma una cantidad que puede ser "1", "1.5", "1/2", "1 1/2" o mixta "1 0.5". null si hay basura.
function parseQuantity(qtyStr) {
  const parts = qtyStr.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  let total = 0;
  for (const p of parts) {
    if (/^\d+\/\d+$/.test(p)) {
      const [a, b] = p.split("/").map(Number);
      if (!b) return null;
      total += a / b;
    } else if (/^\d+(?:\.\d+)?$/.test(p)) {
      total += Number(p);
    } else {
      return null;
    }
  }
  return total;
}

// Toma la parte "unidad + resto" y devuelve el token de unidad normalizado (minúsculas, singular).
function normalizeUnit(unitPart) {
  const m = unitPart.trim().toLowerCase().match(/^[a-z]+/);
  if (!m) return "";
  let u = m[0];
  if (u.length > 2 && u.endsWith("s")) u = u.slice(0, -1); // grams->gram, ounces->ounce, lbs->lb
  return u;
}

// Núcleo puro y testeable: convierte una measure libre.
// -> { converted: true, amount, unit }  |  { converted: false, original }
export function convertMeasure(measure) {
  const raw = (measure || "").trim();
  if (!raw) return { converted: false, original: "" };
  const expanded = replaceUnicodeFractions(raw).trim();
  // separa la cantidad inicial (dígitos/./ /espacios) del resto (empieza con letra).
  const m = expanded.match(/^([\d.\/\s]+?)\s*([a-zA-Z].*)?$/);
  if (!m || !m[1] || !m[1].trim()) return { converted: false, original: raw };
  const qty = parseQuantity(m[1]);
  if (qty == null) return { converted: false, original: raw };
  const entry = UNIT_TABLE[normalizeUnit(m[2] || "")];
  if (!entry) return { converted: false, original: raw }; // sin unidad o unidad ambigua
  return { converted: true, amount: qty * entry.factor, unit: entry.unit };
}

// Mapea el detalle normalizado de TheMealDB a la receta importada (pesos fijos, sin pct).
export function importMealRecipe(detail) {
  if (!detail) return null;
  const ingredients = detail.ingredients.map((ing, i) => {
    const c = convertMeasure(ing.measure);
    return c.converted
      ? { id: i, name: ing.name, converted: true, amount: c.amount, unit: c.unit }
      : { id: i, name: ing.name, converted: false, original: c.original };
  });
  return {
    id: detail.id,
    name: detail.name,
    thumb: detail.thumb,
    area: detail.area,
    category: detail.category,
    source: detail.source,
    steps: detail.steps,
    ingredients,
    hasUnconverted: ingredients.some((x) => !x.converted),
  };
}
```

Notas para el implementador:
- **No** importar React ni `mealdb.js` aquí. La única relación con `baker.js` es que el **componente**
  usará `formatAmount` para pintar `amount`; este módulo devuelve el número crudo.
- El orden de backtracking del regex hace que `"200g"` separe bien `"200"` + `"g"` (el resto debe
  empezar por letra). No cambiarlo sin re-verificar los tests.

### Paso 2 — Crear `src/lib/importRecipe.test.js`

Tests de los normalizadores puros, sin red. Casos mínimos obligatorios:

- **Masa exacta**: `convertMeasure("200g")` y `"200 g"` → `{converted:true, amount:200, unit:"g"}`;
  `"1kg"`/`"1 kg"` → `1000 g`; `"2 oz"` → `≈56.7 g` (usar `toBeCloseTo`); `"1 lb"` → `≈453.6 g`;
  `"500 grams"` → `500 g`.
- **Volumen exacto**: `"250ml"` → `250 ml`; `"1 litre"`/`"1 l"` → `1000 ml`; `"2 cl"` → `20 ml`.
- **Fracciones**: `"1/2 kg"` → `500 g`; `"½ l"` → `500 ml`; `"1 1/2 kg"` → `1500 g`; `"1½ kg"` → `1500 g`.
- **Ambiguas / no convertidas** (devuelven `{converted:false, original:<raw trim>}`): `"1 cup"`,
  `"2 tbsp"`, `"1 tsp"`, `"1 pinch"`, `"2 cloves garlic"`, `"1 fl oz"`, `"2"` (conteo), `"to taste"`.
- **Vacío**: `convertMeasure("")` y `"   "` → `{converted:false, original:""}`.
- **`importMealRecipe`**: dado un `detail` con mezcla de ingredientes convertibles y no, produce el
  array con las dos formas, `hasUnconverted === true`, e ids incrementales; `importMealRecipe(null)` → `null`.

> Estos tests **se suman** al total del proyecto; ningún test existente se modifica.

### Paso 3 — Crear `src/hooks/useImportedRecipe.js`

```js
import { useState, useCallback } from "react";
import { importMealRecipe } from "../lib/importRecipe.js";

// Estado de sesión de la receta externa "cargada en el calculador". No se persiste (dato volátil).
export function useImportedRecipe() {
  const [imported, setImported] = useState(null);
  const importRecipe = useCallback((detail) => setImported(importMealRecipe(detail)), []);
  const clearImport = useCallback(() => setImported(null), []);
  return { imported, importRecipe, clearImport };
}
```

### Paso 4 — Crear `src/components/ImportedRecipe.jsx`

Presentación de la receta importada en la zona principal. Estilos inline + tokens; reutiliza `StepList`
y `formatAmount`. Estructura de referencia (ajustable en detalles de estilo, **manteniendo** tokens,
roles ARIA y la separación convertido/no-convertido):

```jsx
import { colors, fonts, radius, shadow } from "../styles/theme.js";
import { formatAmount } from "../lib/baker.js";
import StepList from "./StepList.jsx";

export default function ImportedRecipe({ recipe, onClear, t }) {
  return (
    <>
      <div style={{ background: colors.surface, borderRadius: radius.card,
                    padding: "1.6rem 1.8rem", boxShadow: shadow.cardSoft }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      gap: "1rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.78rem", letterSpacing: "0.04em",
                        textTransform: "uppercase", color: colors.eyebrow }}>
              {t("imported.heading")}
            </p>
            <h2 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0.15rem 0 0",
                         color: colors.ink }}>{recipe.name}</h2>
            {(recipe.area || recipe.category) && (
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: colors.faint }}>
                {[recipe.area, recipe.category].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button type="button" onClick={onClear} style={clearStyle}>{t("imported.clear")}</button>
        </div>

        <p style={{ margin: "0.6rem 0 1rem", fontSize: "0.85rem", color: colors.muted, lineHeight: 1.5 }}>
          {t("imported.note")}
        </p>

        {recipe.hasUnconverted && (
          <p role="status" style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: colors.subtext,
               border: `1px solid ${colors.border}`, borderRadius: radius.card,
               padding: "0.6rem 0.8rem", lineHeight: 1.45 }}>
            ⚠ {t("imported.unconvertedWarning")}
          </p>
        )}

        <div style={{ display: "grid", gap: "0.55rem" }}>
          {recipe.ingredients.map((ing) => (
            <div key={ing.id} style={{ display: "flex", justifyContent: "space-between",
                 alignItems: "baseline", padding: "0.5rem 0",
                 borderBottom: `1px solid ${colors.divider}` }}>
              <span style={{ fontSize: "0.98rem", color: colors.inkSoft }}>{ing.name}</span>
              {ing.converted ? (
                <span style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: "1.05rem",
                     whiteSpace: "nowrap", marginLeft: "1rem", color: colors.ink }}>
                  {formatAmount(ing.amount)} {ing.unit}
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.4rem",
                     marginLeft: "1rem", whiteSpace: "nowrap" }}>
                  <span style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: "1.05rem",
                       color: colors.muted }}>{ing.original || "—"}</span>
                  <span title={t("imported.unconvertedLabel")}
                        aria-label={t("imported.unconvertedLabel")}
                        style={{ fontSize: "0.72rem", color: colors.faint,
                                 border: `1px solid ${colors.border}`, borderRadius: radius.pill,
                                 padding: "0.05rem 0.5rem" }}>⚠</span>
                </span>
              )}
            </div>
          ))}
        </div>

        {recipe.source && (
          <p style={{ marginTop: "1.2rem", fontSize: "0.82rem" }}>
            <a href={recipe.source} target="_blank" rel="noopener noreferrer"
               style={{ color: colors.eyebrow }}>{t("external.viewOriginal")}</a>
          </p>
        )}
      </div>

      <StepList steps={recipe.steps} accent={colors.ink} t={t} />
    </>
  );
}

const clearStyle = { cursor: "pointer", border: `1px solid ${colors.border}`, background: "transparent",
  color: colors.subtext, borderRadius: radius.pill, padding: "0.35rem 0.9rem", fontSize: "0.82rem",
  fontWeight: 600, whiteSpace: "nowrap" };
```

Notas:
- **Solo tokens** de `theme.js`; nada de hex sueltos → modo oscuro gratis.
- El badge ⚠ tiene `aria-label`/`title` con `imported.unconvertedLabel` (accesibilidad).
- Se reutiliza `t("external.viewOriginal")` (mismo significado que en la sección externa).

### Paso 5 — Editar `src/components/ExternalRecipes.jsx`

- Añadir la prop `onImport` a la firma: `export default function ExternalRecipes({ t, onImport }) {`.
- Dentro del bloque `detailStatus === "ready" && detail && (...)`, tras el título/área (o junto al
  enlace "Ver receta original"), añadir un botón que carga la receta en el calculador:

```jsx
<button type="button" onClick={() => onImport(detail)} style={importBtnStyle}>
  {t("external.import")}
</button>
```

Con un estilo "pill" con tokens (puede vivir junto a `retryStyle`/`subheadStyle` al final del archivo):

```js
const importBtnStyle = { cursor: "pointer", border: `1px solid ${colors.border}`,
  background: colors.surface, color: colors.ink, borderRadius: radius.pill,
  padding: "0.5rem 1.1rem", fontSize: "0.9rem", fontWeight: 600, marginTop: "0.4rem" };
```

Ubicarlo de forma visible en el detalle (p. ej. tras el encabezado `área · categoría`, antes de
"Ingredientes"). No se cambia nada más de la sección externa.

### Paso 6 — Editar `src/App.jsx`

Cambios (render condicional; el modelo `pct` no se toca):

```jsx
import ImportedRecipe from "./components/ImportedRecipe.jsx";
import { useImportedRecipe } from "./hooks/useImportedRecipe.js";
// … dentro de App():
const { imported, importRecipe, clearImport } = useImportedRecipe();

// Elegir una receta de la casa descarta la importada y vuelve al calculador local.
const handleSelectLocal = (id) => { clearImport(); setActiveId(id); };
// Cargar una externa: importa y sube a la zona principal.
const handleImport = (detail) => {
  importRecipe(detail);
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
};
```

En el JSX:
- `<RecipeSelector ... onSelect={handleSelectLocal} ... />` (antes `onSelect={setActiveId}`).
- **Ocultar** `WeightControl` y `ShareButton` cuando `imported` existe:
  `{!imported && <WeightControl .../>}` y `{!imported && <ShareButton .../>}`.
- Dentro de `<main>`, condicionar el contenido:

```jsx
<main className="recipe-main" style={{ /* … igual … */ }}>
  {imported ? (
    <ImportedRecipe recipe={imported} onClear={clearImport} t={t} />
  ) : (
    <>
      <IngredientList recipeName={recipe.name} accent={recipe.accent} scaled={scaled} t={t} />
      <StepList steps={recipe.steps} accent={recipe.accent} t={t} />
    </>
  )}
</main>
<ExternalRecipes t={t} onImport={handleImport} />
```

> Nota sobre el layout: `.recipe-main` es una grilla de 2 columnas en pantallas anchas. Con importada
> activa, `ImportedRecipe` renderiza **dos hijos** (card de ingredientes + `StepList`), que ocuparán las
> dos columnas igual que hoy `IngredientList` + `StepList`. No hace falta tocar `global.css`.

### Paso 7 — Editar `src/i18n/messages.js` (paridad es/en)

Añadir **en ambos idiomas** (mismas claves — lo verifica `translate.test.js`). Reutilizar
`external.viewOriginal`, `external.ingredients`/`external.method` (vía `StepList`→`steps.heading`) donde
aplique. Claves nuevas:

```js
// es
"external.import": "Cargar en el calculador",
"imported.heading": "Receta importada",
"imported.note": "Convertida a g/ml donde fue posible. Son pesos fijos: esta receta no se reescala por porcentaje de panadero como las recetas de la casa.",
"imported.unconvertedWarning": "Algunos ingredientes no se pudieron convertir a g/ml (cucharadas, tazas, unidades…) y se muestran en su medida original.",
"imported.unconvertedLabel": "Sin convertir",
"imported.clear": "Volver a las recetas de la casa",

// en
"external.import": "Load into the calculator",
"imported.heading": "Imported recipe",
"imported.note": "Converted to g/ml where possible. These are fixed weights: this recipe is not scaled by baker's percentage like the house recipes.",
"imported.unconvertedWarning": "Some ingredients couldn't be converted to g/ml (spoons, cups, units…) and are shown in their original measure.",
"imported.unconvertedLabel": "Not converted",
"imported.clear": "Back to the house recipes",
```

## Verificación (end-to-end)

Ejecutar desde la raíz del proyecto.

1. **Tests:** `npm test` →
   - Todos los tests previos siguen en verde (`baker.js` intacto, paridad i18n incluida).
   - Los **nuevos `importRecipe.test.js`** pasan (conversión exacta, ambiguas, fracciones, `importMealRecipe`).
   - El **test de paridad de claves** (`translate.test.js`) sigue verde con las 6 claves nuevas en es y en.

2. **Build (PWA intacta):** `npm run build` → sin errores; `dist/` conserva `sw.js` + `manifest.webmanifest`.

3. **Dev / comportamiento (con red):** `npm run dev`, http://localhost:5173.
   - En "Explorar más panes", buscar y seleccionar un pan → aparece el botón **"Cargar en el calculador"**.
   - Al pulsarlo: la vista sube arriba, el **slider y el botón "Compartir" desaparecen**, y la zona
     principal muestra la **"Receta importada"** con: encabezado + nombre, nota de "pesos fijos, no se
     reescala", ingredientes **convertidos a g/ml** donde la unidad era exacta (g/kg/oz/lb/ml/l), y los
     **no convertidos** con su medida original + badge ⚠, más el **banner de advertencia** (`role="status"`)
     si hay alguno. El **procedimiento** se ve vía `StepList`.
   - **Volver a las recetas de la casa** (botón): reaparecen slider, "Compartir", `IngredientList` y
     `StepList` locales **idénticos** a antes (mismo `activeId`/peso). También seleccionar una receta en
     el `RecipeSelector` limpia la importada y vuelve al calculador.
   - **El calculador local nunca pasó por conversión externa**; `scaleRecipe`/`pct` no se tocaron.

4. **Conversión correcta (spot-check con la API real):** elegir un pan cuyos ingredientes traigan `g`/`ml`
   → se ven en g/ml con el redondeo de `formatAmount`; los que traigan `cup`/`tbsp`/`tsp`/conteos quedan
   con su texto original + ⚠. Ningún gramo "inventado" para tazas/cucharadas.

5. **Reload (no persiste):** con una receta importada activa, recargar → vuelve al **calculador local**
   (la importada no se persiste; D3). Receta/peso locales siguen persistidos como siempre (B-03/B-08).

6. **Claro/oscuro (B-04) + i18n (B-07):** con el toggle de tema, la vista importada se ve coherente en
   ambos modos (superficies, texto, bordes, badge). Con el toggle de idioma, todo el **chrome** nuevo
   (botón importar, encabezado, nota, advertencia, badge, botón volver) cambia es/en; el **contenido**
   (nombres de ingredientes/pasos) permanece en inglés (esperado, D5).

7. **Accesibilidad:** banner de "sin convertir" con `role="status"`; badge ⚠ con `aria-label`; botones
   reales `<button type="button">` navegables por teclado con foco visible; enlace externo con
   `rel="noopener noreferrer"`. Sin errores de consola.

## Fuera de alcance

- **Tabla de densidades por ingrediente** para convertir `cup`/`tbsp`/`tsp`/conteos a gramos: se
  descarta (decisiones a/b) — se muestran sin convertir. Sería frágil y de datos inventados.
- **Calcular `pct`/porcentaje de panadero** de la receta importada o detectar "la harina base"
  (decisión c): no se hace. Son pesos fijos; no pasan por `scaleRecipe` ni por el slider.
- **Reescalar la receta importada por peso total**: no aplica (no tiene `pct`).
- **Persistir la receta importada** en `localStorage` (D3): solo estado de sesión.
- **Traducir el contenido** de TheMealDB (nombres de ingredientes/pasos): sigue en inglés (D5/B-07).
- **Editar/ajustar manualmente** las conversiones ambiguas por el usuario (decisión a): no se pide input.
- **`fl oz`/fluid ounce → ml**: se deja sin convertir a propósito (confundible con `oz` de peso).
- **Favoritos** (locales/externos) y **ordenar por favoritas**: son **B-13** y **B-14** del grupo.
- Cambios en `baker.js`, `recipes.js`, `useRecipeScaling`, `mealdb.js`, `useExternalRecipes`, la PWA o
  dependencias nuevas.
```