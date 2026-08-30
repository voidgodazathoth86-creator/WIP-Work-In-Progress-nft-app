import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { 
  BlockchainNetwork, 
  BridgeProtocol, 
  BridgeTransaction, 
  NFT, 
  TokenStandard 
} from '../types';
import { SUPPORTED_CHAINS, CHAIN_LIST } from '../data/chains';
import { 
  BRIDGE_PROTOCOLS, 
  PROTOCOL_LIST, 
  calculateBridgeQuote, 
  getEstimatedTransitTime, 
  getRequiredConfirmations 
} from '../services/bridgeService';
import { formatCrypto, formatUsd } from '../services/gasService';
import { 
  Network, 
  ArrowRight, 
  ArrowLeftRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Fuel, 
  ExternalLink, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Zap, 
  Lock, 
  Send, 
  Flame, 
  Info, 
  ChevronRight, 
  History, 
  HelpCircle, 
  Search, 
  SlidersHorizontal,
  Coins,
  Droplet,
  Trash2,
  Share2,
  Percent
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NFTBridgeProps {
  initialNFT?: NFT | null;
  onNavigateToDashboard?: () => void;
  onNavigateToMarketplace?: () => void;
  openFaucetModal?: () => void;
}

export const NFTBridge: React.FC<NFTBridgeProps> = ({
  initialNFT,
  onNavigateToDashboard,
  onNavigateToMarketplace,
  openFaucetModal,
}) => {
  const { 
    activeChain, 
    switchChain, 
    activeAccount, 
    nfts, 
    bridgeTransactions, 
    bridgeNFT, 
    clearBridgeHistory 
  } = useWeb3();

  // Navigation tab inside Bridge
  const [activeTab, setActiveTab] = useState<'bridge' | 'history' | 'protocols' | 'faq'>('bridge');

  // Selected NFT
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(initialNFT || null);
  const [isNFTDrawerOpen, setIsNFTDrawerOpen] = useState(false);
  const [nftSearchTerm, setNftSearchTerm] = useState('');

  // Routing State
  const [sourceChain, setSourceChain] = useState<BlockchainNetwork>(initialNFT ? initialNFT.chainId : activeChain);
  const [destChain, setDestChain] = useState<BlockchainNetwork>(() => {
    const defaultDest: BlockchainNetwork = (initialNFT ? initialNFT.chainId : activeChain) === 'polygon' ? 'ethereum' : 'polygon';
    return defaultDest;
  });

  // Protocol State
  const [selectedProtocol, setSelectedProtocol] = useState<BridgeProtocol>('layerzero');
  const [bridgeStandard, setBridgeStandard] = useState<'ONFT-721' | 'Lock & Mint'>('ONFT-721');
  const [gasSpeed, setGasSpeed] = useState<'slow' | 'standard' | 'fast' | 'instant'>('standard');
  
  // Custom destination options
  const [recipientAddress, setRecipientAddress] = useState<string>(activeAccount.address);
  const [gasDropOption, setGasDropOption] = useState<number>(0); // Native token amount on destination
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Execution state
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStep, setBridgeStep] = useState<number>(1);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [activeBridgeResult, setActiveBridgeResult] = useState<BridgeTransaction | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  // Selected History modal
  const [selectedHistoryTx, setSelectedHistoryTx] = useState<BridgeTransaction | null>(null);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Update source chain if initial NFT changes
  useEffect(() => {
    if (initialNFT) {
      setSelectedNFT(initialNFT);
      setSourceChain(initialNFT.chainId);
      if (initialNFT.chainId === destChain) {
        setDestChain(initialNFT.chainId === 'polygon' ? 'ethereum' : 'polygon');
      }
    }
  }, [initialNFT]);

  // If user changes active account, sync recipient address if it was previous address
  useEffect(() => {
    setRecipientAddress(activeAccount.address);
  }, [activeAccount.address]);

  // Owned NFTs on source chain
  const userOwnedSourceNFTs = nfts.filter(
    n => n.ownerAddress.toLowerCase() === activeAccount.address.toLowerCase() && n.chainId === sourceChain
  );

  // Filtered list in modal
  const filteredSourceNFTs = userOwnedSourceNFTs.filter(n => 
    n.name.toLowerCase().includes(nftSearchTerm.toLowerCase()) ||
    (n.collectionName && n.collectionName.toLowerCase().includes(nftSearchTerm.toLowerCase())) ||
    n.tokenId.includes(nftSearchTerm)
  );

  // If selected NFT is not on source chain, clear it or find replacement
  useEffect(() => {
    if (selectedNFT && selectedNFT.chainId !== sourceChain) {
      const matchOnNewSource = userOwnedSourceNFTs[0] || null;
      setSelectedNFT(matchOnNewSource);
    }
  }, [sourceChain]);

  // Chain configurations
  const sourceConfig = SUPPORTED_CHAINS[sourceChain] || SUPPORTED_CHAINS.ethereum;
  const destConfig = SUPPORTED_CHAINS[destChain] || SUPPORTED_CHAINS.polygon;

  // Active Quote Calculation
  const quote = calculateBridgeQuote(sourceChain, destChain, selectedProtocol, gasSpeed, gasDropOption);

  // Balance Check
  const sourceBalance = activeAccount.balances[sourceChain] || 0;
  const isBalanceSufficient = sourceBalance >= quote.totalCostCrypto;

  // Swap Source & Destination
  const handleSwapChains = () => {
    const prevSource = sourceChain;
    const prevDest = destChain;
    setSourceChain(prevDest);
    setDestChain(prevSource);
    setSelectedNFT(null);
  };

  // Start Bridge Sequence
  const handleStartBridge = async () => {
    if (!selectedNFT) {
      setBridgeError('Please select an NFT to bridge');
      return;
    }

    if (sourceChain === destChain) {
      setBridgeError('Destination chain cannot be identical to source chain');
      return;
    }

    if (!isBalanceSufficient) {
      setBridgeError(`Insufficient balance. You need ${quote.totalCostCrypto} ${sourceConfig.symbol}, but have ${sourceBalance.toFixed(4)} ${sourceConfig.symbol}.`);
      return;
    }

    setIsBridging(true);
    setBridgeError(null);
    setBridgeStep(1);
    setStepMessage('Initiating cross-chain transaction signature...');

    try {
      const res = await bridgeNFT({
        nftId: selectedNFT.id,
        destinationChain: destChain,
        recipientAddress: recipientAddress.trim() || activeAccount.address,
        protocol: selectedProtocol,
        gasSpeed,
        gasDropCrypto: gasDropOption,
        onStepUpdate: (step, msg) => {
          setBridgeStep(step);
          setStepMessage(msg);
        }
      });

      if (res.success && res.bridgeTx) {
        setActiveBridgeResult(res.bridgeTx);
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        setBridgeError(res.error || 'Cross-chain bridge transaction failed');
      }
    } catch (err: any) {
      setBridgeError(err?.message || 'An unexpected error occurred during bridging');
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16" id="crosschain-bridge-studio">
      
      {/* ========================================================================= */}
      {/* HERO BANNER & PROTOCOL STATUS BAR */}
      {/* ========================================================================= */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                Interchain Gateway V2.1
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                7 Chains Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-100 tracking-tight">
              Omnichain NFT Bridge & Teleport
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Transfer NFTs seamlessly across Ethereum, Polygon, Arbitrum, Base, Avalanche, BSC, and Solana using enterprise decentralized verifier networks with automated metadata and creator royalty preservation.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/90">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Settlement Time</div>
              <div className="text-base font-black text-cyan-400 font-mono mt-0.5">~15-45s</div>
              <div className="text-[10px] text-zinc-400">Zero Slippage</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/90">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Security Models</div>
              <div className="text-base font-black text-purple-400 font-mono mt-0.5">DVN + RMN</div>
              <div className="text-[10px] text-zinc-400">19/19 Guardians</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/90 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Teleported Assets</div>
              <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                {bridgeTransactions.length + 128} NFTs
              </div>
              <div className="text-[10px] text-zinc-400">100% Provenance</div>
            </div>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-zinc-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('bridge')}
            id="bridge-tab-transfer-btn"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bridge'
                ? 'bg-cyan-500 text-zinc-950 shadow-lg shadow-cyan-500/25 font-black'
                : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Bridge Station
          </button>

          <button
            onClick={() => setActiveTab('history')}
            id="bridge-tab-history-btn"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <History className="w-4 h-4" />
            Transfer History
            {bridgeTransactions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 font-extrabold">
                {bridgeTransactions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('protocols')}
            id="bridge-tab-protocols-btn"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'protocols'
                ? 'bg-zinc-800 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Protocol Comparer
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            id="bridge-tab-faq-btn"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'faq'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Standards & FAQ
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE BRIDGE STATION */}
      {/* ========================================================================= */}
      {activeTab === 'bridge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Bridge Router & Asset Selection (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Network Selection Card */}
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">1</span>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Select Cross-Chain Route</h3>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {getEstimatedTransitTime(sourceChain, destChain, selectedProtocol)}s estimated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                
                {/* Source Chain Selector */}
                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Source Network</span>
                    <span className="text-emerald-400 font-mono text-[9px]">
                      Bal: {(activeAccount.balances[sourceChain] || 0).toFixed(3)} {sourceConfig.symbol}
                    </span>
                  </div>
                  <select
                    value={sourceChain}
                    onChange={(e) => {
                      const newSource = e.target.value as BlockchainNetwork;
                      setSourceChain(newSource);
                      if (newSource === destChain) {
                        setDestChain(newSource === 'polygon' ? 'ethereum' : 'polygon');
                      }
                    }}
                    id="bridge-source-chain-select"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    {CHAIN_LIST.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.icon} {chain.name} ({chain.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Swap Button */}
                <div className="sm:col-span-1 flex justify-center py-1">
                  <button
                    onClick={handleSwapChains}
                    type="button"
                    title="Swap Route Direction"
                    id="bridge-swap-route-btn"
                    className="p-3 rounded-2xl bg-zinc-800 border border-zinc-700 hover:border-cyan-500 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-400 transition-all shadow-md group"
                  >
                    <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                </div>

                {/* Destination Chain Selector */}
                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Destination Network</span>
                    <span className="text-purple-400 font-mono text-[9px]">
                      Bal: {(activeAccount.balances[destChain] || 0).toFixed(3)} {destConfig.symbol}
                    </span>
                  </div>
                  <select
                    value={destChain}
                    onChange={(e) => {
                      const newDest = e.target.value as BlockchainNetwork;
                      setDestChain(newDest);
                      if (newDest === sourceChain) {
                        setSourceChain(newDest === 'polygon' ? 'ethereum' : 'polygon');
                      }
                    }}
                    id="bridge-dest-chain-select"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    {CHAIN_LIST.filter(c => c.id !== sourceChain).map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.icon} {chain.name} ({chain.shortName})
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Visual Highway Route Diagram */}
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">{sourceConfig.icon}</span>
                  <div>
                    <div className="font-bold text-zinc-200">{sourceConfig.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Gateway: 0x721...Bridge</div>
                  </div>
                </div>

                <div className="flex flex-col items-center px-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    {BRIDGE_PROTOCOLS[selectedProtocol].name}
                  </div>
                  <div className="w-24 sm:w-36 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 my-1 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-glow" />
                  </div>
                  <span className="text-[9px] text-zinc-500">Secured Relayer</span>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <div className="font-bold text-zinc-200">{destConfig.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Endpoint: 0x902...Mint</div>
                  </div>
                  <span className="text-base">{destConfig.icon}</span>
                </div>
              </div>
            </div>

            {/* Step 2: NFT Asset Selector Card */}
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Select NFT to Teleport</h3>
                </div>
                <button
                  onClick={() => setIsNFTDrawerOpen(true)}
                  id="browse-owned-nfts-btn"
                  className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  Browse Portfolio ({userOwnedSourceNFTs.length})
                </button>
              </div>

              {selectedNFT ? (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-cyan-500/30 relative group flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800">
                    <img 
                      src={selectedNFT.image} 
                      alt={selectedNFT.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-xs font-bold text-zinc-100">{selectedNFT.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                        #{selectedNFT.tokenId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {selectedNFT.standard}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {selectedNFT.description || 'Verified Omnichain Compatible Digital Asset'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] text-zinc-400 font-mono">
                      <span>Collection: <strong className="text-zinc-200">{selectedNFT.collectionName || 'Single Edition'}</strong></span>
                      <span>•</span>
                      <span>Royalty: <strong className="text-purple-400">{selectedNFT.royaltyPercentage}%</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsNFTDrawerOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                  >
                    Change NFT
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsNFTDrawerOpen(true)}
                  className="p-8 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-cyan-500/60 bg-zinc-950/40 hover:bg-zinc-950/80 transition-all cursor-pointer text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-200">No NFT selected for teleportation</div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      You have {userOwnedSourceNFTs.length} NFTs on {sourceConfig.name}. Click to pick from your portfolio.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-zinc-950 text-xs font-bold hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
                  >
                    Choose NFT from {sourceConfig.name}
                  </button>
                </div>
              )}
            </div>

            {/* Step 3: Messaging Protocol Selector */}
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">3</span>
                  <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Cross-Chain Messaging Protocol</h3>
                </div>
                <span className="text-xs text-zinc-400 font-mono">Consensus Engines</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROTOCOL_LIST.map((proto) => {
                  const isSelected = selectedProtocol === proto.id;
                  const isSupported = proto.supportedChains.includes(sourceChain) && proto.supportedChains.includes(destChain);

                  return (
                    <button
                      key={proto.id}
                      onClick={() => isSupported && setSelectedProtocol(proto.id)}
                      disabled={!isSupported}
                      className={`p-4 rounded-2xl text-left transition-all relative border flex flex-col justify-between space-y-3 ${
                        !isSupported
                          ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-zinc-800'
                          : isSelected
                          ? 'bg-zinc-950 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{proto.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                              {proto.name}
                              <span className="text-[9px] font-mono text-zinc-500">{proto.version}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400">{proto.securityRating}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-400 line-clamp-2">
                        {proto.description}
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Base Fee: ~{formatUsd(proto.baseFeeUsd)}</span>
                        <span className="text-cyan-400 font-semibold">Speed: ~{proto.avgTimeSeconds}s</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Advanced Cross-Chain Options Accordion */}
            <div className="p-5 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-zinc-100"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  Advanced Bridge & Destination Gas Settings
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {isAdvancedOpen ? 'Hide' : 'Configure'}
                </span>
              </button>

              {isAdvancedOpen && (
                <div className="space-y-4 pt-3 border-t border-zinc-800/80 animate-in fade-in duration-200">
                  
                  {/* Destination Recipient Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                      <span>Destination Recipient Address</span>
                      <span className="text-zinc-500 font-mono text-[10px]">Defaults to your wallet</span>
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="0x... or Solana pubkey"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Gas on Arrival (Gas Drop) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-400 flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 text-indigo-400" />
                        Gas on Arrival (Destination Airdrop)
                      </span>
                      <span className="text-xs font-mono text-zinc-300 font-bold">
                        {gasDropOption > 0 ? `${gasDropOption} ${destConfig.symbol} (${formatUsd(gasDropOption * destConfig.usdPrice)})` : 'None'}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Deliver native gas to destination wallet alongside your NFT so you can immediately list or interact without claiming a faucet!
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 0.005, 0.02, 0.05].map((amount) => {
                        const scaledAmount = destChain === 'polygon' ? amount * 500 : destChain === 'solana' ? amount * 10 : amount;
                        const isSelected = gasDropOption === scaledAmount;
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setGasDropOption(scaledAmount)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                              isSelected
                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            {scaledAmount === 0 ? 'No Gas' : `+${scaledAmount} ${destConfig.symbol}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gas Speed Tier */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-400 flex items-center gap-1.5">
                        <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                        Relayer Priority Fee Tier
                      </span>
                      <span className="text-xs font-mono text-emerald-400 uppercase font-bold">
                        {gasSpeed}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(['slow', 'standard', 'fast', 'instant'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setGasSpeed(tier)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                            gasSpeed === tier
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Right Column: Bridge Teleport Summary & Action (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Teleport Summary Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl space-y-6 sticky top-24">
              
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <h3 className="text-base font-black text-zinc-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Teleport Summary
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  {quote.bridgeStandard}
                </span>
              </div>

              {/* Cost Ledger Breakdown */}
              <div className="space-y-3 text-xs">
                
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Source Gas Fee ({sourceConfig.name}):</span>
                  <span className="font-mono text-zinc-200">
                    {quote.sourceGasCrypto} {sourceConfig.symbol} ({formatUsd(quote.sourceGasUsd)})
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1">
                    {BRIDGE_PROTOCOLS[selectedProtocol].name} Protocol Fee:
                  </span>
                  <span className="font-mono text-zinc-200">
                    {quote.protocolFeeCrypto} {sourceConfig.symbol} ({formatUsd(quote.protocolFeeUsd)})
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span>Relayer Execution & Destination Gas:</span>
                  <span className="font-mono text-zinc-200">
                    {formatUsd(quote.relayerGasUsd)} (Relayed)
                  </span>
                </div>

                {gasDropOption > 0 && (
                  <div className="flex items-center justify-between text-indigo-400">
                    <span>Destination Gas Drop (+{gasDropOption} {destConfig.symbol}):</span>
                    <span className="font-mono font-semibold">
                      +{formatUsd(quote.gasDropUsd)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Total Teleport Cost:</div>
                    <div className="text-[10px] text-zinc-500">Includes all relay & security proofs</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-cyan-400 font-mono">
                      {quote.totalCostCrypto} {sourceConfig.symbol}
                    </div>
                    <div className="text-xs font-semibold text-zinc-400 font-mono">
                      {formatUsd(quote.totalCostUsd)}
                    </div>
                  </div>
                </div>

              </div>

              {/* Security & Verification Guarantee Box */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security Guarantee: {quote.securityScore}/100</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {quote.securityNote}. Metadata, media IPFS hashes, traits, and creator royalties will be transferred with 100% fidelity.
                </p>
              </div>

              {/* Error Notice if any */}
              {bridgeError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <div className="flex-1">
                    <div className="font-bold">Teleportation Error</div>
                    <div>{bridgeError}</div>
                  </div>
                </div>
              )}

              {/* Insufficient balance warning + Faucet button */}
              {!isBalanceSufficient && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    Low {sourceConfig.name} Balance
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Your wallet balance is {sourceBalance.toFixed(4)} {sourceConfig.symbol}, but {quote.totalCostCrypto} {sourceConfig.symbol} is required.
                  </p>
                  {openFaucetModal && (
                    <button
                      onClick={openFaucetModal}
                      className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Droplet className="w-3.5 h-3.5" />
                      Claim Free Testnet {sourceConfig.symbol}
                    </button>
                  )}
                </div>
              )}

              {/* Main Action Button */}
              <button
                onClick={handleStartBridge}
                disabled={!selectedNFT || !isBalanceSufficient || isBridging}
                id="bridge-teleport-submit-btn"
                className={`w-full py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-xl ${
                  !selectedNFT || !isBalanceSufficient || isBridging
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                    : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-zinc-950 shadow-cyan-500/25 active:scale-[0.98]'
                }`}
              >
                {isBridging ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Teleporting Cross-Chain...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Teleport NFT to {destConfig.name}
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-zinc-500 font-mono">
                Source: {sourceConfig.testnetName} → Target: {destConfig.testnetName}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CROSS-CHAIN TRANSACTION HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-zinc-100 flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Cross-Chain Teleport Ledger
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Audit trail of verified cross-chain NFT transfers, DVN attestations, and cryptographic proofs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search token or tx hash..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 w-52 sm:w-64"
                />
              </div>

              {bridgeTransactions.length > 0 && (
                <button
                  onClick={clearBridgeHistory}
                  title="Clear Local History"
                  className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500/50 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {bridgeTransactions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <History className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-zinc-300">No cross-chain transfers recorded yet</div>
              <p className="text-xs text-zinc-500">
                Teleport your first NFT across chains to generate cryptographic verification logs.
              </p>
              <button
                onClick={() => setActiveTab('bridge')}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-zinc-950 text-xs font-bold hover:bg-cyan-400 transition-all"
              >
                Go to Bridge Station
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-mono uppercase text-zinc-500">
                    <th className="pb-3 pl-2">Asset</th>
                    <th className="pb-3">Route</th>
                    <th className="pb-3">Protocol</th>
                    <th className="pb-3">Message ID</th>
                    <th className="pb-3">Fee Paid</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {bridgeTransactions
                    .filter(tx => 
                      tx.nftName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                      tx.messageId.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                      tx.sourceTxHash.toLowerCase().includes(historySearchTerm.toLowerCase())
                    )
                    .map((tx) => {
                      const srcConf = SUPPORTED_CHAINS[tx.sourceChain] || SUPPORTED_CHAINS.ethereum;
                      const dstConf = SUPPORTED_CHAINS[tx.destinationChain] || SUPPORTED_CHAINS.polygon;
                      const proto = BRIDGE_PROTOCOLS[tx.protocol];

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-950/60 transition-colors">
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={tx.nftImage} 
                                alt={tx.nftName} 
                                className="w-8 h-8 rounded-lg object-cover bg-zinc-900 border border-zinc-800"
                              />
                              <div>
                                <div className="font-bold text-zinc-200">{tx.nftName}</div>
                                <div className="text-[10px] font-mono text-zinc-500">Token #{tx.sourceTokenId}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3">
                            <div className="flex items-center gap-1.5 font-semibold">
                              <span>{srcConf.icon} {srcConf.shortName}</span>
                              <ArrowRight className="w-3 h-3 text-zinc-500" />
                              <span>{dstConf.icon} {dstConf.shortName}</span>
                            </div>
                          </td>

                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {proto.shortName}
                            </span>
                          </td>

                          <td className="py-3">
                            <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[120px] inline-block" title={tx.messageId}>
                              {tx.messageId.slice(0, 16)}...
                            </span>
                          </td>

                          <td className="py-3">
                            <span className="font-mono text-zinc-300">
                              {formatUsd(tx.protocolFeeUsd + tx.gasRelayFeeUsd)}
                            </span>
                          </td>

                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Finalized
                            </span>
                          </td>

                          <td className="py-3 text-right pr-2">
                            <button
                              onClick={() => setSelectedHistoryTx(tx)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold transition-colors"
                            >
                              Inspect Proof
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROTOCOL COMPARISON MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'protocols' && (
        <div className="space-y-6">
          <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-zinc-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Cross-Chain Protocol Comparison Architecture
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Benchmark evaluation of enterprise cross-chain messaging layers and security topologies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROTOCOL_LIST.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <h3 className="text-sm font-black text-zinc-100">{p.name}</h3>
                        <div className="text-[10px] font-mono text-cyan-400">{p.securityRating}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {p.version}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-zinc-800">
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <div className="text-[9px] text-zinc-500 uppercase">Security Consensus</div>
                      <div className="text-zinc-200 font-bold text-[10px] mt-0.5 truncate" title={p.securityModel}>{p.securityModel}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                      <div className="text-[9px] text-zinc-500 uppercase">Avg Relayer Time</div>
                      <div className="text-emerald-400 font-bold text-xs mt-0.5">~{p.avgTimeSeconds}s</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-500 font-mono">
                    Supported Networks: {p.supportedChains.map(c => SUPPORTED_CHAINS[c]?.shortName || c).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STANDARDS & FAQ */}
      {/* ========================================================================= */}
      {activeTab === 'faq' && (
        <div className="p-6 md:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-black text-zinc-100 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Cross-Chain Standards & Technical FAQ
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              How the Omnichain NFT Bridge preserves provenance, avoids double-spending, and handles multi-chain royalty enforcement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                How are double-spends prevented across chains?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When you initiate a bridge transfer, the source asset is cryptographically <strong>burned</strong> (in ONFT mode) or deposited into a non-custodial bridge vault contract. Only after the multi-oracle decentralized verifier network signs off does the destination endpoint mint or release the token.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-400" />
                Are creator royalties preserved on the target chain?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Yes! The bridge packet carries the exact EIP-2981 royalty percentage and creator payout address inside the cross-chain payload. When the destination contract instantiates the NFT, the royalty parameters are bound directly into the bytecode.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Droplet className="w-4 h-4 text-indigo-400" />
                What is "Gas on Arrival" (Destination Airdrop)?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Users often bridge NFTs to a new chain without having native gas tokens on that chain to pay for secondary transactions. The Gas on Arrival feature swaps a small slice of your source gas into destination native currency and deposits it into your target wallet in the same transaction!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Does IPFS and unlockable content remain intact?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All decentralized IPFS metadata URIs (pinata/IPFS gateway hashes), high-resolution media hashes, and encrypted unlockable content payloads are fully replicated on the target chain's contract.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SELECT NFT FROM PORTFOLIO DRAWER */}
      {/* ========================================================================= */}
      {isNFTDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-black text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Select NFT from {sourceConfig.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Showing {userOwnedSourceNFTs.length} owned digital assets available on this chain
                </p>
              </div>
              <button
                onClick={() => setIsNFTDrawerOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, collection, or Token ID..."
                value={nftSearchTerm}
                onChange={(e) => setNftSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* NFT Cards Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSourceNFTs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="text-xs text-zinc-400 font-bold">No NFTs found matching criteria on {sourceConfig.name}</div>
                  <p className="text-[11px] text-zinc-500">
                    Switch your source network or mint an NFT using Mint Studio first!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredSourceNFTs.map((nft) => (
                    <div
                      key={nft.id}
                      onClick={() => {
                        setSelectedNFT(nft);
                        setIsNFTDrawerOpen(false);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        selectedNFT?.id === nft.id
                          ? 'bg-zinc-950 border-cyan-500 ring-1 ring-cyan-500 shadow-lg shadow-cyan-500/10'
                          : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950'
                      }`}
                    >
                      <img 
                        src={nft.image} 
                        alt={nft.name} 
                        className="w-14 h-14 rounded-xl object-cover bg-zinc-900 border border-zinc-800 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-zinc-100 truncate">{nft.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">#{nft.tokenId} • {nft.standard}</div>
                        <div className="text-[10px] text-purple-400 font-mono mt-0.5">
                          {nft.royaltyPercentage}% Royalty
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsNFTDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: LIVE TELEPORTATION EXECUTION & CELEBRATION MODAL */}
      {/* ========================================================================= */}
      {(isBridging || activeBridgeResult) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            
            {activeBridgeResult ? (
              // Completed Teleport State
              <div className="space-y-5 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-zinc-100">Teleportation Finalized!</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Your NFT <strong>{activeBridgeResult.nftName}</strong> is now live and registered on the <strong>{destConfig.name}</strong> network.
                  </p>
                </div>

                {/* Bridged NFT Preview Card */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3 text-left">
                  <img 
                    src={activeBridgeResult.nftImage} 
                    alt={activeBridgeResult.nftName} 
                    className="w-14 h-14 rounded-xl object-cover border border-zinc-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-100">{activeBridgeResult.nftName}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      Token #{activeBridgeResult.destinationTokenId} • {destConfig.name}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5 truncate">
                      Contract: {activeBridgeResult.destinationContract.slice(0, 14)}...
                    </div>
                  </div>
                </div>

                {/* Explorer Hashes */}
                <div className="space-y-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-400">Source Lock Tx:</span>
                    <a 
                      href={activeBridgeResult.explorerUrlSource} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      {activeBridgeResult.sourceTxHash.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
                    <span className="text-zinc-400">Destination Mint Tx:</span>
                    <a 
                      href={activeBridgeResult.explorerUrlDest} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      {activeBridgeResult.destinationTxHash?.slice(0, 10)}... <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      switchChain(destChain);
                      setActiveBridgeResult(null);
                      onNavigateToDashboard?.();
                    }}
                    className="py-3 rounded-xl bg-cyan-500 text-zinc-950 text-xs font-bold hover:bg-cyan-400 transition-all shadow-md"
                  >
                    View in Portfolio
                  </button>

                  <button
                    onClick={() => {
                      setActiveBridgeResult(null);
                      setSelectedNFT(null);
                    }}
                    className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all"
                  >
                    Bridge Another
                  </button>
                </div>
              </div>
            ) : (
              // In-Progress Live Progression State
              <div className="space-y-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-zinc-800 border-t-cyan-400 animate-spin" />
                  <div className="w-full h-full rounded-full flex items-center justify-center text-cyan-400">
                    <Network className="w-8 h-8 animate-pulse" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-zinc-100">Teleporting Cross-Chain</h3>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">{stepMessage}</p>
                </div>

                {/* 4 Step Progress Indicator */}
                <div className="space-y-3 text-left">
                  {[
                    { step: 1, label: `Lock/Burn on ${sourceConfig.name}` },
                    { step: 2, label: `${BRIDGE_PROTOCOLS[selectedProtocol].name} DVN Consensus` },
                    { step: 3, label: `Relayer Mint on ${destConfig.name}` },
                    { step: 4, label: 'Cross-Chain Finality' },
                  ].map((s) => {
                    const isDone = bridgeStep > s.step;
                    const isCurrent = bridgeStep === s.step;
                    return (
                      <div key={s.step} className="flex items-center gap-3 text-xs">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                          isDone 
                            ? 'bg-emerald-500 text-zinc-950' 
                            : isCurrent 
                            ? 'bg-cyan-500 text-zinc-950 animate-pulse' 
                            : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {isDone ? '✓' : s.step}
                        </div>
                        <span className={`font-semibold ${isDone ? 'text-zinc-200' : isCurrent ? 'text-cyan-400 font-bold' : 'text-zinc-500'}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-zinc-500 font-mono">
                  Do not close this window while consensus cryptographic proofs are being signed.
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CRYPTOGRAPHIC PROOF INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {selectedHistoryTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Interchain Verification Proof
              </h3>
              <button
                onClick={() => setSelectedHistoryTx(null)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Message ID (GUID)</div>
                <div className="text-cyan-400 break-all">{selectedHistoryTx.messageId}</div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Protocol & Standard</div>
                <div className="text-zinc-200">
                  {BRIDGE_PROTOCOLS[selectedHistoryTx.protocol].name} • {selectedHistoryTx.bridgeStandard}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Source Tx Hash ({selectedHistoryTx.sourceChain})</div>
                <a 
                  href={selectedHistoryTx.explorerUrlSource} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline break-all block"
                >
                  {selectedHistoryTx.sourceTxHash}
                </a>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Destination Tx Hash ({selectedHistoryTx.destinationChain})</div>
                <a 
                  href={selectedHistoryTx.explorerUrlDest} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-purple-400 hover:underline break-all block"
                >
                  {selectedHistoryTx.destinationTxHash}
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedHistoryTx(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
