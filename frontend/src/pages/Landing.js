import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music, Users, FileCheck, Lock, Crown, Sparkles } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const logoUrl = "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative">
      <div className="noise-overlay"></div>
      
      {/* Navigation */}
      <motion.nav 
        className="backdrop-studio fixed top-0 w-full z-50 border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <img src={logoUrl} alt="Professor App" className="h-12 w-auto" />
          </motion.div>
          <div className="flex gap-4">
            <motion.button
              onClick={() => navigate("/auth")}
              className="btn-secondary text-sm"
              data-testid="nav-login-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.button>
            <motion.button
              onClick={() => navigate("/auth?mode=signup")}
              className="btn-primary text-sm"
              data-testid="nav-signup-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Free
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1552174588-6733961c358e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHN0dWRpbyUyMHJlY29yZGluZyUyMHNlc3Npb24lMjBkYXJrfGVufDB8fHx8MTc2NTUwODUxN3ww&ixlib=rb-4.1.0&q=85"
          alt="Studio"
          className="hero-image"
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <motion.div
              className="md:col-span-7"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-heading text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                Collaborate.
                <br />
                <span className="text-[#FFB800]">Track. Protect.</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-2xl">
                The professional songwriting platform that tracks every contribution,
                ensures fair splits, and generates legally defensible documentation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => navigate("/auth?mode=signup")}
                  className="btn-primary glow-amber"
                  data-testid="hero-start-free-btn"
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255, 184, 0, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  Start Free
                </motion.button>
                <motion.button
                  onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                  className="btn-secondary"
                  data-testid="hero-go-pro-btn"
                  whileHover={{ scale: 1.05, borderColor: "rgba(255, 184, 0, 0.6)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  Go Pro
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-48 gradient-glow"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 md:px-12 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mb-4">
              Built for <span className="text-[#FFB800]">Serious Creators</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every feature designed for trust, accountability, and legal clarity
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Music className="w-8 h-8" />,
                title: "Real-Time Collaboration",
                description: "Write together with live presence indicators and instant sync across all devices."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Character-Level Tracking",
                description: "Every keystroke is logged. See exactly who contributed what, with immutable audit logs."
              },
              {
                icon: <FileCheck className="w-8 h-8" />,
                title: "Manual Split Management",
                description: "You decide the splits. Data supports negotiations, never auto-assigns ownership."
              },
              {
                icon: <Lock className="w-8 h-8" />,
                title: "Digital Signatures",
                description: "All parties sign off. Lock splits and songs with legally binding documentation."
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Version Control",
                description: "Complete history. Restore any version, compare changes, track every decision."
              },
              {
                icon: <Crown className="w-8 h-8" />,
                title: "Legal Export",
                description: "Generate PDF split sheets with all metadata, ready for legal use and PRO registration."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                data-testid={`feature-card-${index}`}
              >
                <div className="text-[#FFB800] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 md:px-12 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-heading text-3xl sm:text-4xl font-bold mb-4">
              Choose Your <span className="text-[#FFB800]">Plan</span>
            </h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade when you need legal features.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              className="pricing-card"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              data-testid="pricing-free-card"
            >
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-gray-400 mb-6">Perfect for trying out</p>
              <div className="text-4xl font-bold mb-8 text-heading">$0<span className="text-lg text-gray-500">/mo</span></div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Up to 3 active songs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Up to 3 collaborators per song</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Real-time editing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Basic version history</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span className="text-gray-500">Split finalization</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span className="text-gray-500">Digital signatures</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span className="text-gray-500">Legal PDF export</span>
                </li>
              </ul>
              
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="btn-secondary w-full"
                data-testid="pricing-free-cta"
              >
                Start Free
              </button>
            </motion.div>

            <motion.div
              className="pricing-card pro"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              data-testid="pricing-pro-card"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">Pro</h3>
                <span className="bg-[#FFB800] text-black px-3 py-1 rounded text-sm font-bold">POPULAR</span>
              </div>
              <p className="text-gray-400 mb-6">For professional writers</p>
              <div className="text-4xl font-bold mb-8 text-heading text-[#FFB800]">$19<span className="text-lg text-gray-500">/mo</span></div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Unlimited songs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Unlimited collaborators</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Full contribution analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Manual split management</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Digital signatures</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Legal PDF export</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Song & split locking</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#FFB800] mt-1">✓</span>
                  <span className="font-semibold">Priority support</span>
                </li>
              </ul>
              
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="btn-primary w-full glow-amber"
                data-testid="pricing-pro-cta"
              >
                Start Pro Trial
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 md:px-12 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-heading text-3xl sm:text-5xl font-bold mb-6">
              Protect Your <span className="text-[#FFB800]">Creative Work</span>
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join professional songwriters who trust Professor App for collaboration and legal documentation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="btn-primary glow-amber"
                data-testid="final-cta-signup"
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="btn-secondary"
                data-testid="final-cta-pro"
              >
                Upgrade to Pro
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2025 Professor App by José "El Profesor Gómez". All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;