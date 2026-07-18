import { colors, fonts, radius, shadow } from "../styles/theme.js";

export default function StepList({ steps, accent }) {
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
        Procedimiento
      </h2>
      <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.65rem" }}>
        {steps.map((step, i) => (
          <li key={i} style={{ fontSize: "0.97rem", color: colors.inkSoft, lineHeight: 1.5 }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
