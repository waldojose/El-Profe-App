import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Music, FileCheck, Lock, GitBranch, FileText,
  Languages, PenTool, Scale, Check, X, ChevronRight
} from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

const LOGO_URL =
  "/logo-white.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 6,
  duration: 6 + Math.random() * 8,
  drift: -20 + Math.random() * 40,
}));

const AuroraBackground = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        el.style.setProperty("--mx", `${x}%`);
        el.style.setProperty("--my", `${y}%`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="aurora-bg" ref={ref}>
        <div className="aurora-blob v1" />
        <div className="aurora-blob v2" />
        <div className="aurora-blob v3" />
        {PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            className="particle"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size }}
            animate={{ y: [0, p.drift, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
      <div className="grid-overlay" />
      <div className="noise-overlay" />
    </>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const goSignup = () => navigate("/auth?mode=signup");
  const goLogin = () => navigate("/auth");
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const features = [
    { icon: <Music className="w-6 h-6" />, title: t("feat1.title"), desc: t("feat1.desc") },
    { icon: <PenTool className="w-6 h-6" />, title: t("feat2.title"), desc: t("feat2.desc") },
    { icon: <FileCheck className="w-6 h-6" />, title: t("feat3.title"), desc: t("feat3.desc") },
    { icon: <Lock className="w-6 h-6" />, title: t("feat4.title"), desc: t("feat4.desc") },
    { icon: <GitBranch className="w-6 h-6" />, title: t("feat5.title"), desc: t("feat5.desc") },
    { icon: <Languages className="w-6 h-6" />, title: t("feat6.title"), desc: t("feat6.desc") },
  ];

  const steps = [
    { n: "01", title: t("step1.title"), desc: t("step1.desc") },
    { n: "02", title: t("step2.title"), desc: t("step2.desc") },
    { n: "03", title: t("step3.title"), desc: t("step3.desc") },
    { n: "04", title: t("step4.title"), desc: t("step4.desc") },
  ];

  const societies = ["ASCAP", "BMI", "SESAC", "SGAE"];

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
  ];

  const freeFeatures = [
    [t("pricing.free1"), true], [t("pricing.free2"), true], [t("pricing.free3"), true],
    [t("pricing.free4"), true], [t("pricing.free5"), false], [t("pricing.free6"), false],
    [t("pricing.free7"), false],
  ];
  const proFeatures = [
    t("pricing.pro1"), t("pricing.pro2"), t("pricing.pro3"), t("pricing.pro4"),
    t("pricing.pro5"), t("pricing.pro6"), t("pricing.pro7"), t("pricing.pro8"),
  ];

  const compareRows = [
    [t("compare.rowEvidence"), false, false, true],
    [t("compare.rowSign"), false, true, true],
    [t("compare.rowPdf"), false, true, true],
    [t("compare.rowRealtime"), false, false, true],
    [t("compare.rowCost"), t("compare.costSpreadsheet"), t("compare.costLawyer"), t("compare.costElProfe")],
  ];

  return (
    <div className="min-h-screen text-[var(--ep-text)] overflow-x-hidden relative" style={{ background: "var(--ep-bg)" }}>
      <AuroraBackground />

      {/* ---------------- Navigation ---------------- */}
      <motion.nav
        className="backdrop-studio fixed top-0 w-full z-50"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer relative" onClick={() => navigate("/")}>
            <div className="absolute -inset-3 blur-2xl opacity-60 pointer-events-none">
              <div className="w-full h-full rounded-full" style={{ background: "radial-gradient(circle, rgba(124,92,255,0.55), transparent 70%)" }} />
            </div>
            <img
              src={LOGO_URL}
              alt="El Profe"
              className="h-11 w-auto relative z-10 rounded-lg"
              style={{ filter: "drop-shadow(0 0 14px rgba(124,92,255,0.5))" }}
            />
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-[var(--ep-muted)]">
            <button onClick={() => scrollTo("how")} className="hover:text-[var(--ep-ink)] transition-colors">{t("nav.how")}</button>
            <button onClick={() => scrollTo("features")} className="hover:text-[var(--ep-ink)] transition-colors">{t("nav.features")}</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-[var(--ep-ink)] transition-colors">{t("nav.pricing")}</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-[var(--ep-ink)] transition-colors">{t("nav.faq")}</button>
          </div>

          <div className="flex gap-3 items-center">
            <button onClick={goLogin} className="btn-secondary text-sm py-2 px-4" data-testid="nav-login-btn">{t("nav.login")}</button>
            <button onClick={goSignup} className="btn-primary text-sm py-2 px-4" data-testid="nav-signup-btn">{t("nav.start")}</button>
          </div>
        </div>
      </motion.nav>

      {/* ---------------- Hero ---------------- */}
      <section className="relative pt-40 pb-28 px-6 md:px-10 overflow-hidden z-10">
        <div
          className="absolute top-1/2 left-1/2 pointer-events-none z-0"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <motion.img
            src={LOGO_URL}
            alt=""
            className="h-[480px] w-auto rounded-3xl"
            style={{ filter: "drop-shadow(0 0 120px rgba(124,92,255,0.5))" }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.06, 0.13, 0.06],
              scale: [1, 1.06, 1],
              x: [0, 110, -90, 60, 0],
              y: [0, -70, 50, -30, 0],
              rotate: [0, 3.5, -3.5, 1.5, 0],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <span className="eyebrow">{t("hero.eyebrow")}</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.08 }}
            className="text-heading font-extrabold tracking-tight mt-6 mb-6 leading-[0.98] text-5xl sm:text-6xl lg:text-[5rem]"
          >
            {t("hero.titleA")}
            <br />
            <span className="gradient-text">{t("hero.titleB")}</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.16 }}
            className="text-lg sm:text-xl text-[var(--ep-muted)] max-w-2xl mx-auto mb-9"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.24 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button onClick={goSignup} className="btn-primary" data-testid="hero-start-free-btn" whileTap={{ scale: 0.96 }}>
              {t("hero.ctaStart")} <ChevronRight className="w-4 h-4" />
            </motion.button>
            <motion.button onClick={() => scrollTo("pricing")} className="btn-secondary" data-testid="hero-go-pro-btn" whileTap={{ scale: 0.96 }}>
              {t("hero.ctaPricing")}
            </motion.button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.32 }}
            className="text-mono text-xs text-[var(--ep-muted)] mt-6 tracking-wider"
          >
            {t("hero.trust")}
          </motion.p>
        </div>
      </section>

      {/* ---------------- PRO societies strip ---------------- */}
      <section className="px-6 md:px-10 pb-8 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <span className="text-mono text-[0.7rem] tracking-[0.25em] uppercase text-[var(--ep-muted)]">{t("societies.label")}</span>
          <div className="flex flex-wrap justify-center gap-3">
            {societies.map((s) => (<span key={s} className="chip">{s}</span>))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="py-24 px-6 md:px-10 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-14" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">{t("how.eyebrow")}</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              {t("how.titleA")}<span className="gradient-text">{t("how.titleB")}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                className="step-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <div className="step-num">{s.n}</div>
                <h3 className="text-lg font-bold mt-3 mb-2 text-[var(--ep-ink)]">{s.title}</h3>
                <p className="text-sm text-[var(--ep-muted)] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="py-24 px-6 md:px-10 relative z-10" style={{ background: "rgba(11,10,20,0.6)" }}>
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-14" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">{t("features.eyebrow")}</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              {t("features.titleA")}<span className="gradient-text">{t("features.titleB")}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="feature-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                data-testid={`feature-card-${i}`}
              >
                <div className="icon-badge mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2 text-[var(--ep-ink)]">{f.title}</h3>
                <p className="text-sm text-[var(--ep-muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Comparison ---------------- */}
      <section className="py-24 px-6 md:px-10 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">{t("compare.eyebrow")}</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              {t("compare.titleA")}<span className="gradient-text">{t("compare.spreadsheet")}</span>{t("compare.titleB")}<span className="gradient-text-2">{t("compare.lawyer")}</span>{t("compare.titleC")}
            </h2>
          </motion.div>

          <motion.div className="compare" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="grid grid-cols-4 text-mono text-xs uppercase tracking-wider" style={{ background: "rgba(124,92,255,0.08)" }}>
              <div className="p-4" />
              <div className="p-4 text-center font-bold text-[var(--ep-muted)]">{t("compare.colSpreadsheet")}</div>
              <div className="p-4 text-center font-bold text-[var(--ep-muted)]">{t("compare.colLawyer")}</div>
              <div className="p-4 text-center font-bold gradient-text">{t("compare.colElProfe")}</div>
            </div>
            {compareRows.map((row, i) => (
              <div key={i} className="grid grid-cols-4 items-center" style={{ borderTop: "1px solid var(--ep-border)" }}>
                <div className="p-4 text-sm font-semibold text-[var(--ep-ink)]">{row[0]}</div>
                {row.slice(1).map((cell, j) => (
                  <div key={j} className="p-4 flex justify-center text-sm">
                    {cell === true ? <Check className="w-5 h-5" style={{ color: "var(--ep-success)" }} />
                      : cell === false ? <X className="w-5 h-5" style={{ color: "var(--ep-error)", opacity: 0.6 }} />
                      : <span className={j === 2 ? "font-bold gradient-text" : "text-[var(--ep-muted)]"}>{cell}</span>}
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- Pricing ---------------- */}
      <section id="pricing" className="py-24 px-6 md:px-10 relative z-10" style={{ background: "rgba(11,10,20,0.6)" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-14" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">{t("pricing.eyebrow")}</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              {t("pricing.titleA")}<span className="gradient-text">{t("pricing.titleB")}</span>{t("pricing.titleC")}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="pricing-card" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} whileHover={{ y: -6 }} data-testid="pricing-free-card">
              <h3 className="text-xl font-bold text-[var(--ep-ink)]">{t("pricing.free")}</h3>
              <p className="text-[var(--ep-muted)] mb-5">{t("pricing.freeSub")}</p>
              <div className="text-heading text-5xl font-extrabold mb-7">$0<span className="text-base font-normal text-[var(--ep-muted)]">{t("pricing.perMo")}</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                {freeFeatures.map(([txt, ok], i) => (
                  <li key={i} className="flex items-start gap-3">
                    {ok ? <Check className="w-4 h-4 mt-0.5 text-[var(--ep-success)] shrink-0" />
                        : <X className="w-4 h-4 mt-0.5 text-[var(--ep-muted)] shrink-0" />}
                    <span className={ok ? "" : "text-[var(--ep-muted)] line-through"}>{txt}</span>
                  </li>
                ))}
              </ul>
              <button onClick={goSignup} className="btn-secondary w-full" data-testid="pricing-free-cta">{t("pricing.freeCta")}</button>
            </motion.div>

            <motion.div className="pricing-card pro" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} whileHover={{ y: -10 }} data-testid="pricing-pro-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-[var(--ep-ink)]">{t("pricing.pro")}</h3>
                <span className="text-mono text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: "linear-gradient(110deg, var(--ep-violet), var(--ep-magenta))" }}>{t("pricing.popular")}</span>
              </div>
              <p className="text-[var(--ep-muted)] mb-5">{t("pricing.proSub")}</p>
              <div className="text-heading text-5xl font-extrabold mb-7 gradient-text inline-block">$19<span className="text-base font-normal text-[var(--ep-muted)]" style={{ WebkitTextFillColor: "var(--ep-muted)" }}>{t("pricing.perMo")}</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                {proFeatures.map((txt, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 text-[var(--ep-cyan)] shrink-0" />
                    <span className="font-medium text-[var(--ep-ink)]">{txt}</span>
                  </li>
                ))}
              </ul>
              <button onClick={goSignup} className="btn-primary w-full" data-testid="pricing-pro-cta">{t("pricing.proCta")}</button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="py-24 px-6 md:px-10 relative z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">{t("faq.eyebrow")}</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">{t("faq.title")}</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <motion.details
                key={i}
                className="group rounded-xl border border-[var(--ep-border)] bg-[var(--ep-surface)] px-5 py-4"
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-[var(--ep-ink)]">
                  {f.q}
                  <ChevronRight className="w-4 h-4 text-[var(--ep-cyan)] transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-[var(--ep-muted)] leading-relaxed mt-3">{f.a}</p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Final CTA ---------------- */}
      <section className="py-28 px-6 md:px-10 relative z-10 overflow-hidden">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <Scale className="w-10 h-10 mx-auto mb-5 text-[var(--ep-violet-2)]" />
            <h2 className="text-heading text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
              {t("cta.titleA")}<span className="gradient-text">{t("cta.titleB")}</span>
            </h2>
            <p className="text-[var(--ep-muted)] text-lg mb-9 max-w-xl mx-auto">{t("cta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button onClick={goSignup} className="btn-primary" data-testid="final-cta-signup" whileTap={{ scale: 0.96 }}>
                {t("cta.create")} <ChevronRight className="w-4 h-4" />
              </motion.button>
              <motion.button onClick={goSignup} className="btn-secondary" data-testid="final-cta-pro" whileTap={{ scale: 0.96 }}>
                {t("cta.upgrade")}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-[var(--ep-border)] py-10 px-6 md:px-10 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="El Profe" className="h-8 w-auto rounded-md" style={{ filter: "drop-shadow(0 0 10px rgba(124,92,255,0.5))" }} />
            <span className="text-mono text-xs text-[var(--ep-muted)]">EL&nbsp;PROFE</span>
          </div>
          <p className="text-mono text-xs text-[var(--ep-muted)] text-center">{t("footer.rights")}</p>
          <div className="flex items-center gap-2 text-mono text-xs text-[var(--ep-muted)]">
            <FileText className="w-3.5 h-3.5" /> {t("footer.tagline")}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
