import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, Music, LogOut, User, Crown, Users, Inbox, Star, FileText,
  Archive, Search, Bell, UserPlus
} from "lucide-react";
import ProfileModal from "../components/ProfileModal";
import LogoBadge from "../components/LogoBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Aurora gradient palettes used for collaborator avatar circles.
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #7c5cff, #22d3ee)",
  "linear-gradient(135deg, #f65bae, #7c5cff)",
  "linear-gradient(135deg, #22d3ee, #34d399)",
  "linear-gradient(135deg, #9d7bff, #f65bae)",
  "linear-gradient(135deg, #f65bae, #22d3ee)",
];

// Deterministic gradient pick from a string (so a writer always gets the same color).
function gradientFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// First non-empty, non-[section-tag] line of the lyrics.
// Strips any HTML markup (rich-text pastes can leave <br ...> / attributes).
function lyricPreview(content) {
  if (!content) return null;
  const clean = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
  const lines = clean.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^\[.*\]$/.test(line)) continue; // skip [Intro], [Chorus] tags
    return line.length > 120 ? line.slice(0, 117) + "..." : line;
  }
  return null;
}

// "time ago" relative formatter, bilingual via the supplied dictionary.
function timeAgo(dateStr, L) {
  if (!dateStr) return L.justNow;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return L.justNow;
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return L.justNow;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}${L.minShort}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${L.hrShort}`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}${L.dayShort}`;
  const wk = Math.floor(day / 7);
  return `${wk}${L.wkShort}`;
}

const FILTERS = ["all", "active", "awaiting", "drafts"];

