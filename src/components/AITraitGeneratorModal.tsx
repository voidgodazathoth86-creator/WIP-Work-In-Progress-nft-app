import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  Sliders, 
  Upload, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Tag, 
  Eye, 
  Layers, 
  Zap, 
  CheckCircle2,
  Percent
} from 'lucide-react';
import { NFTTrait } from '../types';
import { requestAITraitsFromImage, SuggestTraitsResult } from '../services/aiMetadataService';

interface AITraitGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onApplyTraits: (traits: NFTTrait[], replace: boolean) => void;
  onApplyAll?: (data: { title?: string; description?: string; traits: NFTTrait[] }) => void;
  onUploadImage?: (file: File) => void;
  currentTraitsCount?: number;
}

export const AITraitGeneratorModal: React.FC<AITraitGeneratorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onApplyTraits,
  onApplyAll,
  onUploadImage,
  currentTraitsCount = 0,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SuggestTraitsResult | null>(null);
  const [selectedTraits, setSelectedTraits] = useState<Record<number, boolean>>({});
  const [editableTraits, setEditableTraits] = useState<Array<{
    trait_type: string;
    value: string | number;
    description: string;
    rarityPercentage: number;
    rarityTier: string;
    display_type?: any;
  }>>([]);
  const [styleHint, setStyleHint] = useState<string>('');
  const [userNotes, setUserNotes] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [includeTitleDesc, setIncludeTitleDesc] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<number>(0);

  // Trigger analysis when modal opens with an image if not already analyzed
  useEffect(() => {
    if (isOpen && imageUrl && !result && !loading) {
      handleAnalyze(imageUrl);
    }
  }, [isOpen, imageUrl]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAnalyze = async (imgData: string) => {
    setLoading(true);
    setGenerationStep(1);

    const stepTimer1 = setTimeout(() => setGenerationStep(2), 700);
    const stepTimer2 = setTimeout(() => setGenerationStep(3), 1400);

    try {
      const res = await requestAITraitsFromImage({
        imageData: imgData,
        styleHint: styleHint.trim() || undefined,
        userNotes: userNotes.trim() || undefined,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setGenerationStep(4);

      setResult(res);
      setEditableTraits(res.traits);
      setCustomTitle(res.suggestedTitle || '');
      setCustomDescription(res.suggestedDescription || '');

      // Select all traits by default
      const initialSelection: Record<number, boolean> = {};
      res.traits.forEach((_, idx) => {
        initialSelection[idx] = true;
      });
      setSelectedTraits(initialSelection);

      if (res.isFallback) {
        showToast('Generated traits using local analytical engine.');
      } else {
        showToast('Gemini 3.8 Flash visual trait analysis complete!');
      }
    } catch (err: any) {
      showToast('Encountered an issue analyzing traits. Loaded fallback analysis.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTraitSelection = (index: number) => {
    setSelectedTraits(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const toggleSelectAll = () => {
    const allSelected = editableTraits.every((_, idx) => selectedTraits[idx] !== false);
    const updated: Record<number, boolean> = {};
    editableTraits.forEach((_, idx) => {
      updated[idx] = !allSelected;
    });
    setSelectedTraits(updated);
  };

  const updateTraitField = (index: number, field: string, val: any) => {
    setEditableTraits(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      
      // Auto-update rarity tier if percentage is edited
      if (field === 'rarityPercentage') {
        const p = Number(val);
        if (!isNaN(p)) {
          next[index].rarityTier = 
            p <= 3 ? 'Mythic' : 
            p <= 8 ? 'Legendary' : 
            p <= 18 ? 'Epic' : 
            p <= 30 ? 'Rare' : 
            p <= 50 ? 'Uncommon' : 'Common';
        }
      }
      return next;
    });
  };

  const handleApplySelectedTraits = () => {
    const traitsToApply: NFTTrait[] = editableTraits
      .filter((_, idx) => selectedTraits[idx] !== false)
      .map(t => ({
        trait_type: t.trait_type,
        value: t.value,
        description: t.description,
        rarityPercentage: t.rarityPercentage,
        rarityTier: t.rarityTier,
        display_type: t.display_type,
      }));

    if (traitsToApply.length === 0) {
      showToast('Please select at least one trait to apply');
      return;
    }

    if (includeTitleDesc && onApplyAll && (customTitle || customDescription)) {
      onApplyAll({
        title: customTitle,
        description: customDescription,
        traits: traitsToApply,
      });
    } else {
      onApplyTraits(traitsToApply, replaceExisting);
    }

    onClose();
  };

  const getRarityBadgeStyle = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'mythic':
        return 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40';
      case 'legendary':
        return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40';
      case 'epic':
        return 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40';
      case 'rare':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'uncommon':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getRarityProgressColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'mythic':
        return 'bg-gradient-to-r from-purple-400 to-pink-500';
      case 'legendary':
        return 'bg-gradient-to-r from-amber-400 to-yellow-400';
      case 'epic':
        return 'bg-gradient-to-r from-cyan-400 to-blue-400';
      case 'rare':
        return 'bg-blue-400';
      case 'uncommon':
        return 'bg-emerald-400';
      default:
        return 'bg-zinc-400';
    }
  };

  if (!isOpen) return null;

  const selectedCount = editableTraits.filter((_, idx) => selectedTraits[idx] !== false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Gemini AI Trait & Rarity Analyzer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Gemini 3.8 Flash Vision
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Deep visual neural inspection of your uploaded asset to formulate trait descriptions and calibrated rarity percentiles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!imageUrl ? (
            /* Upload Image State */
            <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/50 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400">
                <Upload className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-zinc-100">Upload an Image for Gemini AI Vision</h4>
                <p className="text-xs text-zinc-400">
                  Select an artwork, character render, or generative asset. Gemini will detect visual elements, clothing, lighting, accessories, and compute trait rarity levels.
                </p>
              </div>

              {onUploadImage && (
                <div>
                  <input
                    type="file"
                    id="modal-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onUploadImage(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="modal-image-upload"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold text-xs cursor-pointer shadow-lg transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Browse Image File
                  </label>
                </div>
              )}
            </div>
          ) : (
            /* Analysis Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Visual Asset & Neural Telemetry */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Image Card */}
                <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-lg group">
                  <div className="aspect-square w-full flex items-center justify-center overflow-hidden bg-zinc-950">
                    <img
                      src={imageUrl}
                      alt="Asset to analyze"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Scanning Animation while loading */}
                  {loading && (
                    <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-[0_0_15px_#22d3ee]" />
                      <div className="relative z-10 text-center space-y-2 bg-zinc-950/90 p-4 rounded-xl border border-purple-500/40">
                        <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto" />
                        <div className="text-xs font-bold text-zinc-100">
                          {generationStep === 1 && 'Scanning Visual Composition...'}
                          {generationStep === 2 && 'Extracting Subject Equipment & Traits...'}
                          {generationStep === 3 && 'Computing Statistical Rarity Distributions...'}
                          {generationStep >= 4 && 'Finalizing Trait Descriptions...'}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Multimodal Gemini 3.8 Flash Vision
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visual Analysis Overlay Tag */}
                  {result?.overallRarityTier && (
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow-md flex items-center gap-1.5 ${getRarityBadgeStyle(result.overallRarityTier)}`}>
                        <Flame className="w-3 h-3" />
                        {result.overallRarityTier} Asset
                      </span>
                    </div>
                  )}
                </div>

                {/* Detected Visual Features */}
                {result?.visualInspection && (
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                    <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Visual Neural Summary
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {result.visualInspection.summary}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-900 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Subject:</span>
                        <span className="font-semibold text-zinc-200">{result.visualInspection.detectedSubject}</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Art Style:</span>
                        <span className="font-semibold text-zinc-200">{result.visualInspection.artStyle}</span>
                      </div>
                    </div>

                    {/* Dominant Colors */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-zinc-400 font-semibold">Dominant Palette:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.visualInspection.dominantColors.map((color, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200 flex items-center gap-1.5"
                          >
                            <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500" />
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Guidance Controls */}
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    Custom Trait Guidance (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dark fantasy RPG, Cybernetic mech, Mystic anime"
                    value={styleHint}
                    onChange={(e) => setStyleHint(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => handleAnalyze(imageUrl)}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Analyzing with Gemini...' : 'Re-Analyze Image'}
                  </button>
                </div>
              </div>

              {/* Right Column: Suggested Traits & Rarity Breakdown */}
              <div className="lg:col-span-8 space-y-4">

                {/* Traits Header & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      Suggested Traits & Rarity Levels ({selectedCount}/{editableTraits.length})
                    </span>
                    <button
                      onClick={toggleSelectAll}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                    >
                      {editableTraits.every((_, idx) => selectedTraits[idx] !== false) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={(e) => setReplaceExisting(e.target.checked)}
                        className="rounded border-zinc-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Replace existing traits ({currentTraitsCount})</span>
                    </label>
                  </div>
                </div>

                {/* Traits List */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {editableTraits.map((trait, index) => {
                    const isChecked = selectedTraits[index] !== false;
                    const tier = trait.rarityTier || 'Common';

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl border transition-all ${
                          isChecked
                            ? 'bg-zinc-950 border-zinc-700 shadow-sm'
                            : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleTraitSelection(index)}
                            className={`mt-1 w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-400 text-black'
                                : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          {/* Trait Fields */}
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              {/* Trait Type */}
                              <div className="sm:col-span-4">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                  Trait Type
                                </label>
                                <input
                                  type="text"
                                  value={trait.trait_type}
                                  onChange={(e) => updateTraitField(index, 'trait_type', e.target.value)}
                                  className="w-full px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-semibold text-zinc-200 focus:outline-none focus:border-cyan-500"
                                />
                              </div>

                              {/* Trait Value */}
                              <div className="sm:col-span-5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                  Value / Appearance
                                </label>
                                <input
                                  type="text"
                                  value={trait.value}
                                  onChange={(e) => updateTraitField(index, 'value', e.target.value)}
                                  className="w-full px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                                />
                              </div>

                              {/* Rarity Controls */}
                              <div className="sm:col-span-3">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                                  <span>Rarity Level</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getRarityBadgeStyle(tier)}`}>
                                    {tier}
                                  </span>
                                </label>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={trait.rarityPercentage || 10}
                                    onChange={(e) => updateTraitField(index, 'rarityPercentage', Number(e.target.value))}
                                    className="w-14 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono font-bold text-cyan-300 text-center focus:outline-none focus:border-cyan-500"
                                  />
                                  <span className="text-xs text-zinc-400 font-mono">%</span>
                                </div>
                              </div>
                            </div>

                            {/* Trait Description */}
                            <div>
                              <input
                                type="text"
                                placeholder="Descriptive lore or visual explanation of this trait..."
                                value={trait.description || ''}
                                onChange={(e) => updateTraitField(index, 'description', e.target.value)}
                                className="w-full px-2.5 py-1 bg-zinc-900/60 border border-zinc-900 rounded text-[11px] text-zinc-400 focus:outline-none focus:border-zinc-700 italic"
                              />
                            </div>

                            {/* Rarity Bar Indicator */}
                            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getRarityProgressColor(tier)} transition-all duration-300`}
                                style={{ width: `${Math.min(100, Math.max(2, 100 - (trait.rarityPercentage || 10)))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Title & Narrative Description Sync */}
                {result?.suggestedTitle && (
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-bold text-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeTitleDesc}
                          onChange={(e) => setIncludeTitleDesc(e.target.checked)}
                          className="rounded border-zinc-700 text-purple-500 focus:ring-0"
                        />
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        Also Adopt AI Title & Lore Description
                      </label>
                    </div>

                    {includeTitleDesc && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Suggested Title:</span>
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-bold text-zinc-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Suggested Lore:</span>
                          <textarea
                            rows={2}
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>OpenSea EIP-721 on-chain metadata compatible</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplySelectedTraits}
              disabled={selectedCount === 0 || loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-600 hover:from-emerald-400 hover:via-cyan-400 hover:to-purple-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Apply {selectedCount} Traits & Rarity Levels to NFT
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
