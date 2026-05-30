import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Send, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LogoBadge from "../components/LogoBadge";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Messages = ({ token, user }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const logoUrl = "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.partner_id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      toast.error(t("msg.toast.loadConversationsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (partnerId) => {
    try {
      const response = await axios.get(`${API}/messages/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      toast.error(t("msg.toast.loadMessagesFailed"));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post(
        `${API}/messages/send`,
        {
          receiver_id: selectedConversation.partner_id,
          content: newMessage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewMessage("");
      fetchMessages(selectedConversation.partner_id);
    } catch (error) {
      toast.error(t("msg.toast.sendMessageFailed"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">{t("msg.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="noise-overlay"></div>

      {/* Header */}
      <header className="backdrop-studio border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white/5 rounded transition-colors"
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <img src={logoUrl} alt="Professor App" className="h-10 w-auto" />
            <div>
              <h1 className="font-bold text-lg">{t("msg.title")}</h1>
              <p className="text-xs text-gray-500">{t("msg.subtitle")}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="col-span-4 backdrop-studio rounded-sm p-4 overflow-y-auto">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <MessageCircle className="text-[#7c5cff]" size={20} />
              {t("msg.conversations")}
            </h2>

            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-sm">{t("msg.noMessages")}</p>
                <button
                  onClick={() => navigate("/network")}
                  className="btn-primary mt-4 text-sm"
                >
                  {t("msg.discoverCreators")}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <motion.div
                    key={conv.partner_id}
                    className={`p-3 rounded-sm cursor-pointer transition-colors ${
                      selectedConversation?.partner_id === conv.partner_id
                        ? 'bg-[#7c5cff]/20 border border-[#7c5cff]/50'
                        : 'bg-[#121212] hover:bg-[#1a1a1a]'
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                    whileHover={{ scale: 1.02 }}
                    data-testid={`conversation-${conv.partner_id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#7c5cff]/20 rounded-full flex items-center justify-center text-[#7c5cff] font-bold overflow-hidden">
                          {conv.partner.photo_url ? (
                            <img src={conv.partner.photo_url} alt={conv.partner.artist_name} className="w-full h-full object-cover" />
                          ) : (
                            conv.partner.artist_name?.charAt(0) || '?'
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{conv.partner.artist_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{conv.partner.role}</p>
                        </div>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="bg-[#FF3B30] text-white text-xs px-2 py-1 rounded-full">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {conv.last_message.content}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Window */}
          <div className="col-span-8 backdrop-studio rounded-sm flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#7c5cff]/20 rounded-full flex items-center justify-center text-[#7c5cff] font-bold text-xl overflow-hidden">
                      {selectedConversation.partner.photo_url ? (
                        <img src={selectedConversation.partner.photo_url} alt={selectedConversation.partner.artist_name} className="w-full h-full object-cover" />
                      ) : (
                        selectedConversation.partner.artist_name?.charAt(0) || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold">{selectedConversation.partner.artist_name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{selectedConversation.partner.role}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.sender_id === user?.id
                            ? 'bg-[#7c5cff] text-white'
                            : 'bg-[#121212] text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs opacity-60">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {msg.sender_id === user?.id && (
                            msg.read ? <CheckCheck size={14} /> : <Check size={14} />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={t("msg.inputPlaceholder")}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="bg-[#121212] border-white/10 text-white min-h-[60px]"
                      data-testid="message-input"
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="bg-[#7c5cff] text-white hover:bg-[#6a4ef0] font-bold"
                      data-testid="send-message-btn"
                    >
                      <Send size={20} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle size={64} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">{t("msg.selectConversation")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Logo Badge */}
      <LogoBadge />
    </div>
  );
};

export default Messages;