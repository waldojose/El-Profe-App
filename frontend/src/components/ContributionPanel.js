import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart3, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ContributionPanel = ({ songId, token }) => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContributions();
  }, [songId]);

  const fetchContributions = async () => {
    try {
      const response = await axios.get(`${API}/contributions/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContributions(response.data);
    } catch (error) {
      console.error('Failed to fetch contributions', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="backdrop-studio p-6 rounded-sm">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  const totalChars = contributions.reduce((sum, c) => sum + c.net_chars, 0);

  return (
    <div className="backdrop-studio p-6 rounded-sm" data-testid="contribution-panel">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="text-[#FFB800]" size={20} />
        <h3 className="font-bold text-lg">Contributions</h3>
      </div>

      <div className="mb-6 p-4 bg-[#121212] rounded-sm">
        <p className="text-xs text-gray-500 mb-1">Total Characters</p>
        <p className="text-2xl font-bold text-mono text-[#FFB800]">{totalChars}</p>
      </div>

      <div className="space-y-4">
        {contributions.length === 0 ? (
          <p className="text-gray-400 text-sm">No contributions yet</p>
        ) : (
          contributions.map((contrib, index) => (
            <motion.div
              key={contrib.user_id}
              className="p-4 bg-[#121212] rounded-sm border border-white/5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              data-testid={`contribution-item-${index}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{contrib.artist_name}</p>
                <TrendingUp size={16} className="text-green-500" />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Added</p>
                  <p className="font-bold text-green-500 text-mono">{contrib.chars_added}</p>
                </div>
                <div>
                  <p className="text-gray-500">Deleted</p>
                  <p className="font-bold text-red-500 text-mono">{contrib.chars_deleted}</p>
                </div>
                <div>
                  <p className="text-gray-500">Net</p>
                  <p className="font-bold text-[#FFB800] text-mono">{contrib.net_chars}</p>
                </div>
              </div>

              <div className="mt-3 h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FFB800] to-[#FF3B30]"
                  style={{ width: `${totalChars > 0 ? (contrib.net_chars / totalChars) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {totalChars > 0 ? ((contrib.net_chars / totalChars) * 100).toFixed(1) : 0}% of total
              </p>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-6 p-3 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-sm">
        <p className="text-xs text-gray-400">
          <strong className="text-[#FFB800]">Note:</strong> This data supports negotiations but does not auto-assign ownership.
        </p>
      </div>
    </div>
  );
};

export default ContributionPanel;