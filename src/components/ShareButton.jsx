import { useState, useEffect, useRef } from "react";
import { colors, fonts, radius, layout } from "../styles/theme.js";
import { buildShareUrl } from "../lib/shareUrl.js";

// Botón "Compartir receta": construye el enlace (?receta=<id>&peso=<g>) a partir del estado
// activo, lo copia al portapapeles y da feedback accesible (role="status"/"alert"). Si el
// portapapeles no está disponible o falla, muestra la URL en un input seleccionable como
// respaldo manual. Componente "tonto": no conoce el hook, recibe todo por props.
export default function ShareButton({ activeId, targetWeight, t }) {
  const [status, setStatus] = useState("idle"); // "idle" | "copied" | "error"
  const [url, setUrl] = useState("");
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleClick() {
    const base = window.location.origin + window.location.pathname;
    const shareUrl = buildShareUrl(base, activeId, targetWeight);
    setUrl(shareUrl);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      if (!navigator.clipboard) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(shareUrl);
      setStatus("copied");
      timeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        maxWidth: layout.maxWidth,
        margin: "1.2rem auto 0",
        padding: "0 1.5rem",
      }}
    >
      <button
        type="button"
        className="share-button touch"
        aria-label={t("share.ariaLabel")}
        onClick={handleClick}
        style={{
          cursor: "pointer",
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          color: colors.subtext,
          borderRadius: radius.pill,
          padding: "0.5rem 1.1rem",
          fontFamily: fonts.sans,
          fontSize: "0.9rem",
          fontWeight: 600,
        }}
      >
        {t("share.button")}
      </button>

      {status === "copied" && (
        <span
          role="status"
          style={{
            display: "block",
            marginTop: "0.5rem",
            fontFamily: fonts.sans,
            fontSize: "0.85rem",
            color: colors.muted,
          }}
        >
          {t("share.copied")}
        </span>
      )}

      {status === "error" && (
        <div
          role="alert"
          style={{
            marginTop: "0.5rem",
            fontFamily: fonts.sans,
            fontSize: "0.85rem",
            color: colors.subtext,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>{t("share.error")}</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            style={{
              flex: "1 1 220px",
              border: `1px solid ${colors.border}`,
              borderRadius: radius.tab,
              background: colors.surface,
              color: colors.ink,
              padding: "0.35rem 0.6rem",
              fontFamily: fonts.sans,
              fontSize: "1rem",
            }}
          />
        </div>
      )}
    </div>
  );
}
