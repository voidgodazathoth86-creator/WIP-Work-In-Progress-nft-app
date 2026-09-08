import React, { useState, useMemo, useEffect } from 'react';
import { NFT } from '../types';
import { useWeb3 } from '../context/Web3Context';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatCrypto, formatUsd } from '../services/gasService';
import { calculateNFTRarity } from '../services/rarityService';
import { RarityExplorer } from './RarityExplorer';
import { 
  X, 
  Sparkles, 
  Percent, 
  ExternalLink, 
  ShoppingBag, 
  Tag, 
  Send, 
  Flame, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Coins, 
  Info,
  Layers,
  ArrowRight,
  AlertCircle,
  ArrowLeftRight,
  BrainCircuit,
  TrendingUp,
  Gauge,
  Gem,
  BarChart3,
  Award,
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NFTDetailModalProps {
  nft: NFT | null;
  onClose: () => void;
  onOpenBridge?: (nft: NFT) => void;
}

export const NFTDetailModal: React.FC<NFTDetailModalProps> = ({ nft, onClose, onOpenBridge }) => {
  const { 
    activeAccount, 
    buyNFT, 
    listNFTForSale, 
    delistNFT, 
    transferNFT, 
    burnNFT, 
    makeOffer, 
    acceptOffer,
    gasData, 
    selectedGasSpeed,
    nfts,
    collections,
    offers,
    transactions,
    wipConfig,
    isWipCollection
  } = useWeb3();

  // Internal active NFT state allowing peer preview within collection
  const [currentNFT, setCurrentNFT] = useState<NFT | null>(nft);

  useEffect(() => {
    if (nft) {
      setCurrentNFT(nft);
    }
  }, [nft]);

  const activeNFT = currentNFT || nft;

  const [activeTab, setActiveTab] = useState<'overview' | 'rarity' | 'royalties' | 'offers'>('overview');

  // AI-Driven Rarity Analysis
  const rarity = useMemo(() => {
    if (!activeNFT) return null;
    return calculateNFTRarity(activeNFT, nfts);
  }, [activeNFT, nfts]);

  const collection = useMemo(() => {
    if (!activeNFT) return undefined;
    return collections?.find(c => c.id === activeNFT.collectionId);
  }, [activeNFT, collections]);
  
  // Listing state
  const [listPriceInput, setListPriceInput] = useState<string>('');
  const [isListingOpen, setIsListingOpen] = useState(false);

  // Transfer state
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Offer state
  const [offerInput, setOfferInput] = useState<string>('');
  const [isOfferOpen, setIsOfferOpen] = useState(false);

  // Action loading/feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUnlockable, setShowUnlockable] = useState(false);

  // Secondary royalty simulator input
  const [simulatedResalePrice, setSimulatedResalePrice] = useState<number>(activeNFT?.price || 1.0);

  if (!activeNFT) return null;

  const chainConfig = SUPPORTED_CHAINS[activeNFT.chainId] || SUPPORTED_CHAINS.ethereum;
  const isOwner = activeNFT.ownerAddress.toLowerCase() === activeAccount.address.toLowerCase();
  const isCreator = activeNFT.creatorAddress.toLowerCase() === activeAccount.address.toLowerCase();

  // Royalty Calculations
  const price = activeNFT.price || 0;
  const royaltyPercent = activeNFT.royaltyPercentage || 0;
  const royaltyAmount = +(price * (royaltyPercent / 100)).toFixed(6);
  const marketplaceFee = +(price * 0.015).toFixed(6); // 1.5%
  const sellerPayout = +(price - royaltyAmount - marketplaceFee).toFixed(6);

  // Filter offers and transactions for this token
  const tokenOffers = offers.filter(o => o.nftId === activeNFT.id);
  const tokenTransactions = transactions.filter(t => t.nftId === activeNFT.id || (t.nftName && t.nftName.includes(activeNFT.name)));

  // Handle Buy
  const handleBuy = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await buyNFT(activeNFT.id);
      if (res.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Purchased successfully! ${res.royaltyPaid ? `${res.royaltyPaid} ${chainConfig.symbol} creator royalty distributed.` : ''}` 
        });
        confetti({ particleCount: 70, spread: 60 });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to purchase NFT' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle List
  const handleList = async () => {
    const val = parseFloat(listPriceInput);
    if (!val || val <= 0) return;
    setIsProcessing(true);
    try {
      await listNFTForSale(activeNFT.id, val);
      setIsListingOpen(false);
      setStatusMessage({ type: 'success', text: `Listed for sale at ${val} ${chainConfig.symbol}!` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delist
  const handleDelist = async () => {
    setIsProcessing(true);
    try {
      await delistNFT(activeNFT.id);
      setStatusMessage({ type: 'success', text: 'Delisted from marketplace.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Transfer
  const handleTransfer = async () => {
    if (!recipientInput.trim()) return;
    setIsProcessing(true);
    try {
      await transferNFT(activeNFT.id, recipientInput.trim());
      setIsTransferOpen(false);
      setStatusMessage({ type: 'success', text: `Transferred to ${recipientInput.slice(0, 8)}...` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Burn
  const handleBurn = async () => {
    if (!window.confirm('Are you sure you want to permanently burn (destroy) this NFT? This cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await burnNFT(activeNFT.id);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Make Offer
  const handleMakeOffer = async () => {
    const val = parseFloat(offerInput);
    if (!val || val <= 0) return;
    setIsProcessing(true);
    try {
      await makeOffer(activeNFT.id, val);
      setIsOfferOpen(false);
      setStatusMessage({ type: 'success', text: `Offer of ${val} ${chainConfig.symbol} submitted to escrow!` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Accept Offer
  const handleAcceptOffer = async (offerId: string) => {
    setIsProcessing(true);
    try {
      const ok = await acceptOffer(offerId);
      if (ok) {
        setStatusMessage({ type: 'success', text: 'Offer accepted! Ownership transferred and escrow released.' });
        confetti({ particleCount: 70, spread: 60 });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        id="nft-detail-modal-view"
      >
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <span className="text-base">{chainConfig.icon}</span>
            <span className="text-xs font-bold text-zinc-300 font-mono">{chainConfig.name} ({chainConfig.standard})</span>
            <span className="text-xs text-zinc-500 font-mono">• {activeNFT.tokenId}</span>
          </div>
          <button
            onClick={onClose}
            id="close-nft-detail-btn"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Media Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-xl group">
              <img
                src={activeNFT.image}
                alt={activeNFT.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center gap-1">
                <span>{chainConfig.icon}</span>
                <span>{chainConfig.shortName}</span>
              </div>
              
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                {activeNFT.royaltyPercentage > 0 && (
                  <div className="px-2.5 py-1 rounded-lg bg-purple-950/85 backdrop-blur-md border border-purple-500/30 text-[11px] font-bold text-purple-300">
                    {activeNFT.royaltyPercentage}% Royalty
                  </div>
                )}
              </div>

              {/* AI Rarity Tier Overlay Pill - Clickable to open Rarity Explorer */}
              {rarity && (
                <button
                  type="button"
                  id="nft-detail-rarity-pill-btn"
                  onClick={() => setActiveTab('rarity')}
                  title="Click to open Rarity Explorer & analyze traits"
                  className={`absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center justify-between shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all ${rarity.tierColor.bg} ${rarity.tierColor.border} ${rarity.tierColor.text}`}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{rarity.tier} Tier</span>
                    <span className="text-[10px] opacity-75 font-mono">• Top {rarity.rankPercentile}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-black">{rarity.normalizedScore}/100</span>
                    <ArrowRight className="w-3 h-3 opacity-70" />
                  </div>
                </button>
              )}
            </div>

            {/* Smart Contract Info Box */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Contract Address:</span>
                <span className="font-mono text-zinc-300 truncate max-w-[150px]">{activeNFT.contractAddress}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Token ID:</span>
                <span className="font-mono text-zinc-300">{activeNFT.tokenId}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Metadata Storage:</span>
                <span className="font-mono text-cyan-400 truncate max-w-[150px]">{activeNFT.ipfsMetadataUri}</span>
              </div>
              {collection && (
                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/80">
                  <span>Collection Size:</span>
                  <span className="font-mono text-zinc-300">{collection.itemCount} items</span>
                </div>
              )}

              {/* WIP Collection OpenSea & Enforced Royalty Indicator */}
              {isWipCollection(activeNFT.contractAddress) && (
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <a
                    href={wipConfig.openseaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all group"
                  >
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      <span>View on OpenSea</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200">Polygon</span>
                  </a>
                  <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-500/20 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-purple-300 font-medium">
                      <span>Enforced Royalty:</span>
                      <span className="font-mono font-bold">10.0% (1,000 BPS)</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>Marketplace Protocol Fee:</span>
                      <span className="font-mono font-bold">0% (Waived)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details & Actions Column (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            <div>
              <div className="text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                <span>{activeNFT.collectionName || 'Single Masterpiece'}</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-2xl font-black text-zinc-100">{activeNFT.name}</h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{activeNFT.description}</p>
            </div>

            {/* Status Messages */}
            {statusMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Creator & Owner Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Creator</div>
                <div className="text-xs font-bold text-zinc-200 mt-0.5 truncate">
                  {isCreator ? 'You (Connected)' : (activeNFT.creatorName || activeNFT.creatorAddress.slice(0, 10) + '...')}
                </div>
                <div className="text-[10px] font-mono text-purple-400 mt-0.5">
                  {activeNFT.royaltyPercentage}% Royalty Receiver
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Current Owner</div>
                <div className="text-xs font-bold text-zinc-200 mt-0.5 truncate">
                  {isOwner ? 'You (Connected)' : (activeNFT.ownerName || activeNFT.ownerAddress.slice(0, 10) + '...')}
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {isOwner ? 'Full Ownership Rights' : 'Verified Holder'}
                </div>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-x-auto" id="nft-detail-modal-tabs">
              <button
                id="nft-tab-btn-overview"
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Overview & Trade</span>
              </button>

              <button
                id="nft-tab-btn-rarity"
                type="button"
                onClick={() => setActiveTab('rarity')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'rarity'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-purple-300 hover:text-purple-200 hover:bg-purple-950/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Rarity Explorer</span>
                {rarity && (
                  <span className="text-[10px] font-mono font-bold bg-purple-950/90 px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-300">
                    {rarity.normalizedScore}/100
                  </span>
                )}
              </button>

              <button
                id="nft-tab-btn-royalties"
                type="button"
                onClick={() => setActiveTab('royalties')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'royalties'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Percent className="w-3.5 h-3.5 text-purple-400" />
                <span>Royalties ({activeNFT.royaltyPercentage}%)</span>
              </button>

              <button
                id="nft-tab-btn-offers"
                type="button"
                onClick={() => setActiveTab('offers')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'offers'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Offers & Activity</span>
                {tokenOffers.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] font-mono font-bold flex items-center justify-center">
                    {tokenOffers.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: OVERVIEW & TRADE */}
            {activeTab === 'overview' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Pricing Box & Primary Action */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Current Price</div>
                      {activeNFT.isListed && activeNFT.price ? (
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-black text-zinc-100 font-mono">
                            {activeNFT.price} {chainConfig.symbol}
                          </span>
                          <span className="text-xs text-emerald-400 font-mono font-bold">
                            {formatUsd(activeNFT.price * chainConfig.usdPrice)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-zinc-400 mt-1">Not Currently Listed for Sale</div>
                      )}
                    </div>

                    <div className="text-right text-xs">
                      <div className="text-zinc-500 font-mono">Est. Gas</div>
                      <div className="text-emerald-400 font-mono font-semibold">
                        {formatCrypto(gasData.actionsEstimate.buyNft.crypto, chainConfig.symbol)}
                      </div>
                    </div>
                  </div>

                  {/* AUTOMATED ROYALTY BREAKDOWN ACCORDION */}
                  {activeNFT.isListed && activeNFT.price && (
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-purple-400" />
                          Automated Secondary Sale Payout Breakdown:
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span>Seller Net Proceeds (~91%):</span>
                          <span className="font-bold text-zinc-200">{sellerPayout} {chainConfig.symbol}</span>
                        </div>

                        <div className="flex items-center justify-between text-purple-400">
                          <span>Creator Royalty ({royaltyPercent}% to {isCreator ? 'You' : 'Creator'}):</span>
                          <span className="font-bold">{royaltyAmount} {chainConfig.symbol} ({formatUsd(royaltyAmount * chainConfig.usdPrice)})</span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Marketplace Protocol Fee (1.5%):</span>
                          <span>{marketplaceFee} {chainConfig.symbol}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {activeNFT.isListed && !isOwner && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleBuy}
                          disabled={isProcessing}
                          id="nft-buy-confirm-btn"
                          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          {isProcessing ? 'Confirming On-Chain...' : `Buy Now for ${activeNFT.price} ${chainConfig.symbol}`}
                        </button>
                        <button
                          onClick={() => setIsOfferOpen(!isOfferOpen)}
                          className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Make Offer
                        </button>
                      </div>
                    )}

                    {isOwner && (
                      <div className="flex flex-wrap gap-2">
                        {activeNFT.isListed ? (
                          <button
                            onClick={handleDelist}
                            disabled={isProcessing}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs border border-zinc-700 transition-colors cursor-pointer"
                          >
                            Cancel Listing (Delist)
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsListingOpen(!isListingOpen)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            List for Sale on Marketplace
                          </button>
                        )}

                        <button
                          onClick={() => setIsTransferOpen(!isTransferOpen)}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Transfer
                        </button>

                        {onOpenBridge && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenBridge(activeNFT);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs border border-cyan-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Teleport / Bridge
                          </button>
                        )}

                        <button
                          onClick={handleBurn}
                          className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Burn
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub-panels for Listing, Transferring, Offering */}
                  {isListingOpen && (
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                      <label className="text-xs font-bold text-zinc-300">Set Listing Price ({chainConfig.symbol})</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 1.5"
                          value={listPriceInput}
                          onChange={(e) => setListPriceInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-100 focus:outline-none"
                        />
                        <button
                          onClick={handleList}
                          className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Confirm Listing
                        </button>
                      </div>
                    </div>
                  )}

                  {isTransferOpen && (
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                      <label className="text-xs font-bold text-zinc-300">Recipient Wallet Address</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="0x... or Solana address"
                          value={recipientInput}
                          onChange={(e) => setRecipientInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-100 focus:outline-none"
                        />
                        <button
                          onClick={handleTransfer}
                          className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Send NFT
                        </button>
                      </div>
                    </div>
                  )}

                  {isOfferOpen && (
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                      <label className="text-xs font-bold text-zinc-300">Make an Escrow Offer ({chainConfig.symbol})</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 0.8"
                          value={offerInput}
                          onChange={(e) => setOfferInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-100 focus:outline-none"
                        />
                        <button
                          onClick={handleMakeOffer}
                          className="px-4 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Submit Bid
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Unlockable Content Section */}
                {activeNFT.hasUnlockableContent && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        {isOwner ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        Unlockable Exclusive Content
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => setShowUnlockable(!showUnlockable)}
                          className="text-[11px] underline hover:text-amber-200 cursor-pointer"
                        >
                          {showUnlockable ? 'Hide' : 'Reveal'}
                        </button>
                      )}
                    </div>
                    {isOwner ? (
                      showUnlockable ? (
                        <div className="p-2.5 bg-zinc-950 rounded-lg border border-amber-500/40 text-xs font-mono text-amber-200 break-all select-all">
                          {activeNFT.unlockableContent}
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-400">Content hidden. Click reveal to view your exclusive access key.</p>
                      )
                    ) : (
                      <p className="text-[11px] text-zinc-400">Included with purchase. Revealed exclusively to the current verified token holder.</p>
                    )}
                  </div>
                )}

                {/* Quick Rarity Highlights Preview Card */}
                {rarity && (
                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                            <span>Trait Rarity & Scarcity</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                              {rarity.tier} Tier
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            Top {rarity.rankPercentile}% percentile • {rarity.traitsBreakdown.length} traits analyzed
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('rarity')}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>Open Explorer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Trait Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {rarity.traitsBreakdown.slice(0, 6).map((trait, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveTab('rarity')}
                          className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-left hover:border-purple-500/40 transition-colors cursor-pointer"
                        >
                          <div className="text-[10px] uppercase font-semibold text-zinc-400 truncate">
                            {trait.trait_type}
                          </div>
                          <div className="text-xs font-bold text-zinc-200 font-mono truncate mt-0.5">
                            {trait.value}
                          </div>
                          <div className="text-[10px] font-mono text-cyan-400 mt-1">
                            {trait.frequencyPercent}% rarity
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RARITY EXPLORER (Deep-Dive Trait Scarcity, What-If Simulator & Raw Metadata) */}
            {activeTab === 'rarity' && (
              <div className="animate-in fade-in duration-150">
                <RarityExplorer
                  nft={activeNFT}
                  allNFTs={nfts}
                  collection={collection}
                  onSelectPeerNFT={(peerNFT) => setCurrentNFT(peerNFT)}
                />
              </div>
            )}

            {/* TAB 3: ROYALTIES & SPLITS */}
            {activeTab === 'royalties' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100">EIP-2981 Secondary Sale Royalty Engine</h3>
                      <p className="text-[11px] text-zinc-400">Enforced by on-chain smart contract protocol standard.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold">
                    {activeNFT.royaltyPercentage}% Lifetime Royalty
                  </span>
                </div>

                {/* Receiver Info */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Royalty Beneficiary:</span>
                    <span className="font-bold text-zinc-200">
                      {isCreator ? 'You (Creator)' : activeNFT.creatorName || 'Original Artist'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Payout Address:</span>
                    <span className="font-mono text-purple-300 truncate max-w-[200px]">
                      {activeNFT.royaltyPayoutAddress || activeNFT.creatorAddress}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Standard Enforced:</span>
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      EIP-2981 / ERC-721
                    </span>
                  </div>
                </div>

                {/* Interactive Secondary Sale Simulator */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-purple-400" />
                      Hypothetical Resale Revenue Simulator:
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {simulatedResalePrice} {chainConfig.symbol}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.1"
                    max="20"
                    step="0.1"
                    value={simulatedResalePrice}
                    onChange={(e) => setSimulatedResalePrice(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />

                  {(() => {
                    const simRoyalty = +(simulatedResalePrice * (royaltyPercent / 100)).toFixed(6);
                    const simFee = +(simulatedResalePrice * 0.015).toFixed(6);
                    const simSeller = +(simulatedResalePrice - simRoyalty - simFee).toFixed(6);
                    return (
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-mono">
                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                          <div className="text-[10px] text-zinc-400">Seller Receives</div>
                          <div className="font-bold text-zinc-200 mt-0.5">{simSeller} {chainConfig.symbol}</div>
                          <div className="text-[9px] text-zinc-500">{formatUsd(simSeller * chainConfig.usdPrice)}</div>
                        </div>

                        <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/40">
                          <div className="text-[10px] text-purple-300">Creator Royalty</div>
                          <div className="font-bold text-purple-200 mt-0.5">{simRoyalty} {chainConfig.symbol}</div>
                          <div className="text-[9px] text-purple-400">{formatUsd(simRoyalty * chainConfig.usdPrice)}</div>
                        </div>

                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                          <div className="text-[10px] text-zinc-400">Protocol (1.5%)</div>
                          <div className="font-bold text-zinc-300 mt-0.5">{simFee} {chainConfig.symbol}</div>
                          <div className="text-[9px] text-zinc-500">{formatUsd(simFee * chainConfig.usdPrice)}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 4: OFFERS & ACTIVITY */}
            {activeTab === 'offers' && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-100">Escrow Offers & Activity Log</h3>
                      <p className="text-[11px] text-zinc-400">Direct on-chain bids protected in escrow.</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-zinc-400 font-bold">
                    {tokenOffers.length} Active Bids
                  </span>
                </div>

                {tokenOffers.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800/80 text-center space-y-2">
                    <Clock className="w-6 h-6 text-zinc-600 mx-auto" />
                    <div className="text-xs text-zinc-400 font-semibold">No active escrow offers yet</div>
                    <p className="text-[11px] text-zinc-500">
                      Be the first to submit a binding bid on this piece.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tokenOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-200">
                              {offer.bidderName || offer.bidderAddress.slice(0, 8) + '...'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                              {offer.status}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-zinc-400 mt-0.5">
                            <span className="text-zinc-100 font-bold">{offer.amountCrypto} {chainConfig.symbol}</span> ({formatUsd(offer.amountUsd)})
                          </div>
                        </div>

                        {isOwner && offer.status === 'active' && (
                          <button
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Accept Bid
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Token Activity / Ledger */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Transaction History</span>
                  </div>

                  {tokenTransactions.length === 0 ? (
                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-500 text-center">
                      Initial mint confirmed on {chainConfig.name}.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {tokenTransactions.map((tx) => (
                        <div key={tx.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold capitalize">{tx.type}</span>
                            <span className="text-zinc-400 truncate max-w-[150px]">{tx.nftName || `${tx.type} event`}</span>
                          </div>
                          <span className="text-zinc-500">{new Date(tx.timestamp).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
