import React, { useState, useMemo } from 'react';
import { NFT } from '../types';
import { useWeb3 } from '../context/Web3Context';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatCrypto, formatUsd } from '../services/gasService';
import { calculateNFTRarity } from '../services/rarityService';
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
  Award
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
    gasData, 
    selectedGasSpeed,
    nfts 
  } = useWeb3();

  const [activeTab, setActiveTab] = useState<'details' | 'royalties' | 'offers' | 'activity'>('details');

  // AI-Driven Rarity Analysis
  const rarity = useMemo(() => {
    if (!nft) return null;
    return calculateNFTRarity(nft, nfts);
  }, [nft, nfts]);
  
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

  if (!nft) return null;

  const chainConfig = SUPPORTED_CHAINS[nft.chainId] || SUPPORTED_CHAINS.ethereum;
  const isOwner = nft.ownerAddress.toLowerCase() === activeAccount.address.toLowerCase();
  const isCreator = nft.creatorAddress.toLowerCase() === activeAccount.address.toLowerCase();

  // Royalty Calculations
  const price = nft.price || 0;
  const royaltyPercent = nft.royaltyPercentage || 0;
  const royaltyAmount = +(price * (royaltyPercent / 100)).toFixed(6);
  const marketplaceFee = +(price * 0.015).toFixed(6); // 1.5%
  const sellerPayout = +(price - royaltyAmount - marketplaceFee).toFixed(6);

  // Handle Buy
  const handleBuy = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await buyNFT(nft.id);
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
      await listNFTForSale(nft.id, val);
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
      await delistNFT(nft.id);
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
      await transferNFT(nft.id, recipientInput.trim());
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
      await burnNFT(nft.id);
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
      await makeOffer(nft.id, val);
      setIsOfferOpen(false);
      setStatusMessage({ type: 'success', text: `Offer of ${val} ${chainConfig.symbol} submitted to escrow!` });
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
            <span className="text-xs text-zinc-500 font-mono">• {nft.tokenId}</span>
          </div>
          <button
            onClick={onClose}
            id="close-nft-detail-btn"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
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
                src={nft.image}
                alt={nft.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center gap-1">
                <span>{chainConfig.icon}</span>
                <span>{chainConfig.shortName}</span>
              </div>
              
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                {nft.royaltyPercentage > 0 && (
                  <div className="px-2.5 py-1 rounded-lg bg-purple-950/85 backdrop-blur-md border border-purple-500/30 text-[11px] font-bold text-purple-300">
                    {nft.royaltyPercentage}% Royalty
                  </div>
                )}
              </div>

              {/* AI Rarity Tier Overlay Pill */}
              {rarity && (
                <div className={`absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center justify-between shadow-lg ${rarity.tierColor.bg} ${rarity.tierColor.border} ${rarity.tierColor.text}`}>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{rarity.tier} Tier</span>
                    <span className="text-[10px] opacity-75 font-mono">• Top {rarity.rankPercentile}%</span>
                  </div>
                  <span className="font-mono font-black">{rarity.normalizedScore}/100</span>
                </div>
              )}
            </div>

            {/* Smart Contract Info Box */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Contract Address:</span>
                <span className="font-mono text-zinc-300 truncate max-w-[150px]">{nft.contractAddress}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Token ID:</span>
                <span className="font-mono text-zinc-300">{nft.tokenId}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Metadata Storage:</span>
                <span className="font-mono text-cyan-400 truncate max-w-[150px]">{nft.ipfsMetadataUri}</span>
              </div>
            </div>
          </div>

          {/* Details & Actions Column (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            <div>
              <div className="text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                <span>{nft.collectionName || 'Single Masterpiece'}</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-2xl font-black text-zinc-100">{nft.name}</h2>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{nft.description}</p>
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
                  {isCreator ? 'You (Connected)' : (nft.creatorName || nft.creatorAddress.slice(0, 10) + '...')}
                </div>
                <div className="text-[10px] font-mono text-purple-400 mt-0.5">
                  {nft.royaltyPercentage}% Royalty Receiver
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Current Owner</div>
                <div className="text-xs font-bold text-zinc-200 mt-0.5 truncate">
                  {isOwner ? 'You (Connected)' : (nft.ownerName || nft.ownerAddress.slice(0, 10) + '...')}
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {isOwner ? 'Full Ownership Rights' : 'Verified Holder'}
                </div>
              </div>
            </div>

            {/* Pricing Box & Primary Action */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Current Price</div>
                  {nft.isListed && nft.price ? (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-zinc-100 font-mono">
                        {nft.price} {chainConfig.symbol}
                      </span>
                      <span className="text-xs text-emerald-400 font-mono font-bold">
                        {formatUsd(nft.price * chainConfig.usdPrice)}
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
              {nft.isListed && nft.price && (
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
                {nft.isListed && !isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleBuy}
                      disabled={isProcessing}
                      id="nft-buy-confirm-btn"
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {isProcessing ? 'Confirming On-Chain...' : `Buy Now for ${nft.price} ${chainConfig.symbol}`}
                    </button>
                    <button
                      onClick={() => setIsOfferOpen(!isOfferOpen)}
                      className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs transition-colors"
                    >
                      Make Offer
                    </button>
                  </div>
                )}

                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    {nft.isListed ? (
                      <button
                        onClick={handleDelist}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs border border-zinc-700 transition-colors"
                      >
                        Cancel Listing (Delist)
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsListingOpen(!isListingOpen)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        List for Sale on Marketplace
                      </button>
                    )}

                    <button
                      onClick={() => setIsTransferOpen(!isTransferOpen)}
                      className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs border border-zinc-700 transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Transfer
                    </button>

                    {onOpenBridge && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenBridge(nft);
                        }}
                        className="py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs border border-cyan-500/30 transition-colors flex items-center gap-1.5"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Teleport / Bridge
                      </button>
                    )}

                    <button
                      onClick={handleBurn}
                      className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs transition-colors flex items-center gap-1"
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
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
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
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
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
                      className="px-4 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Submit Bid
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Unlockable Content Section */}
            {nft.hasUnlockableContent && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-1.5">
                    {isOwner ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    Unlockable Exclusive Content
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => setShowUnlockable(!showUnlockable)}
                      className="text-[11px] underline hover:text-amber-200"
                    >
                      {showUnlockable ? 'Hide' : 'Reveal'}
                    </button>
                  )}
                </div>
                {isOwner ? (
                  showUnlockable ? (
                    <div className="p-2.5 bg-zinc-950 rounded-lg border border-amber-500/40 text-xs font-mono text-amber-200 break-all select-all">
                      {nft.unlockableContent}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400">Content hidden. Click reveal to view your exclusive access key.</p>
                  )
                ) : (
                  <p className="text-[11px] text-zinc-400">Included with purchase. Revealed exclusively to the current verified token holder.</p>
                )}
              </div>
            )}

            {/* AI-Driven Rarity Score & Trait Distribution Card */}
            {rarity && (
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 space-y-4" id="ai-rarity-score-panel">
                
                {/* Header with AI Engine Badge & Tier Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        <span>AI-Driven Rarity Score</span>
                        <span className="text-[10px] font-mono font-normal text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          Neural Trait Engine
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Calculated from on-chain trait scarcity, entropy, and collection distribution.
                      </p>
                    </div>
                  </div>

                  <div className={`self-start sm:self-auto px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm ${rarity.tierColor.bg} ${rarity.tierColor.border} ${rarity.tierColor.text}`}>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{rarity.tier} Tier</span>
                    <span className="text-[10px] opacity-80 font-mono">• Top {rarity.rankPercentile}%</span>
                  </div>
                </div>

                {/* Score & Key Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Rarity Score</div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black font-mono text-zinc-100">{rarity.normalizedScore}</span>
                      <span className="text-[11px] text-zinc-500 font-mono">/ 100</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Trait Points</div>
                    <div className="text-xl font-black font-mono text-purple-400 mt-0.5">
                      {rarity.rawScore} <span className="text-[10px] text-zinc-500 font-normal">pts</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Scarcity Boost</div>
                    <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                      +{rarity.statisticalSummary.traitMultiplier}x
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Rarest Trait</div>
                    <div className="text-xs font-bold text-cyan-400 mt-1 truncate" title={rarity.rarestTrait ? String(rarity.rarestTrait.value) : 'None'}>
                      {rarity.rarestTrait ? `${rarity.rarestTrait.value} (${rarity.rarestTrait.frequencyPercent}%)` : 'Standard'}
                    </div>
                  </div>
                </div>

                {/* VISUAL PROGRESS BAR */}
                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                      Rarity Distribution Spectrum:
                    </span>
                    <span className="font-mono font-bold text-zinc-200">
                      {rarity.normalizedScore}% ({rarity.tier})
                    </span>
                  </div>

                  {/* Multi-layered Progress Track */}
                  <div className="relative w-full h-3.5 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${rarity.tierColor.barGradient} shadow-sm`}
                      style={{ width: `${Math.max(6, rarity.normalizedScore)}%` }}
                    />
                  </div>

                  {/* Milestone Indicators */}
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-0.5 px-0.5">
                    <span>Common</span>
                    <span>Uncommon (35)</span>
                    <span>Rare (50)</span>
                    <span>Epic (68)</span>
                    <span>Legendary (80)</span>
                    <span className="text-amber-400 font-bold">Mythic (90+)</span>
                  </div>
                </div>

                {/* AI Neural Insights Assessment */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/20 via-purple-950/20 to-zinc-900/40 border border-cyan-500/20 text-xs text-zinc-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-cyan-300 text-[11px]">AI Statistical Assessment</div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                      {rarity.aiInsight}
                    </p>
                  </div>
                </div>

                {/* Detailed Traits Breakdown Table */}
                {rarity.traitsBreakdown.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                        Trait Distribution & Frequency Breakdown ({rarity.traitCount})
                      </span>
                      <span className="text-[10px] text-zinc-500 font-normal normal-case font-mono">
                        Ranked by Scarcity
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rarity.traitsBreakdown.map((trait, i) => (
                        <div 
                          key={i} 
                          className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="truncate">
                              <span className="text-[10px] uppercase font-semibold text-cyan-400 block truncate">
                                {trait.trait_type}
                              </span>
                              <span className="text-xs font-bold text-zinc-100 font-mono block truncate mt-0.5">
                                {trait.value}
                              </span>
                            </div>

                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 font-mono ${
                              trait.impact === 'Critical'
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                : trait.impact === 'High'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                : trait.impact === 'Medium'
                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            }`}>
                              {trait.frequencyPercent}% freq
                            </span>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                            <span>Score Weight:</span>
                            <span className="text-purple-400 font-bold">+{trait.traitScore} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
