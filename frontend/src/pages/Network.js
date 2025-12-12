import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users, Music, Crown, MessageCircle, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import LogoBadge from "../components/LogoBadge";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Network = ({ token, user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const logoUrl = "https://customer-assets.emergentagent.com/job_elprofe-app/artifacts/vq8mu8b5_A_digital_vector_graphic_features_the_logo_for__Pr.png";

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get(`${API}/users/discover`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setUsers(response.data);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchUsers();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await axios.post(
        `${API}/messages/send`,
        {
          receiver_id: selectedUser.id,
          content: message
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Message sent!");
      setShowMessageModal(false);
      setMessage("");
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-xl">Loading network...</div>
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
              <h1 className="font-bold text-lg">Network</h1>
              <p className="text-xs text-gray-500">Discover & connect with creators</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/messages")}
            className="btn-secondary text-sm flex items-center gap-2"
            data-testid="messages-btn"
          >
            <MessageCircle size={16} />
            Messages
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Search & Filter */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-studio p-6 rounded-sm"
          >
            <div className="flex items-center gap-2 mb-6">
              <Users className="text-[#FFB800]" size={24} />
              <h2 className="text-heading text-2xl font-bold">Discover Creators</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-[#121212] border-white/10 text-white"
                    data-testid="search-input"
                  />
                  <Button
                    onClick={handleSearch}
                    className="bg-[#FFB800] text-black hover:bg-[#e0a600] font-bold"
                    data-testid="search-btn"
                  >
                    <Search size={16} />
                  </Button>
                </div>
              </div>

              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-[#121212] border border-white/10 rounded-md text-white"
                  data-testid="role-filter"
                >
                  <option value="">All Roles</option>
                  <option value="writer">Writers</option>
                  <option value="producer">Producers</option>
                  <option value="composer">Composers</option>
                  <option value="manager">Managers</option>
                  <option value="publisher">Publishers</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              {users.length} creator{users.length !== 1 ? 's' : ''} found
            </p>
          </motion.div>
        </div>

        {/* Users Grid */}
        {users.length === 0 ? (
          <div className="backdrop-studio p-12 rounded-sm text-center">
            <Users size={64} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold mb-2">No creators found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((creator, index) => (
              <motion.div
                key={creator.id}
                className="feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`user-card-${creator.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FFB800]/20 rounded-full flex items-center justify-center text-[#FFB800] font-bold text-xl overflow-hidden">
                      {creator.photo_url ? (
                        <img src={creator.photo_url} alt={creator.artist_name} className="w-full h-full object-cover" />
                      ) : (
                        creator.artist_name?.charAt(0) || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{creator.artist_name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {creator.roles && creator.roles.length > 0 ? (
                          creator.roles.map(role => (
                            <span key={role} className="text-xs bg-white/10 px-2 py-0.5 rounded capitalize">
                              {role}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 capitalize">{creator.role}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {creator.is_pro && (
                    <div className="flex items-center gap-1 bg-[#FFB800]/20 text-[#FFB800] px-2 py-1 rounded-sm text-xs font-bold">
                      <Crown size={12} />
                      PRO
                    </div>
                  )}
                </div>

                {creator.music_styles && creator.music_styles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {creator.music_styles.map(style => (
                      <span key={style} className="text-xs bg-[#FFB800]/10 text-[#FFB800] px-2 py-1 rounded-sm">
                        {style}
                      </span>
                    ))}
                  </div>
                )}

                {creator.bio && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{creator.bio}</p>
                )}

                <div className="text-xs text-gray-500 mb-4">
                  <p>{creator.country}</p>
                  {creator.pro_affiliation && <p>PRO: {creator.pro_affiliation}</p>}
                </div>

                <button
                  onClick={() => {
                    setSelectedUser(creator);
                    setShowMessageModal(true);
                  }}
                  className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                  data-testid={`message-user-btn-${creator.id}`}
                >
                  <MessageCircle size={16} />
                  Send Message
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white" data-testid="message-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl">
              Message {selectedUser?.artist_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Hi! I'd love to collaborate on a song..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-[#121212] border-white/10 text-white min-h-[150px]"
              data-testid="message-textarea"
            />
            <p className="text-xs text-gray-400 mt-2">
              Start a conversation and invite them to collaborate!
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageModal(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="cancel-message-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              className="bg-[#FFB800] text-black hover:bg-[#e0a600] font-bold"
              data-testid="send-message-btn"
            >
              <MessageCircle size={16} className="mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Network;
