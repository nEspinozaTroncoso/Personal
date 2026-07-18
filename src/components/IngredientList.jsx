import { colors, fonts, radius, shadow } from "../styles/theme.js";
import { formatAmount } from "../lib/baker.js";

export default function IngredientList({ recipeName, accent, scaled }) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radius.card,
        padding: "1.6rem 1.8rem",
        boxShadow: shadow.cardSoft,
      }}
    >
      <h2 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0 0 1rem", color: accent }}>
        Ingredientes — {recipeName}
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
              borderBottom: `1px solid ${colors.divider}`,
            }}
          >
            <span style={{ fontSize: "0.98rem", color: colors.inkSoft }}>{ing.name}</span>
            <span
              style={{
                fontFamily: fonts.serif,
                fontWeight: 600,
                fontSize: "1.05rem",
                whiteSpace: "nowrap",
                marginLeft: "1rem",
                color: colors.ink,
              }}
            >
              {formatAmount(ing.amount)} {ing.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
