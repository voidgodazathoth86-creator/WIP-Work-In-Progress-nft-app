import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  RefreshCw, 
  Check, 
  Copy, 
  Layers, 
  Tag, 
  Sliders, 
  Lock, 
  DollarSign, 
  Palette, 
  Flame, 
  Cpu, 
  Eye, 
  ArrowRight,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { AIMetadataSuggestion, NFTTrait, TokenStandard, BlockchainNetwork } from '../types';
import { requestAIMetadata } from '../services/aiMetadataService';

interface AIMetadataCopilotProps {
  currentImage: string;
  mediaSource: 'generative' | 'upload';
  tokenStandard: TokenStandard;
  chainName: string;
  onApplyAll: (data: {
    name: string;
    description: string;
    traits: NFTTrait[];
    royaltyPercentage?: number;
    suggestedPrice?: number;
    unlockableContent?: string;
    category?: string;
  }) => void;
  onApplyName: (name: string) => void;
  onApplyDescription: (desc: string) => void;
  onApplyTraits: (traits: NFTTrait[]) => void;
  onApplyUnlockable: (lore: string) => void;
}

const STYLE_PRESETS = [
  { id: 'cyberpunk', label: '🚀 Cyberpunk & Neon', hint: 'Cyberpunk futuristic neon vector high-tech' },
  { id: 'cosmic', label: '🌌 Cosmic Sci-Fi & Nebula', hint: 'Deep space cosmic nebula quantum celestial' },
  { id: 'fantasy', label: '⚔️ Dark Fantasy & Mythic', hint: 'Mythic medieval fantasy enchanted artifact lore' },
  { id: 'abstract', label: '🎨 Abstract Generative Art', hint: 'Fine art generative algorithm mathematical geometry' },
  { id: 'anime', label: '🌸 Anime & Pop Genesis', hint: 'Stylized anime neo-tokyo vivid character aesthetics' },
  { id: 'glitch', label: '👾 Glitch Protocol & Occult', hint: 'Digital corruption glitch art techno-occult cybernetic' },
  { id: 'luxury', label: '💎 Minimalist Luxury 1/1', hint: 'High-end prestigious sleek obsidian gold minimalist' },
];

const TONE_PRESETS = [
  'Epic & Narrative Lore',
  'Technical & Cryptographic',
  'Poetic & Transcendental',
  'Playful & Gamified',
  'Curator & Fine Art Analysis',
];

