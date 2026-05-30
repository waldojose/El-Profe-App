import { useState, useEffect } from "react";
import axios from "axios";
import { History, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VersionsPanel = ({ songId, token, refreshKey }) => {
  const { t } = useI18n();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, refreshKey]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/versions/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVersions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch versions', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch (e) {
      return value;
    }
  };

  const snapshotLabel = (type) => {
    if (type === 'manual') return t("versions.manual");
    return type;
  };

  if (loading) {
    return (
      <div className="backdrop-studio p-6 rounded-sm">
        <p className="text-sm" style={{ color: "var(--ep-muted)" }}>{t("dict.loading")}</p>
      </div>
    );
  }

  return (
    <div
      className="backdrop-studio p-6 rounded-sm"
      data-testid="versions-panel"
      style={{
        background: "var(--ep-surface)",
        border: "1px solid var(--ep-border)",
        color: "var(--ep-text)"
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <History size={20} style={{ color: "var(--ep-violet)" }} />
        <h3 className="font-bold text-lg">{t("versions.title")}</h3>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ep-muted)" }}>
          {t("versions.empty")}
        </p>
      ) : (
        <div className="relative pl-4" style={{ borderLeft: "1px solid var(--ep-border)" }}>
          {versions.map((version, index) => {
            const isExpanded = expandedId === version.id;
            return (
              <motion.div
                key={version.id}
                className="relative mb-4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`version-item-${index}`}
              >
                <span
                  className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full"
                  style={{ background: "var(--ep-cyan)" }}
                />
                <div
                  className="p-3 rounded-sm"
                  style={{
                    background: "var(--ep-surface)",
                    border: "1px solid var(--ep-border)"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : version.id)}
                    className="w-full flex items-start justify-between gap-2 text-left"
                    data-testid={`version-toggle-${index}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock size={14} style={{ color: "var(--ep-cyan)" }} />
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: "var(--ep-muted)" }}>
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{ background: "var(--ep-border)", color: "var(--ep-text)" }}
                        >
                          {snapshotLabel(version.snapshot_type)}
                        </span>
                        <span>
                          {(version.content ? version.content.length : 0)} {t("versions.chars")}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--ep-violet)" }}>
                      {t("versions.preview")}
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <pre
                      className="mt-3 p-3 rounded-sm text-xs whitespace-pre-wrap break-words text-mono overflow-auto max-h-64"
                      style={{
                        background: "#0A0A0A",
                        border: "1px solid var(--ep-border)",
                        color: "var(--ep-text)"
                      }}
                      data-testid={`version-content-${index}`}
                    >
                      {version.content || ""}
                    </pre>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VersionsPanel;
