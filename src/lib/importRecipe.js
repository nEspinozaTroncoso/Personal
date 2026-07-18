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
