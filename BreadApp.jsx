import React, { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// DATA: 6 recetas base. Cada ingrediente lleva "pct" = porcentaje de panadero
// (respecto al total de harina = 100). El agua/leche/huevo también van en pct
// para poder reescalar todo linealmente a partir del peso final deseado.
// baseYieldG = peso aproximado de la masa que produce 100% de harina + resto,
// usado solo para mostrar una referencia, el cálculo real es proporcional.
// ---------------------------------------------------------------------------

const RECIPES = [
  {
    id: "molde-7030",
    name: "Pan de Molde 70/30",
    subtitle: "Blanca y integral, miga suave",
    accent: "#C17F3E",
    totalFlour: 500, // g de harina en la receta base tal como fue definida
    ingredients: [
      { id: "harina-blanca", name: "Harina blanca (000)", pct: 70, unit: "g" },
      { id: "harina-integral", name: "Harina integral", pct: 30, unit: "g" },
      { id: "levadura", name: "Levadura seca instantánea", pct: 1.4, unit: "g" },
      { id: "agua", name: "Agua tibia (35–40°C)", pct: 60, unit: "ml" },
      { id: "azucar", name: "Miel o azúcar", pct: 5, unit: "g" },
      { id: "sal", name: "Sal", pct: 1.8, unit: "g" },
      { id: "grasa", name: "Aceite o mantequilla derretida", pct: 6, unit: "g" },
      { id: "leche-polvo", name: "Leche en polvo (opcional)", pct: 3, unit: "g" },
    ],
    steps: [
      "Activa la levadura en el agua tibia con el azúcar, 8–10 min hasta que espume.",
      "Mezcla las harinas, la sal y la leche en polvo en un bowl grande.",
      "Incorpora el líquido activado y la grasa. Une hasta masa desordenada.",
      "Amasa 10–12 min hasta lograr el test de la ventana.",
      "Primer levado en bowl aceitado y tapado, hasta duplicar (~60–90 min).",
      "Desgasifica, forma un rollo y colócalo en el molde enmantequillado.",
      "Segundo levado tapado hasta que sobrepase el molde (~45–60 min).",
      "Hornea a 190°C por 35–40 min hasta sonar hueco al golpear la base.",
      "Desmolda de inmediato y enfría en rejilla al menos 30 min antes de cortar.",
    ],
  },
  {
    id: "molde-tradicional",
    name: "Pan de Molde Tradicional",
    subtitle: "100% harina blanca, clásico de sándwich",
    accent: "#B5652E",
    totalFlour: 500,
    ingredients: [
      { id: "harina-blanca", name: "Harina blanca (000)", pct: 100, unit: "g" },
      { id: "levadura", name: "Levadura seca instantánea", pct: 1.4, unit: "g" },
      { id: "agua", name: "Leche tibia", pct: 60, unit: "ml" },
      { id: "azucar", name: "Azúcar", pct: 6, unit: "g" },
      { id: "sal", name: "Sal", pct: 1.8, unit: "g" },
      { id: "grasa", name: "Mantequilla derretida", pct: 7, unit: "g" },
    ],
    steps: [
      "Activa la levadura en la leche tibia con el azúcar, 8–10 min.",
      "Mezcla la harina y la sal en un bowl grande.",
      "Agrega el líquido activado y la mantequilla. Une hasta masa desordenada.",
      "Amasa 10 min hasta que esté lisa y elástica.",
      "Primer levado tapado hasta duplicar (~60 min).",
      "Desgasifica, forma en rollo y coloca en molde enmantequillado.",
      "Segundo levado hasta sobrepasar el molde (~40–50 min).",
      "Hornea a 190°C por 30–35 min hasta dorar y sonar hueco.",
      "Desmolda y enfría en rejilla antes de cortar.",
    ],
  },
  {
    id: "brioche",
    name: "Brioche",
    subtitle: "Enriquecido, mantecoso, para ocasiones",
    accent: "#D9A441",
    totalFlour: 500,
    ingredients: [
      { id: "harina-blanca", name: "Harina blanca (000)", pct: 100, unit: "g" },
      { id: "levadura", name: "Levadura seca instantánea", pct: 1.6, unit: "g" },
      { id: "leche", name: "Leche tibia", pct: 20, unit: "ml" },
      { id: "huevo", name: "Huevo entero", pct: 30, unit: "g" },
      { id: "azucar", name: "Azúcar", pct: 12, unit: "g" },
      { id: "sal", name: "Sal", pct: 1.8, unit: "g" },
      { id: "mantequilla", name: "Mantequilla pomada", pct: 40, unit: "g" },
    ],
    steps: [
      "Activa la levadura en la leche tibia, 8–10 min.",
      "Mezcla harina, azúcar y sal. Agrega huevo y leche activada.",
      "Amasa 5 min, luego incorpora la mantequilla en 3 tandas, amasando entre cada una.",
      "Sigue amasando 10–12 min hasta masa brillante y elástica.",
      "Primer levado tapado 60–90 min a temperatura ambiente.",
      "Refrigera la masa 1–2 horas (facilita el formado, opcional pero recomendado).",
      "Forma en molde o trenza, segundo levado 60–90 min hasta duplicar.",
      "Pinta con huevo batido y hornea a 175°C por 25–30 min hasta dorar.",
      "Enfría en rejilla antes de cortar.",
    ],
  },
  {
    id: "hallulla",
    name: "Pan Jockey / Hallulla",
    subtitle: "Chileno clásico, con manteca",
    accent: "#A66B3F",
    totalFlour: 500,
    ingredients: [
      { id: "harina-blanca", name: "Harina blanca (000)", pct: 100, unit: "g" },
      { id: "levadura", name: "Levadura seca instantánea", pct: 1.2, unit: "g" },
      { id: "agua", name: "Agua tibia", pct: 55, unit: "ml" },
      { id: "manteca", name: "Manteca o margarina", pct: 8, unit: "g" },
      { id: "azucar", name: "Azúcar", pct: 2, unit: "g" },
      { id: "sal", name: "Sal", pct: 2, unit: "g" },
      { id: "polvo-hornear", name: "Polvo de hornear", pct: 0.6, unit: "g" },
    ],
    steps: [
      "Activa la levadura en el agua tibia con el azúcar, 8–10 min.",
      "Mezcla harina, sal y polvo de hornear en un bowl.",
      "Agrega el líquido activado y la manteca. Une hasta masa desordenada.",
      "Amasa 10 min hasta lograr una masa lisa y firme (más dura que un pan de molde).",
      "Primer levado tapado 40–50 min hasta que crezca visiblemente.",
      "Divide en bollos, estira cada uno en disco de ~1.5 cm y pincha el centro con tenedor.",
      "Segundo levado corto, 20–25 min sobre la lata enharinada.",
      "Hornea a 220°C por 15–20 min hasta dorar la superficie.",
      "Sirve tibio; se conserva mejor el mismo día.",
    ],
  },
  {
    id: "hamburguesa",
    name: "Pan de Hamburguesa",
    subtitle: "Suave, ligeramente dulce, para armar",
    accent: "#CE8A3D",
    totalFlour: 500,
    ingredients: [
      { id: "harina-blanca", name: "Harina blanca (000)", pct: 100, unit: "g" },
      { id: "levadura", name: "Levadura seca instantánea", pct: 1.6, unit: "g" },
      { id: "leche", name: "Leche tibia", pct: 45, unit: "ml" },
      { id: "huevo", name: "Huevo entero", pct: 15, unit: "g" },
      { id: "azucar", name: "Azúcar", pct: 8, unit: "g" },
      { id: "sal", name: "Sal", pct: 1.8, unit: "g" },
      { id: "mantequilla", name: "Mantequilla derretida", pct: 10, unit: "g" },
    ],
    steps: [
      "Activa la levadura en la leche tibia con el azúcar, 8–10 min.",
      "Mezcla harina y sal. Agrega huevo y líquido activado.",
      "Amasa 5 min, incorpora la mantequilla y sigue amasando 8–10 min más.",
      "Primer levado tapado 60 min hasta duplicar.",
      "Divide en bollos parejos (~90–110 g cada uno) y bolea firme.",
      "Aplana levemente, ubica en lata separados y tapa.",
      "Segundo levado 40–50 min hasta que se vean esponjosos.",
      "Pinta con huevo batido, agrega sésamo si quieres, hornea a 180°C por 15–18 min.",
      "Enfría en rejilla antes de armar la hamburguesa.",
    ],
  },
  {
    id: "baguette",
    name: "Baguette Básica",
    subtitle: "Corteza crujiente, miga alveolada",
    accent: "#B87333",
    totalFlour: 500,
    ingredients: [
      { id: "harina-blanca", name: "Harina blanca (000)", pct: 100, unit: "g" },
      { id: "levadura", name: "Levadura seca instantánea", pct: 1, unit: "g" },
      { id: "agua", name: "Agua fría", pct: 68, unit: "ml" },
      { id: "sal", name: "Sal", pct: 2, unit: "g" },
    ],
    steps: [
      "Disuelve la levadura en el agua fría (el frío ralentiza la fermentación y mejora el sabor).",
      "Mezcla la harina y la sal, agrega el agua con levadura.",
      "Amasa 10 min hasta masa lisa y algo pegajosa (hidratación alta).",
      "Primer levado tapado 2 horas, con un pliegue a la mitad del tiempo.",
      "Divide en 2–3 piezas, preforma en cilindros y deja reposar 15 min.",
      "Forma las baguettes alargando y sellando la costura.",
      "Segundo levado 45 min sobre tela enharinada (couche) o lata.",
      "Greña (corta) la superficie en diagonal y hornea a 230°C con vapor por 20–25 min.",
      "Enfría al menos 15 min antes de cortar para que la miga asiente.",
    ],
  },
];

// Convierte la lista de %-panadero a gramos/ml reales dado un peso final deseado.
// Suma todos los pct (que ya incluyen 100 de harina + resto de ingredientes),
// obtiene el "factor" para que la masa total resultante sea igual a targetWeight.
function scaleRecipe(recipe, targetWeightG) {
  const totalPct = recipe.ingredients.reduce((sum, ing) => sum + ing.pct, 0);
  const factor = targetWeightG / totalPct;
  return recipe.ingredients.map((ing) => ({
    ...ing,
    amount: ing.pct * factor,
  }));
}

function formatAmount(n) {
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toString();
}

export default function BreadApp() {
  const [activeId, setActiveId] = useState(RECIPES[0].id);
  const [targetWeight, setTargetWeight] = useState(1000);

  const recipe = useMemo(
    () => RECIPES.find((r) => r.id === activeId),
    [activeId]
  );
  const scaled = useMemo(
    () => scaleRecipe(recipe, targetWeight),
    [recipe, targetWeight]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EDE4D3",
        color: "#2B2119",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: "4rem",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .recipe-tab {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .recipe-tab:hover {
          transform: translateY(-2px);
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: #d8ccb4;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #2B2119;
          border: 4px solid #FAF6EF;
          box-shadow: 0 0 0 1px #2B2119;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #2B2119;
          border: 4px solid #FAF6EF;
          box-shadow: 0 0 0 1px #2B2119;
          cursor: pointer;
          border: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .recipe-tab { transition: none; }
        }
      `}</style>

      {/* Header */}
      <header style={{ padding: "3rem 1.5rem 1.5rem", maxWidth: 960, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "0.85rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B7860",
            marginBottom: "0.5rem",
            fontWeight: 600,
          }}
        >
          Cuaderno de panadería
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          Seis panes, un solo peso.
        </h1>
        <p
          style={{
            marginTop: "0.9rem",
            fontSize: "1.05rem",
            color: "#5A4E3F",
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Elige una receta, decide cuánto pan quieres hoy, y cada ingrediente
          se ajusta solo — en gramos y mililitros.
        </p>
      </header>

      {/* Recipe selector */}
      <nav
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.6rem",
        }}
      >
        {RECIPES.map((r) => {
          const active = r.id === activeId;
          return (
            <button
              key={r.id}
              className="recipe-tab"
              onClick={() => setActiveId(r.id)}
              style={{
                cursor: "pointer",
                border: active ? `2px solid ${r.accent}` : "2px solid transparent",
                background: active ? "#FAF6EF" : "rgba(255,255,255,0.4)",
                borderRadius: "14px",
                padding: "0.9rem 1.1rem",
                textAlign: "left",
                minWidth: 150,
                boxShadow: active ? "0 4px 14px rgba(43,33,25,0.12)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: "1.02rem",
                  color: "#2B2119",
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "#837662", marginTop: 2 }}>
                {r.subtitle}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Weight control — the signature element */}
      <section
        style={{
          maxWidth: 960,
          margin: "2.2rem auto 0",
          padding: "1.6rem 1.8rem",
          background: "#FAF6EF",
          borderRadius: "18px",
          marginLeft: "1.5rem",
          marginRight: "1.5rem",
          boxShadow: "0 6px 24px rgba(43,33,25,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "0.9rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <label
            htmlFor="weight-slider"
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1rem",
              fontWeight: 600,
              color: "#5A4E3F",
            }}
          >
            Peso total de la masa
          </label>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "2rem",
              fontWeight: 700,
              color: recipe.accent,
            }}
          >
            {targetWeight >= 1000
              ? `${(targetWeight / 1000).toFixed(targetWeight % 1000 === 0 ? 0 : 1)} kg`
              : `${targetWeight} g`}
          </div>
        </div>
        <input
          id="weight-slider"
          type="range"
          min={200}
          max={2500}
          step={50}
          value={targetWeight}
          onChange={(e) => setTargetWeight(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "#9A8D78",
            marginTop: "0.4rem",
          }}
        >
          <span>200 g</span>
          <span>2.5 kg</span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.9rem", flexWrap: "wrap" }}>
          {[500, 1000, 1500, 2000].map((w) => (
            <button
              key={w}
              onClick={() => setTargetWeight(w)}
              style={{
                cursor: "pointer",
                border: "1px solid #d8ccb4",
                background: targetWeight === w ? "#2B2119" : "transparent",
                color: targetWeight === w ? "#FAF6EF" : "#5A4E3F",
                borderRadius: "999px",
                padding: "0.35rem 0.9rem",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              {w >= 1000 ? `${w / 1000} kg` : `${w} g`}
            </button>
          ))}
        </div>
      </section>

      {/* Ingredients + steps */}
      <main
        style={{
          maxWidth: 960,
          margin: "2rem auto 0",
          padding: "0 1.5rem",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            background: "#FAF6EF",
            borderRadius: "18px",
            padding: "1.6rem 1.8rem",
            boxShadow: "0 6px 24px rgba(43,33,25,0.06)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.3rem",
              margin: "0 0 1rem",
              color: recipe.accent,
            }}
          >
            Ingredientes — {recipe.name}
          </h2>
          <div style={{ display: "grid", gap: "0.55rem" }}>
            {scaled.map((ing) => (
              <div
                key={ing.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #ECE3D0",
                }}
              >
                <span style={{ fontSize: "0.98rem", color: "#3B3226" }}>
                  {ing.name}
                </span>
                <span
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    whiteSpace: "nowrap",
                    marginLeft: "1rem",
                    color: "#2B2119",
                  }}
                >
                  {formatAmount(ing.amount)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#FAF6EF",
            borderRadius: "18px",
            padding: "1.6rem 1.8rem",
            boxShadow: "0 6px 24px rgba(43,33,25,0.06)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.3rem",
              margin: "0 0 1rem",
              color: recipe.accent,
            }}
          >
            Procedimiento
          </h2>
          <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.65rem" }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ fontSize: "0.97rem", color: "#3B3226", lineHeight: 1.5 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </main>

      <footer
        style={{
          maxWidth: 960,
          margin: "2.5rem auto 0",
          padding: "0 1.5rem",
          fontSize: "0.8rem",
          color: "#9A8D78",
        }}
      >
        Las cantidades se calculan por porcentaje de panadero, así que la
        proporción entre ingredientes se mantiene sin importar cuánto pan
        quieras hacer.
      </footer>
    </div>
  );
}
