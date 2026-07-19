import { useState } from "react";
import { colors, fonts, radius, shadow } from "../styles/theme.js";
import { ACCENTS, validateDraft, draftToRecipe, recipeToDraft } from "../lib/customRecipes.js";

// Draft por defecto para "alta". La primera fila sugiere harina=100% (convención blanda, ver
// baker.js): es editable/eliminable, no se fuerza técnicamente.
function defaultDraft() {
  return {
    id: null,
    name: "",
    subtitle: "",
    accent: ACCENTS[0],
    ingredients: [{ name: "Harina", pct: "100", unit: "g" }],
    steps: [""],
  };
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.ink,
  borderRadius: radius.tab,
  fontFamily: fonts.sans,
  fontSize: "1rem", // evita el zoom automático de iOS (B-16)
  padding: "0.55rem 0.7rem",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontFamily: fonts.sans,
  fontSize: "0.8rem",
  fontWeight: 600,
  color: colors.subtext,
  marginBottom: "0.3rem",
};

// Panel inline (no modal) de captura/edición de una receta custom. Presentacional: toda la
// persistencia vive en useCustomRecipes; este componente solo valida el draft y emite el
// resultado ya convertido con draftToRecipe.
export default function RecipeForm({ mode, initialRecipe, existingNames, onSubmit, onCancel, t }) {
  const [draft, setDraft] = useState(() =>
    mode === "edit" && initialRecipe ? recipeToDraft(initialRecipe) : defaultDraft()
  );
  const [errors, setErrors] = useState([]);

  const updateIngredient = (idx, field, value) => {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)),
    }));
  };

  const addIngredient = () => {
    setDraft((d) => ({
      ...d,
      ingredients: [...d.ingredients, { name: "", pct: "", unit: "g" }],
    }));
  };

  const removeIngredient = (idx) => {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }));
  };

  const updateStep = (idx, value) => {
    setDraft((d) => ({ ...d, steps: d.steps.map((s, i) => (i === idx ? value : s)) }));
  };

  const addStep = () => {
    setDraft((d) => ({ ...d, steps: [...d.steps, ""] }));
  };

  const removeStep = (idx) => {
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    const { valid, errors: nextErrors } = validateDraft(draft, existingNames);
    if (!valid) {
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    onSubmit(draftToRecipe(draft));
  };

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radius.card,
        padding: "1.6rem 1.8rem",
        boxShadow: shadow.cardSoft,
        display: "grid",
        gap: "1rem",
      }}
    >
      <h2 style={{ fontFamily: fonts.serif, fontSize: "1.3rem", margin: 0, color: draft.accent }}>
        {mode === "edit" ? t("form.headingEdit") : t("form.headingCreate")}
      </h2>

      {errors.length > 0 && (
        <div
          role="alert"
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: radius.tab,
            padding: "0.7rem 0.9rem",
            fontFamily: fonts.sans,
            fontSize: "0.88rem",
            color: colors.subtext,
            display: "grid",
            gap: "0.3rem",
          }}
        >
          {errors.map((key) => (
            <span key={key}>{t(key)}</span>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="recipe-form-name" style={labelStyle}>
          {t("form.nameLabel")}
        </label>
        <input
          id="recipe-form-name"
          type="text"
          className="recipe-form-input"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="recipe-form-subtitle" style={labelStyle}>
          {t("form.subtitleLabel")}
        </label>
        <input
          id="recipe-form-subtitle"
          type="text"
          className="recipe-form-input"
          value={draft.subtitle}
          onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
          style={inputStyle}
        />
      </div>

      <div>
        <span style={labelStyle}>{t("form.accentLabel")}</span>
        <div role="radiogroup" aria-label={t("form.accentLabel")} style={{ display: "flex", gap: "0.5rem" }}>
          {ACCENTS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={draft.accent === color}
              aria-label={color}
              onClick={() => setDraft((d) => ({ ...d, accent: color }))}
              className="touch"
              style={{
                cursor: "pointer",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: color,
                border:
                  draft.accent === color
                    ? `3px solid ${colors.ink}`
                    : `1px solid ${colors.border}`,
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <span style={labelStyle}>{t("form.ingredientsLabel")}</span>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {draft.ingredients.map((ing, idx) => (
            <div key={idx} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <input
                type="text"
                className="recipe-form-input"
                aria-label={t("form.ingredientNameLabel")}
                value={ing.name}
                onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                style={{ ...inputStyle, flex: "1 1 auto" }}
              />
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                className="recipe-form-input"
                aria-label={t("form.pctLabel")}
                value={ing.pct}
                onChange={(e) => updateIngredient(idx, "pct", e.target.value)}
                style={{ ...inputStyle, width: "5rem", flex: "0 0 auto" }}
              />
              <select
                className="recipe-form-input"
                aria-label={t("form.unitLabel")}
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                style={{ ...inputStyle, width: "4.5rem", flex: "0 0 auto" }}
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
              <button
                type="button"
                className="fav-toggle"
                aria-label={t("form.removeIngredient")}
                onClick={() => removeIngredient(idx)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="touch"
          onClick={addIngredient}
          style={{
            marginTop: "0.6rem",
            cursor: "pointer",
            border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.subtext,
            borderRadius: radius.pill,
            padding: "0.35rem 0.9rem",
            fontFamily: fonts.sans,
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          {t("form.addIngredient")}
        </button>
      </div>

      <div>
        <span style={labelStyle}>{t("form.stepsLabel")}</span>
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {draft.steps.map((step, idx) => (
            <div key={idx} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <input
                type="text"
                className="recipe-form-input"
                aria-label={`${t("form.stepsLabel")} ${idx + 1}`}
                value={step}
                onChange={(e) => updateStep(idx, e.target.value)}
                style={{ ...inputStyle, flex: "1 1 auto" }}
              />
              <button
                type="button"
                className="fav-toggle"
                aria-label={t("form.removeStep")}
                onClick={() => removeStep(idx)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="touch"
          onClick={addStep}
          style={{
            marginTop: "0.6rem",
            cursor: "pointer",
            border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.subtext,
            borderRadius: radius.pill,
            padding: "0.35rem 0.9rem",
            fontFamily: fonts.sans,
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          {t("form.addStep")}
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="share-button touch"
          onClick={handleSave}
          style={{
            cursor: "pointer",
            border: `1px solid ${colors.border}`,
            background: colors.ink,
            color: colors.surface,
            borderRadius: radius.pill,
            padding: "0.5rem 1.1rem",
            fontFamily: fonts.sans,
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          {t("form.save")}
        </button>
        <button
          type="button"
          className="share-button touch"
          onClick={onCancel}
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
          {t("form.cancel")}
        </button>
      </div>
    </div>
  );
}
