import { useState, useEffect } from "react";
import axios from "axios";
import { Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SynonymsPanel = ({ selectedWord, token }) => {
  const { t } = useI18n();
  const [word, setWord] = useState(selectedWord || "");
  const [synonyms, setSynonyms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedWord) {
      setWord(selectedWord);
      fetchSynonyms(selectedWord);
    }
  }, [selectedWord]);

  const fetchSynonyms = async (searchWord) => {
    if (!searchWord.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/synonyms/${searchWord}`);
      setSynonyms(response.data.synonyms);
    } catch (error) {
      console.error('Failed to fetch synonyms', error);
      setSynonyms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSynonyms(word);
  };

  return (
    <div className="backdrop-studio p-6 rounded-sm" data-testid="synonyms-panel">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-[#7c5cff]" size={20} />
        <h3 className="font-bold text-lg">{t("dict.heading")}</h3>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={t("dict.search.placeholder")}
            className="bg-[#121212] border-white/10 text-white pr-10"
            data-testid="synonyms-search-input"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#7c5cff] transition-colors"
            data-testid="synonyms-search-btn"
          >
            <Search size={16} />
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">{t("dict.loading")}</p>
      ) : synonyms.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">{t("dict.tab.synonyms")}</p>
          <div className="flex flex-wrap gap-2">
            {synonyms.map((syn, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-[#121212] border border-white/10 rounded-sm text-sm hover:border-[#7c5cff] hover:text-[#7c5cff] transition-colors cursor-pointer"
                data-testid={`synonym-${index}`}
              >
                {syn}
              </span>
            ))}
          </div>
        </div>
      ) : word ? (
        <p className="text-gray-400 text-sm">{t("dict.noResults")} "{word}"</p>
      ) : (
        <div className="text-center py-8">
          <Sparkles size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-sm">{t("dict.prompt")}</p>
        </div>
      )}
    </div>
  );
};

export default SynonymsPanel;