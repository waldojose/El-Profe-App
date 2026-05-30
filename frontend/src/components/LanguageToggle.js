import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nProvider";

// Always-visible EN/ES pill. Fixed bottom-left so it shows on every screen.
export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const langs = ["en", "es"];

  return (
    <div
      className="fixed bottom-5 left-5 z-[60] flex items-center gap-1 rounded-full p-1 backdrop-blur"
      style={{
        background: "rgba(16,14,28,0.8)",
        border: "1px solid rgba(157,123,255,0.35)",
        boxShadow: "0 6px 24px rgba(124,92,255,0.25)",
      }}
      data-testid="language-toggle"
    >
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="relative px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
          style={{ color: lang === l ? "#fff" : "var(--ep-muted)" }}
          data-testid={`lang-${l}`}
          aria-pressed={lang === l}
        >
          {lang === l && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 rounded-full"
              style={{ background: "linear-gradient(110deg, var(--ep-violet), var(--ep-magenta))" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{l.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
