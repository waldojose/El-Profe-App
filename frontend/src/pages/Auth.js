import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Eye, EyeOff, Music } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nProvider";
import LanguageToggle from "../components/LanguageToggle";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Same reactive aurora background used on the landing page (violet/cyan/magenta
// blobs + grid + noise), kept local to Auth so the auth screen feels cohesive
// with the rest of the app instead of the old flat background + stock photo.
const AuthAuroraBackground = () => {
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
      </div>
      <div className="grid-overlay" />
      <div className="noise-overlay" />
    </>
  );
};

const Auth = ({ setToken, setUser }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const logoUrl = "/logo-white.png";
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    artist_name: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      setToken(response.data.token);
      setUser(response.data.user);
      toast.success(mode === "login" ? t("auth.welcomeBackToast") : t("auth.accountCreatedToast"));
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || t("auth.authFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center px-6 py-12 relative overflow-hidden" style={{ background: "var(--ep-bg)" }}>
      <AuthAuroraBackground />

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageToggle inline />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoUrl} alt="Professor App" className="h-40 w-auto mx-auto mb-4 rounded-2xl" />
          <h1 className="text-heading text-3xl font-bold mb-2">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.joinTitle")}
          </h1>
          <p className="text-gray-400">
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
          </p>
        </div>

        {/* Auth Form */}
        <div className="backdrop-studio p-8 rounded-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                {t("auth.emailLabel")}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-sm focus:border-[#7c5cff] focus:outline-none transition-colors"
                placeholder={t("auth.emailPlaceholder")}
                data-testid="auth-email-input"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="artist_name" className="block text-sm font-medium mb-2">
                  {t("auth.artistNameLabel")}
                </label>
                <input
                  type="text"
                  id="artist_name"
                  name="artist_name"
                  value={formData.artist_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-sm focus:border-[#7c5cff] focus:outline-none transition-colors"
                  placeholder={t("auth.artistNamePlaceholder")}
                  data-testid="auth-artist-name-input"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                {t("auth.passwordLabel")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-sm focus:border-[#7c5cff] focus:outline-none transition-colors pr-12"
                  placeholder="••••••••"
                  data-testid="auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  data-testid="auth-toggle-password"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="auth-submit-btn"
            >
              {loading ? t("auth.loading") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setFormData({ email: "", password: "", artist_name: "" });
              }}
              className="text-gray-400 hover:text-[#7c5cff] transition-colors"
              data-testid="auth-toggle-mode"
            >
              {mode === "login" ? t("auth.toggleToSignup") : t("auth.toggleToLogin")}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white transition-colors text-sm"
            data-testid="auth-back-home"
          >
            ← {t("auth.backToHome")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;