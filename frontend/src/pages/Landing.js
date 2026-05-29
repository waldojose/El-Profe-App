import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Music, FileCheck, Lock, GitBranch, FileText,
  Languages, PenTool, Scale, Check, X, ChevronRight
} from "lucide-react";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

// Static particle field (positions computed once at module load)
const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 6,
  duration: 6 + Math.random() * 8,
  drift: -20 + Math.random() * 40,
}));

/* Mouse-reactive aurora background */
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
  const goSignup = () => navigate("/auth?mode=signup");
  const goLogin = () => navigate("/auth");
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const features = [
    { icon: <Music className="w-6 h-6" />, title: "Real-Time Co-Writing", desc: "Write together with live presence and instant sync across every device." },
    { icon: <PenTool className="w-6 h-6" />, title: "Character-Level Tracking", desc: "Every keystroke logged. See exactly who wrote what — an immutable audit trail." },
    { icon: <FileCheck className="w-6 h-6" />, title: "Manual Split Sheets", desc: "You decide the percentages. The data supports the negotiation — it never auto-assigns." },
    { icon: <Lock className="w-6 h-6" />, title: "Binding Signatures", desc: "Every co-writer signs. Splits lock only when all signatures are collected." },
    { icon: <GitBranch className="w-6 h-6" />, title: "Full Version History", desc: "Restore any version, compare changes, and trace every creative decision." },
    { icon: <Languages className="w-6 h-6" />, title: "Bilingual EN / ES", desc: "Built Spanish-first and English-canonical, with a curated songwriter dictionary." },
  ];

  const steps = [
    { n: "01", title: "Write together", desc: "Open a song and co-write in real time — every contribution is captured as it happens." },
    { n: "02", title: "See contributions", desc: "Character-level analytics show each writer's share as decision support, not a verdict." },
    { n: "03", title: "Propose the split", desc: "Drag the sliders, agree on percentages that total 100%. You stay in control." },
    { n: "04", title: "Sign & export", desc: "Everyone signs, the sheet locks, and you export a tamper-evident PDF for your PRO." },
  ];

  const societies = ["ASCAP", "BMI", "SESAC", "SGAE"];

  const faqs = [
    { q: "How are the splits decided?", a: "Always by the writers — manually. El Profe tracks contribution at the character level to give you hard data for the negotiation, but it never assigns percentages itself. You set the numbers and everyone signs." },
    { q: "What makes the PDF legally defensible?", a: "Each split sheet carries a document ID, the full signature table in /s/ Name format, timestamps, and a tamper-evident footer. Until every co-writer signs, the PDF is watermarked DRAFT." },
    { q: "Can I register works with my PRO?", a: "Yes. Export a clean, signed split sheet ready to submit to ASCAP, BMI, SESAC, or SGAE for registration." },
    { q: "Is my work private?", a: "Your songs are yours. Collaborators only see the songs you invite them to, and the audit log records every change." },
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
            <button onClick={() => scrollTo("how")} className="hover:text-[var(--ep-ink)] transition-colors">How it works</button>
            <button onClick={() => scrollTo("features")} className="hover:text-[var(--ep-ink)] transition-colors">Features</button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-[var(--ep-ink)] transition-colors">Pricing</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-[var(--ep-ink)] transition-colors">FAQ</button>
          </div>

          <div className="flex gap-3 items-center">
            <button onClick={goLogin} className="btn-secondary text-sm py-2 px-4" data-testid="nav-login-btn">Login</button>
            <button onClick={goSignup} className="btn-primary text-sm py-2 px-4" data-testid="nav-signup-btn">Start Free</button>
          </div>
        </div>
      </motion.nav>

      {/* ---------------- Hero ---------------- */}
      <section className="relative pt-40 pb-28 px-6 md:px-10 overflow-hidden z-10">
        {/* Ghost logo watermark */}
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
            <span className="eyebrow">Songwriter Split Platform</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.08 }}
            className="text-heading font-extrabold tracking-tight mt-6 mb-6 leading-[0.98] text-5xl sm:text-6xl lg:text-[5rem]"
          >
            Co-write. Track.
            <br />
            <span className="gradient-text">Split it fairly.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.16 }}
            className="text-lg sm:text-xl text-[var(--ep-muted)] max-w-2xl mx-auto mb-9"
          >
            The platform for working songwriters: track every contribution,
            settle splits fairly, collect binding signatures, and export
            tamper-evident PDFs for ASCAP, BMI, SESAC &amp; SGAE.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.24 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button onClick={goSignup} className="btn-primary" data-testid="hero-start-free-btn" whileTap={{ scale: 0.96 }}>
              Start free <ChevronRight className="w-4 h-4" />
            </motion.button>
            <motion.button onClick={() => scrollTo("pricing")} className="btn-secondary" data-testid="hero-go-pro-btn" whileTap={{ scale: 0.96 }}>
              See pricing
            </motion.button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.32 }}
            className="text-mono text-xs text-[var(--ep-muted)] mt-6 tracking-wider"
          >
            No credit card · Splits decided by writers, never by AI
          </motion.p>
        </div>
      </section>

      {/* ---------------- PRO societies strip ---------------- */}
      <section className="px-6 md:px-10 pb-8 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <span className="text-mono text-[0.7rem] tracking-[0.25em] uppercase text-[var(--ep-muted)]">Export-ready for</span>
          <div className="flex flex-wrap justify-center gap-3">
            {societies.map((s) => (<span key={s} className="chip">{s}</span>))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="py-24 px-6 md:px-10 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-14" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">The flow</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              From first line to <span className="gradient-text">signed split sheet</span>
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
            <span className="eyebrow">Built for serious creators</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              Every feature earns <span className="gradient-text">trust</span>
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
            <span className="eyebrow">Why El Profe</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              Beats the <span className="gradient-text">spreadsheet</span>. Costs less than the <span className="gradient-text-2">lawyer</span>.
            </h2>
          </motion.div>

          <motion.div className="compare" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="grid grid-cols-4 text-mono text-xs uppercase tracking-wider" style={{ background: "rgba(124,92,255,0.08)" }}>
              <div className="p-4" />
              <div className="p-4 text-center font-bold text-[var(--ep-muted)]">Spreadsheet</div>
              <div className="p-4 text-center font-bold text-[var(--ep-muted)]">Lawyer drafts</div>
              <div className="p-4 text-center font-bold gradient-text">El Profe</div>
            </div>
            {[
              ["Contribution evidence", false, false, true],
              ["Binding signatures", false, true, true],
              ["Tamper-evident PDF", false, true, true],
              ["Real-time co-writing", false, false, true],
              ["Cost per song", "Free but fragile", "$$$", "Included"],
            ].map((row, i) => (
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
            <span className="eyebrow">Pricing</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">
              Start free. Go <span className="gradient-text">Pro</span> for the legal layer.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div className="pricing-card" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} whileHover={{ y: -6 }} data-testid="pricing-free-card">
              <h3 className="text-xl font-bold text-[var(--ep-ink)]">Free</h3>
              <p className="text-[var(--ep-muted)] mb-5">Perfect for trying it out</p>
              <div className="text-heading text-5xl font-extrabold mb-7">$0<span className="text-base font-normal text-[var(--ep-muted)]">/mo</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                {[
                  ["Up to 3 active songs", true],
                  ["Up to 3 collaborators per song", true],
                  ["Real-time editing", true],
                  ["Basic version history", true],
                  ["Split finalization", false],
                  ["Digital signatures", false],
                  ["Legal PDF export", false],
                ].map(([t, ok], i) => (
                  <li key={i} className="flex items-start gap-3">
                    {ok ? <Check className="w-4 h-4 mt-0.5 text-[var(--ep-success)] shrink-0" />
                        : <X className="w-4 h-4 mt-0.5 text-[var(--ep-muted)] shrink-0" />}
                    <span className={ok ? "" : "text-[var(--ep-muted)] line-through"}>{t}</span>
                  </li>
                ))}
              </ul>
              <button onClick={goSignup} className="btn-secondary w-full" data-testid="pricing-free-cta">Start Free</button>
            </motion.div>

            {/* Pro */}
            <motion.div className="pricing-card pro" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} whileHover={{ y: -10 }} data-testid="pricing-pro-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-[var(--ep-ink)]">Pro</h3>
                <span className="text-mono text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: "linear-gradient(110deg, var(--ep-violet), var(--ep-magenta))" }}>POPULAR</span>
              </div>
              <p className="text-[var(--ep-muted)] mb-5">For professional writers</p>
              <div className="text-heading text-5xl font-extrabold mb-7 gradient-text inline-block">$19<span className="text-base font-normal text-[var(--ep-muted)]" style={{ WebkitTextFillColor: "var(--ep-muted)" }}>/mo</span></div>
              <ul className="space-y-3 mb-8 text-sm">
                {[
                  "Unlimited songs",
                  "Unlimited collaborators",
                  "Full contribution analytics",
                  "Manual split management",
                  "Digital signatures",
                  "Legal PDF export",
                  "Song & split locking",
                  "Priority support",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 mt-0.5 text-[var(--ep-cyan)] shrink-0" />
                    <span className="font-medium text-[var(--ep-ink)]">{t}</span>
                  </li>
                ))}
              </ul>
              <button onClick={goSignup} className="btn-primary w-full" data-testid="pricing-pro-cta">Start Pro Trial</button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="py-24 px-6 md:px-10 relative z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div className="text-center mb-12" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <span className="eyebrow">Questions</span>
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mt-3">Good to know</h2>
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
              Protect your <span className="gradient-text">creative work</span>
            </h2>
            <p className="text-[var(--ep-muted)] text-lg mb-9 max-w-xl mx-auto">
              Join the songwriters who settle splits with evidence, sign with intent,
              and walk away with a document that holds up.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button onClick={goSignup} className="btn-primary" data-testid="final-cta-signup" whileTap={{ scale: 0.96 }}>
                Create free account <ChevronRight className="w-4 h-4" />
              </motion.button>
              <motion.button onClick={goSignup} className="btn-secondary" data-testid="final-cta-pro" whileTap={{ scale: 0.96 }}>
                Upgrade to Pro
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
          <p className="text-mono text-xs text-[var(--ep-muted)] text-center">
            © 2025 El Profe by José “El Profesor Gómez”. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-mono text-xs text-[var(--ep-muted)]">
            <FileText className="w-3.5 h-3.5" /> Creative on surface · legal underneath
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