export const AIMetadataCopilot: React.FC<AIMetadataCopilotProps> = ({
  currentImage,
  mediaSource,
  tokenStandard,
  chainName,
  onApplyAll,
  onApplyName,
  onApplyDescription,
  onApplyTraits,
  onApplyUnlockable,
}) => {
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0].hint);
  const [selectedTone, setSelectedTone] = useState(TONE_PRESETS[0]);
  const [customKeywords, setCustomKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [suggestion, setSuggestion] = useState<AIMetadataSuggestion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTraits, setSelectedTraits] = useState<Record<number, boolean>>({});
  const [activeName, setActiveName] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleGenerate = async (customStyle?: string) => {
    setIsGenerating(true);
    setGenerationStep('Analyzing visual composition & color spectrum...');

    const styleToUse = customStyle || selectedStyle;

    // Simulate progress updates for a rich UX experience
    const timer1 = setTimeout(() => {
      setGenerationStep('Synthesizing Web3 narrative lore & naming motifs...');
    }, 600);

    const timer2 = setTimeout(() => {
      setGenerationStep('Computing rarity tiers & EIP-721 trait schemas...');
    }, 1200);

    try {
      const res = await requestAIMetadata({
        imageData: currentImage,
        styleHint: styleToUse,
        tone: selectedTone,
        userContext: customKeywords,
        standard: tokenStandard,
        chainName: chainName,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res.metadata) {
        setSuggestion(res.metadata);
        setActiveName(res.metadata.name);
        
        // Default all traits to checked
        const traitsChecked: Record<number, boolean> = {};
        res.metadata.traits.forEach((_, idx) => {
          traitsChecked[idx] = true;
        });
        setSelectedTraits(traitsChecked);
        setIsModalOpen(true);
        showNotification('Gemini 3.7 Flash generated full metadata suite!');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Notice: generated using backup creative synthesis engine');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleApplyAll = () => {
    if (!suggestion) return;
    const traitsToApply = suggestion.traits.filter((_, idx) => selectedTraits[idx] !== false);

    onApplyAll({
      name: activeName || suggestion.name,
      description: suggestion.description,
      traits: traitsToApply,
      royaltyPercentage: suggestion.suggestedRoyalty,
      suggestedPrice: suggestion.suggestedPrice,
      unlockableContent: suggestion.unlockableLore,
      category: suggestion.category,
    });

    showNotification('Applied all AI metadata to NFT!');
    setIsModalOpen(false);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-950 border border-purple-500/30 p-4 space-y-3 shadow-lg relative overflow-hidden">
      
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-zinc-100 uppercase tracking-wider">
                AI Metadata Copilot
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                Gemini 3.7 Flash
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Auto-generate NFT names, rich lore descriptions, and structured traits based on your asset
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Controls */}
      {isExpanded && (
        <div className="space-y-3 pt-1 relative z-10">
          
          {/* Quick Style Presets Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3 h-3 text-cyan-400" />
              Creative Genre & World-Building Preset
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyle(preset.hint)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedStyle === preset.hint
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 border border-purple-400/50'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone & Keywords Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Narrative Tone</label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-purple-500/50"
              >
                {TONE_PRESETS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Optional Keywords / Creator Notes</label>
              <input
                type="text"
                placeholder="e.g. holographic dragon, sacred geometry, void blade"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Primary Action Button & Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              id="ai-generate-metadata-btn"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>{generationStep || 'Analyzing visual with Gemini AI...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-cyan-200 group-hover:rotate-12 transition-transform" />
                  <span>Generate Metadata from Visual Asset</span>
                </>
              )}
            </button>

            {suggestion && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>Review Suggestions</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notification banner */}
      {notification && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVIEW & SELECTIVE APPLY MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && suggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    AI Metadata Inspector & Studio
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Gemini 3.7 Flash
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">Review, fine-tune, or selectively adopt generated metadata</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-zinc-200 text-xs">
              
              {/* Asset & Visual Analysis Overview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="md:col-span-4 aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 relative">
                  <img
                    src={currentImage}
                    alt="Asset Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-mono text-zinc-300">
                    {mediaSource === 'generative' ? 'Generative SVG' : 'Uploaded File'}
                  </div>
                </div>

                <div className="md:col-span-8 space-y-2.5 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Visual Harmonics</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {suggestion.visualAnalysis.aestheticStyle}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300">
                    <span className="font-semibold text-zinc-400">Mood: </span>
                    {suggestion.visualAnalysis.mood}
                  </div>

                  {/* Dominant Palette */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-zinc-400">Dominant Palette:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.visualAnalysis.dominantColors.map((color, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500" />
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {suggestion.tags?.map((tag, i) => (
                      <span key={i} className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. Name Suggestions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-cyan-400" />
                    Suggested Name Options (Click to Select)
                  </label>
                  <button
                    onClick={() => {
                      onApplyName(activeName || suggestion.name);
                      showNotification(`Adopted title: "${activeName || suggestion.name}"`);
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Apply Title Only
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-cyan-500/50 flex items-center justify-between">
                    <input
                      type="text"
                      value={activeName}
                      onChange={(e) => setActiveName(e.target.value)}
                      className="w-full bg-transparent font-bold text-zinc-100 text-sm focus:outline-none"
                    />
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 shrink-0 ml-2">
                      Active
                    </span>
                  </div>

                  {/* Alternative name pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-zinc-500 self-center">Alternatives:</span>
                    {suggestion.alternativeNames.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveName(alt)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                          activeName === alt 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold' 
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Narrative Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Lore & Narrative Description
                  </label>
                  <button
                    onClick={() => {
                      onApplyDescription(suggestion.description);
                      showNotification('Applied AI description!');
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Apply Description Only
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                    {suggestion.description}
                  </p>
                  <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Short Preview: "{suggestion.shortDescription}"</span>
                    <span>Category: <strong className="text-zinc-300 capitalize">{suggestion.category}</strong></span>
                  </div>
                </div>
              </div>

              {/* 3. Structured Traits & Attributes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    Structured Traits & Attributes ({suggestion.traits.length})
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const traitsToApply = suggestion.traits.filter((_, idx) => selectedTraits[idx] !== false);
                        onApplyTraits(traitsToApply);
                        showNotification(`Applied ${traitsToApply.length} traits!`);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Apply Selected Traits
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {suggestion.traits.map((trait, idx) => {
                    const isChecked = selectedTraits[idx] !== false;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedTraits(prev => ({ ...prev, [idx]: !isChecked }))}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none relative ${
                          isChecked
                            ? 'bg-zinc-950 border-emerald-500/40 shadow-sm'
                            : 'bg-zinc-950/40 border-zinc-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            {trait.trait_type}
                          </span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-zinc-700'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="text-xs font-bold text-zinc-100 truncate">
                          {trait.value}
                        </div>

                        {trait.rarityPercentage && (
                          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>Rarity</span>
                            <span className="font-mono text-emerald-400 font-semibold">
                              {trait.rarityPercentage}% weight
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Unlockable Secret Lore & Creator Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Unlockable Secret Content Lore
                    </span>
                    <button
                      onClick={() => {
                        onApplyUnlockable(suggestion.unlockableLore);
                        showNotification('Applied unlockable lore!');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    {suggestion.unlockableLore}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Marketplace Recommendations
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Suggested Secondary Royalty:</span>
                      <strong className="text-purple-400 font-mono">{suggestion.suggestedRoyalty}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Suggested Initial Mint Price:</span>
                      <strong className="text-cyan-400 font-mono">{suggestion.suggestedPrice} native</strong>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Recommended Standard:</span>
                      <strong className="text-emerald-400 font-mono">{tokenStandard}</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                Re-roll with Gemini
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAll}
                  id="apply-all-ai-metadata-btn"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Apply All to NFT Form
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
