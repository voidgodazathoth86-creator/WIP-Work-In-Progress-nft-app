import React, { useState, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { 
  Sparkles, 
  Upload, 
  Layers, 
  Percent, 
  ShieldCheck, 
  Fuel, 
  Plus, 
  Trash2, 
  Check, 
  Lock, 
  ExternalLink, 
  Flame, 
  FolderPlus,
  RefreshCw,
  Sliders,
  AlertCircle,
  Code2,
  FileCode,
  Copy,
  CheckCircle2,
  Cpu,
  Info,
  DollarSign,
  ArrowRight,
  Calculator,
  Compass,
  Zap,
  Globe,
  Settings2,
  FileSpreadsheet
} from 'lucide-react';
import { generateArtSVG, generateSeedAttributes, GenerativeStyle } from '../services/generativeArt';
import { NFTTrait, BlockchainNetwork, TokenStandard, NFT, NFTCollection } from '../types';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatCrypto, formatUsd } from '../services/gasService';
import { generateSolidityContract } from '../services/contractGenerator';
import { AIMetadataCopilot } from './AIMetadataCopilot';
import { requestAICollectionBranding } from '../services/aiMetadataService';
import { BulkMintStudio } from './BulkMintStudio';
import { BulkMetadataUploadModal, ParsedAssetItem } from './BulkMetadataUploadModal';
import { processRawSpreadsheetData } from '../services/spreadsheetService';
import { NetworkSelectorDropdown } from './NetworkSelectorDropdown';
import confetti from 'canvas-confetti';

interface MintStudioProps {
  onSuccess: (nft: NFT) => void;
  onOpenDashboard: () => void;
  onOpenMarketplace?: () => void;
}

