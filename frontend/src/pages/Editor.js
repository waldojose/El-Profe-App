import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ContentEditable from "react-contenteditable";
import io from "socket.io-client";
import { ArrowLeft, Users, BarChart3, FileText, Download, Save, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "../i18n/I18nProvider";
import ContributionPanel from "../components/ContributionPanel";
import SplitPanel from "../components/SplitPanel";
import SynonymsPanel from "../components/SynonymsPanel";
import LogoBadge from "../components/LogoBadge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const Editor = ({ token, user }) => {
  const { t } = useI18n();
  const { songId } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(content);
  const socketRef = useRef(null);
  const [collaborators, setCollaborators] = useState([]);
  const [selectedWord, setSelectedWord] = useState("");
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const logoUrl = "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";

  useEffect(() => {
    fetchSong();
    setupWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [songId]);

  const fetchSong = async () => {
    try {
      const response = await axios.get(`${API}/songs/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSong(response.data);
      setContent(response.data.content || "");
      contentRef.current = response.data.content || "";
    } catch (error) {
      toast.error(t("editor.toastLoadFailed"));
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const socket = io(WS_URL, {
      path: `/ws/song/${songId}`,
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('content_update', (data) => {
      if (data.user_id !== user?.id) {
        setContent(data.content);
        contentRef.current = data.content;
      }
    });

    socketRef.current = socket;
  };

  const handleContentChange = (evt) => {
    const newContent = evt.target.value;
    const oldContent = contentRef.current;
    
    setContent(newContent);
    contentRef.current = newContent;

    // Broadcast change
    if (socketRef.current) {
      socketRef.current.emit('content_update', {
        user_id: user?.id,
        content: newContent
      });
    }

    // Log contribution
    const charsDiff = newContent.length - oldContent.length;
    logContribution({
      action: charsDiff > 0 ? 'insert' : 'delete',
      chars_added: charsDiff > 0 ? charsDiff : 0,
      chars_deleted: charsDiff < 0 ? Math.abs(charsDiff) : 0
    });
  };

  const logContribution = async (data) => {
    try {
      await axios.post(
        `${API}/contributions`,
        {
          song_id: songId,
          ...data,
          content: content,
          position: 0
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to log contribution', error);
    }
  };

  const handleSave = async () => {
    try {
      await axios.patch(
        `${API}/songs/${songId}`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Create version snapshot
      await axios.post(
        `${API}/versions`,
        {
          song_id: songId,
          content,
          snapshot_type: 'manual'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t("editor.toastSaved"));
    } catch (error) {
      toast.error(t("editor.toastSaveFailed"));
    }
  };

  const handleWordSelection = () => {
    const selection = window.getSelection();
    const word = selection.toString().trim();
    if (word && word.split(' ').length === 1) {
      setSelectedWord(word);
    }
  };

  const handleAddCollaborator = async () => {
    if (!collaboratorEmail.trim()) {
      toast.error(t("editor.toastEnterEmail"));
      return;
    }

    try {
      await axios.post(
        `${API}/songs/${songId}/collaborators`,
        { email: collaboratorEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t("editor.toastCollaboratorAdded"));
      setShowAddCollaborator(false);
      setCollaboratorEmail("");
      fetchSong(); // Refresh song data
    } catch (error) {
      toast.error(error.response?.data?.detail || t("editor.toastAddCollaboratorFailed"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">{t("editor.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="noise-overlay"></div>
      
      {/* Header */}
      <header className="backdrop-studio border-b border-white/10 sticky top-0 z-40">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white/5 rounded transition-colors"
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <img src={logoUrl} alt="Professor App" className="h-8 w-auto" />
            <div>
              <h1 className="font-bold text-lg">{song?.title}</h1>
              <p className="text-xs text-gray-500">{song?.collaborators?.length || 1} {t("editor.collaboratorsCount")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="btn-secondary text-sm flex items-center gap-2"
              data-testid="save-song-btn"
            >
              <Save size={16} />
              {t("editor.save")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Editor Layout - Control Room Grid */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-73px)]">
        {/* Left Sidebar - Minimal */}
        <div className="col-span-2 space-y-4 overflow-y-auto scroll-fade">
          <div className="backdrop-studio p-4 rounded-sm">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Users size={16} className="text-[#7c5cff]" />
              {t("editor.collaborators")}
            </h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p className="mb-3">{t("editor.total")}: {song?.collaborators?.length || 1}</p>
              <button
                onClick={() => setShowAddCollaborator(true)}
                className="w-full px-3 py-2 bg-[#7c5cff] text-white text-xs font-bold rounded-sm hover:bg-[#6a4ef0] transition-colors"
                data-testid="add-collaborator-btn"
              >
                + {t("editor.addWriter")}
              </button>
            </div>
          </div>
        </div>

        {/* Center - Lyrics Editor */}
        <div className="col-span-7 overflow-y-auto scroll-fade">
          <div className="backdrop-studio p-6 rounded-sm h-full">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-heading text-2xl font-bold">{t("editor.lyrics")}</h2>
              <span className="text-xs text-gray-500 text-mono">{content.length} {t("editor.characters")}</span>
            </div>
            
            <ContentEditable
              html={content}
              onChange={handleContentChange}
              onMouseUp={handleWordSelection}
              className="editable-lyrics"
              data-testid="lyrics-editor"
              disabled={song?.is_locked}
            />
            
            {song?.is_locked && (
              <div className="mt-4 text-sm text-[#FF3B30] flex items-center gap-2">
                <FileText size={16} />
                {t("editor.songLocked")}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Tools & Data */}
        <div className="col-span-3 overflow-y-auto scroll-fade">
          <Tabs defaultValue="synonyms" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#0A0A0A] border border-white/10 mb-4">
              <TabsTrigger value="synonyms" data-testid="tab-synonyms">
                {t("editor.tabTools")}
              </TabsTrigger>
              <TabsTrigger value="contributions" data-testid="tab-contributions">
                <BarChart3 size={16} />
              </TabsTrigger>
              <TabsTrigger value="splits" data-testid="tab-splits">
                <FileText size={16} />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="synonyms" className="mt-0">
              <SynonymsPanel selectedWord={selectedWord} token={token} />
            </TabsContent>

            <TabsContent value="contributions" className="mt-0">
              <ContributionPanel songId={songId} token={token} />
            </TabsContent>

            <TabsContent value="splits" className="mt-0">
              <SplitPanel songId={songId} token={token} user={user} song={song} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Collaborator Modal */}
      <Dialog open={showAddCollaborator} onOpenChange={setShowAddCollaborator}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white" data-testid="add-collaborator-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl">{t("editor.addCollaborator")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="collaborator-email" className="text-sm font-medium mb-2 block">
              {t("editor.emailAddress")}
            </Label>
            <Input
              id="collaborator-email"
              type="email"
              value={collaboratorEmail}
              onChange={(e) => setCollaboratorEmail(e.target.value)}
              placeholder={t("editor.emailPlaceholder")}
              className="bg-[#121212] border-white/10 text-white"
              data-testid="collaborator-email-input"
            />
            <p className="text-xs text-gray-400 mt-2">
              {t("editor.addCollaboratorHelp")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddCollaborator(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="cancel-add-collaborator-btn"
            >
              {t("editor.cancel")}
            </Button>
            <Button
              onClick={handleAddCollaborator}
              className="bg-[#7c5cff] text-white hover:bg-[#6a4ef0] font-bold"
              data-testid="confirm-add-collaborator-btn"
            >
              {t("editor.addCollaborator")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Logo Badge */}
      <LogoBadge />
    </div>
  );
};

export default Editor;