import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Music, LogOut, User, Crown, Settings, FileText, ChevronRight, Users } from "lucide-react";
import ProfileModal from "../components/ProfileModal";
import LogoBadge from "../components/LogoBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ token, logout, user, setUser }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [currentUser, setCurrentUser] = useState(user);
  const logoUrl = "/logo-white.png";

  useEffect(() => {
    fetchUserAndSongs();
  }, []);

  const fetchUserAndSongs = async () => {
    try {
      const [userRes, songsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/songs`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setCurrentUser(userRes.data);
      setUser(userRes.data);
      
      if (!userRes.data.profile_completed) {
        setShowProfileModal(true);
      }
      
      setSongs(songsRes.data);
    } catch (error) {
      toast.error(t("dash.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSong = async () => {
    if (!newSongTitle.trim()) {
      toast.error(t("dash.enterSongTitle"));
      return;
    }

    try {
      const response = await axios.post(
        `${API}/songs`,
        { title: newSongTitle },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSongs([response.data, ...songs]);
      setShowNewSongModal(false);
      setNewSongTitle("");
      toast.success(t("dash.songCreated"));
    } catch (error) {
      toast.error(error.response?.data?.detail || t("dash.createSongFailed"));
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      await axios.post(
        `${API}/subscription/upgrade`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t("dash.upgradedToPro"));
      setCurrentUser({ ...currentUser, is_pro: true });
    } catch (error) {
      toast.error(t("dash.upgradeFailed"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">{t("dash.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="noise-overlay"></div>
      
      {/* Header */}
      <header className="backdrop-studio border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Professor App" className="h-10 w-auto" />
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/network")}
              className="btn-secondary text-sm flex items-center gap-2"
              data-testid="network-btn"
            >
              <Users size={16} />
              {t("dash.network")}
            </button>
            {!currentUser?.is_pro && (
              <button
                onClick={handleUpgradeToPro}
                className="btn-primary text-sm flex items-center gap-2"
                data-testid="upgrade-pro-btn"
              >
                <Crown size={16} />
                {t("dash.upgradeToPro")}
              </button>
            )}
            {currentUser?.is_pro && (
              <div className="flex items-center gap-2 bg-[#7c5cff]/20 text-[#7c5cff] px-3 py-1 rounded-sm text-sm font-bold">
                <Crown size={16} />
                PRO
              </div>
            )}
            <button
              onClick={() => setShowProfileModal(true)}
              className="p-2 hover:bg-white/5 rounded transition-colors"
              data-testid="user-profile-btn"
            >
              <User size={20} />
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-white/5 rounded transition-colors"
              data-testid="logout-btn"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-heading text-4xl sm:text-5xl font-bold mb-4">
              {t("dash.your")} <span className="text-[#7c5cff]">{t("dash.songs")}</span>
            </h1>
            <p className="text-gray-400 text-lg">
              {currentUser?.artist_name ? `${t("dash.welcome")}, ${currentUser.artist_name}` : t("dash.welcomeBack")}
            </p>
          </motion.div>
        </div>

        {/* Create New Song Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowNewSongModal(true)}
            className="btn-primary flex items-center gap-2"
            data-testid="create-song-btn"
          >
            <Plus size={20} />
            {t("dash.newSong")}
          </button>
        </div>

        {/* Songs Grid */}
        {songs.length === 0 ? (
          <motion.div
            className="backdrop-studio p-12 rounded-sm text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="empty-songs-state"
          >
            <Music size={64} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold mb-2">{t("dash.noSongsYet")}</h3>
            <p className="text-gray-400 mb-6">{t("dash.noSongsSubtitle")}</p>
            <button
              onClick={() => setShowNewSongModal(true)}
              className="btn-primary"
            >
              {t("dash.createFirstSong")}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {songs.map((song, index) => (
              <motion.div
                key={song.id}
                className="feature-card cursor-pointer group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/editor/${song.id}`)}
                data-testid={`song-card-${song.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#7c5cff]/20 rounded-sm flex items-center justify-center text-[#7c5cff]">
                      <Music size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{song.title}</h3>
                      <p className="text-sm text-gray-500">
                        {song.collaborators?.length || 1} collaborator{(song.collaborators?.length || 1) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-[#7c5cff] transition-colors" />
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>Updated {new Date(song.updated_at).toLocaleDateString()}</p>
                </div>

                {song.is_locked && (
                  <div className="mt-3 text-xs text-[#7c5cff] flex items-center gap-1">
                    <FileText size={14} />
                    Locked
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Plan Limit Warning */}
        {!currentUser?.is_pro && songs.length >= 3 && (
          <motion.div
            className="mt-8 backdrop-studio p-6 rounded-sm border border-[#7c5cff]/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="plan-limit-warning"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Crown className="text-[#7c5cff]" size={20} />
                  {t("dash.planLimitTitle")}
                </h3>
                <p className="text-gray-400 text-sm">{t("dash.planLimitSubtitle")}</p>
              </div>
              <button
                onClick={handleUpgradeToPro}
                className="btn-primary"
              >
                {t("dash.upgradeNow")}
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          token={token}
          onClose={() => {
            if (currentUser?.profile_completed) {
              setShowProfileModal(false);
            }
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
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white" data-testid="new-song-modal">
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
              placeholder={t("dash.songTitlePlaceholder")}
              className="bg-[#121212] border-white/10 text-white"
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

      {/* Floating Logo Badge */}
      <LogoBadge />
    </div>
  );
};

export default Dashboard;