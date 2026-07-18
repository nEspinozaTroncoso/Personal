import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";

export default function RecipeSelector({ recipes, activeId, onSelect }) {
  return (
    <nav
      style={{
        maxWidth: layout.maxWidth,
        margin: "0 auto",
        padding: "0 1.5rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.6rem",
      }}
    >
      {recipes.map((r) => {
        const active = r.id === activeId;
        return (
          <button
            key={r.id}
            className="recipe-tab"
            onClick={() => onSelect(r.id)}
            style={{
              cursor: "pointer",
              border: active ? `2px solid ${r.accent}` : "2px solid transparent",
              background: active ? colors.surface : colors.tabIdle,
              borderRadius: radius.tab,
              padding: "0.9rem 1.1rem",
              textAlign: "left",
              minWidth: 150,
              boxShadow: active ? shadow.tab : "none",
            }}
          >
            <div
              style={{
                fontFamily: fonts.serif,
                fontWeight: 600,
                fontSize: "1.02rem",
                color: colors.ink,
              }}
            >
              {r.name}
            </div>
            <div style={{ fontSize: "0.78rem", color: colors.muted, marginTop: 2 }}>
              {r.subtitle}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
