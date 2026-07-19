import { colors, fonts, radius, shadow } from "../styles/theme.js";
import { formatAmount } from "../lib/baker.js";
import StepList from "./StepList.jsx";

export default function ImportedRecipe({ recipe, onClear, isFavorite, onToggleFavorite, t }) {
  const fav = isFavorite("mealdb", recipe.id);
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0.15rem 0 0",
                           color: colors.ink }}>{recipe.name}</h2>
              <button
                type="button"
                className="fav-toggle"
                aria-pressed={fav}
                aria-label={
                  fav
                    ? t("favorite.removeAria", { name: recipe.name })
                    : t("favorite.addAria", { name: recipe.name })
                }
                onClick={() =>
                  onToggleFavorite({ kind: "mealdb", id: recipe.id, name: recipe.name, thumb: recipe.thumb })
                }
              >
                <span aria-hidden="true">{fav ? "★" : "☆"}</span>
              </button>
            </div>
            {(recipe.area || recipe.category) && (
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: colors.faint }}>
                {[recipe.area, recipe.category].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button type="button" className="touch" onClick={onClear} style={clearStyle}>{t("imported.clear")}</button>
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
