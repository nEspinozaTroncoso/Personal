import Header from "./components/Header.jsx";
import RecipeSelector from "./components/RecipeSelector.jsx";
import WeightControl from "./components/WeightControl.jsx";
import IngredientList from "./components/IngredientList.jsx";
import StepList from "./components/StepList.jsx";
import Footer from "./components/Footer.jsx";
import ExternalRecipes from "./components/ExternalRecipes.jsx";
import ShareButton from "./components/ShareButton.jsx";
import ImportedRecipe from "./components/ImportedRecipe.jsx";
import { useRecipeScaling } from "./hooks/useRecipeScaling.js";
import { useTheme } from "./hooks/useTheme.js";
import { useI18n } from "./hooks/useI18n.js";
import { useImportedRecipe } from "./hooks/useImportedRecipe.js";
import { useFavorites } from "./hooks/useFavorites.js";
import { colors, fonts, layout } from "./styles/theme.js";

export default function App() {
  const { recipes, activeId, setActiveId, targetWeight, setTargetWeight, recipe, scaled } =
    useRecipeScaling();
  const { theme, toggle } = useTheme();
  const { locale, toggle: toggleLocale, t } = useI18n();
  const { imported, importRecipe, clearImport } = useImportedRecipe();
  const { isFavorite, toggleFavorite } = useFavorites();

  // Elegir una receta de la casa descarta la importada y vuelve al calculador local.
  const handleSelectLocal = (id) => { clearImport(); setActiveId(id); };
  // Cargar una externa: importa y sube a la zona principal.
  const handleImport = (detail) => {
    importRecipe(detail);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.ink,
        fontFamily: fonts.sans,
        paddingBottom: "4rem",
      }}
    >
      <Header
        theme={theme}
        onToggleTheme={toggle}
        locale={locale}
        onToggleLocale={toggleLocale}
        t={t}
      />
      <RecipeSelector
        recipes={recipes}
        activeId={activeId}
        onSelect={handleSelectLocal}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        t={t}
      />
      {!imported && (
        <WeightControl
          targetWeight={targetWeight}
          onChange={setTargetWeight}
          accent={recipe.accent}
          t={t}
        />
      )}
      {!imported && <ShareButton activeId={activeId} targetWeight={targetWeight} t={t} />}
      <main
        className="recipe-main"
        style={{
          maxWidth: layout.maxWidth,
          margin: "2rem auto 0",
          padding: "0 1.5rem",
        }}
      >
        {imported ? (
          <ImportedRecipe
            recipe={imported}
            onClear={clearImport}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            t={t}
          />
        ) : (
          <>
            <IngredientList recipeName={recipe.name} accent={recipe.accent} scaled={scaled} t={t} />
            <StepList steps={recipe.steps} accent={recipe.accent} t={t} />
          </>
        )}
      </main>
      <ExternalRecipes
        t={t}
        onImport={handleImport}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
      <Footer t={t} />
    </div>
  );
}
