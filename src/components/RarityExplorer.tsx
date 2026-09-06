import React, { useState, useMemo } from 'react';
import { NFT, NFTCollection } from '../types';
import { 
  analyzeCollectionMetadata, 
  DetailedTraitRarity, 
  CollectionMetadataAnalysis 
} from '../services/rarityService';
import { 
  Sparkles, 
  Layers, 
  Trophy, 
  Search, 
  SlidersHorizontal, 
  BarChart3, 
  Percent, 
  ArrowUpDown, 
  Info, 
  Check, 
  Copy, 
  ExternalLink, 
  RotateCcw, 
  ShieldCheck, 
  Flame, 
  Code2, 
  ChevronRight, 
  TrendingUp, 
  Gem,
  Award,
  Filter,
  Eye,
  Sliders,
  Sparkle
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '../data/chains';

interface RarityExplorerProps {
  nft: NFT;
  allNFTs?: NFT[];
  collection?: NFTCollection;
  onSelectPeerNFT?: (peerNFT: NFT) => void;
}

export const RarityExplorer: React.FC<RarityExplorerProps> = ({
  nft,
  allNFTs = [],
  collection,
  onSelectPeerNFT
}) => {
  const chainConfig = SUPPORTED_CHAINS[nft.chainId] || SUPPORTED_CHAINS.ethereum;
  const collectionSupply = collection?.currentSupply || collection?.maxSupply || 1000;

  // Metadata Analysis
  const analysisResult = useMemo(() => {
    return analyzeCollectionMetadata(nft, allNFTs, collectionSupply);
  }, [nft, allNFTs, collectionSupply]);

  const { rarity, traits, collectionAnalysis } = analysisResult;

  // View state
  const [viewMode, setViewMode] = useState<'explorer' | 'simulator' | 'json'>('explorer');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [scarcityFilter, setScarcityFilter] = useState<'all' | 'critical' | 'rare' | 'standard'>('all');
  const [sortBy, setSortBy] = useState<'rarest' | 'score' | 'alphabetical' | 'type'>('rarest');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // "What-If" Simulator State
  const [simulatedTraitType, setSimulatedTraitType] = useState<string>(traits[0]?.trait_type || '');
  const [simulatedFrequency, setSimulatedFrequency] = useState<number>(traits[0]?.frequencyPercent || 5);

  // Filtered traits
  const filteredTraits = useMemo(() => {
    return traits.filter(t => {
      // Scarcity filter
      if (scarcityFilter === 'critical' && t.frequencyPercent > 5) return false;
      if (scarcityFilter === 'rare' && (t.frequencyPercent <= 5 || t.frequencyPercent > 15)) return false;
      if (scarcityFilter === 'standard' && t.frequencyPercent <= 15) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesType = t.trait_type.toLowerCase().includes(q);
        const matchesVal = String(t.value).toLowerCase().includes(q);
        if (!matchesType && !matchesVal) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rarest') return a.frequencyPercent - b.frequencyPercent;
      if (sortBy === 'score') return b.traitScore - a.traitScore;
      if (sortBy === 'alphabetical') return String(a.value).localeCompare(String(b.value));
      if (sortBy === 'type') return a.trait_type.localeCompare(b.trait_type);
      return 0;
    });
  }, [traits, scarcityFilter, searchQuery, sortBy]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Simulator dynamic recalculation
  const simulatedStats = useMemo(() => {
    if (!simulatedTraitType) return null;
    const originalTrait = traits.find(t => t.trait_type === simulatedTraitType);
    if (!originalTrait) return null;

    const originalScore = originalTrait.traitScore;
    const newTraitScore = +(100 / Math.max(simulatedFrequency, 0.2)).toFixed(1);
    const scoreDiff = newTraitScore - originalScore;

    const newRawScore = Math.max(10, Math.round(rarity.rawScore + scoreDiff));
    const newNormalized = Math.min(
      99.5,
      Math.max(12, Math.round((Math.log10(Math.max(newRawScore, 10)) / Math.log10(450)) * 96))
    );
    const newPercentile = +(Math.max(0.1, 100 - newNormalized * 0.98)).toFixed(1);
    const newRank = Math.max(1, Math.round((newPercentile / 100) * collectionAnalysis.totalItems));

    let newTier = 'Common';
    if (newNormalized >= 90) newTier = 'Mythic';
    else if (newNormalized >= 80) newTier = 'Legendary';
    else if (newNormalized >= 68) newTier = 'Epic Rare';
    else if (newNormalized >= 50) newTier = 'Rare';
    else if (newNormalized >= 35) newTier = 'Uncommon';

    return {
      originalScore,
      newTraitScore,
      scoreDiff,
      newRawScore,
      newNormalized,
      newPercentile,
      newRank,
      newTier,
    };
  }, [simulatedTraitType, simulatedFrequency, traits, rarity.rawScore, collectionAnalysis.totalItems]);

  // Metadata JSON payload
  const metadataJsonPayload = useMemo(() => {
    return {
      name: nft.name,
      description: nft.description,
      image: nft.image,
      collection: {
        id: collectionAnalysis.collectionId,
        name: collectionAnalysis.collectionName,
        total_supply: collectionAnalysis.totalItems,
      },
      rarity_analysis: {
        rank: collectionAnalysis.currentNFTRank,
        percentile: `Top ${collectionAnalysis.currentNFTPercentile}%`,
        tier: rarity.tier,
        rarity_score: rarity.normalizedScore,
        raw_trait_points: rarity.rawScore,
        collection_average_points: collectionAnalysis.averageScore,
        delta_vs_average: `${collectionAnalysis.deltaVsAveragePercent > 0 ? '+' : ''}${collectionAnalysis.deltaVsAveragePercent}%`,
      },
      attributes: traits.map(t => ({
        trait_type: t.trait_type,
        value: t.value,
        frequency_percentage: `${t.frequencyPercent}%`,
        collection_count: `${t.countInCollection}/${t.totalCollectionSupply}`,
        rarity_score: t.traitScore,
        impact: t.impact,
      })),
      on_chain_standards: {
        erc_standard: nft.standard,
        contract_address: nft.contractAddress,
        token_id: nft.tokenId,
        metadata_uri: nft.ipfsMetadataUri,
      }
    };
  }, [nft, collectionAnalysis, rarity, traits]);

  return (
    <div id="rarity-explorer-root" className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Banner & Mode Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-purple-500/30 shadow-xl relative overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Rarity Explorer
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {collectionAnalysis.collectionName} • <strong className="text-zinc-200 font-mono">{collectionAnalysis.totalItems.toLocaleString()}</strong> items analyzed
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                EIP-2981 & Metadata Spec
              </span>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                  Rank #{collectionAnalysis.currentNFTRank}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  of {collectionAnalysis.totalItems.toLocaleString()}
                </span>
              </div>

              <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${rarity.tierColor.bg} ${rarity.tierColor.border} ${rarity.tierColor.text}`}>
                {rarity.tier} (Top {collectionAnalysis.currentNFTPercentile}%)
              </div>
            </div>

            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed pt-0.5">
              Trait rarity scores calculated via metadata frequency distribution (Score = 1 / Trait Frequency). 
              This asset is <strong className="text-emerald-400 font-semibold">{collectionAnalysis.deltaVsAveragePercent > 0 ? `+${collectionAnalysis.deltaVsAveragePercent}%` : `${collectionAnalysis.deltaVsAveragePercent}%`}</strong> compared to collection baseline.
            </p>
          </div>

          {/* Sub-view Nav Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 self-start md:self-center shrink-0">
            <button
              id="rarity-subtab-explorer-btn"
              onClick={() => setViewMode('explorer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'explorer'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Traits Explorer</span>
            </button>

            <button
              id="rarity-subtab-simulator-btn"
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'simulator'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-900/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>What-If Simulator</span>
            </button>

            <button
              id="rarity-subtab-json-btn"
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'json'
                  ? 'bg-zinc-800 text-cyan-300 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Metadata JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRICS QUAD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* Metric 1: Rarity Score */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Rarity Score</span>
            <Sparkles className="w-3 h-3 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black font-mono text-white">{rarity.normalizedScore}</span>
            <span className="text-xs text-zinc-500 font-mono">/ 100</span>
          </div>
          <div className="text-[10px] text-purple-400 font-semibold mt-0.5 truncate">
            {rarity.rawScore} Raw Trait Points
          </div>
        </div>

        {/* Metric 2: Collection Standing */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Collection Rank</span>
            <Trophy className="w-3 h-3 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black font-mono text-cyan-400">#{collectionAnalysis.currentNFTRank}</span>
            <span className="text-[11px] text-zinc-400 font-mono">Top {collectionAnalysis.currentNFTPercentile}%</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
            Baseline: {collectionAnalysis.averageScore} pts avg
          </div>
        </div>

        {/* Metric 3: Rarest Trait */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Scarcest Trait</span>
            <Flame className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-black text-white mt-1.5 truncate" title={rarity.rarestTrait ? String(rarity.rarestTrait.value) : 'None'}>
            {rarity.rarestTrait ? rarity.rarestTrait.value : 'Standard'}
          </div>
          <div className="text-[10px] text-rose-400 font-mono font-bold mt-0.5 flex items-center gap-1">
            <span>{rarity.rarestTrait ? `${rarity.rarestTrait.frequencyPercent}% Occurrence` : 'Common'}</span>
            {rarity.rarestTrait && <span>• +{rarity.rarestTrait.traitScore} pts</span>}
          </div>
        </div>

        {/* Metric 4: Trait Count Bonus */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Trait Count</span>
            <Layers className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black font-mono text-emerald-400">{collectionAnalysis.traitCountAnalysis.count}</span>
            <span className="text-xs text-zinc-400 font-mono">Properties</span>
          </div>
          <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5 truncate">
            {collectionAnalysis.traitCountAnalysis.collectionFrequency}% of items have {collectionAnalysis.traitCountAnalysis.count}
          </div>
        </div>

      </div>

      {/* COLLECTION RARITY SPECTRUM WITH PINPOINT */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="font-bold text-zinc-200 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Collection Rarity Bell-Curve & Tier Distribution:
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            Position: <strong className="text-white">{rarity.normalizedScore}%</strong> ({rarity.tier})
          </span>
        </div>

        {/* Visual Tier Proportion Spectrum */}
        <div className="space-y-1.5">
          <div className="relative w-full h-5 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex shadow-inner">
            {collectionAnalysis.tierBreakdown.map((t, idx) => (
              <div
                key={idx}
                style={{ width: `${t.percentage}%` }}
                className={`h-full flex items-center justify-center text-[9px] font-mono font-bold tracking-tight border-r border-black/40 transition-all ${t.color}`}
                title={`${t.tier}: ${t.percentage}% of collection (~${t.count} items)`}
              >
                <span className="hidden md:inline truncate px-1">{t.tier}</span>
              </div>
            ))}

            {/* Current Item Pinpoint Marker */}
            <div 
              className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-lg shadow-cyan-400/80 -translate-x-1/2 ring-2 ring-cyan-400 animate-pulse z-20"
              style={{ left: `${Math.min(98, Math.max(2, rarity.normalizedScore))}%` }}
              title={`This NFT: ${rarity.normalizedScore}/100 (${rarity.tier})`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 px-1 pt-0.5">
            <span>Floor: {collectionAnalysis.lowestScore} pts</span>
            <span>Avg: {collectionAnalysis.averageScore} pts</span>
            <span className="text-cyan-400 font-bold">This NFT: {rarity.rawScore} pts</span>
            <span className="text-amber-400">Ceiling: {collectionAnalysis.highestScore} pts</span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: TRAIT EXPLORER & SCARCITY BREAKDOWN */}
      {viewMode === 'explorer' && (
        <div className="space-y-4">
          
          {/* Controls Bar: Search + Filter Chips + Sorting */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
            
            {/* Search Input */}
            <div className="relative flex-1 group">
              <Search className="w-3.5 h-3.5 text-zinc-400 group-focus-within:text-purple-400 transition-colors absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="rarity-trait-search-input"
                type="text"
                placeholder="Search trait type or value..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* Scarcity Filter Chips */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
              <button
                id="filter-all-traits-btn"
                onClick={() => setScarcityFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  scarcityFilter === 'all'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({traits.length})
              </button>
              <button
                id="filter-critical-traits-btn"
                onClick={() => setScarcityFilter('critical')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  scarcityFilter === 'critical'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-rose-400/80 hover:text-rose-300'
                }`}
              >
                <Flame className="w-2.5 h-2.5" />
                Ultra-Rare (&lt;5%)
              </button>
              <button
                id="filter-rare-traits-btn"
                onClick={() => setScarcityFilter('rare')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  scarcityFilter === 'rare'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                Scarce (5-15%)
              </button>
              <button
                id="filter-standard-traits-btn"
                onClick={() => setScarcityFilter('standard')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  scarcityFilter === 'standard'
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                Common (&gt;15%)
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs shrink-0">
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
              <select
                id="rarity-sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-zinc-200 focus:outline-none text-[11px] font-semibold cursor-pointer"
              >
                <option value="rarest" className="bg-zinc-900">Sort: Rarest First</option>
                <option value="score" className="bg-zinc-900">Sort: Score Contribution</option>
                <option value="alphabetical" className="bg-zinc-900">Sort: Value (A-Z)</option>
                <option value="type" className="bg-zinc-900">Sort: Trait Type</option>
              </select>
            </div>

          </div>

          {/* Traits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="rarity-traits-grid">
            {filteredTraits.map((t, idx) => {
              const pctOfScore = t.percentageOfTotalScore;

              return (
                <div 
                  key={idx}
                  id={`trait-card-${t.trait_type.toLowerCase().replace(/\s+/g, '-')}`}
                  className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-1.5">
                    {/* Trait Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block truncate">
                          {t.trait_type}
                        </span>
                        <span className="text-sm font-black text-white font-mono block truncate mt-0.5 group-hover:text-cyan-200 transition-colors">
                          {String(t.value)}
                        </span>
                      </div>

                      {/* Impact Tag */}
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        t.impact === 'Critical'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : t.impact === 'High'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : t.impact === 'Medium'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                        {t.impact === 'Critical' ? '★ Ultra-Rare' : `${t.frequencyPercent}% freq`}
                      </span>
                    </div>

                    {/* Collection Scarcity Bar */}
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>{t.countInCollection.toLocaleString()} of {t.totalCollectionSupply.toLocaleString()} in collection</span>
                        <span className="font-bold text-zinc-200">{t.frequencyPercent}%</span>
                      </div>

                      <div className="relative w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            t.impact === 'Critical'
                              ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                              : t.impact === 'High'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                              : t.impact === 'Medium'
                              ? 'bg-gradient-to-r from-purple-500 to-cyan-400'
                              : 'bg-zinc-600'
                          }`}
                          style={{ width: `${Math.max(4, Math.min(100, t.frequencyPercent))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-3 pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1 text-zinc-400">
                      <span>Score:</span>
                      <span className="text-purple-300 font-bold">+{t.traitScore} pts</span>
                      <span className="text-[10px] text-zinc-500 font-normal">({pctOfScore}% share)</span>
                    </div>

                    <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {t.floorImpactMultiplier}x floor weight
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTraits.length === 0 && (
            <div className="text-center py-8 rounded-2xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-1.5">
              <Filter className="w-5 h-5 text-zinc-500 mx-auto" />
              <div className="text-xs font-bold text-zinc-300">No traits match current criteria</div>
              <p className="text-[11px] text-zinc-500">Clear your search query or reset filter chips</p>
            </div>
          )}

          {/* Category Contribution Summary Strip */}
          {collectionAnalysis.categoryContributions.length > 1 && (
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  Rarity Score Breakdown by Trait Category:
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {collectionAnalysis.categoryContributions.length} Categories
                </span>
              </div>

              <div className="space-y-2">
                {collectionAnalysis.categoryContributions.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-300">{cat.category}</span>
                      <span className="font-mono text-purple-300 font-bold">
                        +{cat.score} pts <span className="text-zinc-500 font-normal">({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peer Collection Leaderboard Preview */}
          {collectionAnalysis.peerNFTsRanked.length > 1 && (
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Collection Rarity Leaderboard ({collectionAnalysis.peerNFTsRanked.length} items sampled):
                </span>
                <span className="text-[10px] text-zinc-500">Click to compare metadata</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {collectionAnalysis.peerNFTsRanked.slice(0, 6).map((peer) => (
                  <div
                    key={peer.id}
                    onClick={() => {
                      if (onSelectPeerNFT) {
                        const matched = allNFTs.find(n => n.id === peer.id);
                        if (matched) onSelectPeerNFT(matched);
                      }
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      peer.isCurrent
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <img
                      src={peer.image}
                      alt={peer.name}
                      className="w-9 h-9 rounded-lg object-cover ring-1 ring-zinc-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white truncate">{peer.name}</span>
                        <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">#{peer.rank}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                        <span className="text-cyan-400 font-bold">{peer.score} pts</span>
                        <span>•</span>
                        <span className="truncate">{peer.tier}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW MODE 2: "WHAT-IF" METADATA SIMULATOR */}
      {viewMode === 'simulator' && (
        <div className="p-5 rounded-2xl bg-zinc-950/90 border border-cyan-500/30 space-y-5 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Trait Rarity Shift & "What-If" Simulator</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Interactive Model
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Simulate how swapping or rerolling a specific metadata property alters this NFT's rarity score, tier classification, and collection rank.
            </p>
          </div>

          {/* Simulator Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* Trait Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Select Target Trait Property:</label>
              <select
                id="simulator-trait-selector"
                value={simulatedTraitType}
                onChange={e => {
                  setSimulatedTraitType(e.target.value);
                  const match = traits.find(t => t.trait_type === e.target.value);
                  if (match) setSimulatedFrequency(match.frequencyPercent);
                }}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                {traits.map(t => (
                  <option key={t.trait_type} value={t.trait_type}>
                    {t.trait_type}: {String(t.value)} ({t.frequencyPercent}% on-chain)
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-zinc-300">Simulated Scarcity Occurrence:</label>
                <span className="font-mono text-cyan-400 font-bold">{simulatedFrequency}%</span>
              </div>
              <input
                id="simulator-frequency-slider"
                type="range"
                min="0.5"
                max="35"
                step="0.5"
                value={simulatedFrequency}
                onChange={e => setSimulatedFrequency(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0.5% (Mythic 1-of-1)</span>
                <span>5% (Rare)</span>
                <span>15% (Uncommon)</span>
                <span>35% (Common)</span>
              </div>
            </div>

          </div>

          {/* Simulated Outcome Comparison Card */}
          {simulatedStats && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-zinc-500">New Trait Score</div>
                <div className="text-lg font-black text-cyan-400 font-mono">
                  +{simulatedStats.newTraitScore} pts
                </div>
                <div className="text-[10px] text-zinc-400">
                  {simulatedStats.scoreDiff > 0 ? `+${simulatedStats.scoreDiff.toFixed(1)} gain` : `${simulatedStats.scoreDiff.toFixed(1)} delta`}
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-zinc-500">Total Raw Points</div>
                <div className="text-lg font-black text-white font-mono">
                  {simulatedStats.newRawScore} pts
                </div>
                <div className="text-[10px] text-zinc-400">Original: {rarity.rawScore} pts</div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-zinc-500">Simulated Score & Tier</div>
                <div className="text-lg font-black text-purple-400 font-mono">
                  {simulatedStats.newNormalized} / 100
                </div>
                <div className="text-[10px] text-purple-300 font-semibold">{simulatedStats.newTier} Tier</div>
              </div>

              <div className="space-y-0.5">
                <div className="text-[10px] font-bold uppercase text-zinc-500">Projected Rank</div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  #{simulatedStats.newRank}
                </div>
                <div className="text-[10px] text-zinc-400">Top {simulatedStats.newPercentile}%</div>
              </div>

            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                const match = traits.find(t => t.trait_type === simulatedTraitType);
                if (match) setSimulatedFrequency(match.frequencyPercent);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to On-Chain Values</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: RAW ON-CHAIN METADATA JSON */}
      {viewMode === 'json' && (
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-zinc-200">EIP-721 / ERC-1155 Metadata Spec JSON</span>
            </div>

            <button
              id="copy-metadata-json-btn"
              onClick={() => handleCopy(JSON.stringify(metadataJsonPayload, null, 2), 'metadata-json')}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedKey === 'metadata-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'metadata-json' ? 'Copied JSON' : 'Copy JSON'}</span>
            </button>
          </div>

          <pre className="p-3 bg-zinc-900/70 rounded-xl overflow-x-auto text-[11px] text-zinc-300 max-h-[350px] overflow-y-auto leading-relaxed border border-zinc-800">
            {JSON.stringify(metadataJsonPayload, null, 2)}
          </pre>
        </div>
      )}

    </div>
  );
};
