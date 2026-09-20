import React, { useState, useMemo, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { NFTCard } from './NFTCard';
import { NFT, BlockchainNetwork } from '../types';
import { 
  Search, 
  Filter, 
  Sparkles, 
  ArrowUpDown, 
  Percent, 
  Layers, 
  PlusCircle, 
  Grid3X3, 
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  X,
  Tag,
  User,
  Hash,
  Loader2,
  ChevronDown,
  ArrowUp,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  Copy,
  Check,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatUsd } from '../services/gasService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { BatchRoyaltyManagerModal } from './BatchRoyaltyManagerModal';
import { WIP_COLLECTION, WIP_LOGO_COLLECTION } from '../config/wipCollection';

interface MarketplaceProps {
  onSelectNFT: (nft: NFT) => void;
  onOpenMintStudio: () => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectNFT, onOpenMintStudio }) => {
  const { 
    nfts, 
    collections, 
    activeChain, 
    buyNFT,
    isAutoSyncing,
    autoSyncEnabled,
    toggleAutoSync,
    lastSyncTimestamp,
    syncWipCollections,
    wipTotalCount
  } = useWeb3();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('all');
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState<string>('all');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'royalty_desc'>('recent');
  const [onlyListed, setOnlyListed] = useState<boolean>(true);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [batchSizeConfig, setBatchSizeConfig] = useState<number>(12);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isBatchRoyaltyModalOpen, setIsBatchRoyaltyModalOpen] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleManualSync = async () => {
    const res = await syncWipCollections(false);
    if (res.success) {
      setSyncToast(`Auto-sync complete: ${res.totalWipCount} Work In Progress & Logo items are active and visible.`);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Auto-dismiss success notification
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Quick buy action
  const handleQuickBuy = (nft: NFT, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNFT(nft);
  };

  // Scroll listener for "Back to Top" button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyAddress = (e: React.MouseEvent, addr: string) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  // Filtered & Sorted NFTs
  const filteredNFTs = useMemo(() => {
    return nfts.filter((nft) => {
      // Search query - Real-time filtering by Name, Creator, Collection, Token ID, and Contract Address
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        // Remove leading '#' if user searched e.g. "#1001" or "#1"
        const cleanQuery = query.startsWith('#') ? query.slice(1) : query;

        const matchesName = nft.name.toLowerCase().includes(query);
        const matchesCol = (nft.collectionName || '').toLowerCase().includes(query);
        const matchesCreatorName = (nft.creatorName || '').toLowerCase().includes(query);
        const matchesCreatorAddress = (nft.creatorAddress || '').toLowerCase().includes(query);
        const matchesTokenId = (nft.tokenId || '').toLowerCase().includes(cleanQuery) || (nft.tokenId || '').toLowerCase().includes(query);
        const matchesContract = (nft.contractAddress || '').toLowerCase().includes(query);

        if (!matchesName && !matchesCol && !matchesCreatorName && !matchesCreatorAddress && !matchesTokenId && !matchesContract) {
          return false;
        }
      }

      // Chain filter
      if (selectedChainFilter !== 'all' && nft.chainId !== selectedChainFilter) {
        return false;
      }

      // Collection filter
      if (selectedCollectionFilter !== 'all') {
        const matchesId = nft.collectionId === selectedCollectionFilter;
        const matchesContract = nft.contractAddress && (
          nft.contractAddress.toLowerCase() === selectedCollectionFilter.toLowerCase() ||
          (selectedCollectionFilter === 'col-wip-polygon' && nft.contractAddress.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase()) ||
          (selectedCollectionFilter === 'col-wip-logo-polygon' && nft.contractAddress.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase())
        );
        if (!matchesId && !matchesContract) {
          return false;
        }
      }

      // Listed filter (WIP & Logo collection NFTs are ALWAYS visible in the marketplace)
      const isWipOrLogoNFT = 
        nft.collectionId === 'col-wip-polygon' ||
        nft.collectionId === 'col-wip-logo-polygon' ||
        nft.contractAddress?.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase() ||
        nft.contractAddress?.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase() ||
        (nft.collectionName && nft.collectionName.toLowerCase().includes('work in progress')) ||
        (nft.collectionName && nft.collectionName.toLowerCase().includes('wip logo'));

      if (onlyListed && !nft.isListed && !isWipOrLogoNFT) {
        return false;
      }

      // Price filter
      if (minPrice && nft.price !== undefined && nft.price < parseFloat(minPrice)) {
        return false;
      }
      if (maxPrice && nft.price !== undefined && nft.price > parseFloat(maxPrice)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'royalty_desc') {
        return (b.royaltyPercentage || 0) - (a.royaltyPercentage || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [nfts, searchQuery, selectedChainFilter, selectedCollectionFilter, onlyListed, minPrice, maxPrice, sortBy]);

  // Infinite Scroll & Intersection Observer Hook
  const {
    visibleItems,
    displayedCount,
    totalCount,
    hasMore,
    isLoadingMore,
    sentinelRef,
    loadMore,
    loadAll,
    progressPercentage,
  } = useInfiniteScroll<NFT>(filteredNFTs, {
    initialBatchSize: batchSizeConfig,
    batchSize: batchSizeConfig,
    rootMargin: '300px',
    threshold: 0.1,
    delayMs: 250,
  });

  // Aggregate stats
  const totalListed = nfts.filter(n => n.isListed).length;
  const avgRoyalty = (nfts.reduce((acc, n) => acc + (n.royaltyPercentage || 0), 0) / (nfts.length || 1)).toFixed(1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative" id="marketplace-view">

      {/* Success Notification Banner */}
      {successBanner && (
        <div 
          id="marketplace-royalty-success-banner"
          className="p-4 rounded-2xl bg-zinc-950/90 border border-emerald-500/40 text-emerald-200 text-xs shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-100">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 rounded-lg hover:bg-emerald-950 text-emerald-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Hero Showcase Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-gradient-to-bl from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Decentralized Cross-Chain Protocol
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-zinc-100 tracking-tight leading-tight">
              Mint & Trade Cross-Chain NFTs with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">Guaranteed Royalties</span>
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Create single 1/1 masterworks or full smart contract collections across Ethereum, Polygon, Solana, Arbitrum, Base, and Avalanche. Automated secondary market royalties sent straight to creator wallets on every sale.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenMintStudio}
                id="hero-start-minting-btn"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Launch Mint Studio
              </button>

              <button
                onClick={() => setIsBatchRoyaltyModalOpen(true)}
                id="hero-batch-royalty-manager-btn"
                className="px-5 py-2.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-bold shadow-lg shadow-purple-950/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Percent className="w-4 h-4 text-purple-400" />
                Batch Royalty Manager
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Listed Assets</div>
              <div className="text-xl font-black text-zinc-100 font-mono mt-1">{totalListed} NFTs</div>
              <div className="text-[10px] text-cyan-400 mt-0.5">Live Secondary Market</div>
            </div>

            <div 
              onClick={() => setIsBatchRoyaltyModalOpen(true)}
              id="marketplace-metric-royalty-card"
              className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-purple-500/50 backdrop-blur-md transition-all cursor-pointer group shadow-inner"
              title="Click to manage collection royalties"
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Avg Creator Royalty</div>
                <Percent className="w-3 h-3 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-xl font-black text-purple-400 font-mono mt-1">{avgRoyalty}%</div>
              <div className="text-[10px] text-purple-300 mt-0.5 flex items-center gap-1">
                <span>Manage Batch</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chains Supported</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">7 Networks</div>
              <div className="text-[10px] text-emerald-300 mt-0.5">EVM + Solana</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Official Collections on Polygon Showcase */}
      <div className="space-y-3" id="marketplace-official-collections-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wider">
              <span>Verified Polygon Smart Contract Collections</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">
            Enforced 10% secondary royalties • 0% marketplace protocol fee
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Work In Progress - WIP Collection Card */}
          <div 
            onClick={() => {
              setSelectedCollectionFilter(selectedCollectionFilter === 'col-wip-polygon' ? 'all' : 'col-wip-polygon');
              if (selectedChainFilter !== 'all' && selectedChainFilter !== 'polygon') {
                setSelectedChainFilter('all');
              }
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedCollectionFilter === 'col-wip-polygon'
                ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/40'
                : 'bg-zinc-900/80 border-zinc-800 hover:border-cyan-500/40 hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Polygon (137)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                    10% Royalty
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Symbol: WIP</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                  Work In Progress - WIP Collection
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 inline shrink-0" />
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  Original generative iterations and genesis blueprints on Polygon smart contract with automated secondary royalties.
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Floor Price</div>
                <div className="text-lg font-black text-white font-mono">25.0 MATIC</div>
                <div className="text-[10px] text-cyan-400 font-mono">
                  {nfts.filter(n => n.collectionId === 'col-wip-polygon' || n.contractAddress?.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase()).length} in Marketplace
                </div>
              </div>
            </div>

            {/* Contract Address Bar & Quick Actions */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                <span className="text-zinc-500">Contract:</span>
                <span className="text-zinc-200 select-all font-semibold">
                  {WIP_COLLECTION.contractAddress.slice(0, 10)}...{WIP_COLLECTION.contractAddress.slice(-8)}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyAddress(e, WIP_COLLECTION.contractAddress)}
                  title="Copy full contract address"
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedAddress === WIP_COLLECTION.contractAddress ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={`https://polygonscan.com/address/${WIP_COLLECTION.contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors"
                  title="View on PolygonScan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMintStudio();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  Mint to WIP
                </button>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCollectionFilter === 'col-wip-polygon'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}>
                  {selectedCollectionFilter === 'col-wip-polygon' ? 'Filtered Active' : 'Filter Collection'}
                </span>
              </div>
            </div>
          </div>

          {/* WIP Logo Collection Card */}
          <div 
            onClick={() => {
              setSelectedCollectionFilter(selectedCollectionFilter === 'col-wip-logo-polygon' ? 'all' : 'col-wip-logo-polygon');
              if (selectedChainFilter !== 'all' && selectedChainFilter !== 'polygon') {
                setSelectedChainFilter('all');
              }
            }}
            className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
              selectedCollectionFilter === 'col-wip-logo-polygon'
                ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/40 shadow-lg shadow-purple-950/40'
                : 'bg-zinc-900/80 border-zinc-800 hover:border-purple-500/40 hover:bg-zinc-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Polygon (137)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                    10% Royalty
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Symbol: WIPLOGO</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                  WIP Logo Collection
                  <CheckCircle2 className="w-4 h-4 text-purple-400 inline shrink-0" />
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  Official insignia, genesis monograms, and emblem prints from the WIP Logo Polygon smart contract.
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Floor Price</div>
                <div className="text-lg font-black text-white font-mono">50.0 MATIC</div>
                <div className="text-[10px] text-purple-400 font-mono">
                  {nfts.filter(n => n.collectionId === 'col-wip-logo-polygon' || n.contractAddress?.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase()).length} in Marketplace
                </div>
              </div>
            </div>

            {/* Contract Address Bar & Quick Actions */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                <span className="text-zinc-500">Contract:</span>
                <span className="text-zinc-200 select-all font-semibold">
                  {WIP_LOGO_COLLECTION.contractAddress.slice(0, 10)}...{WIP_LOGO_COLLECTION.contractAddress.slice(-8)}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyAddress(e, WIP_LOGO_COLLECTION.contractAddress)}
                  title="Copy full contract address"
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  {copiedAddress === WIP_LOGO_COLLECTION.contractAddress ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={`https://polygonscan.com/address/${WIP_LOGO_COLLECTION.contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition-colors"
                  title="View on PolygonScan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMintStudio();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  Mint to Logo
                </button>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCollectionFilter === 'col-wip-logo-polygon'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}>
                  {selectedCollectionFilter === 'col-wip-logo-polygon' ? 'Filtered Active' : 'Filter Collection'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Sync Live Status Bar for WIP & Logo Collections */}
      <div 
        id="wip-auto-sync-status-bar"
        className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-zinc-900/80 to-purple-950/40 border border-cyan-500/20 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${autoSyncEnabled ? 'bg-emerald-400' : 'bg-zinc-500'} ${isAutoSyncing ? 'animate-ping' : ''}`} />
            {autoSyncEnabled && <span className="absolute w-2 h-2 rounded-full bg-emerald-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                WIP Auto-Sync Engine
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {autoSyncEnabled ? 'LIVE AUTO-SYNC' : 'PAUSED'}
              </span>
              {lastSyncTimestamp && (
                <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                  Updated {new Date(lastSyncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              New mints to <span className="text-cyan-300 font-semibold">Work In Progress - WIP</span> and <span className="text-purple-300 font-semibold">WIP Logo</span> are automatically added and always visible in the marketplace.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Quick Collection Count Badges */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedCollectionFilter(selectedCollectionFilter === 'col-wip-polygon' ? 'all' : 'col-wip-polygon')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                selectedCollectionFilter === 'col-wip-polygon'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-cyan-500/40'
              }`}
              title="Filter to Work In Progress - WIP"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>WIP:</span>
              <span className="font-mono text-cyan-300 font-bold">{nfts.filter(n => n.collectionId === 'col-wip-polygon' || n.contractAddress?.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase()).length}</span>
            </button>

            <button
              onClick={() => setSelectedCollectionFilter(selectedCollectionFilter === 'col-wip-logo-polygon' ? 'all' : 'col-wip-logo-polygon')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                selectedCollectionFilter === 'col-wip-logo-polygon'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-purple-500/40'
              }`}
              title="Filter to WIP Logo Collection"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Logo:</span>
              <span className="font-mono text-purple-300 font-bold">{nfts.filter(n => n.collectionId === 'col-wip-logo-polygon' || n.contractAddress?.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase()).length}</span>
            </button>
          </div>

          {/* Sync Now Button */}
          <button
            id="wip-manual-sync-btn"
            onClick={handleManualSync}
            disabled={isAutoSyncing}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            title="Scan blockchain & database for new mints now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin text-cyan-200' : ''}`} />
            <span>{isAutoSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* Auto-Sync Toggle */}
          <button
            id="wip-toggle-autosync-btn"
            onClick={toggleAutoSync}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              autoSyncEnabled
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle automatic background sync"
          >
            {autoSyncEnabled ? 'Auto-Sync: ON' : 'Auto-Sync: OFF'}
          </button>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button onClick={() => setSyncToast(null)} className="text-emerald-400 hover:text-emerald-200 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4" id="marketplace-filter-section">
        
        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Real-time Search Box */}
          <div className="relative flex-1 w-full group">
            <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="marketplace-search-input"
              type="text"
              placeholder="Search by NFT name, creator, token ID (e.g. #101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }}
              className="w-full pl-10 pr-24 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
            />
            
            {/* Quick Clear Button & Match Counter */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    {filteredNFTs.length} {filteredNFTs.length === 1 ? 'match' : 'matches'}
                  </span>
                  <button
                    id="marketplace-clear-search-btn"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                    className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sort & Pagination Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs w-full sm:w-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                id="marketplace-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-zinc-200 focus:outline-none text-xs font-semibold cursor-pointer"
              >
                <option value="recent" className="bg-zinc-900">Recently Added</option>
                <option value="price_asc" className="bg-zinc-900">Price: Low to High</option>
                <option value="price_desc" className="bg-zinc-900">Price: High to Low</option>
                <option value="royalty_desc" className="bg-zinc-900">Highest Royalty %</option>
              </select>
            </div>

            {/* Batch Size Selector */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
              <Grid3X3 className="w-3.5 h-3.5 text-zinc-400" />
              <select
                id="marketplace-batch-size-select"
                value={batchSizeConfig}
                onChange={(e) => setBatchSizeConfig(Number(e.target.value))}
                title="Batch size per scroll"
                className="bg-transparent text-zinc-300 focus:outline-none text-xs font-mono font-semibold cursor-pointer"
              >
                <option value={8} className="bg-zinc-900">8 / batch</option>
                <option value={12} className="bg-zinc-900">12 / batch</option>
                <option value={24} className="bg-zinc-900">24 / batch</option>
                <option value={48} className="bg-zinc-900">48 / batch</option>
              </select>
            </div>

            {/* Toggle Listed Only */}
            <button
              id="marketplace-toggle-listed-btn"
              onClick={() => setOnlyListed(!onlyListed)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                onlyListed
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              Listed Only
            </button>

            {/* Quick Batch Royalty Manager Toolbar Button */}
            <button
              id="marketplace-toolbar-royalty-btn"
              onClick={() => setIsBatchRoyaltyModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold border bg-purple-950/40 border-purple-500/30 text-purple-300 hover:bg-purple-900/50 hover:border-purple-500/50 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              title="Batch update royalties across collections"
            >
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              <span>Batch Royalties</span>
            </button>
          </div>
        </div>

        {/* Chain Filters Pill Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            id="marketplace-filter-chain-all"
            onClick={() => setSelectedChainFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedChainFilter === 'all'
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Chains ({nfts.length})
          </button>

          {Object.values(SUPPORTED_CHAINS).map((chain) => {
            const count = nfts.filter(n => n.chainId === chain.id).length;
            const isSelected = selectedChainFilter === chain.id;
            return (
              <button
                key={chain.id}
                id={`marketplace-filter-chain-${chain.id}`}
                onClick={() => setSelectedChainFilter(chain.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/50 shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <span>{chain.icon}</span>
                <span>{chain.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Collection Filters Pill Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-zinc-800/60">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Collection:
          </span>

          <button
            id="marketplace-filter-col-all"
            onClick={() => setSelectedCollectionFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCollectionFilter === 'all'
                ? 'bg-zinc-200 text-zinc-950 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            All Collections
          </button>

          {/* Official WIP Collection Pill */}
          <button
            id="marketplace-filter-col-wip"
            onClick={() => {
              setSelectedCollectionFilter(selectedCollectionFilter === 'col-wip-polygon' ? 'all' : 'col-wip-polygon');
              if (selectedChainFilter !== 'all' && selectedChainFilter !== 'polygon') {
                setSelectedChainFilter('all');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCollectionFilter === 'col-wip-polygon'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/60 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-cyan-500/40 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Work In Progress - WIP</span>
            <span className="text-[10px] font-mono text-cyan-400">
              ({nfts.filter(n => n.collectionId === 'col-wip-polygon' || n.contractAddress?.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase()).length})
            </span>
          </button>

          {/* Official WIP Logo Collection Pill */}
          <button
            id="marketplace-filter-col-wip-logo"
            onClick={() => {
              setSelectedCollectionFilter(selectedCollectionFilter === 'col-wip-logo-polygon' ? 'all' : 'col-wip-logo-polygon');
              if (selectedChainFilter !== 'all' && selectedChainFilter !== 'polygon') {
                setSelectedChainFilter('all');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCollectionFilter === 'col-wip-logo-polygon'
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/60 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-purple-500/40 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>WIP Logo Collection</span>
            <span className="text-[10px] font-mono text-purple-400">
              ({nfts.filter(n => n.collectionId === 'col-wip-logo-polygon' || n.contractAddress?.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase()).length})
            </span>
          </button>

          {/* Other Collections */}
          {collections
            .filter(c => c.id !== 'col-wip-polygon' && c.id !== 'col-wip-logo-polygon' && c.contractAddress !== WIP_COLLECTION.contractAddress && c.contractAddress !== WIP_LOGO_COLLECTION.contractAddress)
            .map(col => {
              const count = nfts.filter(n => n.collectionId === col.id || n.contractAddress?.toLowerCase() === col.contractAddress.toLowerCase()).length;
              if (count === 0) return null;
              const isSelected = selectedCollectionFilter === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollectionFilter(isSelected ? 'all' : col.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-zinc-800 text-cyan-300 border border-cyan-500/50 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span>{col.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">({count})</span>
                </button>
              );
            })}
        </div>

        {/* Active Collection Filter Banner */}
        {selectedCollectionFilter !== 'all' && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-cyan-500/40 rounded-xl text-xs shadow-md animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">
                  {selectedCollectionFilter === 'col-wip-polygon'
                    ? 'Work In Progress - WIP Collection'
                    : selectedCollectionFilter === 'col-wip-logo-polygon'
                    ? 'WIP Logo Collection'
                    : collections.find(c => c.id === selectedCollectionFilter)?.name || 'Filtered Collection'}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                <span className="text-zinc-500">Contract:</span>
                <span className="text-zinc-200 font-semibold">
                  {selectedCollectionFilter === 'col-wip-polygon'
                    ? WIP_COLLECTION.contractAddress
                    : selectedCollectionFilter === 'col-wip-logo-polygon'
                    ? WIP_LOGO_COLLECTION.contractAddress
                    : collections.find(c => c.id === selectedCollectionFilter)?.contractAddress || ''}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyAddress(
                    e,
                    selectedCollectionFilter === 'col-wip-polygon'
                      ? WIP_COLLECTION.contractAddress
                      : selectedCollectionFilter === 'col-wip-logo-polygon'
                      ? WIP_LOGO_COLLECTION.contractAddress
                      : collections.find(c => c.id === selectedCollectionFilter)?.contractAddress || ''
                  )}
                  title="Copy Contract Address"
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              <span className="text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-[11px]">
                10.0% Royalty Protected
              </span>

              <span className="text-cyan-400 font-mono text-[11px]">
                {filteredNFTs.length} {filteredNFTs.length === 1 ? 'collectible' : 'collectibles'} shown
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenMintStudio}
                className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Mint New Item
              </button>

              <button
                type="button"
                onClick={() => setSelectedCollectionFilter('all')}
                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all border border-zinc-700 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Active Search Filter Banner */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Filtering by: <strong className="text-zinc-100 font-mono">"{searchQuery.trim()}"</strong> across NFT names, creators, and token IDs ({filteredNFTs.length} results)
              </span>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-cyan-400 hover:text-cyan-200 underline font-semibold flex items-center gap-1"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Dynamic Rendering Status & Progress Header */}
        {filteredNFTs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2 text-zinc-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Displaying <strong className="text-zinc-200 font-mono">{displayedCount}</strong> of <strong className="text-zinc-200 font-mono">{totalCount}</strong> collectibles
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                {progressPercentage}%
              </span>
            </div>

            {hasMore && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-cyan-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  Infinite scroll enabled via IntersectionObserver
                </span>
                <button
                  id="marketplace-load-all-btn"
                  onClick={loadAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 transition-colors"
                >
                  Load All
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Grid of NFTs */}
      {filteredNFTs.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" id="marketplace-nft-grid">
            {visibleItems.map((nft) => (
              <NFTCard 
                key={nft.id} 
                nft={nft} 
                onSelect={onSelectNFT} 
                onQuickBuy={handleQuickBuy} 
              />
            ))}

            {/* Skeleton Card Loaders while fetching next batch */}
            {isLoadingMore && (
              Array.from({ length: Math.min(4, totalCount - displayedCount) }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 space-y-4 animate-pulse"
                >
                  <div className="aspect-square w-full rounded-xl bg-zinc-800/60" />
                  <div className="space-y-2">
                    <div className="h-3 w-1/3 bg-zinc-800/80 rounded" />
                    <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                  </div>
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <div className="h-4 w-16 bg-zinc-800 rounded" />
                    <div className="h-7 w-16 bg-zinc-800 rounded-xl" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Intersection Observer Sentinel & Fallback Controls */}
          {hasMore ? (
            <div 
              ref={sentinelRef}
              id="marketplace-infinite-scroll-sentinel"
              className="py-8 flex flex-col items-center justify-center space-y-3"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Loading next {Math.min(batchSizeConfig, totalCount - displayedCount)} NFTs as you scroll...</span>
              </div>

              <button
                id="marketplace-manual-load-more-btn"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:border-cyan-500/40"
              >
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Manual Load More ({totalCount - displayedCount} remaining)</span>
              </button>
            </div>
          ) : totalCount > 0 ? (
            <div className="py-6 text-center border-t border-zinc-800/60" id="marketplace-all-loaded-indicator">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>All <strong className="text-zinc-200 font-mono">{totalCount}</strong> collectibles loaded</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl bg-zinc-900/30 border border-dashed border-zinc-800 space-y-4" id="marketplace-empty-results">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-200">
              {searchQuery ? `No NFTs matching "${searchQuery}" found` : 'No NFTs Match Your Filter'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery 
                ? 'Try searching by a different name, creator name or address, or token ID number.' 
                : 'Try adjusting your search criteria, removing chain filters, or minting a brand new NFT in the studio!'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {searchQuery && (
              <button
                id="empty-state-clear-search-btn"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition-colors inline-flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Clear Search
              </button>
            )}
            <button
              onClick={onOpenMintStudio}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-md transition-colors inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Mint New NFT
            </button>
          </div>
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          id="marketplace-back-to-top-btn"
          onClick={scrollToTop}
          title="Back to top"
          className="fixed bottom-6 right-6 z-40 p-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-cyan-400 shadow-xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Batch Royalty Manager Modal */}
      <BatchRoyaltyManagerModal
        isOpen={isBatchRoyaltyModalOpen}
        onClose={() => setIsBatchRoyaltyModalOpen(false)}
        onSuccessNotification={(msg) => setSuccessBanner(msg)}
      />

    </div>
  );
};

