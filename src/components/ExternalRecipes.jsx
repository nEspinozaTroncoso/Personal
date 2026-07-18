import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";
import { useExternalRecipes } from "../hooks/useExternalRecipes.js";

// El texto de intro trae una única palabra de negación ("no"/"not") que se muestra en
// <strong>. Se parte el string traducido alrededor de esa palabra para conservar el énfasis
// sin necesitar una clave de catálogo adicional por idioma.
function introWithEmphasis(text) {
  const match = text.match(/\b(no|not)\b/);
  if (!match) return text;
  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {text.slice(0, start)}
      <strong>{match[0]}</strong>
      {text.slice(end)}
    </>
  );
}

export default function ExternalRecipes({ t, onImport, isFavorite, onToggleFavorite }) {
  const {
    query, setQuery,
    list, listStatus, listError, retryList,
    selectedId, detail, detailStatus, detailError,
    selectRecipe, retryDetail,
  } = useExternalRecipes();

  return (
    <section
      style={{
        maxWidth: layout.maxWidth,
        margin: "3rem auto 0",
        padding: "0 1.5rem",
      }}
    >
      <h2 style={{ fontFamily: fonts.serif, fontSize: "1.4rem", margin: "0 0 0.4rem", color: colors.ink }}>
        {t("external.heading")}
      </h2>
      <p style={{ margin: "0 0 1.2rem", fontSize: "0.9rem", color: colors.muted, lineHeight: 1.5 }}>
        {introWithEmphasis(t("external.intro"))}
      </p>

      <input
        type="search"
        className="recipe-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("external.searchPlaceholder")}
        aria-label={t("external.searchAria")}
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginBottom: "0.9rem",
          padding: "0.7rem 1rem",
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          color: colors.ink,
          borderRadius: radius.pill,
          fontFamily: fonts.sans,
          fontSize: "0.95rem",
          outline: "none",
        }}
      />

      {/* Estados del listado */}
      {listStatus === "prompt" && (
        <p role="status" style={statusStyle}>{t("external.typePrompt")}</p>
      )}
      {listStatus === "loading" && (
        <p role="status" style={statusStyle}>{t("external.loadingList")}</p>
      )}
      {listStatus === "error" && (
        <div role="alert" style={statusStyle}>
          {t("external.listError", { error: listError })}{" "}
          <button type="button" onClick={retryList} style={retryStyle}>{t("external.retry")}</button>
        </div>
      )}
      {listStatus === "ready" && list.length === 0 && (
        <p role="status" style={statusStyle}>{t("external.noResults", { query: query.trim() })}</p>
      )}

      {/* Grid del listado */}
      {listStatus === "ready" && list.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "0.9rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          }}
        >
          {list.map((m) => {
            const active = m.id === selectedId;
            const fav = isFavorite("mealdb", m.id);
            return (
              <div key={m.id} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="external-card"
                  onClick={() => selectRecipe(m.id)}
                  aria-pressed={active}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    padding: 0,
                    overflow: "hidden",
                    width: "100%",
                    border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                    background: colors.surface,
                    borderRadius: radius.card,
                    boxShadow: active ? shadow.tab : shadow.cardSoft,
                  }}
                >
                  {m.thumb && (
                    <img
                      className="external-card__img"
                      src={m.thumb}
                      alt={t("external.photoAlt", { name: m.name })}
                      loading="lazy"
                    />
                  )}
                  <div style={{ padding: "0.7rem 0.85rem", fontFamily: fonts.serif, fontWeight: 600,
                                fontSize: "0.98rem", color: colors.ink }}>
                    {m.name}
                  </div>
                </button>
                <button
                  type="button"
                  className="fav-toggle"
                  aria-pressed={fav}
                  aria-label={
                    fav
                      ? t("favorite.removeAria", { name: m.name })
                      : t("favorite.addAria", { name: m.name })
                  }
                  onClick={() => onToggleFavorite({ kind: "mealdb", id: m.id, name: m.name, thumb: m.thumb })}
                  style={{ position: "absolute", top: 8, right: 8 }}
                >
                  <span aria-hidden="true">{fav ? "★" : "☆"}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle del pan seleccionado */}
      {selectedId && (
        <div
          style={{
            marginTop: "1.6rem",
            background: colors.surface,
            borderRadius: radius.card,
            padding: "1.6rem 1.8rem",
            boxShadow: shadow.cardSoft,
          }}
        >
          {detailStatus === "loading" && <p role="status" style={statusStyle}>{t("external.loadingDetail")}</p>}
          {detailStatus === "error" && (
            <div role="alert" style={statusStyle}>
              {t("external.detailError", { error: detailError })}{" "}
              <button type="button" onClick={retryDetail} style={retryStyle}>{t("external.retry")}</button>
            </div>
          )}
          {detailStatus === "ready" && detail && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <h3 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: "0 0 0.2rem", color: colors.ink }}>
                  {detail.name}
                </h3>
                <button
                  type="button"
                  className="fav-toggle"
                  aria-pressed={isFavorite("mealdb", detail.id)}
                  aria-label={
                    isFavorite("mealdb", detail.id)
                      ? t("favorite.removeAria", { name: detail.name })
                      : t("favorite.addAria", { name: detail.name })
                  }
                  onClick={() =>
                    onToggleFavorite({ kind: "mealdb", id: detail.id, name: detail.name, thumb: detail.thumb })
                  }
                  style={{ marginBottom: "0.2rem" }}
                >
                  <span aria-hidden="true">{isFavorite("mealdb", detail.id) ? "★" : "☆"}</span>
                </button>
              </div>
              {(detail.area || detail.category) && (
                <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: colors.faint }}>
                  {[detail.area, detail.category].filter(Boolean).join(" · ")}
                </p>
              )}

              <button type="button" onClick={() => onImport(detail)} style={importBtnStyle}>
                {t("external.import")}
              </button>

              <h4 style={subheadStyle}>{t("external.ingredients")}</h4>
              <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.2rem" }}>
                {detail.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "baseline", padding: "0.4rem 0",
                    borderBottom: `1px solid ${colors.divider}` }}>
                    <span style={{ fontSize: "0.97rem", color: colors.inkSoft }}>{ing.name}</span>
                    <span style={{ fontFamily: fonts.serif, fontWeight: 600, fontSize: "1rem",
                      whiteSpace: "nowrap", marginLeft: "1rem", color: colors.ink }}>
                      {ing.measure || "—"}
                    </span>
                  </div>
                ))}
              </div>

              <h4 style={subheadStyle}>{t("external.method")}</h4>
              <ol style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: "0.6rem" }}>
                {detail.steps.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.96rem", color: colors.inkSoft, lineHeight: 1.5 }}>{s}</li>
                ))}
              </ol>

              {detail.source && (
                <p style={{ marginTop: "1.2rem", fontSize: "0.82rem" }}>
                  <a href={detail.source} target="_blank" rel="noopener noreferrer"
                     style={{ color: colors.eyebrow }}>
                    {t("external.viewOriginal")}
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

const statusStyle = { margin: "0.4rem 0", fontFamily: fonts.sans, fontSize: "0.9rem", color: colors.muted };
const retryStyle = { cursor: "pointer", border: `1px solid ${colors.border}`, background: "transparent",
  color: colors.subtext, borderRadius: radius.pill, padding: "0.25rem 0.8rem", fontSize: "0.8rem",
  fontWeight: 600, marginLeft: "0.3rem" };
const subheadStyle = { fontFamily: fonts.serif, fontSize: "1.05rem", margin: "0 0 0.6rem", color: colors.subtext };
const importBtnStyle = { cursor: "pointer", border: `1px solid ${colors.border}`,
  background: colors.surface, color: colors.ink, borderRadius: radius.pill,
  padding: "0.5rem 1.1rem", fontSize: "0.9rem", fontWeight: 600, marginTop: "0.4rem",
  marginBottom: "1rem" };
