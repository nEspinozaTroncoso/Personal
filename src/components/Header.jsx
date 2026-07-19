import { colors, fonts, layout } from "../styles/theme.js";

export default function Header({ theme, onToggleTheme, locale, onToggleLocale, t }) {
  const isDark = theme === "dark";
  return (
    <header style={{ padding: "3rem 1.5rem 1.5rem", maxWidth: layout.maxWidth, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button
          type="button"
          className="touch"
          onClick={onToggleLocale}
          aria-label={t("header.localeToggleAria")}
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
          <span aria-hidden="true">🌐</span>
          {t("header.localeLabel")}
        </button>
        <button
          type="button"
          className="touch"
          onClick={onToggleTheme}
          aria-label={isDark ? t("header.themeToLight") : t("header.themeToDark")}
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
          {isDark ? t("header.themeLabelLight") : t("header.themeLabelDark")}
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
        {t("header.eyebrow")}
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
        {t("header.title")}
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
        {t("header.subtitle")}
      </p>
    </header>
  );
}
