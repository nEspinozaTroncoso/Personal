import Header from "./components/Header.jsx";
import RecipeSelector from "./components/RecipeSelector.jsx";
import WeightControl from "./components/WeightControl.jsx";
import IngredientList from "./components/IngredientList.jsx";
import StepList from "./components/StepList.jsx";
import Footer from "./components/Footer.jsx";
import { useRecipeScaling } from "./hooks/useRecipeScaling.js";
import { useTheme } from "./hooks/useTheme.js";
import { colors, fonts, layout } from "./styles/theme.js";

export default function App() {
  const { recipes, activeId, setActiveId, targetWeight, setTargetWeight, recipe, scaled } =
    useRecipeScaling();
  const { theme, toggle } = useTheme();

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
      <Header theme={theme} onToggleTheme={toggle} />
      <RecipeSelector recipes={recipes} activeId={activeId} onSelect={setActiveId} />
      <WeightControl targetWeight={targetWeight} onChange={setTargetWeight} accent={recipe.accent} />
      <main
        className="recipe-main"
        style={{
          maxWidth: layout.maxWidth,
          margin: "2rem auto 0",
          padding: "0 1.5rem",
        }}
      >
        <IngredientList recipeName={recipe.name} accent={recipe.accent} scaled={scaled} />
        <StepList steps={recipe.steps} accent={recipe.accent} />
      </main>
      <Footer />
    </div>
  );
}
