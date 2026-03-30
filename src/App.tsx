/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, User, BookOpen, Send, Loader2, RefreshCw, ChevronRight, Image as ImageIcon, MapPin, Trash2, Edit3, Check, X, Key, Eye, EyeOff } from "lucide-react";
import { generateCharacter, generateScript, generatePanelImage, regeneratePanelContent, setApiKey as setServiceApiKey, type Character, type Script, type Panel } from "./services/geminiService";
import { cn } from "./lib/utils";

const STORAGE_KEY = "instatoon_saved_characters";
const SCRIPT_STORAGE_KEY = "instatoon_saved_script";
const CONFIG_STORAGE_KEY = "instatoon_saved_config";
const API_KEY_STORAGE = "instatoon_api_key";

export default function App() {
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("UltraSimple");
  const [scriptTopic, setScriptTopic] = useState("");
  const [panelCount, setPanelCount] = useState(4);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelLoading, setPanelLoading] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<"character" | "script">("character");
  const [pendingCharacters, setPendingCharacters] = useState<Character[]>([]);
  const [currentPendingIdx, setCurrentPendingIdx] = useState(0);
  const [editingCharacterIdx, setEditingCharacterIdx] = useState<number | null>(null);
  const [editingPanelIdx, setEditingPanelIdx] = useState<number | null>(null);
  const [panelFeedback, setPanelFeedback] = useState("");
  const [tempPanelData, setTempPanelData] = useState<Panel | null>(null);

  // API key state
  const [apiKey, setApiKey] = useState("");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Load all data from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setServiceApiKey(savedApiKey);
    } else {
      setShowApiSettings(true);
    }

    const savedChars = localStorage.getItem(STORAGE_KEY);
    if (savedChars) {
      try {
        const parsed = JSON.parse(savedChars);
        const charactersArray = Array.isArray(parsed) ? parsed : [parsed];
        charactersArray.forEach(c => {
          if (!c.style) c.style = "UltraSimple";
        });
        setCharacters(charactersArray);
      } catch (e) {
        console.error("Failed to parse saved characters", e);
      }
    }

    const savedScript = localStorage.getItem(SCRIPT_STORAGE_KEY);
    if (savedScript) {
      try {
        setScript(JSON.parse(savedScript));
      } catch (e) {
        console.error("Failed to parse saved script", e);
      }
    }

    const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.selectedStyle) setSelectedStyle(config.selectedStyle);
        if (config.scriptTopic) setScriptTopic(config.scriptTopic);
        if (config.panelCount) setPanelCount(config.panelCount);
        if (config.activeTab) setActiveTab(config.activeTab);
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
  }, []);

  // Auto-save characters
  useEffect(() => {
    if (characters.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [characters]);

  // Auto-save script
  useEffect(() => {
    if (script) {
      localStorage.setItem(SCRIPT_STORAGE_KEY, JSON.stringify(script));
    } else {
      localStorage.removeItem(SCRIPT_STORAGE_KEY);
    }
  }, [script]);

  // Auto-save config
  useEffect(() => {
    const config = { selectedStyle, scriptTopic, panelCount, activeTab };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [selectedStyle, scriptTopic, panelCount, activeTab]);

  const handleGenerateCharacter = async () => {
    if (!characterPrompt.trim()) return;
    setLoading(true);
    try {
      const result = await generateCharacter(characterPrompt, selectedStyle, characterName.trim() || undefined);
      setPendingCharacters([result]);
      setCurrentPendingIdx(0);
    } catch (error) {
      console.error("Failed to generate character:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCharacter = () => {
    const current = pendingCharacters[currentPendingIdx];
    if (current) {
      if (editingCharacterIdx !== null) {
        setCharacters(prev => {
          const next = [...prev];
          next[editingCharacterIdx] = current;
          return next;
        });
      } else {
        setCharacters(prev => [...prev, current]);
      }
      setPendingCharacters([]);
      setCurrentPendingIdx(0);
      setEditingCharacterIdx(null);
      setCharacterPrompt("");
      setCharacterName("");
    }
  };

  const handleRegeneratePending = async () => {
    const baseChar = pendingCharacters[currentPendingIdx];
    if (!baseChar) return;
    setLoading(true);
    try {
      const result = await generateCharacter(baseChar.prompt || characterPrompt, baseChar.style, baseChar.name);
      setPendingCharacters(prev => [...prev, result]);
      setCurrentPendingIdx(pendingCharacters.length); // Switch to the new one
    } catch (error) {
      console.error("Failed to regenerate character:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetCharacters = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SCRIPT_STORAGE_KEY);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    setCharacters([]);
    setScript(null);
    setCharacterPrompt("");
    setScriptTopic("");
    setPanelCount(4);
    setSelectedStyle("UltraSimple");
    setActiveTab("character");
  };

  const handleSaveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setApiKey(key);
    setServiceApiKey(key);
    if (rememberKey) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    setShowApiSettings(false);
    setApiKeyInput("");
  };

  const handleClearApiKey = () => {
    setApiKey("");
    setServiceApiKey("");
    localStorage.removeItem(API_KEY_STORAGE);
    setShowApiSettings(true);
  };

  const handleRemoveCharacter = (index: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegenerateCharacter = async (index: number) => {
    const char = characters[index];
    setEditingCharacterIdx(index);
    setPendingCharacters([char]);
    setCurrentPendingIdx(0);
    
    setLoading(true);
    try {
      const result = await generateCharacter(char.prompt || char.description, char.style, char.name);
      setPendingCharacters(prev => [...prev, result]);
      setCurrentPendingIdx(1);
    } catch (error) {
      console.error("Failed to regenerate character:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!scriptTopic.trim() || characters.length === 0) return;
    setLoading(true);
    try {
      const result = await generateScript(scriptTopic, characters, panelCount);
      setScript(result);
      setActiveTab("script");
    } catch (error) {
      console.error("Failed to generate script:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePanelImage = async (panel: Panel) => {
    if (characters.length === 0 || !script) return;
    setPanelLoading(prev => ({ ...prev, [panel.panelNumber]: true }));
    try {
      const imageUrl = await generatePanelImage(characters, panel);
      setScript(prev => {
        if (!prev) return null;
        return {
          ...prev,
          panels: prev.panels.map(p => 
            p.panelNumber === panel.panelNumber ? { ...p, imageUrl } : p
          )
        };
      });
    } catch (error) {
      console.error("Failed to generate panel image:", error);
    } finally {
      setPanelLoading(prev => ({ ...prev, [panel.panelNumber]: false }));
    }
  };

  const handleRegeneratePanelContent = async (panelIdx: number) => {
    if (!script || characters.length === 0) return;
    const panel = script.panels[panelIdx];
    setLoading(true);
    try {
      const mainChar = characters[0];
      const subChars = characters.slice(1);
      const newPanel = await regeneratePanelContent(
        scriptTopic,
        mainChar,
        subChars,
        script,
        panel.panelNumber,
        panelFeedback
      );
      
      setScript(prev => {
        if (!prev) return null;
        const nextPanels = [...prev.panels];
        nextPanels[panelIdx] = { ...newPanel, imageUrl: undefined }; // Reset image as content changed
        return { ...prev, panels: nextPanels };
      });
      setEditingPanelIdx(null);
      setPanelFeedback("");
    } catch (error) {
      console.error("Failed to regenerate panel content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePanelManual = (panelIdx: number) => {
    if (!tempPanelData || !script) return;
    setScript(prev => {
      if (!prev) return null;
      const nextPanels = [...prev.panels];
      nextPanels[panelIdx] = { ...tempPanelData, imageUrl: undefined }; // Reset image if text changed manually? 
      // Actually, user might just want to fix a typo, so maybe don't reset image automatically if they don't want to.
      // But usually text and image should match. Let's reset it to be safe or let user decide.
      // For now, let's reset it so they can regenerate the image to match the new text.
      return { ...prev, panels: nextPanels };
    });
    setEditingPanelIdx(null);
    setTempPanelData(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 instatoon-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <Sparkles size={24} />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-pink-600">
              인스타툰 생성기
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-full">
              <button
                onClick={() => setActiveTab("character")}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  activeTab === "character" ? "bg-white shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                캐릭터
              </button>
              <button
                onClick={() => setActiveTab("script")}
                disabled={characters.length === 0}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all disabled:opacity-50",
                  activeTab === "script" ? "bg-white shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                대본
              </button>
            </div>
            <button
              onClick={() => { setApiKeyInput(""); setShowApiSettings(true); }}
              className={cn(
                "p-2 rounded-full transition-colors",
                apiKey ? "text-green-500 hover:bg-green-50" : "text-red-400 hover:bg-red-50"
              )}
              title="API 키 설정"
            >
              <Key size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* API Key Modal (update existing key) */}
      <AnimatePresence>
        {showApiSettings && apiKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setShowApiSettings(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Key size={16} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold">API 키 설정</h2>
                </div>
                <button onClick={() => setShowApiSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
                  placeholder="새 API 키 입력..."
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 pr-12 text-sm font-mono"
                  autoFocus
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button onClick={() => setRememberKey(!rememberKey)} className="flex items-center gap-3">
                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0", rememberKey ? "bg-orange-500 border-orange-500" : "border-gray-300")}>
                  {rememberKey && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm text-gray-600">이 기기에서 기억하기</span>
              </button>
              <button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()} className="w-full py-3 instatoon-gradient text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
                저장
              </button>
              <button onClick={handleClearApiKey} className="w-full py-2 text-sm text-red-400 hover:text-red-600 transition-colors">
                저장된 API 키 삭제
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key Setup Screen (no key set) */}
      {!apiKey ? (
        <main className="max-w-md mx-auto px-6 mt-20">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl instatoon-gradient flex items-center justify-center shadow-lg shadow-orange-200">
                <Sparkles size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">인스타툰 생성기</h2>
              <p className="text-gray-400 text-sm leading-relaxed">Gemini API 키를 입력하면 바로 시작할 수 있어요.</p>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
                placeholder="AIza..."
                className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 pr-12 text-sm font-mono"
                autoFocus
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button onClick={() => setRememberKey(!rememberKey)} className="flex items-center gap-3 w-full">
              <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0", rememberKey ? "bg-orange-500 border-orange-500" : "border-gray-300")}>
                {rememberKey && <Check size={12} className="text-white" />}
              </div>
              <span className="text-sm text-gray-600">이 기기에서 기억하기</span>
            </button>
            <button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()} className="w-full py-3 instatoon-gradient text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
              시작하기
            </button>
            <p className="text-center text-xs text-gray-400">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">
                Google AI Studio에서 API 키 발급받기 →
              </a>
            </p>
          </div>
        </main>
      ) : (

      <main className="max-w-4xl mx-auto px-6 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "character" ? (
            <motion.div
              key="character-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Character Input */}
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <h2 className="text-xl font-bold">캐릭터 만들기</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    {characters.length > 0 && (
                      <button 
                        onClick={handleResetCharacters}
                        className="text-gray-400 hover:text-red-500 flex items-center gap-1 text-sm font-medium transition-colors"
                      >
                        <Trash2 size={16} /> 초기화
                      </button>
                    )}
                  </div>
                </div>

                {/* Style Selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">그림체 선택</h3>
                    <span className="text-[10px] text-orange-500 font-medium">
                      {selectedStyle === "UltraSimple" ? "귀엽고 굵은 선의 초간단 캐릭터" : 
                       selectedStyle === "Simple" ? "깔끔하고 세련된 웹툰 스타일" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: "UltraSimple", label: "초간단", icon: "✍️" },
                      { id: "Simple", label: "간단", icon: "✏️" },
                      { id: "Cute", label: "귀여움", icon: "🧸" },
                      { id: "Comic", label: "코믹", icon: "💥" },
                      { id: "Watercolor", label: "수채화", icon: "🎨" },
                      { id: "Retro", label: "레트로", icon: "📼" },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all",
                          selectedStyle === style.id 
                            ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm" 
                            : "border-gray-100 hover:border-gray-200 text-gray-500"
                        )}
                      >
                        <span className="text-xl">{style.icon}</span>
                        <span className="text-[10px] font-bold">{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">캐릭터 이름 (선택)</h3>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="이름을 직접 정하고 싶다면 입력하세요..."
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 text-lg"
                  />
                </div>

                <div className="relative">
                  <textarea
                    value={characterPrompt}
                    onChange={(e) => setCharacterPrompt(e.target.value)}
                    placeholder={characters.length === 0 ? "주인공 캐릭터를 설명해주세요..." : "서브 캐릭터를 설명해주세요..."}
                    className="w-full h-32 p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-orange-500 resize-none text-lg"
                  />
                  <button
                    onClick={handleGenerateCharacter}
                    disabled={loading || !characterPrompt.trim() || pendingCharacters.length > 0}
                    className="absolute bottom-4 right-4 instatoon-gradient text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {loading && pendingCharacters.length === 0 ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    {characters.length === 0 ? "주인공 생성" : "서브 캐릭터 추가"}
                  </button>
                </div>

                {/* Pending Character Preview */}
                <AnimatePresence>
                  {pendingCharacters.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-8 pt-8 border-t border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <Sparkles size={14} className="text-orange-500" /> 생성된 캐릭터 후보 ({currentPendingIdx + 1}/{pendingCharacters.length})
                        </h3>
                        {pendingCharacters.length > 1 && (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setCurrentPendingIdx(prev => Math.max(0, prev - 1))}
                              disabled={currentPendingIdx === 0}
                              className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-30"
                            >
                              <ChevronRight size={14} className="rotate-180" />
                            </button>
                            <button 
                              onClick={() => setCurrentPendingIdx(prev => Math.min(pendingCharacters.length - 1, prev + 1))}
                              disabled={currentPendingIdx === pendingCharacters.length - 1}
                              className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-30"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-orange-50/50 rounded-3xl p-6 border border-orange-100 flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-48 aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-orange-100 relative">
                          {loading ? (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                              <Loader2 className="animate-spin text-orange-500" size={32} />
                            </div>
                          ) : null}
                          <img 
                            src={pendingCharacters[currentPendingIdx].imageUrl} 
                            alt={pendingCharacters[currentPendingIdx].name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <h4 className="text-2xl font-black text-gray-900 mb-1">{pendingCharacters[currentPendingIdx].name}</h4>
                            <p className="text-gray-600 leading-relaxed">{pendingCharacters[currentPendingIdx].description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white text-orange-600 rounded-full text-xs font-bold border border-orange-100 shadow-sm">
                              {pendingCharacters[currentPendingIdx].style}
                            </span>
                            <span className="px-3 py-1 bg-white text-gray-600 rounded-full text-xs font-bold border border-gray-100 shadow-sm">
                              {pendingCharacters[currentPendingIdx].personality}
                            </span>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={handleConfirmCharacter}
                              disabled={loading}
                              className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                              {editingCharacterIdx !== null ? "이 버전으로 교체" : "이 캐릭터로 결정"}
                            </button>
                            <button
                              onClick={handleRegeneratePending}
                              disabled={loading}
                              className="px-4 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                              title="다른 버전 생성"
                            >
                              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                              <span className="hidden sm:inline">다른 버전</span>
                            </button>
                            <button
                              onClick={() => {
                                setPendingCharacters([]);
                                setCurrentPendingIdx(0);
                                setEditingCharacterIdx(null);
                              }}
                              disabled={loading}
                              className="px-4 bg-white text-red-500 border border-red-100 rounded-xl font-bold hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                              title="취소"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Characters List */}
              {characters.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-2">
                    등록된 캐릭터 <span className="text-orange-500">{characters.length}</span>
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {characters.map((char, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
                      >
                        <div className="relative aspect-square">
                          {char.imageUrl ? (
                            <img
                              src={char.imageUrl}
                              alt={char.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Loader2 className="animate-spin text-gray-300" size={32} />
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                              idx === 0 ? "bg-orange-500 text-white" : "bg-white/90 text-gray-600 backdrop-blur-sm"
                            )}>
                              {idx === 0 ? "Main" : "Sub"}
                            </span>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2">
                            <button 
                              onClick={() => handleRegenerateCharacter(idx)}
                              disabled={loading}
                              className="w-8 h-8 rounded-full bg-white/90 text-gray-400 hover:text-orange-500 flex items-center justify-center backdrop-blur-sm transition-colors shadow-sm disabled:opacity-50"
                              title="다시 생성"
                            >
                              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            </button>
                            <button 
                              onClick={() => handleRemoveCharacter(idx)}
                              className="w-8 h-8 rounded-full bg-white/90 text-gray-400 hover:text-red-500 flex items-center justify-center backdrop-blur-sm transition-colors shadow-sm"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="p-6 space-y-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-1">{char.name}</h4>
                            <p className="text-sm text-gray-500 italic line-clamp-1">"{char.description}"</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {char.style}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                              {char.personality}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setActiveTab("script")}
                    className="w-full py-4 rounded-2xl bg-black text-white font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                  >
                    다음: 대본 만들기 <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="script-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Script Input */}
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                    <BookOpen size={18} />
                  </div>
                  <h2 className="text-xl font-bold">이야기 쓰기</h2>
                </div>

                {/* Panel Count Selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">컷 수 선택</h3>
                    <span className="text-pink-600 font-black text-lg">{panelCount}컷</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={panelCount}
                    onChange={(e) => setPanelCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
                    <span>1컷</span>
                    <span>10컷</span>
                    <span>20컷</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <input
                    type="text"
                    value={scriptTopic}
                    onChange={(e) => setScriptTopic(e.target.value)}
                    placeholder="주제를 입력하세요 (예: '월요병', '첫 데이트')..."
                    className="flex-1 p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-pink-500 text-lg"
                  />
                  <button
                    onClick={handleGenerateScript}
                    disabled={loading || !scriptTopic.trim()}
                    className="instatoon-gradient text-white px-8 py-2 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                    생성하기
                  </button>
                </div>
              </section>

              {/* Script Result */}
              {script && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-display font-black mb-2">{script.title}</h3>
                    <span className="px-4 py-1 bg-pink-50 text-pink-600 rounded-full text-sm font-bold uppercase tracking-wider">
                      {script.theme}
                    </span>
                  </div>

                  <div className="grid gap-8">
                    {script.panels.map((panel, idx) => (
                      <motion.div
                        key={panel.panelNumber}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl instatoon-gradient text-white flex items-center justify-center text-xl font-black shrink-0">
                              {panel.panelNumber}
                            </div>
                            <div className="flex-1">
                               <h4 className="text-lg font-bold text-gray-900">컷 {panel.panelNumber}</h4>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {editingPanelIdx === idx ? (
                              <button 
                                onClick={() => {
                                  setEditingPanelIdx(null);
                                  setTempPanelData(null);
                                  setPanelFeedback("");
                                }}
                                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                                title="취소"
                              >
                                <X size={20} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  setEditingPanelIdx(idx);
                                  setTempPanelData(panel);
                                }}
                                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                                title="컷 수정"
                              >
                                <Edit3 size={20} />
                              </button>
                            )}
                          </div>
                        </div>

                        {editingPanelIdx === idx ? (
                          <div className="space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">상황 묘사</label>
                                  <textarea 
                                    value={tempPanelData?.description}
                                    onChange={(e) => setTempPanelData(prev => prev ? { ...prev, description: e.target.value } : null)}
                                    className="w-full p-3 rounded-xl border-gray-200 text-sm focus:ring-pink-500 focus:border-pink-500"
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">배경 설정</label>
                                  <textarea 
                                    value={tempPanelData?.backgroundDescription}
                                    onChange={(e) => setTempPanelData(prev => prev ? { ...prev, backgroundDescription: e.target.value } : null)}
                                    className="w-full p-3 rounded-xl border-gray-200 text-sm focus:ring-pink-500 focus:border-pink-500"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">대사</label>
                                  <input 
                                    type="text"
                                    value={tempPanelData?.dialogue}
                                    onChange={(e) => setTempPanelData(prev => prev ? { ...prev, dialogue: e.target.value } : null)}
                                    className="w-full p-3 rounded-xl border-gray-200 text-sm focus:ring-pink-500 focus:border-pink-500"
                                  />
                                </div>
                                <button 
                                  onClick={() => handleUpdatePanelManual(idx)}
                                  className="w-full py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                                >
                                  <Check size={18} /> 수정 완료
                                </button>
                              </div>

                              <div className="space-y-4 border-l border-gray-200 pl-6">
                                <div className="flex items-center gap-2 text-pink-600">
                                  <Sparkles size={16} />
                                  <h5 className="text-sm font-bold">AI에게 수정 요청하기</h5>
                                </div>
                                <p className="text-xs text-gray-500">원하는 수정 사항을 입력하면 AI가 컷을 다시 작성합니다.</p>
                                <textarea 
                                  value={panelFeedback}
                                  onChange={(e) => setPanelFeedback(e.target.value)}
                                  placeholder="예: '더 코믹하게 바꿔줘', '주인공이 더 당황한 표정으로'..."
                                  className="w-full p-3 rounded-xl border-pink-100 bg-white text-sm focus:ring-pink-500 focus:border-pink-500"
                                  rows={4}
                                />
                                <button 
                                  onClick={() => handleRegeneratePanelContent(idx)}
                                  disabled={loading}
                                  className="w-full py-3 instatoon-gradient text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                  {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                  AI로 다시 쓰기
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2 text-gray-400">
                                  <ImageIcon size={14} />
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest">상황 묘사</h5>
                                </div>
                                <p className="text-gray-800 text-sm leading-relaxed">{panel.description}</p>
                              </div>
                              
                              <div className="bg-blue-50 p-4 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2 text-blue-400">
                                  <MapPin size={14} />
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest">배경 설정</h5>
                                </div>
                                <p className="text-blue-800 text-sm leading-relaxed">{panel.backgroundDescription}</p>
                              </div>

                              <div className="bg-pink-50 p-4 rounded-2xl border-l-4 border-pink-500">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-pink-400 mb-1">대사</h5>
                                <p className="text-lg font-medium text-gray-900 leading-relaxed">"{panel.dialogue}"</p>
                              </div>
                            </div>

                            <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center group">
                              {panel.imageUrl ? (
                                <img 
                                  src={panel.imageUrl} 
                                  alt={`Panel ${panel.panelNumber}`} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-center p-6">
                                  <button
                                    onClick={() => handleGeneratePanelImage(panel)}
                                    disabled={panelLoading[panel.panelNumber]}
                                    className="flex flex-col items-center gap-3 text-gray-400 hover:text-orange-500 transition-colors"
                                  >
                                    {panelLoading[panel.panelNumber] ? (
                                      <Loader2 className="animate-spin" size={32} />
                                    ) : (
                                      <>
                                        <ImageIcon size={48} strokeWidth={1.5} />
                                        <span className="text-sm font-medium">장면 이미지 생성하기</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                              {panel.imageUrl && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={() => handleGeneratePanelImage(panel)}
                                    disabled={panelLoading[panel.panelNumber]}
                                    className="bg-white text-black px-4 py-2 rounded-full font-bold flex items-center gap-2"
                                  >
                                    {panelLoading[panel.panelNumber] ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                    이미지 다시 생성
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      )} {/* end apiKey conditional */}

      {/* Footer / Info */}
      <footer className="max-w-4xl mx-auto px-6 mt-12 text-center text-gray-400 text-sm">
        <p>© 2026 인스타툰 생성기 • Powered by Gemini AI</p>
      </footer>
    </div>
  );
}
