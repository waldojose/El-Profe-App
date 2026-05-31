import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "../i18n/I18nProvider";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TABS = [
  { id: "synonyms", labelKey: "dict.tab.synonyms" },
  { id: "antonyms", labelKey: "dict.tab.antonyms" },
  { id: "rhymes", labelKey: "dict.tab.rhymes" },
  { id: "translate", labelKey: "dict.tab.translate" },
];

const SynonymsPanel = ({ selectedWord, token }) => {
  const { t, lang } = useI18n();
  const [word, setWord] = useState(selectedWord || "");
  const [activeTab, setActiveTab] = useState("synonyms");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch one tab's data for a given word. Backend returns:
  //   /dictionary/{kind}/{word}?lang=  ->  { word, results: [...], language, kind }
  const fetchTab = useCallback(
    async (searchWord, tab) => {
      if (!searchWord || !searchWord.trim()) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `${API}/dictionary/${tab}/${encodeURIComponent(searchWord.trim())}`,
          { params: { lang } }
        );
        setResults(Array.isArray(response.data.results) ? response.data.results : []);
      } catch (error) {
        console.error(`Failed to fetch ${tab}`, error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [lang]
  );

  // Auto-search when a word is selected in the editor.
  useEffect(() => {
    if (selectedWord) {
      setWord(selectedWord);
      fetchTab(selectedWord, activeTab);
    }
  }, [selectedWord]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTab(word, activeTab);
  };

  const handleTab = (tabId) => {
    setActiveTab(tabId);
    if (word && word.trim()) fetchTab(word, tabId);
  };

  // Clicking a result chip looks that word up in the same tab.
  const handleChip = (chipWord) => {
    setWord(chipWord);
    fetchTab(chipWord, activeTab);
  };

  return (
    <div className="backdrop-studio p-6 rounded-sm" data-testid="synonyms-panel">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="text-[#7c5cff]" size={20} />
        <h3 className="font-bold text-lg">{t("dict.heading")}</h3>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
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

      {/* Tabs: Synonyms / Antonyms / Rhymes / Translate */}
      <div className="flex flex-wrap gap-2 mb-5" data-testid="dict-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTab(tab.id)}
            data-testid={`dict-tab-${tab.id}`}
            className={`px-3 py-1 rounded-sm text-xs uppercase tracking-wide transition-colors border ${
              activeTab === tab.id
                ? "bg-[#7c5cff] border-[#7c5cff] text-white"
                : "bg-[#121212] border-white/10 text-gray-400 hover:border-[#7c5cff] hover:text-[#7c5cff]"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">{t("dict.loading")}</p>
      ) : results.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
            {t(`dict.tab.${activeTab}`)}
          </p>
          <div className="flex flex-wrap gap-2">
            {results.map((item, index) => (
              <span
                key={index}
                onClick={() => handleChip(item)}
                className="px-3 py-1 bg-[#121212] border border-white/10 rounded-sm text-sm hover:border-[#7c5cff] hover:text-[#7c5cff] transition-colors cursor-pointer"
                data-testid={`synonym-${index}`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : word ? (
        <p className="text-gray-400 text-sm">
          {t("dict.noResults")} "{word}"
        </p>
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
