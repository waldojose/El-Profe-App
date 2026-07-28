import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";

// EN/ES pill. Two modes:
//  - inline (default false): a fixed floating toggle, top-right, for pages that
//    don't embed it. Hidden on routes that render their own inline toggle.
//  - inline=true: a static pill meant to live inside a nav/topbar.
// Routes that render their own inline toggle in their header/topbar — keep
// this list in sync with every page that mounts <LanguageToggle inline />,
// so there is always exactly one toggle visible per screen.
const ROUTES_WITH_INLINE_TOGGLE = ["/", "/dashboard", "/editor", "/network", "/messages", "/auth"];

export default function LanguageToggle({ inline = false }) {
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const langs = ["en", "es"];

  const hasOwnInlineToggle = ROUTES_WITH_INLINE_TOGGLE.some((route) =>
    route === "/" ? location.pathname === "/" : location.pathname.startsWith(route)
  );
  if (!inline && hasOwnInlineToggle) {
    return null;
  }

  const wrapClass = inline
    ? "inline-flex items-center gap-1 rounded-full p-1"
    : "fixed top-3 right-4 z-[70] flex items-center gap-1 rounded-full p-1 backdrop-blur";

  return (
    <div
      className={wrapClass}
      style={{
        background: "rgba(16,14,28,0.8)",
        border: "1px solid rgba(157,123,255,0.35)",
        boxShadow: inline ? "none" : "0 6px 24px rgba(124,92,255,0.25)",
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
