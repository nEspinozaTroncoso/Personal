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

export default function RecipeSelector({ recipes, activeId, onSelect }) {
  const [query, setQuery] = useState("");

  // Filtrado en cliente sobre name + subtitle. Con query vacío se muestran todas.
  const q = normalize(query.trim());
  const filtered = q
    ? recipes.filter(
        (r) => normalize(r.name).includes(q) || normalize(r.subtitle).includes(q)
      )
    : recipes;

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
        placeholder="Buscar receta…"
        aria-label="Buscar receta por nombre o descripción"
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
          No hay recetas que coincidan con «{query.trim()}».
        </p>
      ) : (
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
          }}
        >
          {filtered.map((r) => {
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
      )}
    </div>
  );
}
