import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translations } from "./translations";

const I18nContext = createContext(null);
const STORAGE_KEY = "elprofe.lang";

export function I18nProvider({ children, defaultLang = "en" }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "en" || saved === "es" ? saved : defaultLang;
    } catch {
      return defaultLang;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    try { document.documentElement.lang = lang; } catch {}
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l === "es" ? "es" : "en"), []);
  const toggle = useCallback(() => setLangState((l) => (l === "en" ? "es" : "en")), []);

  // t("key") with EN fallback; returns the key itself if missing everywhere.
  const t = useCallback(
    (key) => {
      const dict = translations[lang] || translations.en;
      const val = dict[key];
      if (val !== undefined) return val;
      const fallback = translations.en[key];
      return fallback !== undefined ? fallback : key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe default if used outside the provider
    return { lang: "en", setLang: () => {}, toggle: () => {}, t: (k) => k };
  }
  return ctx;
}
