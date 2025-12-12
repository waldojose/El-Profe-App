import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FileText, Plus, Crown, Check, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SplitPanel = ({ songId, token, user, song }) => {
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewSplitModal, setShowNewSplitModal] = useState(false);
  const [newSplits, setNewSplits] = useState([{ user_id: user?.id, percentage: 100 }]);
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [signatureName, setSignatureName] = useState(user?.legal_name || "");

  useEffect(() => {
    fetchSplits();
  }, [songId]);

  const fetchSplits = async () => {
    try {
      const response = await axios.get(`${API}/splits/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSplits(response.data);
    } catch (error) {
      console.error('Failed to fetch splits', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSplit = async () => {
    const total = newSplits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error("Splits must total 100%");
      return;
    }

    try {
      await axios.post(
        `${API}/splits`,
        {
          song_id: songId,
          splits: newSplits
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Split proposal created!");
      setShowNewSplitModal(false);
      setNewSplits([{ user_id: user?.id, percentage: 100 }]);
      fetchSplits();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create split");
    }
  };

  const handleSign = async () => {
    if (!signatureName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      await axios.post(
        `${API}/signatures`,
        {
          split_proposal_id: selectedProposal.id,
          signature_data: `${signatureName} - ${new Date().toISOString()}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Signature recorded!");
      setShowSignModal(false);
      setSelectedProposal(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to sign");
    }
  };

  const handleExportPDF = async (proposalId) => {
    try {
      const response = await axios.get(`${API}/export/split-sheet/${proposalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${response.data.pdf}`;
      link.download = response.data.filename;
      link.click();
      
      toast.success("PDF exported!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to export PDF");
    }
  };

  if (!user?.is_pro) {
    return (
      <div className="backdrop-studio p-6 rounded-sm" data-testid="split-panel-locked">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="text-[#FFB800]" size={20} />
          <h3 className="font-bold text-lg">Split Management</h3>
        </div>
        <div className="p-6 bg-[#121212] rounded-sm text-center">
          <Crown size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 mb-4">Pro plan required for split management, signatures, and legal exports</p>
          <p className="text-xs text-gray-500">Upgrade to unlock this feature</p>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-studio p-6 rounded-sm" data-testid="split-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="text-[#FFB800]" size={20} />
          <h3 className="font-bold text-lg">Splits</h3>
        </div>
        <button
          onClick={() => setShowNewSplitModal(true)}
          className="p-2 hover:bg-[#FFB800]/20 rounded transition-colors"
          data-testid="create-split-btn"
        >
          <Plus size={16} className="text-[#FFB800]" />
        </button>
      </div>

      <div className="space-y-4">
        {splits.length === 0 ? (
          <p className="text-gray-400 text-sm">No split proposals yet</p>
        ) : (
          splits.map((split, index) => (
            <motion.div
              key={split.id}
              className="p-4 bg-[#121212] rounded-sm border border-white/5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              data-testid={`split-item-${index}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">Version {split.version}</p>
                  <p className="text-xs text-gray-500">{split.status}</p>
                </div>
                {split.status === 'approved' && (
                  <Check size={16} className="text-green-500" />
                )}
              </div>

              <div className="space-y-2 mb-3">
                {split.splits.map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-400">Contributor {i + 1}</span>
                    <span className="font-bold text-[#FFB800] text-mono">{s.percentage}%</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedProposal(split);
                    setShowSignModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-[#FFB800] text-black text-xs font-bold rounded-sm hover:bg-[#e0a600] transition-colors"
                  data-testid={`sign-split-btn-${index}`}
                >
                  Sign
                </button>
                <button
                  onClick={() => handleExportPDF(split.id)}
                  className="px-3 py-2 border border-white/20 text-xs rounded-sm hover:bg-white/5 transition-colors"
                  data-testid={`export-split-btn-${index}`}
                >
                  <Download size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* New Split Modal */}
      <Dialog open={showNewSplitModal} onOpenChange={setShowNewSplitModal}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white" data-testid="new-split-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl">Create Split Proposal</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {newSplits.map((split, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-sm mb-2 block">Contributor {index + 1}</Label>
                  <Input
                    type="number"
                    value={split.percentage}
                    onChange={(e) => {
                      const updated = [...newSplits];
                      updated[index].percentage = parseFloat(e.target.value);
                      setNewSplits(updated);
                    }}
                    placeholder="Percentage"
                    className="bg-[#121212] border-white/10 text-white"
                    data-testid={`split-percentage-input-${index}`}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400">
              Total: {newSplits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0).toFixed(1)}%
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewSplitModal(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="cancel-split-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSplit}
              className="bg-[#FFB800] text-black hover:bg-[#e0a600] font-bold"
              data-testid="save-split-btn"
            >
              Create Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="bg-[#0A0A0A] border border-white/10 text-white" data-testid="sign-modal">
          <DialogHeader>
            <DialogTitle className="text-heading text-2xl">Digital Signature</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm mb-2 block">Type your legal name to sign</Label>
            <Input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Your legal name"
              className="bg-[#121212] border-white/10 text-white"
              data-testid="signature-name-input"
            />
            <p className="text-xs text-gray-400 mt-2">
              By signing, you agree to the split percentages in this proposal.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignModal(false)}
              className="border-white/20 bg-transparent hover:bg-white/5"
              data-testid="cancel-sign-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              className="bg-[#FFB800] text-black hover:bg-[#e0a600] font-bold"
              data-testid="confirm-sign-btn"
            >
              Sign Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SplitPanel;