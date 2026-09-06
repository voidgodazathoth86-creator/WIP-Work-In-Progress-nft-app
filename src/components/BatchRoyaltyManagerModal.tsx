import React, { useState, useMemo } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { NFTCollection, BlockchainNetwork, BatchRoyaltyUpdateItem } from '../types';
import { 
  Percent, 
  Layers, 
  Search, 
  Check, 
  CheckSquare, 
  Square, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  SlidersHorizontal, 
  X, 
  ExternalLink, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  Zap, 
  Wallet, 
  TrendingUp, 
  Loader2, 
  Copy,
  ChevronDown
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatUsd, formatCrypto } from '../services/gasService';
import confetti from 'canvas-confetti';

interface BatchRoyaltyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNotification?: (message: string) => void;
}

interface CollectionWorkingState {
  collection: NFTCollection;
  isSelected: boolean;
  newRoyalty: number;
  newPayoutAddress: string;
}

const ROYALTY_PRESETS = [
  { label: '0%', value: 0, desc: 'Zero Royalty (Community)' },
  { label: '2.5%', value: 2.5, desc: 'Market Standard' },
  { label: '5.0%', value: 5.0, desc: 'Creator Preferred' },
  { label: '7.5%', value: 7.5, desc: 'EIP-2981 Standard' },
  { label: '10.0%', value: 10.0, desc: 'Studio Standard' },
  { label: '12.5%', value: 12.5, desc: 'High Support' },
  { label: '15.0%', value: 15.0, desc: 'Exclusive Share' },
];

