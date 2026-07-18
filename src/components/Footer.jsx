import { colors, layout } from "../styles/theme.js";

export default function Footer() {
  return (
    <footer
      style={{
        maxWidth: layout.maxWidth,
        margin: "2.5rem auto 0",
        padding: "0 1.5rem",
        fontSize: "0.8rem",
        color: colors.faint,
      }}
    >
      Las cantidades se calculan por porcentaje de panadero, así que la proporción entre
      ingredientes se mantiene sin importar cuánto pan quieras hacer.
    </footer>
  );
}
