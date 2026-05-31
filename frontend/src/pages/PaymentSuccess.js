import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Post-checkout landing. Stripe redirects here with ?session_id=...
// We re-fetch /auth/me so the client reflects the Pro status the webhook set,
// then route the user back to the dashboard.
const PaymentSuccess = ({ token, setUser }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!token) {
      navigate("/auth");
      return;
    }
    try {
      const { data } = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (setUser) setUser(data);
    } catch {
      /* best-effort; the webhook is the source of truth for is_pro */
    } finally {
      setChecked(true);
    }
  }, [token, setUser, navigate]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="aurora-bg min-h-screen flex items-center justify-center p-6" data-testid="payment-success-page">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="backdrop-studio rounded-2xl p-10 max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7c5cff]/20 text-[#9d7bff]">
            <Crown size={32} />
          </span>
        </div>
        <h1
          className="text-2xl font-bold text-white mb-2"
          data-testid="payment-success-title"
        >
          {t("pay.successTitle")} 🎉
        </h1>
        <p className="text-[#9b97b8] mb-8">{t("pay.successSubtitle")}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="btn-primary w-full"
          data-testid="payment-success-continue"
          disabled={!checked}
        >
          {t("pay.successCta")}
        </button>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