export const BatchRoyaltyManagerModal: React.FC<BatchRoyaltyManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccessNotification,
}) => {
  const { 
    collections, 
    activeAccount, 
    activeChain, 
    currentChainConfig, 
    batchUpdateRoyalties, 
    gasData 
  } = useWeb3();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<'all' | 'my'>('all');

  // Global Bulk Value Inputs
  const [globalRoyaltyInput, setGlobalRoyaltyInput] = useState<number>(5.0);
  const [globalPayoutAddressInput, setGlobalPayoutAddressInput] = useState<string>(activeAccount.address);

  // Per-collection working state Map
  const [workingStates, setWorkingStates] = useState<Record<string, { newRoyalty: number; newPayoutAddress: string; isSelected: boolean }>>(() => {
    const initial: Record<string, { newRoyalty: number; newPayoutAddress: string; isSelected: boolean }> = {};
    collections.forEach((c, idx) => {
      initial[c.id] = {
        newRoyalty: c.royaltyPercentage,
        newPayoutAddress: c.royaltyPayoutAddress || activeAccount.address,
        isSelected: idx < 3, // pre-select top collections for convenience
      };
    });
    return initial;
  });

  // Sync if collections change
  React.useEffect(() => {
    setWorkingStates(prev => {
      const updated = { ...prev };
      collections.forEach(c => {
        if (!updated[c.id]) {
          updated[c.id] = {
            newRoyalty: c.royaltyPercentage,
            newPayoutAddress: c.royaltyPayoutAddress || activeAccount.address,
            isSelected: false,
          };
        }
      });
      return updated;
    });
  }, [collections, activeAccount.address]);

  // Execution & Step States
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStep, setExecutionStep] = useState<number>(0);
  const [executionTxHash, setExecutionTxHash] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{ updatedCount: number; gasCrypto: number; gasUsd: number } | null>(null);

  // Filtered collections list
  const filteredCollections = useMemo(() => {
    return collections.filter(col => {
      // Creator filter
      if (creatorFilter === 'my') {
        const isMyCol = col.creatorAddress.toLowerCase() === activeAccount.address.toLowerCase();
        if (!isMyCol) return false;
      }

      // Chain filter
      if (selectedChainFilter !== 'all' && col.chainId !== selectedChainFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = col.name.toLowerCase().includes(query);
        const matchesSymbol = col.symbol.toLowerCase().includes(query);
        const matchesContract = col.contractAddress.toLowerCase().includes(query);
        const matchesCreator = (col.creatorName || '').toLowerCase().includes(query) || col.creatorAddress.toLowerCase().includes(query);
        if (!matchesName && !matchesSymbol && !matchesContract && !matchesCreator) {
          return false;
        }
      }

      return true;
    });
  }, [collections, creatorFilter, selectedChainFilter, searchQuery, activeAccount.address]);

  // Selected Collections calculations
  const selectedCollections = useMemo(() => {
    return collections.filter(c => workingStates[c.id]?.isSelected);
  }, [collections, workingStates]);

  const collectionsWithChanges = useMemo(() => {
    return selectedCollections.filter(c => {
      const state = workingStates[c.id];
      if (!state) return false;
      const royaltyChanged = Math.abs(state.newRoyalty - c.royaltyPercentage) > 0.01;
      const addressChanged = (state.newPayoutAddress || '').toLowerCase() !== (c.royaltyPayoutAddress || '').toLowerCase();
      return royaltyChanged || addressChanged;
    });
  }, [selectedCollections, workingStates]);

  // Selection toggle helpers
  const handleToggleSelectAll = (select: boolean) => {
    setWorkingStates(prev => {
      const next = { ...prev };
      filteredCollections.forEach(c => {
        if (next[c.id]) {
          next[c.id].isSelected = select;
        }
      });
      return next;
    });
  };

  const handleToggleCollection = (id: string) => {
    setWorkingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isSelected: !prev[id]?.isSelected,
      },
    }));
  };

  const handleUpdateCollectionRoyalty = (id: string, royalty: number) => {
    const clamped = Math.max(0, Math.min(25, +(royalty.toFixed(2))));
    setWorkingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        newRoyalty: clamped,
      },
    }));
  };

  const handleUpdateCollectionPayout = (id: string, address: string) => {
    setWorkingStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        newPayoutAddress: address,
      },
    }));
  };

  // Bulk Apply functions
  const handleApplyGlobalRoyalty = () => {
    const clamped = Math.max(0, Math.min(25, globalRoyaltyInput));
    setWorkingStates(prev => {
      const next = { ...prev };
      selectedCollections.forEach(c => {
        if (next[c.id]) {
          next[c.id].newRoyalty = clamped;
        }
      });
      return next;
    });
  };

  const handleApplyGlobalPayout = () => {
    if (!globalPayoutAddressInput.trim()) return;
    setWorkingStates(prev => {
      const next = { ...prev };
      selectedCollections.forEach(c => {
        if (next[c.id]) {
          next[c.id].newPayoutAddress = globalPayoutAddressInput.trim();
        }
      });
      return next;
    });
  };

  const handleResetAll = () => {
    setWorkingStates(prev => {
      const next = { ...prev };
      collections.forEach(c => {
        if (next[c.id]) {
          next[c.id].newRoyalty = c.royaltyPercentage;
          next[c.id].newPayoutAddress = c.royaltyPayoutAddress || activeAccount.address;
        }
      });
      return next;
    });
  };

  // Gas and Financial calculations
  const avgCurrentRoyalty = selectedCollections.length > 0
    ? (selectedCollections.reduce((sum, c) => sum + c.royaltyPercentage, 0) / selectedCollections.length).toFixed(2)
    : '0.00';

  const avgNewRoyalty = selectedCollections.length > 0
    ? (selectedCollections.reduce((sum, c) => sum + (workingStates[c.id]?.newRoyalty ?? c.royaltyPercentage), 0) / selectedCollections.length).toFixed(2)
    : '0.00';

  const baseMulticallGas = 0.0004;
  const perCollectionGas = 0.00012;
  const singleTxGas = 0.00035;
  const totalMulticallGas = +(baseMulticallGas + perCollectionGas * Math.max(1, selectedCollections.length)).toFixed(5);
  const totalSeparateGas = +(singleTxGas * Math.max(1, selectedCollections.length)).toFixed(5);
  const gasSavingsPercent = selectedCollections.length > 1 
    ? Math.round(((totalSeparateGas - totalMulticallGas) / totalSeparateGas) * 100)
    : 0;

  // Execute Batch Update
  const handleExecuteBatch = async () => {
    if (selectedCollections.length === 0) return;

    setIsExecuting(true);
    setExecutionStep(1);

    try {
      // Step 1: Simulating Calldata Generation
      await new Promise(r => setTimeout(r, 600));
      setExecutionStep(2);

      // Step 2: Signature Prompt
      await new Promise(r => setTimeout(r, 700));
      setExecutionStep(3);

      // Prepare updates payload
      const updates: BatchRoyaltyUpdateItem[] = selectedCollections.map(c => ({
        collectionId: c.id,
        royaltyPercentage: workingStates[c.id]?.newRoyalty ?? c.royaltyPercentage,
        royaltyPayoutAddress: workingStates[c.id]?.newPayoutAddress || c.royaltyPayoutAddress,
      }));

      // Step 3: Broadcast transaction via Web3Context
      const res = await batchUpdateRoyalties(updates);

      // Step 4: Finalize
      await new Promise(r => setTimeout(r, 600));
      setExecutionStep(4);
      setExecutionTxHash(res.txHash || null);
      setExecutionResult({
        updatedCount: res.updatedCount,
        gasCrypto: res.totalGasUsedCrypto || totalMulticallGas,
        gasUsd: res.totalGasUsedUsd || +(totalMulticallGas * currentChainConfig.usdPrice),
      });

      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#06b6d4', '#a855f7', '#10b981', '#f59e0b'],
      });

      if (onSuccessNotification) {
        onSuccessNotification(`Successfully updated royalties across ${res.updatedCount} collections via multicall!`);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="batch-royalty-manager-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div 
        className="bg-zinc-900 border border-zinc-750 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              <Percent className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Batch Royalty Manager
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  ERC-2981 Compliant
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-semibold">
                  Multicall Batching
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Update secondary marketplace royalty rates and payout addresses across multiple collections in a single transaction.
              </p>
            </div>
          </div>

          <button
            id="batch-royalty-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container with Scroll */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6">

          {/* Success Completed Screen */}
          {executionStep === 4 && executionResult && (
            <div className="p-6 rounded-2xl bg-zinc-950/80 border border-emerald-500/40 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">Batch Royalty Update Complete!</h3>
                <p className="text-xs text-zinc-400 max-w-lg mx-auto">
                  On-chain royalty registries, EIP-2981 contract handlers, and secondary marketplace indexers have been updated for all selected collections.
                </p>
              </div>

              {/* Transaction Metrics Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Collections Updated</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">{executionResult.updatedCount} Collections</div>
                  <div className="text-[10px] text-emerald-400">All Changes Active</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Gas Incurred</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">{executionResult.gasCrypto} {currentChainConfig.symbol}</div>
                  <div className="text-[10px] text-zinc-400">~{formatUsd(executionResult.gasUsd)}</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Multicall Gas Saved</div>
                  <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">~{gasSavingsPercent}% Saved</div>
                  <div className="text-[10px] text-zinc-400">vs separate calls</div>
                </div>
              </div>

              {executionTxHash && (
                <div className="text-xs text-zinc-400 pt-2 flex items-center justify-center gap-2">
                  <span className="font-mono">{executionTxHash.slice(0, 14)}...{executionTxHash.slice(-12)}</span>
                  <a
                    href={`${currentChainConfig.blockExplorer}/tx/${executionTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-semibold"
                  >
                    <span>View in Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  id="batch-royalty-done-btn"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Done & Return to Marketplace
                </button>
                <button
                  onClick={() => {
                    setExecutionStep(0);
                    setIsReviewMode(false);
                    setExecutionTxHash(null);
                    setExecutionResult(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Manage More Royalties
                </button>
              </div>
            </div>
          )}

          {/* Normal Editing & Review Flow */}
          {executionStep !== 4 && (
            <>
              {/* Batch Configuration Control Strip */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-purple-500/30 space-y-4 shadow-lg shadow-purple-950/20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Quick Royalty Presets & Slider */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <Percent className="w-3.5 h-3.5 text-purple-400" />
                        <span>Simultaneous Target Royalty %:</span>
                        <span className="font-mono text-cyan-400 font-black text-sm">{globalRoyaltyInput.toFixed(1)}%</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Applies to {selectedCollections.length} selected collections
                      </span>
                    </div>

                    {/* Presets Button Strip */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ROYALTY_PRESETS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          id={`batch-royalty-preset-${p.value}`}
                          onClick={() => setGlobalRoyaltyInput(p.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                            globalRoyaltyInput === p.value
                              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                          }`}
                          title={p.desc}
                        >
                          {p.label}
                        </button>
                      ))}

                      {/* Manual Slider & Input */}
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="0.5"
                          value={globalRoyaltyInput}
                          onChange={e => setGlobalRoyaltyInput(parseFloat(e.target.value))}
                          className="w-24 accent-purple-500 cursor-pointer"
                        />
                        <button
                          id="batch-royalty-apply-to-all-btn"
                          onClick={handleApplyGlobalRoyalty}
                          disabled={selectedCollections.length === 0}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-purple-950/40"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Apply to {selectedCollections.length} Selected</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Batch Payout Address Bar (Optional) */}
                <div className="pt-3 border-t border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-zinc-400 font-semibold whitespace-nowrap flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                      Batch Payout Address:
                    </span>
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        value={globalPayoutAddressInput}
                        onChange={e => setGlobalPayoutAddressInput(e.target.value)}
                        placeholder="0x... or ENS address"
                        className="w-full pl-3 pr-24 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => setGlobalPayoutAddressInput(activeAccount.address)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-cyan-300 rounded transition-colors"
                      >
                        My Wallet
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyGlobalPayout}
                      disabled={selectedCollections.length === 0 || !globalPayoutAddressInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all disabled:opacity-40"
                    >
                      Apply Payout to Selected
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-zinc-800 transition-all flex items-center gap-1"
                      title="Reset working state back to on-chain values"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Collections Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* Search Box */}
                <div className="relative flex-1 w-full group">
                  <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-purple-400 transition-colors absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="batch-royalty-search-input"
                    type="text"
                    placeholder="Filter collections by name, symbol, or contract address..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/60 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Creator Scope Pills */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setCreatorFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      creatorFilter === 'all'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All Collections ({collections.length})
                  </button>
                  <button
                    onClick={() => setCreatorFilter('my')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      creatorFilter === 'my'
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    My Created
                  </button>
                </div>

                {/* Chain Selector */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    value={selectedChainFilter}
                    onChange={e => setSelectedChainFilter(e.target.value)}
                    className="bg-transparent text-zinc-200 focus:outline-none text-xs font-semibold cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-900">All Networks</option>
                    {Object.values(SUPPORTED_CHAINS).map(chain => (
                      <option key={chain.id} value={chain.id} className="bg-zinc-900">
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-all"
                  >
                    Select All ({filteredCollections.length})
                  </button>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-all"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Collections List Table / Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">
                      Selected: <strong className="text-cyan-400 font-mono">{selectedCollections.length}</strong> of {collections.length}
                    </span>
                    {collectionsWithChanges.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                        {collectionsWithChanges.length} with pending updates
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Individual overrides adjust in real-time below
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {filteredCollections.map(col => {
                    const state = workingStates[col.id] || {
                      newRoyalty: col.royaltyPercentage,
                      newPayoutAddress: col.royaltyPayoutAddress,
                      isSelected: false,
                    };
                    const isSelected = state.isSelected;
                    const chain = SUPPORTED_CHAINS[col.chainId];
                    const diff = +(state.newRoyalty - col.royaltyPercentage).toFixed(2);
                    const hasChanged = Math.abs(diff) > 0.01;

                    return (
                      <div
                        key={col.id}
                        id={`collection-royalty-row-${col.id}`}
                        onClick={() => handleToggleCollection(col.id)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-zinc-950/80 border-purple-500/50 shadow-md shadow-purple-950/20'
                            : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* Left: Checkbox + Avatar + Details */}
                        <div className="flex items-center gap-3.5 min-w-[280px]">
                          <div 
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                              isSelected
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-zinc-900 border-zinc-700 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </div>

                          <img
                            src={col.avatarImage}
                            alt={col.name}
                            className="w-11 h-11 rounded-xl object-cover ring-1 ring-zinc-700 shrink-0"
                          />

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                {col.name}
                              </h4>
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                {col.symbol}
                              </span>
                              {col.verified && (
                                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" title="Verified Creator" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                              <span className="flex items-center gap-1">
                                <span>{chain.icon}</span>
                                <span>{chain.name}</span>
                              </span>
                              <span>•</span>
                              <span>{col.currentSupply} items</span>
                              <span>•</span>
                              <span>Floor: {col.floorPrice} {chain.symbol}</span>
                            </div>
                          </div>
                        </div>

                        {/* Middle / Right: Current vs New Royalty Controls */}
                        <div 
                          className="flex flex-wrap items-center gap-4 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Current Royalty */}
                          <div className="text-right">
                            <div className="text-[10px] uppercase font-bold text-zinc-500">Current</div>
                            <div className="text-xs font-mono font-bold text-zinc-300 mt-0.5">
                              {col.royaltyPercentage.toFixed(1)}%
                            </div>
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-zinc-600 hidden sm:block" />

                          {/* New Royalty Input + Stepper */}
                          <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
                            <button
                              type="button"
                              onClick={() => handleUpdateCollectionRoyalty(col.id, state.newRoyalty - 0.5)}
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition-colors"
                            >
                              -
                            </button>

                            <div className="flex items-center gap-1 px-1">
                              <input
                                type="number"
                                min="0"
                                max="25"
                                step="0.1"
                                value={state.newRoyalty}
                                onChange={e => handleUpdateCollectionRoyalty(col.id, parseFloat(e.target.value) || 0)}
                                className="w-12 bg-transparent text-center font-mono font-black text-xs text-white focus:outline-none"
                              />
                              <span className="text-xs font-bold text-zinc-400">%</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUpdateCollectionRoyalty(col.id, state.newRoyalty + 0.5)}
                              className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>

                          {/* Delta Badge */}
                          <div className="min-w-[80px] text-right">
                            {hasChanged ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                diff > 0 
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}>
                                {diff > 0 ? `+${diff}%` : `${diff}%`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                No change
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {filteredCollections.length === 0 && (
                    <div className="text-center py-10 rounded-2xl bg-zinc-950/50 border border-dashed border-zinc-800 space-y-2">
                      <Search className="w-6 h-6 text-zinc-500 mx-auto" />
                      <div className="text-xs font-bold text-zinc-300">No collections match criteria</div>
                      <p className="text-[11px] text-zinc-500">Try clearing your search query or switching network filters</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial & Gas Impact Summary Widget */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-zinc-500">Target Collections</div>
                  <div className="text-base font-black text-white font-mono">{selectedCollections.length} selected</div>
                  <div className="text-[10px] text-zinc-400">{collectionsWithChanges.length} modified rates</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-zinc-500">Average Royalty Rate</div>
                  <div className="text-base font-black text-purple-400 font-mono">
                    {avgCurrentRoyalty}% → <span className="text-cyan-300">{avgNewRoyalty}%</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Across active batch</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-zinc-500">Estimated Gas Fee</div>
                  <div className="text-base font-black text-emerald-400 font-mono">
                    {totalMulticallGas} {currentChainConfig.symbol}
                  </div>
                  <div className="text-[10px] text-zinc-400">~{formatUsd(totalMulticallGas * currentChainConfig.usdPrice)}</div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-zinc-500">Multicall Optimization</div>
                  <div className="text-base font-black text-cyan-400 font-mono">
                    ~{gasSavingsPercent}% Saved
                  </div>
                  <div className="text-[10px] text-cyan-300">1 single batch transaction</div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Bottom Action Footer */}
        {executionStep !== 4 && (
          <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Simultaneous update via <strong className="text-zinc-200">EIP-2981 MultiSetter</strong> on <strong className="text-cyan-400">{currentChainConfig.name}</strong>.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="batch-royalty-execute-btn"
                type="button"
                onClick={handleExecuteBatch}
                disabled={selectedCollections.length === 0 || isExecuting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {executionStep === 1 && 'Building ERC-2981 Calldata...'}
                      {executionStep === 2 && 'Signing Multi-Setter Call...'}
                      {executionStep === 3 && 'Broadcasting On-Chain...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Percent className="w-3.5 h-3.5 text-purple-200" />
                    <span>Update {selectedCollections.length} Collections ({totalMulticallGas} {currentChainConfig.symbol})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