export const MintStudio: React.FC<MintStudioProps> = ({ onSuccess, onOpenDashboard, onOpenMarketplace }) => {
  const { 
    activeChain, 
    currentChainConfig, 
    allChains, 
    switchChain, 
    gasData, 
    selectedGasSpeed, 
    setSelectedGasSpeed,
    activeAccount, 
    activeBalance,
    collections, 
    mintNFT, 
    deployCollection 
  } = useWeb3();

  // Studio Mode: 'single' | 'deploy' | 'bulk'
  const [studioMode, setStudioMode] = useState<'single' | 'deploy' | 'bulk'>('single');

  // ==================== SINGLE NFT STATE ====================
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaSource, setMediaSource] = useState<'generative' | 'upload'>('generative');
  const [generativeStyle, setGenerativeStyle] = useState<GenerativeStyle>('cyberpunk');
  const [generativeSeed, setGenerativeSeed] = useState(`CyberNFT-${Date.now()}`);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [tokenStandard, setTokenStandard] = useState<TokenStandard>('ERC-721');
  const [royaltyPercentage, setRoyaltyPercentage] = useState<number>(7.5);
  const [royaltyPayoutAddress, setRoyaltyPayoutAddress] = useState(activeAccount.address);
  const [isInstantList, setIsInstantList] = useState(false);
  const [listPrice, setListPrice] = useState<string>('0.5');
  const [hasUnlockable, setHasUnlockable] = useState(false);
  const [unlockableContent, setUnlockableContent] = useState('');
  
  // Traits builder
  const [traits, setTraits] = useState<NFTTrait[]>([
    { trait_type: 'Rarity Tier', value: 'Mythic', rarityPercentage: 5 },
    { trait_type: 'Power Level', value: 92, display_type: 'number', rarityPercentage: 8 },
  ]);

  // ==================== DEPLOY CONTRACT STATE ====================
  const [contractStandard, setContractStandard] = useState<TokenStandard>('ERC-721');
  const [contractName, setContractName] = useState('');
  const [contractSymbol, setContractSymbol] = useState('');
  const [contractDescription, setContractDescription] = useState('');
  const [contractCategory, setContractCategory] = useState<'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility'>('art');
  const [contractMaxSupply, setContractMaxSupply] = useState<number>(3333);
  const [contractMintPrice, setContractMintPrice] = useState<number>(0.05);
  const [contractMaxPerWallet, setContractMaxPerWallet] = useState<number>(5);
  const [contractBaseUri, setContractBaseUri] = useState('ipfs://QmNexusGenesisCollection/');
  const [contractBannerUrl, setContractBannerUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80');
  const [contractAvatarUrl, setContractAvatarUrl] = useState('https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&q=80');
  
  // Royalty Configuration for Deploy Contract
  const [contractRoyalty, setContractRoyalty] = useState<number>(7.5);
  const [contractRoyaltyPayoutAddress, setContractRoyaltyPayoutAddress] = useState(activeAccount.address);
  const [contractIsBurnable, setContractIsBurnable] = useState(true);
  const [contractIsPausable, setContractIsPausable] = useState(true);
  const [contractEnforceOperatorFilter, setContractEnforceOperatorFilter] = useState(true);
  const [contractDeployView, setContractDeployView] = useState<'form' | 'solidity' | 'simulator'>('form');
  const [copiedSolidity, setCopiedSolidity] = useState(false);

  // Simulation test amount
  const [simSalePrice, setSimSalePrice] = useState<number>(2.5);

  // ==================== MULTI-STEP EXECUTION MODAL STATE ====================
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionType, setExecutionType] = useState<'mint' | 'deploy'>('mint');
  const [executionStep, setExecutionStep] = useState<number>(0); // 0=Idle, 1=IPFS/Compile, 2=Sign, 3=Mempool, 4=Confirmed
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mintedResult, setMintedResult] = useState<NFT | null>(null);
  const [deployedResult, setDeployedResult] = useState<NFTCollection | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current preview image for single mint
  const previewImage = mediaSource === 'generative' 
    ? generateArtSVG(generativeSeed, generativeStyle)
    : (uploadedImageUrl || generateArtSVG('Placeholder-Seed', 'cyberpunk'));

  // Regenerate procedural artwork seed
  const regenerateArt = () => {
    const newSeed = `CyberMatrix-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    setGenerativeSeed(newSeed);
    if (!name) {
      setName(`Cosmic Vanguard #${Math.floor(100 + Math.random() * 900)}`);
    }
    const generatedTraits = generateSeedAttributes(newSeed, generativeStyle);
    setTraits(generatedTraits as NFTTrait[]);
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImageUrl(event.target.result as string);
          setMediaSource('upload');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trait management
  const addTrait = () => {
    setTraits(prev => [...prev, { trait_type: 'Attribute', value: 'Value', rarityPercentage: 20 }]);
  };

  const updateTrait = (index: number, field: keyof NFTTrait, val: any) => {
    setTraits(prev => prev.map((t, i) => i === index ? { ...t, [field]: val } : t));
  };

  const removeTrait = (index: number) => {
    setTraits(prev => prev.filter((_, i) => i !== index));
  };

  // Bulk Metadata Upload Modal State
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkImportedBatch, setBulkImportedBatch] = useState<any[] | null>(null);

  // Apply parsed asset item from Bulk JSON to Single Mint Form
  const handleApplyParsedJsonAsset = (item: ParsedAssetItem) => {
    if (item.name) setName(item.name);
    if (item.description) setDescription(item.description);
    if (item.image) {
      setUploadedImageUrl(item.image);
      setMediaSource('upload');
    }
    if (item.price !== undefined) {
      setListPrice(item.price.toString());
      setIsInstantList(true);
    }
    if (item.royaltyPercentage !== undefined) {
      setRoyaltyPercentage(item.royaltyPercentage);
    }
    if (item.traits && item.traits.length > 0) {
      setTraits(item.traits);
    }
    if (item.unlockableContent) {
      setUnlockableContent(item.unlockableContent);
      setHasUnlockable(true);
    }
  };

  // Send entire multi-asset JSON batch directly into BulkMintStudio
  const handleSendParsedBatchToBulkStudio = (items: ParsedAssetItem[]) => {
    const bulkRows = processRawSpreadsheetData(items as any);
    setBulkImportedBatch(bulkRows);
    setStudioMode('bulk');
  };

  // AI Collection Branding Loading State
  const [isGeneratingBranding, setIsGeneratingBranding] = useState(false);

  // Apply Full AI Metadata Suite
  const handleApplyAllAIMetadata = (aiData: {
    name: string;
    description: string;
    traits: NFTTrait[];
    royaltyPercentage?: number;
    suggestedPrice?: number;
    unlockableContent?: string;
    category?: string;
  }) => {
    if (aiData.name) setName(aiData.name);
    if (aiData.description) setDescription(aiData.description);
    if (aiData.traits && aiData.traits.length > 0) setTraits(aiData.traits);
    if (aiData.royaltyPercentage !== undefined) setRoyaltyPercentage(aiData.royaltyPercentage);
    if (aiData.suggestedPrice !== undefined) {
      setListPrice(aiData.suggestedPrice.toString());
      setIsInstantList(true);
    }
    if (aiData.unlockableContent) {
      setUnlockableContent(aiData.unlockableContent);
      setHasUnlockable(true);
    }
  };

  // Handle AI Collection Branding Generation
  const handleAICollectionBranding = async () => {
    setIsGeneratingBranding(true);
    try {
      const res = await requestAICollectionBranding({
        category: contractCategory,
        theme: 'Cyberpunk & Decentralized Web3 Protocol',
        standard: contractStandard,
      });

      if (res.data) {
        setContractName(res.data.name);
        setContractSymbol(res.data.symbol);
        setContractDescription(res.data.description);
        setContractMaxSupply(res.data.maxSupply);
        setContractMintPrice(res.data.mintPrice);
        setContractRoyalty(res.data.suggestedRoyalty);
        setContractMaxPerWallet(res.data.maxPerWallet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingBranding(false);
    }
  };

  // Generated Solidity Code
  const generatedSolidity = generateSolidityContract({
    name: contractName || 'CustomCollection',
    symbol: contractSymbol || 'NFT',
    standard: contractStandard,
    chainId: activeChain,
    maxSupply: contractMaxSupply,
    royaltyPercentage: contractRoyalty,
    royaltyPayoutAddress: contractRoyaltyPayoutAddress || activeAccount.address,
    isBurnable: contractIsBurnable,
    isPausable: contractIsPausable,
    enforceOperatorFilter: contractEnforceOperatorFilter,
    baseUri: contractBaseUri,
    mintPrice: contractMintPrice,
    maxPerWallet: contractMaxPerWallet,
  });

  const handleCopySolidity = () => {
    navigator.clipboard.writeText(generatedSolidity);
    setCopiedSolidity(true);
    setTimeout(() => setCopiedSolidity(false), 2000);
  };

  // Handle Submit Single Mint
  const handleMintSingle = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter a name for your NFT');
      return;
    }

    setErrorMessage(null);
    setExecutionType('mint');
    setIsExecuting(true);
    setExecutionStep(1); // IPFS Hashing

    try {
      await new Promise(r => setTimeout(r, 800));
      setExecutionStep(2); // Wallet Signature

      await new Promise(r => setTimeout(r, 1000));
      setExecutionStep(3); // Mempool Broadcast & Gas

      const priceVal = isInstantList && listPrice ? parseFloat(listPrice) : undefined;
      const selectedCol = collections.find(c => c.id === collectionId);

      const result = await mintNFT({
        name,
        description: description || `Original ${currentChainConfig.standard} digital asset minted on ${currentChainConfig.name}.`,
        image: previewImage,
        chainId: activeChain,
        standard: tokenStandard,
        collectionId: collectionId || undefined,
        collectionName: selectedCol?.name,
        royaltyPercentage,
        royaltyPayoutAddress: royaltyPayoutAddress || activeAccount.address,
        price: priceVal,
        traits,
        unlockableContent: hasUnlockable ? unlockableContent : undefined,
      }, selectedGasSpeed);

      if (!result.success || !result.nft) {
        setErrorMessage(result.error || 'Failed to mint NFT');
        setIsExecuting(false);
        return;
      }

      setExecutionStep(4); // Confirmed!
      setMintedResult(result.nft);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

    } catch (err: any) {
      setErrorMessage(err?.message || 'Transaction failed');
      setIsExecuting(false);
    }
  };

  // Handle Deploy Custom Smart Contract
  const handleDeployContract = async () => {
    if (!contractName.trim() || !contractSymbol.trim()) {
      setErrorMessage('Please provide both Smart Contract Name and Token Symbol');
      return;
    }

    setErrorMessage(null);
    setExecutionType('deploy');
    setIsExecuting(true);
    setExecutionStep(1); // Compiling Solidity & Bytecode

    try {
      await new Promise(r => setTimeout(r, 900));
      setExecutionStep(2); // Requesting EIP-712 Deployer Signature

      await new Promise(r => setTimeout(r, 1200));
      setExecutionStep(3); // Broadcasting Bytecode to Mempool

      const result = await deployCollection({
        name: contractName,
        symbol: contractSymbol.toUpperCase(),
        description: contractDescription || `Custom ${contractStandard} verified smart contract deployed on ${currentChainConfig.name} with EIP-2981 royalty protocol (${contractRoyalty}%).`,
        category: contractCategory,
        bannerImage: contractBannerUrl,
        avatarImage: contractAvatarUrl,
        chainId: activeChain,
        standard: contractStandard,
        maxSupply: contractMaxSupply,
        royaltyPercentage: contractRoyalty,
        royaltyPayoutAddress: contractRoyaltyPayoutAddress || activeAccount.address,
      });

      if (!result.success || !result.collection) {
        setErrorMessage(result.error || 'Smart contract deployment failed');
        setIsExecuting(false);
        return;
      }

      setExecutionStep(4);
      setDeployedResult(result.collection);

      confetti({ 
        particleCount: 120, 
        spread: 85, 
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b']
      });

    } catch (err: any) {
      setErrorMessage(err?.message || 'Smart contract deployment failed');
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" id="mint-studio-view">
      
      {/* Header Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            Cross-Chain NFT & Contract Studio
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Mint individual 1/1 digital assets or deploy custom ERC-721 / ERC-1155 smart contracts with embedded EIP-2981 royalties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Target Network Dropdown */}
          <div className="flex items-center gap-1.5">
            <NetworkSelectorDropdown 
              variant="header" 
              id="mint-studio-header-network-dropdown" 
            />
          </div>

          {/* Studio Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              onClick={() => setStudioMode('single')}
              id="studio-mode-single-btn"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                studioMode === 'single'
                  ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Mint Single NFT (1/1)
            </button>
            <button
              onClick={() => setStudioMode('deploy')}
              id="studio-mode-deploy-btn"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                studioMode === 'deploy'
                  ? 'bg-zinc-800 text-purple-400 border border-purple-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-purple-400" />
              Deploy Contract
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                ERC-721 / 1155
              </span>
            </button>
            <button
              onClick={() => setStudioMode('bulk')}
              id="studio-mode-bulk-btn"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                studioMode === 'bulk'
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Bulk Minting
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CSV / Excel
              </span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 1: SINGLE NFT MINTING */}
      {/* ========================================================= */}
      {studioMode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Media Creator & Live Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">NFT Media Canvas</span>
                
                {/* Switch Media Source */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setMediaSource('generative')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                      mediaSource === 'generative' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400'
                    }`}
                  >
                    Generative AI
                  </button>
                  <button
                    onClick={() => setMediaSource('upload')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                      mediaSource === 'upload' ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-400'
                    }`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-inner group">
                <img
                  src={previewImage}
                  alt="NFT Preview"
                  className="w-full h-full object-cover"
                />

                {/* Chain Badge on preview */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-xs font-bold text-zinc-200">
                  {currentChainConfig.icon} {currentChainConfig.shortName}
                </div>

                {/* Royalty Badge on preview */}
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-purple-950/80 backdrop-blur-md border border-purple-500/30 text-[11px] font-bold text-purple-300">
                  {royaltyPercentage}% Royalty
                </div>
              </div>

              {/* Generative Controls */}
              {mediaSource === 'generative' ? (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Generative Style</span>
                    <select
                      value={generativeStyle}
                      onChange={(e) => setGenerativeStyle(e.target.value as GenerativeStyle)}
                      className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-200 focus:outline-none"
                    >
                      <option value="cyberpunk">Cyberpunk Neon</option>
                      <option value="cosmic">Cosmic Nebula</option>
                      <option value="geometric">Geometric Vector</option>
                      <option value="glitch">Glitch Protocol</option>
                      <option value="minimal">Dark Minimalist</option>
                    </select>
                  </div>

                  <button
                    onClick={regenerateArt}
                    id="regenerate-art-btn"
                    className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    Regenerate Procedural Art & Traits
                  </button>
                </div>
              ) : (
                <div className="pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyan-500/50 bg-zinc-950/60 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    Choose File (JPG, PNG, GIF, SVG, MP4)
                  </button>
                </div>
              )}
            </div>

            {/* Network Gas Summary Box */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-emerald-400" />
                  Gas Fee Estimation
                </span>
                <NetworkSelectorDropdown variant="compact" id="preview-gas-network-dropdown" />
              </div>

              {/* Gas Speed Selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['slow', 'standard', 'fast', 'instant'] as const).map((speed) => {
                  const isSel = selectedGasSpeed === speed;
                  const tier = gasData.tiers[speed];
                  return (
                    <button
                      key={speed}
                      onClick={() => setSelectedGasSpeed(speed)}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        isSel 
                          ? 'bg-zinc-800 border-emerald-500/50 text-emerald-400 font-bold' 
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      <div className="text-[10px] uppercase">{speed}</div>
                      <div className="text-[11px] font-mono">{tier.totalGwei}</div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total Network Mint Cost:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCrypto(gasData.actionsEstimate.mintSingle.crypto, currentChainConfig.symbol)} ({formatUsd(gasData.actionsEstimate.mintSingle.usd)})
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Metadata, Collection, Traits, Royalty (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* AI Metadata Generator Copilot (Gemini 3.7 Flash) */}
            <AIMetadataCopilot
              currentImage={previewImage}
              mediaSource={mediaSource}
              tokenStandard={tokenStandard}
              chainName={currentChainConfig.name}
              onApplyAll={handleApplyAllAIMetadata}
              onApplyName={(val) => setName(val)}
              onApplyDescription={(val) => setDescription(val)}
              onApplyTraits={(val) => setTraits(val)}
              onApplyUnlockable={(val) => {
                setUnlockableContent(val);
                setHasUnlockable(true);
              }}
            />

            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              
              {/* Top Form Action Bar with Bulk Metadata Upload Trigger */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Asset Attributes & Metadata
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsBulkUploadModalOpen(true)}
                  id="bulk-metadata-upload-btn"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm group"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Bulk JSON Metadata Parser</span>
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                    Auto-Fill
                  </span>
                </button>
              </div>

              {/* Network to Mint To & Token Standard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <NetworkSelectorDropdown 
                  variant="form"
                  label="Network to Mint NFT To *"
                  id="single-mint-target-network"
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Token Standard</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Contract Architecture</span>
                  </label>
                  <select
                    value={tokenStandard}
                    onChange={(e) => setTokenStandard(e.target.value as TokenStandard)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="ERC-721">ERC-721 (Unique 1/1 Edition)</option>
                    <option value="ERC-1155">ERC-1155 (Multi-Edition Token)</option>
                    <option value="SPL-NFT">SPL-NFT (Solana Standard)</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">NFT Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. CyberRonin #1042 - Blade of Horizon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide backstory, lore, and unlockable features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Collection Attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Attach to Smart Contract Collection (Optional)</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    {collections.filter(c => c.chainId === activeChain).length} on {currentChainConfig.name}
                  </span>
                </label>
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">Independent Single 1/1 Edition (Direct Smart Contract)</option>
                  {collections.filter(c => c.chainId === activeChain).map(col => (
                    <option key={col.id} value={col.id}>
                      [{currentChainConfig.shortName}] {col.name} ({col.symbol}) • {col.standard} • {col.currentSupply}/{col.maxSupply}
                    </option>
                  ))}
                  {collections.filter(c => c.chainId !== activeChain).length > 0 && (
                    <optgroup label="Collections on Other Networks">
                      {collections.filter(c => c.chainId !== activeChain).map(col => (
                        <option key={col.id} value={col.id}>
                          [{col.chainId.toUpperCase()}] {col.name} ({col.symbol}) • {col.standard}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Royalty Engine Configuration */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-purple-400" />
                    Automated Secondary Royalty (EIP-2981)
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                    {royaltyPercentage}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={royaltyPercentage}
                  onChange={(e) => setRoyaltyPercentage(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>0% (No Fee)</span>
                  <span>5% (Industry Standard)</span>
                  <span>10% (Creator Focused)</span>
                  <span>25% (Max)</span>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Royalty Payout Address (EIP-2981 Receiver)</label>
                  <input
                    type="text"
                    value={royaltyPayoutAddress}
                    onChange={(e) => setRoyaltyPayoutAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Attributes / Traits Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    On-Chain Traits & Attributes ({traits.length})
                  </label>
                  <button
                    onClick={addTrait}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Trait
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {traits.map((trait, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      <input
                        type="text"
                        placeholder="Trait Type (e.g. Weapon)"
                        value={trait.trait_type}
                        onChange={(e) => updateTrait(index, 'trait_type', e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Plasma Katana)"
                        value={trait.value}
                        onChange={(e) => updateTrait(index, 'value', e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none"
                      />
                      <button
                        onClick={() => removeTrait(index)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant Secondary Listing Option */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">List for Sale Immediately Upon Mint</div>
                  <div className="text-[11px] text-zinc-500">Put this NFT on the secondary marketplace right away</div>
                </div>

                <div className="flex items-center gap-3">
                  {isInstantList && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono font-bold text-zinc-100 text-right focus:outline-none"
                      />
                      <span className="text-xs font-bold text-zinc-400 font-mono">{currentChainConfig.symbol}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setIsInstantList(!isInstantList)}
                    className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      isInstantList ? 'bg-cyan-500 justify-end' : 'bg-zinc-800 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              {/* Unlockable Content Toggle */}
              <div className="space-y-2">
                <button
                  onClick={() => setHasUnlockable(!hasUnlockable)}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  {hasUnlockable ? 'Remove Unlockable Content' : '+ Add Unlockable Content (Owner Only)'}
                </button>

                {hasUnlockable && (
                  <input
                    type="text"
                    placeholder="Enter secret high-res download link, Discord key, or private access code..."
                    value={unlockableContent}
                    onChange={(e) => setUnlockableContent(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                  />
                )}
              </div>

              {/* Mint Action Button */}
              <button
                onClick={handleMintSingle}
                id="mint-single-submit-btn"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Mint NFT on {currentChainConfig.name}
              </button>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: DEPLOY CUSTOM ERC-721 / ERC-1155 SMART CONTRACT */}
      {/* ========================================================= */}
      {studioMode === 'deploy' && (
        <div className="space-y-6">
          
          {/* Sub Navigation Bar for Contract Deployer */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setContractDeployView('form')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  contractDeployView === 'form'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Contract Parameters & Royalty Settings
              </button>
              <button
                onClick={() => setContractDeployView('solidity')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  contractDeployView === 'solidity'
                    ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Live Solidity Code & ABI
              </button>
              <button
                onClick={() => setContractDeployView('simulator')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  contractDeployView === 'simulator'
                    ? 'bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Royalty Distribution Simulator
              </button>
            </div>

            {/* Target Network Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-medium text-xs hidden sm:inline">Target Chain:</span>
              <NetworkSelectorDropdown variant="compact" id="deploy-contract-network-dropdown" />
            </div>
          </div>

          {/* VIEW: FORM PARAMETERS & ROYALTIES */}
          {contractDeployView === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Core Contract Configuration (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* 1. Token Standard Selection (ERC-721 vs ERC-1155) */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      1. Select Token Standard
                    </label>
                    <span className="text-[11px] text-zinc-400 font-mono">EVM Compatible</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* ERC-721 Card */}
                    <div
                      onClick={() => setContractStandard('ERC-721')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        contractStandard === 'ERC-721'
                          ? 'bg-purple-950/30 border-purple-500 shadow-lg shadow-purple-900/20'
                          : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
                          ERC-721
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            Non-Fungible
                          </span>
                        </span>
                        {contractStandard === 'ERC-721' && (
                          <div className="w-5 h-5 rounded-full bg-purple-500 text-zinc-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Best for 1/1 unique artworks, individual avatars, generative PFP collections, and distinct digital collectibles where each token has a unique token ID.
                      </p>
                    </div>

                    {/* ERC-1155 Card */}
                    <div
                      onClick={() => setContractStandard('ERC-1155')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        contractStandard === 'ERC-1155'
                          ? 'bg-purple-950/30 border-purple-500 shadow-lg shadow-purple-900/20'
                          : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
                          ERC-1155
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                            Multi-Token
                          </span>
                        </span>
                        {contractStandard === 'ERC-1155' && (
                          <div className="w-5 h-5 rounded-full bg-purple-500 text-zinc-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Best for semi-fungible editions, gaming items, membership badges, and batch transfer efficiency (saves up to 80% gas when sending multiple items).
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Contract Metadata Parameters */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4 text-purple-400" />
                      2. Smart Contract Identity
                    </label>
                    <button
                      onClick={handleAICollectionBranding}
                      disabled={isGeneratingBranding}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm shadow-purple-900/40 transition-all disabled:opacity-50"
                    >
                      <Sparkles className={`w-3 h-3 ${isGeneratingBranding ? 'animate-spin' : ''}`} />
                      {isGeneratingBranding ? 'Generating Branding...' : '✨ Generate Collection Identity (Gemini AI)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">Contract Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. CyberMatrix Genesis Protocol"
                        value={contractName}
                        onChange={(e) => setContractName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">Token Ticker / Symbol *</label>
                      <input
                        type="text"
                        placeholder="e.g. MATRIX"
                        value={contractSymbol}
                        onChange={(e) => setContractSymbol(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Contract Description & Lore</label>
                    <textarea
                      rows={2}
                      placeholder="Describe your collection roadmap, utility, benefits, and tokenomics..."
                      value={contractDescription}
                      onChange={(e) => setContractDescription(e.target.value)}
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">Category</label>
                      <select
                        value={contractCategory}
                        onChange={(e) => setContractCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none"
                      >
                        <option value="art">Digital Art</option>
                        <option value="pfp">PFP / Avatars</option>
                        <option value="gaming">Gaming & Metaverse</option>
                        <option value="photography">Photography</option>
                        <option value="music">Music & Audio</option>
                        <option value="utility">Utility & Access</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">
                        {contractStandard === 'ERC-721' ? 'Max Total Supply' : 'Max Supply / Edition'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={contractMaxSupply}
                        onChange={(e) => setContractMaxSupply(parseInt(e.target.value, 10) || 1000)}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300">Public Mint Price ({currentChainConfig.symbol})</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={contractMintPrice}
                        onChange={(e) => setContractMintPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Base URI / IPFS Gateway</label>
                    <input
                      type="text"
                      value={contractBaseUri}
                      onChange={(e) => setContractBaseUri(e.target.value)}
                      placeholder="ipfs://Qm.../"
                      className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Advanced Smart Contract Modules */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    3. Smart Contract Extensions & Security
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div>
                        <div className="text-xs font-bold text-zinc-200">EIP-2981 Native On-Chain Royalties</div>
                        <div className="text-[11px] text-zinc-400">Standardized royalty queries across OpenSea, Blur, Magic Eden, and Nexus Marketplace</div>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                        ENABLED
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div>
                        <div className="text-xs font-bold text-zinc-200">Burnable Extension ({contractStandard}Burnable)</div>
                        <div className="text-[11px] text-zinc-400">Allows holders to permanently burn token for deflationary tokenomics or crafting</div>
                      </div>
                      <button
                        onClick={() => setContractIsBurnable(!contractIsBurnable)}
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                          contractIsBurnable ? 'bg-purple-500 justify-end' : 'bg-zinc-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div>
                        <div className="text-xs font-bold text-zinc-200">Emergency Pausable Circuit Breaker</div>
                        <div className="text-[11px] text-zinc-400">Contract owner can temporarily freeze minting or transfers in case of emergency</div>
                      </div>
                      <button
                        onClick={() => setContractIsPausable(!contractIsPausable)}
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                          contractIsPausable ? 'bg-purple-500 justify-end' : 'bg-zinc-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div>
                        <div className="text-xs font-bold text-zinc-200">Operator Filter Registry Protection</div>
                        <div className="text-[11px] text-zinc-400">Blocks zero-royalty evasion market contracts from trading your collection</div>
                      </div>
                      <button
                        onClick={() => setContractEnforceOperatorFilter(!contractEnforceOperatorFilter)}
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                          contractEnforceOperatorFilter ? 'bg-purple-500 justify-end' : 'bg-zinc-800 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Pre-Configured Royalty Settings & Deploy Action (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* PRE-CONFIGURED ROYALTY SETTINGS BOX */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-purple-500/30 space-y-4 shadow-xl shadow-purple-950/20">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-purple-400" />
                      Pre-Configured Royalty Settings
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                      EIP-2981
                    </span>
                  </div>

                  {/* Royalty Percentage Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">Creator Secondary Royalty</span>
                      <span className="font-mono text-base font-extrabold text-purple-400">{contractRoyalty}%</span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={contractRoyalty}
                      onChange={(e) => setContractRoyalty(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />

                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[2.5, 5.0, 7.5, 10.0].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setContractRoyalty(preset)}
                          className={`py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            contractRoyalty === preset
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payout Address */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">Royalty Payout Receiver Address</label>
                      <button
                        onClick={() => setContractRoyaltyPayoutAddress(activeAccount.address)}
                        className="text-[10px] text-purple-400 hover:underline font-medium"
                      >
                        Use Connected Wallet
                      </button>
                    </div>
                    <input
                      type="text"
                      value={contractRoyaltyPayoutAddress}
                      onChange={(e) => setContractRoyaltyPayoutAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500/50"
                    />
                    <p className="text-[10px] text-zinc-500">
                      All marketplace secondary sale royalties will be automatically routed on-chain to this address.
                    </p>
                  </div>

                  {/* Live Mini Royalty Breakdown */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Sample 10 {currentChainConfig.symbol} Secondary Resale:</span>
                    </div>
                    <div className="flex justify-between text-zinc-300 font-mono pt-1 border-t border-zinc-800/80">
                      <span className="text-purple-400 font-bold">Your Creator Royalty ({contractRoyalty}%):</span>
                      <span className="text-purple-400 font-bold">
                        {((10 * contractRoyalty) / 100).toFixed(3)} {currentChainConfig.symbol} (${(((10 * contractRoyalty) / 100) * currentChainConfig.usdPrice).toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gas Estimation & Cost Summary */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                      <Fuel className="w-4 h-4 text-emerald-400" />
                      Smart Contract Deployment Gas Fee
                    </span>
                    <span className="font-mono text-zinc-400">{currentChainConfig.name}</span>
                  </div>

                  {/* Speed Selector */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['slow', 'standard', 'fast', 'instant'] as const).map((speed) => {
                      const isSel = selectedGasSpeed === speed;
                      const tier = gasData.tiers[speed];
                      return (
                        <button
                          key={speed}
                          onClick={() => setSelectedGasSpeed(speed)}
                          className={`p-1.5 rounded-lg border text-center transition-all ${
                            isSel 
                              ? 'bg-zinc-800 border-purple-500 text-purple-300 font-bold' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                          }`}
                        >
                          <div className="text-[10px] uppercase">{speed}</div>
                          <div className="text-[11px] font-mono">{tier.totalGwei}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Total Deployment Cost:</span>
                    <span className="font-extrabold text-emerald-400 font-mono text-sm">
                      {formatCrypto(gasData.actionsEstimate.mintCollection.crypto, currentChainConfig.symbol)} ({formatUsd(gasData.actionsEstimate.mintCollection.usd)})
                    </span>
                  </div>
                </div>

                {/* Deploy Action Button */}
                <button
                  onClick={handleDeployContract}
                  id="deploy-smart-contract-submit-btn"
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Deploy {contractStandard} Smart Contract to {currentChainConfig.name}
                </button>

                <p className="text-[11px] text-center text-zinc-500">
                  Bytecode compiled with Solidity v0.8.20 + OpenZeppelin 5.0 audited primitives.
                </p>

              </div>

            </div>
          )}

          {/* VIEW: LIVE SOLIDITY & ABI CODE VIEWER */}
          {contractDeployView === 'solidity' && (
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-cyan-400" />
                    Generated OpenZeppelin {contractStandard} Smart Contract
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time generated Solidity source code reflecting your exact royalty parameters and extensions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
                    Solidity 0.8.20 • EVM: Paris • Runs: 200
                  </div>
                  <button
                    onClick={handleCopySolidity}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSolidity ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSolidity ? 'Copied Code!' : 'Copy Solidity'}
                  </button>
                </div>
              </div>

              {/* Code display */}
              <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[500px]">
                  <code>{generatedSolidity}</code>
                </pre>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
                <span>EIP-2981 interface compliant for automated secondary marketplace distribution.</span>
                <button
                  onClick={() => setContractDeployView('form')}
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                >
                  Return to Parameters & Deploy <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW: ROYALTY DISTRIBUTION SIMULATOR */}
          {contractDeployView === 'simulator' && (
            <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Secondary Market Royalty Distribution Simulator
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Simulate future secondary market resale scenarios and calculate immediate on-chain royalty proceeds for your treasury.
                </p>
              </div>

              {/* Interactive Resale Price Input */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Simulated Sale Price ({currentChainConfig.symbol})</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0.01"
                      value={simSalePrice}
                      onChange={(e) => setSimSalePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono font-bold text-zinc-100 focus:outline-none focus:border-emerald-500/50"
                    />
                    <span className="text-xs font-bold text-zinc-400 font-mono">{currentChainConfig.symbol}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Pre-Configured Royalty</label>
                  <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono font-bold text-purple-400">
                    {contractRoyalty}%
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Marketplace Protocol Fee</label>
                  <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-mono font-bold text-zinc-400">
                    1.5% (Nexus Standard)
                  </div>
                </div>
              </div>

              {/* Visual Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Creator Royalty */}
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-1.5">
                  <div className="text-xs font-bold text-purple-300 flex items-center justify-between">
                    <span>Creator On-Chain Royalty</span>
                    <span>{contractRoyalty}%</span>
                  </div>
                  <div className="text-xl font-extrabold text-purple-400 font-mono">
                    {((simSalePrice * contractRoyalty) / 100).toFixed(4)} {currentChainConfig.symbol}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    ≈ ${(((simSalePrice * contractRoyalty) / 100) * currentChainConfig.usdPrice).toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-purple-300/80 pt-1 border-t border-purple-500/20">
                    Directly sent to: {contractRoyaltyPayoutAddress.slice(0, 8)}...{contractRoyaltyPayoutAddress.slice(-6)}
                  </div>
                </div>

                {/* 2. Seller Proceeds */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Seller Net Balance</span>
                    <span>{(100 - contractRoyalty - 1.5).toFixed(1)}%</span>
                  </div>
                  <div className="text-xl font-extrabold text-zinc-200 font-mono">
                    {((simSalePrice * (100 - contractRoyalty - 1.5)) / 100).toFixed(4)} {currentChainConfig.symbol}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    ≈ ${(((simSalePrice * (100 - contractRoyalty - 1.5)) / 100) * currentChainConfig.usdPrice).toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                    Transferred to the secondary item seller
                  </div>
                </div>

                {/* 3. Marketplace Protocol Fee */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                    <span>Protocol Facilitation Fee</span>
                    <span>1.5%</span>
                  </div>
                  <div className="text-xl font-extrabold text-zinc-400 font-mono">
                    {((simSalePrice * 1.5) / 100).toFixed(4)} {currentChainConfig.symbol}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    ≈ ${(((simSalePrice * 1.5) / 100) * currentChainConfig.usdPrice).toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800">
                    Ecosystem liquidity and relayer maintenance
                  </div>
                </div>
              </div>

              {/* Ready to Deploy CTA */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-zinc-400">
                  Ready to deploy these royalty terms to the blockchain?
                </div>
                <button
                  onClick={() => setContractDeployView('form')}
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  Proceed to Smart Contract Deployment <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: BULK SPREADSHEET BATCH MINTING */}
      {/* ========================================================= */}
      {studioMode === 'bulk' && (
        <BulkMintStudio
          onNavigateToDashboard={onOpenDashboard}
          onNavigateToMarketplace={onOpenMarketplace}
          initialItems={bulkImportedBatch || undefined}
        />
      )}

      {/* ========================================================= */}
      {/* BULK METADATA JSON UPLOAD & AUTO-FILL MODAL */}
      {/* ========================================================= */}
      <BulkMetadataUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onApplySingleItem={handleApplyParsedJsonAsset}
        onSendToBulkStudio={handleSendParsedBatchToBulkStudio}
      />

      {/* ========================================================= */}
      {/* MULTI-STEP EXECUTION MODAL (MINT OR DEPLOY) */}
      {/* ========================================================= */}
      {isExecuting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center">
            
            {executionStep < 4 ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto animate-pulse">
                  {executionType === 'deploy' ? (
                    <ShieldCheck className="w-8 h-8 text-purple-400" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-100">
                    {executionType === 'deploy' ? 'Deploying Smart Contract On-Chain' : 'Executing On-Chain Mint'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Please keep this window open while the transaction settles.</p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2 text-left pt-2">
                  <div className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs ${
                    executionStep >= 1 ? 'bg-zinc-900 border-purple-500/40 text-zinc-100' : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      executionStep > 1 ? 'bg-emerald-500 text-zinc-950' : 'bg-purple-500 text-white'
                    }`}>
                      {executionStep > 1 ? <Check className="w-3 h-3" /> : '1'}
                    </div>
                    <span>
                      {executionType === 'deploy' 
                        ? 'Compiling Solidity Bytecode & EIP-2981 Royalty Interface' 
                        : 'Pinning Media & Attributes to IPFS / Arweave'}
                    </span>
                  </div>

                  <div className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs ${
                    executionStep >= 2 ? 'bg-zinc-900 border-purple-500/40 text-zinc-100' : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      executionStep > 2 ? 'bg-emerald-500 text-zinc-950' : 'bg-purple-500 text-white'
                    }`}>
                      {executionStep > 2 ? <Check className="w-3 h-3" /> : '2'}
                    </div>
                    <span>Requesting EIP-712 Deployer Wallet Signature</span>
                  </div>

                  <div className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs ${
                    executionStep >= 3 ? 'bg-zinc-900 border-purple-500/40 text-zinc-100' : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      executionStep > 3 ? 'bg-emerald-500 text-zinc-950' : 'bg-purple-500 text-white'
                    }`}>
                      {executionStep > 3 ? <Check className="w-3 h-3" /> : '3'}
                    </div>
                    <span>Broadcasting to Mempool ({selectedGasSpeed.toUpperCase()} Gas Tier)</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Success Step */
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-100">
                    {executionType === 'deploy' ? 'Smart Contract Deployed Successfully!' : 'Mint Confirmed On-Chain!'}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                    {executionType === 'deploy' 
                      ? 'Contract verified with EIP-2981 automated royalty parameters' 
                      : 'Asset successfully created with royalties encoded'}
                  </p>
                </div>

                {/* Minted NFT Result */}
                {executionType === 'mint' && mintedResult && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3 text-left">
                    <img src={mintedResult.image} alt={mintedResult.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <div className="text-xs font-bold text-zinc-100">{mintedResult.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {mintedResult.tokenId} • {mintedResult.royaltyPercentage}% Royalty
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5 truncate max-w-[200px]">
                        Tx: {mintedResult.txHash.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                )}

                {/* Deployed Contract Result */}
                {executionType === 'deploy' && deployedResult && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-purple-500/30 space-y-2 text-left">
                    <div className="flex items-center gap-3">
                      <img src={deployedResult.avatarImage} alt={deployedResult.name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <div className="text-xs font-bold text-zinc-100">{deployedResult.name} ({deployedResult.symbol})</div>
                        <div className="text-[10px] text-purple-300 font-mono">
                          {deployedResult.standard} • {deployedResult.royaltyPercentage}% EIP-2981 Royalty
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate max-w-[220px]">
                          Address: {deployedResult.contractAddress.slice(0, 14)}...{deployedResult.contractAddress.slice(-6)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {executionType === 'deploy' ? (
                    <>
                      <button
                        onClick={() => {
                          setIsExecuting(false);
                          setStudioMode('single');
                          if (deployedResult) {
                            setCollectionId(deployedResult.id);
                            setTokenStandard(deployedResult.standard);
                          }
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors"
                      >
                        Mint First NFT in Contract
                      </button>
                      <button
                        onClick={() => {
                          setIsExecuting(false);
                          onOpenDashboard();
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
                      >
                        View in Dashboard
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsExecuting(false);
                          if (mintedResult) onSuccess(mintedResult);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-md transition-colors"
                      >
                        View in Marketplace
                      </button>
                      <button
                        onClick={() => {
                          setIsExecuting(false);
                          onOpenDashboard();
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
                      >
                        Go to Portfolio
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
