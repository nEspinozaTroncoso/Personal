import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";

export default function WeightControl({ targetWeight, onChange, accent }) {
  return (
    <section
      style={{
        maxWidth: layout.maxWidth,
        margin: "2.2rem auto 0",
        padding: "1.6rem 1.8rem",
        background: colors.surface,
        borderRadius: radius.card,
        marginLeft: "1.5rem",
        marginRight: "1.5rem",
        boxShadow: shadow.card,
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
          style={{ fontFamily: fonts.serif, fontSize: "1rem", fontWeight: 600, color: colors.subtext }}
        >
          Peso total de la masa
        </label>
        <div style={{ fontFamily: fonts.serif, fontSize: "2rem", fontWeight: 700, color: accent }}>
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
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: colors.faint,
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
            onClick={() => onChange(w)}
            style={{
              cursor: "pointer",
              border: `1px solid ${colors.border}`,
              background: targetWeight === w ? colors.ink : "transparent",
              color: targetWeight === w ? colors.surface : colors.subtext,
              borderRadius: radius.pill,
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
  );
}
