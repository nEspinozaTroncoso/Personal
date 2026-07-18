import { colors, layout } from "../styles/theme.js";

export default function Footer({ t }) {
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
      {t("footer.note")}
    </footer>
  );
}