const Dashboard = ({ token, logout, user, setUser }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [songs, setSongs] = useState([]);
  const [splitsBySong, setSplitsBySong] = useState({}); // songId -> derived { badge, progress, awaiting }
  const [userMap, setUserMap] = useState({}); // userId -> artist_name
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [currentUser, setCurrentUser] = useState(user);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeNav, setActiveNav] = useState("songs");
  const [query, setQuery] = useState("");
  const logoUrl = "/logo-white.png";

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  // Derive a badge + progress for one song from its split proposals + lock flag.
  const deriveStatus = useCallback((song, proposals) => {
    const list = Array.isArray(proposals) ? proposals : [];
    const signed =
      song.is_locked ||
      list.some((p) => ["signed", "locked", "completed"].includes((p.status || "").toLowerCase()));
    if (signed) {
      return { badge: "signed", progress: 100, awaiting: false };
    }
    if (list.length > 0) {
      // A proposal exists but not all signed → awaiting signatures.
      const approved = list.some((p) => (p.status || "").toLowerCase() === "approved");
      return { badge: "awaiting", progress: approved ? 80 : 70, awaiting: true };
    }
    // No proposal yet → DRAFT. Honest content-based estimate (never presented as a real metric).
    const len = (song.content || "").trim().length;
    const est = Math.min(55, Math.round((len / 600) * 55)); // 0..55% based on lyric length
    return { badge: "draft", progress: Math.max(8, est), awaiting: false };
  }, []);

  const fetchUserAndSongs = useCallback(async () => {
    try {
      const [userRes, songsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, authHeader),
        axios.get(`${API}/songs`, authHeader),
      ]);

      setCurrentUser(userRes.data);
      setUser(userRes.data);
      if (!userRes.data.profile_completed) setShowProfileModal(true);

      const songList = songsRes.data || [];
      setSongs(songList);

      // Build id -> name map from public profiles (for avatars + Collaborators stat).
      try {
        const discRes = await axios.get(`${API}/users/discover`, authHeader);
        const map = {};
        (discRes.data || []).forEach((u) => {
          if (u.id) map[u.id] = u.artist_name || u.legal_name || "";
        });
        // Always know our own name.
        if (userRes.data.id) map[userRes.data.id] = userRes.data.artist_name || map[userRes.data.id] || "";
        setUserMap(map);
      } catch {
        /* discover is best-effort; avatars fall back to initials of the id */
      }

      // Fetch split proposals per song to derive badge + progress (a few extra calls are fine).
      const entries = await Promise.all(
        songList.map(async (s) => {
          try {
            const r = await axios.get(`${API}/splits/${s.id}`, authHeader);
            return [s.id, deriveStatus(s, r.data)];
          } catch {
            return [s.id, deriveStatus(s, [])];
          }
        })
      );
      setSplitsBySong(Object.fromEntries(entries));
    } catch (error) {
      toast.error(t("dash.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [authHeader, setUser, deriveStatus, t]);

  useEffect(() => {
    fetchUserAndSongs();
  }, [fetchUserAndSongs]);

  const handleCreateSong = async () => {
    if (!newSongTitle.trim()) {
      toast.error(t("dash.enterSongTitle"));
      return;
    }
    try {
      const response = await axios.post(`${API}/songs`, { title: newSongTitle }, authHeader);
      const created = response.data;
      setSongs((prev) => [created, ...prev]);
      setSplitsBySong((prev) => ({ ...prev, [created.id]: deriveStatus(created, []) }));
      setShowNewSongModal(false);
      setNewSongTitle("");
      toast.success(t("dash.songCreated"));
    } catch (error) {
      toast.error(error.response?.data?.detail || t("dash.createSongFailed"));
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      const { data } = await axios.post(`${API}/payments/create-checkout-session`, {}, authHeader);
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error(t("dash.upgradeFailed"));
    } catch (error) {
      if (error.response?.status === 503) {
        toast.error(t("pay.notConfigured"));
      } else {
        toast.error(t("dash.upgradeFailed"));
      }
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data } = await axios.post(`${API}/payments/portal`, {}, authHeader);
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error(t("pay.portalFailed"));
    } catch (error) {
      if (error.response?.status === 503) {
        toast.error(t("pay.notConfigured"));
      } else {
        toast.error(t("pay.portalFailed"));
      }
    }
  };

  // ----- Derived collaborator + stat data -----
  const collaboratorNames = useMemo(() => {
    const names = new Set();
    const myId = currentUser?.id;
    songs.forEach((s) => {
      (s.collaborators || []).forEach((cid) => {
        if (cid === myId) return;
        const n = userMap[cid];
        if (n) names.add(n);
      });
    });
    return Array.from(names);
  }, [songs, userMap, currentUser]);

  const awaitingCount = useMemo(
    () => Object.values(splitsBySong).filter((d) => d?.awaiting).length,
    [splitsBySong]
  );

  const referralCredits = currentUser?.credits ?? user?.credits ?? 0;

  // ----- Filtering -----
  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      const d = splitsBySong[s.id];
      const badge = d?.badge || "draft";
      // Filter tab
      if (activeFilter === "active" && (badge === "draft" || badge === "signed")) return false;
      if (activeFilter === "awaiting" && badge !== "awaiting") return false;
      if (activeFilter === "drafts" && badge !== "draft") return false;
      // Sidebar Drafts shortcut behaves like the Drafts tab
      if (activeNav === "drafts" && badge !== "draft") return false;
      // Search box
      if (q) {
        const hay = `${s.title || ""} ${lyricPreview(s.content) || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [songs, splitsBySong, activeFilter, activeNav, query]);

  const L = {
    justNow: t("dash.timeNow"),
    minShort: t("dash.minShort"),
    hrShort: t("dash.hrShort"),
    dayShort: t("dash.dayShort"),
    wkShort: t("dash.wkShort"),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07060d] flex items-center justify-center">
        <div className="text-white text-xl">{t("dash.loading")}</div>
      </div>
    );
  }

  const badgeMeta = {
    signed: { label: "PRO", cls: "ep-badge ep-badge-pro" },
    awaiting: { label: t("dash.badgeAwaiting"), cls: "ep-badge ep-badge-awaiting" },
    draft: { label: t("dash.badgeDraft"), cls: "ep-badge ep-badge-draft" },
  };

  const navItems = [
    { id: "songs", label: t("dash.sbSongs"), icon: Music, badge: songs.length, action: () => setActiveNav("songs") },
    { id: "inbox", label: t("dash.sbInbox"), icon: Inbox, action: () => navigate("/messages") },
    { id: "network", label: t("dash.sbNetwork"), icon: Users, action: () => navigate("/network") },
  ];
  const libraryItems = [
    { id: "favorites", label: t("dash.sbFavorites"), icon: Star, action: () => toast(t("dash.comingSoon")) },
    { id: "drafts", label: t("dash.sbDrafts"), icon: FileText, action: () => { setActiveNav("drafts"); setActiveFilter("drafts"); } },
    { id: "archive", label: t("dash.sbArchive"), icon: Archive, action: () => toast(t("dash.comingSoon")) },
  ];

  const renderNavItem = (item, section) => {
    const Icon = item.icon;
    const isActive = activeNav === item.id;
    return (
      <button
        key={item.id}
        onClick={item.action}
        className={`ep-side-item ${isActive ? "ep-side-item-active" : ""}`}
        data-testid={`sidebar-${section}-${item.id}`}
      >
        <Icon size={17} className="shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge != null && <span className="ep-side-badge">{item.badge}</span>}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#07060d] text-white">
      <div className="noise-overlay"></div>

      <div className="ep-dash-shell">
        {/* ---------------- SIDEBAR ---------------- */}
        <aside className="ep-sidebar" data-testid="dash-sidebar">
          <div
            className="flex items-center gap-2 px-2 mb-6 cursor-pointer"
            onClick={() => { setActiveNav("songs"); setActiveFilter("all"); }}
          >
            <img src={logoUrl} alt="El Profe" className="h-8 w-auto" />
          </div>

          <div className="ep-side-section">{t("dash.sbWorkspace")}</div>
          {navItems.map((i) => renderNavItem(i, "ws"))}

          <div className="ep-side-section mt-5">{t("dash.sbLibrary")}</div>
          {libraryItems.map((i) => renderNavItem(i, "lib"))}

          <div className="mt-auto pt-4">
            <button
              onClick={() => setShowProfileModal(true)}
              className="ep-user-tile"
              data-testid="user-profile-btn"
            >
              <div
                className="ep-avatar"
                style={{ background: gradientFor(currentUser?.artist_name || currentUser?.id || "EP") }}
              >
                {initialsOf(currentUser?.artist_name || currentUser?.email || "EP")}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-sm font-semibold truncate">
                  {currentUser?.artist_name || t("dash.yourProfile")}
                </div>
                <div className="text-xs text-[#9b97b8] truncate">
                  {currentUser?.is_pro ? (
                    <span className="text-[#22d3ee] font-bold">PRO</span>
                  ) : (
                    <>{t("dash.freePlan")} · <span className="text-[#9d7bff] font-bold">{t("dash.upgrade")}</span></>
                  )}
                </div>
              </div>
            </button>
          </div>
        </aside>

        {/* ---------------- MAIN ---------------- */}
        <main className="ep-dash-main">
          {/* Topbar */}
          <div className="ep-topbar">
            <div className="ep-search">
              <Search size={16} className="text-[#9b97b8] shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("dash.searchPlaceholder")}
                data-testid="dash-search"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => navigate("/messages")}
                className="ep-icon-btn relative"
                title={t("dash.sbInbox")}
                data-testid="inbox-btn"
              >
                <Bell size={18} />
              </button>
              {!currentUser?.is_pro ? (
                <button
                  onClick={handleUpgradeToPro}
                  className="btn-primary text-sm flex items-center gap-2"
                  data-testid="upgrade-pro-btn"
                >
                  <Crown size={16} />
                  {t("dash.upgradeToPro")}
                </button>
              ) : (
                <button
                  onClick={handleManageSubscription}
                  className="ep-btn-ghost text-sm flex items-center gap-2"
                  data-testid="manage-subscription-btn"
                >
                  <Crown size={16} />
                  {t("pay.manageSubscription")}
                </button>
              )}
              <button
                onClick={() => setShowNewSongModal(true)}
                className="btn-primary text-sm flex items-center gap-2"
                data-testid="create-song-btn"
              >
                <Plus size={16} />
                {t("dash.newSong")}
              </button>
              <button onClick={logout} className="ep-icon-btn" title={t("dash.logout")} data-testid="logout-btn">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="ep-dash-content">
            {/* Page head */}
            <motion.div
              className="mb-7"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-heading text-3xl sm:text-4xl font-bold">
                {t("dash.your")} <span className="text-[#7c5cff]">{t("dash.songs")}</span>
              </h1>
              <p className="text-[#9b97b8] mt-1" data-testid="dash-subline">
                {currentUser?.artist_name
                  ? `${t("dash.welcome")}, ${currentUser.artist_name}`
                  : t("dash.welcomeBack")}
              </p>
            </motion.div>

            {/* Stat row */}
            <div className="ep-stat-row" data-testid="stat-row">
              <div className="ep-stat-card" data-testid="stat-active-songs">
                <div className="ep-stat-label">{t("dash.statActiveSongs")}</div>
                <div className="ep-stat-value">{songs.length}</div>
                <div className="ep-stat-sub">{t("dash.statActiveSongsSub")}</div>
              </div>
              <div className="ep-stat-card" data-testid="stat-collaborators">
                <div className="ep-stat-label">{t("dash.statCollaborators")}</div>
                <div className="ep-stat-value">{collaboratorNames.length}</div>
                <div className="ep-stat-sub truncate">
                  {collaboratorNames.length > 0
                    ? collaboratorNames.slice(0, 2).join(", ") +
                      (collaboratorNames.length > 2 ? ` +${collaboratorNames.length - 2}` : "")
                    : t("dash.statCollaboratorsSub")}
                </div>
              </div>
              <div className="ep-stat-card" data-testid="stat-awaiting">
                <div className="ep-stat-label">{t("dash.statAwaiting")}</div>
                <div className="ep-stat-value">{awaitingCount}</div>
                <div className="ep-stat-sub" style={{ color: awaitingCount > 0 ? "#fbbf24" : undefined }}>
                  {awaitingCount > 0 ? t("dash.statAwaitingSub") : t("dash.statAwaitingNone")}
                </div>
              </div>
              <div className="ep-stat-card" data-testid="stat-credits">
                <div className="ep-stat-label">{t("dash.statCredits")}</div>
                <div className="ep-stat-value">{referralCredits}</div>
                <div className="ep-stat-sub">{t("dash.statCreditsSub")}</div>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="ep-filter-bar" data-testid="filter-bar">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setActiveFilter(f); if (activeNav === "drafts") setActiveNav("songs"); }}
                  className={`ep-chip ${activeFilter === f ? "ep-chip-active" : ""}`}
                  data-testid={`filter-${f}`}
                >
                  {t(`dash.filter.${f}`)}
                </button>
              ))}
            </div>

            {/* Songs grid */}
            {songs.length === 0 ? (
              <motion.div
                className="backdrop-studio p-12 rounded-2xl text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="empty-songs-state"
              >
                <Music size={56} className="mx-auto mb-4 text-[#9b97b8]" />
                <h3 className="text-xl font-bold mb-2">{t("dash.noSongsYet")}</h3>
                <p className="text-[#9b97b8] mb-6">{t("dash.noSongsSubtitle")}</p>
                <button onClick={() => setShowNewSongModal(true)} className="btn-primary">
                  {t("dash.createFirstSong")}
                </button>
              </motion.div>
            ) : filteredSongs.length === 0 ? (
              <div className="backdrop-studio p-10 rounded-2xl text-center text-[#9b97b8]" data-testid="no-filter-match">
                {t("dash.noFilterMatch")}
              </div>
            ) : (
              <div className="ep-songs-grid" data-testid="songs-grid">
                {filteredSongs.map((song, index) => {
                  const d = splitsBySong[song.id] || deriveStatus(song, []);
                  const meta = badgeMeta[d.badge] || badgeMeta.draft;
                  const preview = lyricPreview(song.content);
                  const collabIds = [
                    song.created_by,
                    ...(song.collaborators || []).filter((c) => c !== song.created_by),
                  ].filter(Boolean);
                  const writerCount = collabIds.length || 1;
                  const writersTxt =
                    writerCount === 1
                      ? t("dash.writer1")
                      : `${writerCount} ${t("dash.writersN")}`;
                  const shown = collabIds.slice(0, 3);
                  const extra = collabIds.length - shown.length;
                  return (
                    <motion.div
                      key={song.id}
                      className="ep-song-card group"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                      data-testid={`song-card-${song.id}`}
                    >
                      <div className="cursor-pointer" onClick={() => navigate(`/editor/${song.id}`)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="ep-song-title truncate">{song.title}</h3>
                            <div className="ep-song-meta">
                              {writersTxt} · {timeAgo(song.updated_at || song.created_at, L)}
                            </div>
                          </div>
                          <span className={meta.cls}>{meta.label}</span>
                        </div>

                        <div className={`ep-song-preview ${preview ? "" : "ep-song-preview-empty"}`}>
                          {preview || t("dash.emptyDraft")}
                        </div>

                        <div className="ep-song-footer">
                          <div className="ep-avatars">
                            {shown.map((cid) => {
                              const name = userMap[cid] || cid;
                              return (
                                <div
                                  key={cid}
                                  className="ep-avatar-sm"
                                  style={{ background: gradientFor(name) }}
                                  title={userMap[cid] || ""}
                                >
                                  {initialsOf(userMap[cid] || "")}
                                </div>
                              );
                            })}
                            {extra > 0 && <div className="ep-avatar-sm ep-avatar-extra">+{extra}</div>}
                          </div>
                          <div className="ep-progress-mini">
                            <div className="ep-progress-bar">
                              <div style={{ width: `${d.progress}%` }} />
                            </div>
                            <span className="ep-pct">{d.progress}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="ep-card-actions">
                        <button
                          className="ep-card-action"
                          onClick={(e) => { e.stopPropagation(); navigate("/network"); }}
                          data-testid={`invite-${song.id}`}
                        >
                          <UserPlus size={14} /> {t("dash.invite")}
                        </button>
                        <button
                          className="ep-card-action ep-card-action-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/editor/${song.id}`); }}
                          data-testid={`open-${song.id}`}
                        >
                          {t("dash.open")}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Plan limit warning */}
            {!currentUser?.is_pro && songs.length >= 3 && (
              <motion.div
                className="mt-8 backdrop-studio p-6 rounded-2xl border border-[#7c5cff]/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="plan-limit-warning"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <Crown className="text-[#7c5cff]" size={20} />
                      {t("dash.planLimitTitle")}
                    </h3>
                    <p className="text-[#9b97b8] text-sm">{t("dash.planLimitSubtitle")}</p>
                  </div>
                  <button onClick={handleUpgradeToPro} className="btn-primary">
                    {t("dash.upgradeNow")}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          token={token}
          onClose={() => {
            if (currentUser?.profile_completed) setShowProfileModal(false);
          }}
          onUpdate={(updatedUser) => {
            setCurrentUser(updatedUser);
            setUser(updatedUser);
            setShowProfileModal(false);
            toast.success(t("dash.profileUpdated"));
          }}
        />
      )}

      {/* New Song Modal */}
      <Dialog open={showNewSongModal} onOpenChange={setShowNewSongModal}>
        <DialogContent className="bg-[#100e1c] border border-white/10 text-white" data-testid="new-song-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl">{t("dash.createNewSong")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="song-title" className="text-sm font-medium mb-2 block">
              {t("dash.songTitleLabel")}
            </Label>
            <Input
              id="song-title"
              value={newSongTitle}
              onChange={(e) => setNewSongTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateSong(); }}
              placeholder={t("dash.songTitlePlaceholder")}
              className="bg-[#15122a] border-white/10 text-white"
              data-testid="new-song-title-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewSongModal(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="new-song-cancel-btn"
            >
              {t("dash.cancel")}
            </Button>
            <Button
              onClick={handleCreateSong}
              className="bg-[#7c5cff] text-white hover:bg-[#6a4ef0] font-bold"
              data-testid="new-song-create-btn"
            >
              {t("dash.createSong")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogoBadge />
    </div>
  );
};

export default Dashboard;
