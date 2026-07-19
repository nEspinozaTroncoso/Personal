import { useState } from "react";
import { colors, fonts, radius, shadow, layout } from "../styles/theme.js";

// Normaliza para búsqueda: minúsculas y sin acentos (NFD + descarte de diacríticos).
// Ej: "Báguette" -> "baguette", "MOLDE" -> "molde". Sin dependencias.
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // descarta las marcas diacríticas combinantes
}

export default function RecipeSelector({ recipes, activeId, onSelect, isFavorite, onToggleFavorite, t }) {
  const [query, setQuery] = useState("");

  // Orden congelado al montar: favoritas primero, preservando el orden de RECIPES dentro de cada
  // grupo (sort estable). No se recalcula al marcar/desmarcar, para evitar que una receta "salte"
  // de posición mientras el usuario interactúa (ver plan B-14, decisión 3).
  const [orderedRecipes] = useState(() => {
    const rank = (r) => (isFavorite("local", r.id) ? 0 : 1);
    return [...recipes].sort((a, b) => rank(a) - rank(b));
  });

  // Filtrado en cliente sobre name + subtitle. Con query vacío se muestran todas.
  const q = normalize(query.trim());
  const filtered = q
    ? orderedRecipes.filter(
        (r) => normalize(r.name).includes(q) || normalize(r.subtitle).includes(q)
      )
    : orderedRecipes;

  return (
    <div
      style={{
        maxWidth: layout.maxWidth,
        margin: "0 auto",
        padding: "0 1.5rem",
      }}
    >
      <input
        type="search"
        className="recipe-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("selector.searchPlaceholder")}
        aria-label={t("selector.searchAria")}
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
          fontSize: "1rem",
          outline: "none",
        }}
      />

      {filtered.length === 0 ? (
        <p
          role="status"
          style={{
            margin: "0.2rem 0 0",
            color: colors.muted,
            fontFamily: fonts.sans,
            fontSize: "0.9rem",
          }}
        >
          {t("selector.noResults", { query: query.trim() })}
        </p>
      ) : (
        <div
          style={{
            maxHeight: "min(60vh, 560px)",
            overflowY: "auto",
            paddingRight: "0.2rem",
          }}
        >
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {filtered.map((r) => {
              const active = r.id === activeId;
              const fav = isFavorite("local", r.id);
              return (
                <li key={r.id} style={{ position: "relative" }}>
                  <button
                    className="recipe-row touch"
                    onClick={() => onSelect(r.id)}
                    aria-current={active ? "true" : undefined}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.7rem",
                      width: "100%",
                      textAlign: "left",
                      border: active ? `2px solid ${r.accent}` : "2px solid transparent",
                      background: active ? colors.surface : colors.tabIdle,
                      borderRadius: radius.tab,
                      padding: "0.7rem 3.4rem 0.7rem 1rem",
                      boxShadow: active ? shadow.tab : "none",
                    }}
                  >
                    {/* Swatch de acento: conserva la identidad por receta en formato compacto */}
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: r.accent,
                      }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontFamily: fonts.serif,
                          fontWeight: 600,
                          fontSize: "1.02rem",
                          color: colors.ink,
                        }}
                      >
                        {r.name}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.78rem",
                          color: colors.muted,
                          marginTop: 2,
                        }}
                      >
                        {r.subtitle}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="fav-toggle"
                    aria-pressed={fav}
                    aria-label={
                      fav
                        ? t("favorite.removeAria", { name: r.name })
                        : t("favorite.addAria", { name: r.name })
                    }
                    onClick={() => onToggleFavorite({ kind: "local", id: r.id })}
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: 10,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span aria-hidden="true">{fav ? "★" : "☆"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
