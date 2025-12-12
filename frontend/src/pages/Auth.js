import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Eye, EyeOff, Music } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Auth = ({ setToken, setUser }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const logoUrl = "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";
  
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
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="noise-overlay"></div>
      
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
        <img
          src="https://images.unsplash.com/photo-1649910855313-8cb8e2e6af9d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwyfHxtdXNpYyUyMHN0dWRpbyUyMHJlY29yZGluZyUyMHNlc3Npb24lMjBkYXJrfGVufDB8fHx8MTc2NTUwODUxN3ww&ixlib=rb-4.1.0&q=85"
          alt="Background"
          className="w-full h-full object-cover"
          style={{ maskImage: 'linear-gradient(to left, black 0%, transparent 100%)' }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoUrl} alt="Professor App" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-heading text-3xl font-bold mb-2">
            {mode === "login" ? "Welcome Back" : "Join Professor App"}
          </h1>
          <p className="text-gray-400">
            {mode === "login" ? "Continue your creative journey" : "Start collaborating professionally"}
          </p>
        </div>

        {/* Auth Form */}
        <div className="backdrop-studio p-8 rounded-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-sm focus:border-[#FFB800] focus:outline-none transition-colors"
                placeholder="your@email.com"
                data-testid="auth-email-input"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="artist_name" className="block text-sm font-medium mb-2">
                  Artist Name (Optional)
                </label>
                <input
                  type="text"
                  id="artist_name"
                  name="artist_name"
                  value={formData.artist_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-sm focus:border-[#FFB800] focus:outline-none transition-colors"
                  placeholder="Your stage name"
                  data-testid="auth-artist-name-input"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-sm focus:border-[#FFB800] focus:outline-none transition-colors pr-12"
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
              {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setFormData({ email: "", password: "", artist_name: "" });
              }}
              className="text-gray-400 hover:text-[#FFB800] transition-colors"
              data-testid="auth-toggle-mode"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
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
            ← Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;