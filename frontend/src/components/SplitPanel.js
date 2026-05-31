import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FileText, Plus, Crown, Check, Download, Lock, Clock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Aurora palette — segments cycle through these in order
const AURORA_PALETTE = ["#7c5cff", "#22d3ee", "#f65bae", "#9d7bff", "#34d399", "#fbbf24"];

// Compact, dependency-free donut chart drawn with inline SVG.
// Uses stroke-dasharray / stroke-dashoffset math (circumference = 2*pi*r).
const SplitDonut = ({ segments, testId, size = 132, stroke = 16 }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const total = segments.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0);
  let offsetAccumulator = 0;

  return (
    <div
      className="flex items-center gap-4"
      data-testid={testId}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
          role="img"
          aria-label="Split percentages donut chart"
        >
          {/* track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--ep-border)"
            strokeWidth={stroke}
            opacity={0.35}
          />
          {segments.map((seg, i) => {
            const value = parseFloat(seg.value) || 0;
            const fraction = total > 0 ? value / 100 : 0;
            const dash = circumference * fraction;
            const dashoffset = -(circumference * (offsetAccumulator / 100));
            offsetAccumulator += value;
            const color = AURORA_PALETTE[i % AURORA_PALETTE.length];
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashoffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        {/* center label in the donut hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="font-bold text-lg text-mono"
            style={{ color: "var(--ep-text)" }}
          >
            {total.toFixed(total % 1 === 0 ? 0 : 1)}%
          </span>
        </div>
      </div>

      {/* legend: swatch + name + percentage */}
      <ul className="flex-1 space-y-1.5 min-w-0">
        {segments.map((seg, i) => {
          const color = AURORA_PALETTE[i % AURORA_PALETTE.length];
          return (
            <li key={i} className="flex items-center gap-2 text-xs min-w-0">
              <span
                className="inline-block w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="truncate" style={{ color: "var(--ep-muted)" }}>
                {seg.label}
              </span>
              <span
                className="ml-auto font-bold text-mono shrink-0"
                style={{ color }}
              >
                {(parseFloat(seg.value) || 0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SplitPanel = ({ songId, token, user, song }) => {
  const { t, lang } = useI18n();
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewSplitModal, setShowNewSplitModal] = useState(false);
  const [newSplits, setNewSplits] = useState([{ user_id: user?.id, percentage: 100 }]);
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [signatureName, setSignatureName] = useState(user?.legal_name || user?.artist_name || "");
  const [agreed, setAgreed] = useState(false);
  // user_id -> display name
  const [nameMap, setNameMap] = useState({});
  // proposal_id -> [signatures]
  const [sigMap, setSigMap] = useState({});

  const authHeaders = useCallback(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const fetchNames = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/songs/${songId}/collaborators`, authHeaders());
      const map = {};
      (res.data || []).forEach((u) => {
        map[u.id] = u.artist_name || u.legal_name || u.email || u.id;
      });
      setNameMap(map);
    } catch (error) {
      console.error("Failed to fetch collaborators", error);
    }
  }, [songId, authHeaders]);

  const fetchSignatures = useCallback(async (proposals) => {
    try {
      const entries = await Promise.all(
        proposals.map(async (p) => {
          const res = await axios.get(`${API}/signatures/${p.id}`, authHeaders());
          return [p.id, res.data || []];
        })
      );
      setSigMap(Object.fromEntries(entries));
    } catch (error) {
      console.error("Failed to fetch signatures", error);
    }
  }, [authHeaders]);

  const fetchSplits = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/splits/${songId}`, authHeaders());
      setSplits(response.data);
      await fetchSignatures(response.data);
    } catch (error) {
      console.error("Failed to fetch splits", error);
    } finally {
      setLoading(false);
    }
  }, [songId, authHeaders, fetchSignatures]);

  useEffect(() => {
    fetchSplits();
    fetchNames();
  }, [fetchSplits, fetchNames]);

  const nameFor = useCallback(
    (userId) => nameMap[userId] || (userId === user?.id ? (user?.artist_name || user?.legal_name) : null) || userId,
    [nameMap, user]
  );

  // Everyone who must sign this proposal: union of its writers + the song collaborators.
  const requiredSigners = useCallback(
    (proposal) => {
      const ids = new Set((proposal?.splits || []).map((s) => s.user_id).filter(Boolean));
      (song?.collaborators || []).forEach((id) => ids.add(id));
      return [...ids];
    },
    [song]
  );

  const signatureFor = useCallback(
    (proposalId, userId) => (sigMap[proposalId] || []).find((s) => s.user_id === userId),
    [sigMap]
  );

  const isFullySigned = useCallback(
    (proposal) => {
      if (proposal.status === "signed") return true;
      const required = requiredSigners(proposal);
      if (required.length === 0) return false;
      return required.every((id) => signatureFor(proposal.id, id));
    },
    [requiredSigners, signatureFor]
  );

  const handleCreateSplit = async () => {
    const total = newSplits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(t("split.error.total100"));
      return;
    }

    try {
      await axios.post(
        `${API}/splits`,
        { song_id: songId, splits: newSplits },
        authHeaders()
      );

      toast.success(t("split.toast.created"));
      setShowNewSplitModal(false);
      setNewSplits([{ user_id: user?.id, percentage: 100 }]);
      fetchSplits();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("split.error.create"));
    }
  };

  const openSignModal = (proposal) => {
    setSelectedProposal(proposal);
    setSignatureName(user?.legal_name || user?.artist_name || "");
    setAgreed(false);
    setShowSignModal(true);
  };

  const handleSign = async () => {
    if (!signatureName.trim()) {
      toast.error(t("split.error.enterName"));
      return;
    }

    try {
      await axios.post(
        `${API}/signatures`,
        {
          split_proposal_id: selectedProposal.id,
          // signature_data is the typed legal name (audit/date is stored server-side)
          signature_data: signatureName.trim()
        },
        authHeaders()
      );

      toast.success(t("split.toast.signed"));
      setShowSignModal(false);
      setSelectedProposal(null);
      setAgreed(false);
      fetchSplits();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("split.error.sign"));
    }
  };

  const handleExportPDF = async (proposalId) => {
    try {
      const response = await axios.get(`${API}/export/split-sheet/${proposalId}`, authHeaders());

      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${response.data.pdf}`;
      link.download = response.data.filename;
      link.click();

      toast.success(t("split.toast.pdfExported"));
    } catch (error) {
      toast.error(error.response?.data?.detail || t("split.error.export"));
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(lang === "es" ? "es" : "en", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "";
    }
  };

  if (!user?.is_pro) {
    return (
      <div className="backdrop-studio p-6 rounded-sm" data-testid="split-panel-locked">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="text-[#7c5cff]" size={20} />
          <h3 className="font-bold text-lg">{t("split.locked.title")}</h3>
        </div>
        <div className="p-6 bg-[#121212] rounded-sm text-center">
          <Crown size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-4">{t("split.locked.message")}</p>
          <p className="text-xs text-gray-500">{t("split.locked.upgrade")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-studio p-6 rounded-sm" data-testid="split-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="text-[#7c5cff]" size={20} />
          <h3 className="font-bold text-lg">{t("split.heading")}</h3>
        </div>
        <button
          onClick={() => setShowNewSplitModal(true)}
          className="p-2 hover:bg-[#7c5cff]/20 rounded transition-colors"
          data-testid="create-split-btn"
        >
          <Plus size={16} className="text-[#7c5cff]" />
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-400 text-sm">{t("dash.loading")}</p>
        ) : splits.length === 0 ? (
          <p className="text-gray-400 text-sm">{t("split.empty")}</p>
        ) : (
          splits.map((split, index) => {
            const required = requiredSigners(split);
            const locked = isFullySigned(split);
            const mySignature = signatureFor(split.id, user?.id);
            const iAmRequired = required.includes(user?.id);

            return (
              <motion.div
                key={split.id}
                className="p-4 bg-[#121212] rounded-sm border"
                style={{ borderColor: locked ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.05)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`split-item-${index}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{t("split.version")} {split.version}</p>
                    <p className="text-xs text-gray-500">{split.status}</p>
                  </div>
                  {locked && <Check size={16} className="text-[#34d399]" />}
                </div>

                {/* Per-writer split + signature status */}
                <div className="space-y-2 mb-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">{t("split.status.heading")}</p>
                  {split.splits.map((s, i) => {
                    const sig = signatureFor(split.id, s.user_id);
                    const color = AURORA_PALETTE[i % AURORA_PALETTE.length];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs gap-2"
                        data-testid={`split-writer-${index}-${i}`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
                          <span className="truncate text-gray-300">{nameFor(s.user_id)}</span>
                          <span className="font-bold text-mono shrink-0" style={{ color }}>{s.percentage}%</span>
                        </span>
                        {sig ? (
                          <span className="flex items-center gap-1 text-[#34d399] shrink-0" data-testid={`sig-status-signed-${index}-${i}`}>
                            <Check size={12} />
                            {t("split.status.signed")} · {fmtDate(sig.signed_at)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 shrink-0" data-testid={`sig-status-pending-${index}-${i}`}>
                            <Clock size={12} />
                            {t("split.status.pending")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Locked banner */}
                {locked && (
                  <div
                    className="flex items-center gap-2 mb-3 p-2 rounded-sm"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)" }}
                    data-testid={`split-locked-banner-${index}`}
                  >
                    <Lock size={14} className="text-[#34d399] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#34d399]">{t("split.locked.banner")}</p>
                      <p className="text-[11px] text-gray-400">{t("split.locked.bannerDesc")}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {iAmRequired && !mySignature && !locked && (
                    <button
                      onClick={() => openSignModal(split)}
                      className="flex-1 px-3 py-2 bg-[#7c5cff] text-white text-xs font-bold rounded-sm hover:bg-[#6a4ef0] transition-colors"
                      data-testid={`sign-split-btn-${index}`}
                    >
                      {t("split.sign")}
                    </button>
                  )}
                  {mySignature && !locked && (
                    <span
                      className="flex-1 px-3 py-2 text-xs text-[#34d399] flex items-center gap-1"
                      data-testid={`already-signed-${index}`}
                    >
                      <Check size={14} /> {t("split.status.youSigned")}
                    </span>
                  )}
                  <button
                    onClick={() => handleExportPDF(split.id)}
                    disabled={!locked}
                    title={locked ? t("split.download") : t("split.status.pending")}
                    className={`px-3 py-2 border text-xs rounded-sm transition-colors flex items-center gap-1 ${
                      locked
                        ? "border-[#34d399]/40 text-[#34d399] hover:bg-[#34d399]/10"
                        : "border-white/20 text-gray-500 opacity-50 cursor-not-allowed"
                    }`}
                    data-testid={`export-split-btn-${index}`}
                  >
                    <Download size={14} />
                    {locked && <span>{t("split.download")}</span>}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* New Split Modal */}
      <Dialog open={showNewSplitModal} onOpenChange={setShowNewSplitModal}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white" data-testid="new-split-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl">{t("split.modal.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {newSplits.map((split, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-sm mb-2 block">{t("split.contributor")} {index + 1}</Label>
                  <Input
                    type="number"
                    value={split.percentage}
                    onChange={(e) => {
                      const updated = [...newSplits];
                      updated[index].percentage = parseFloat(e.target.value);
                      setNewSplits(updated);
                    }}
                    placeholder={t("split.percentage.placeholder")}
                    className="bg-[#121212] border-white/10 text-white"
                    data-testid={`split-percentage-input-${index}`}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              {t("split.total")} {newSplits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0).toFixed(1)}%
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewSplitModal(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="cancel-split-btn"
            >
              {t("split.cancel")}
            </Button>
            <Button
              onClick={handleCreateSplit}
              className="bg-[#7c5cff] text-white hover:bg-[#6a4ef0] font-bold"
              data-testid="save-split-btn"
            >
              {t("split.createProposal")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Modal — DocuSign-like flow */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white max-h-[90vh] overflow-y-auto" data-testid="sign-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#7c5cff]" />
              {t("split.modal.signTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {/* Split summary */}
            {selectedProposal && (
              <div className="rounded-sm border border-white/10 p-3 bg-[#121212]" data-testid="sign-split-summary">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">{t("split.sign.summaryTitle")}</p>
                <div className="space-y-1.5">
                  {selectedProposal.splits.map((s, i) => {
                    const color = AURORA_PALETTE[i % AURORA_PALETTE.length];
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
                          <span className="truncate text-gray-300">{nameFor(s.user_id)}</span>
                        </span>
                        <span className="font-bold text-mono" style={{ color }}>{s.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legal agreement statement */}
            <p className="text-xs text-gray-400 leading-relaxed" data-testid="sign-legal-statement">
              {t("split.sign.legal")}
            </p>

            {/* Legal name input */}
            <div>
              <Label className="text-sm mb-2 block">{t("split.sign.label")}</Label>
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={t("split.sign.placeholder")}
                className="bg-[#121212] border-white/10 text-white"
                data-testid="signature-name-input"
              />
            </div>

            {/* Live handwritten-style signature preview */}
            <div
              className="rounded-sm border border-white/10 bg-[#0f0f0f] px-4 py-5 flex items-center justify-center min-h-[72px]"
              data-testid="signature-preview"
            >
              {signatureName.trim() ? (
                <span className="signature-font text-3xl" style={{ color: "var(--ep-cyan, #22d3ee)" }}>
                  /s/ {signatureName.trim()}
                </span>
              ) : (
                <span className="text-xs text-gray-600">{t("split.sign.preview")}</span>
              )}
            </div>

            {/* Agree checkbox */}
            <label className="flex items-start gap-2 cursor-pointer select-none" data-testid="sign-agree-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-[#7c5cff]"
                data-testid="sign-agree-checkbox"
              />
              <span className="text-xs text-gray-300">
                {t("split.sign.consent")} <span className="text-[#7c5cff]">{t("split.sign.consentEs")}</span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignModal(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="cancel-sign-btn"
            >
              {t("split.cancel")}
            </Button>
            <Button
              onClick={handleSign}
              disabled={!signatureName.trim() || !agreed}
              className="bg-[#7c5cff] text-white hover:bg-[#6a4ef0] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="confirm-sign-btn"
            >
              {t("split.signDocument")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SplitPanel;
