import { useEffect, useState } from "react";
import { messages } from "../i18n/messages.js";
import { translate } from "../i18n/translate.js";

const STORAGE_KEY = "panapp-locale";

function getInitialLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {
    // localStorage no disponible (modo privado): se ignora
  }
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es")) {
    return "es";
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return "en";
  }
  return "es";
}

export function useI18n() {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // sin persistencia si localStorage no está disponible
    }
    document.title = translate(messages, locale, "doc.title");
  }, [locale]);

  const toggle = () => setLocale((l) => (l === "es" ? "en" : "es"));

  const t = (key, params) => translate(messages, locale, key, params);

  return { locale, toggle, t };
}
