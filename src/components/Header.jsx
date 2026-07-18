import { colors, fonts, layout } from "../styles/theme.js";

export default function Header({ theme, onToggleTheme }) {
  const isDark = theme === "dark";
  return (
    <header style={{ padding: "3rem 1.5rem 1.5rem", maxWidth: layout.maxWidth, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
          aria-pressed={isDark}
          style={{
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.subtext,
            borderRadius: "999px",
            padding: "0.4rem 0.85rem",
            fontFamily: fonts.sans,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
          {isDark ? "Claro" : "Oscuro"}
        </button>
      </div>
      <div
        style={{
          fontFamily: fonts.serif,
          fontSize: "0.85rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: colors.eyebrow,
          marginBottom: "0.5rem",
          fontWeight: 600,
        }}
      >
        Cuaderno de panadería
      </div>
      <h1
        style={{
          fontFamily: fonts.serif,
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
          color: colors.subtext,
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        Elige una receta, decide cuánto pan quieres hoy, y cada ingrediente se ajusta solo — en
        gramos y mililitros.
      </p>
    </header>
  );
}
