import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Layers, 
  Tag, 
  Sliders, 
  Eye, 
  Copy, 
  Download, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  ChevronRight, 
  Zap, 
  Lock, 
  DollarSign, 
  Filter, 
  Search, 
  FolderPlus, 
  ShieldCheck, 
  Coins, 
  HelpCircle,
  Database,
  ArrowRight,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  BulkNFTItem, 
  BulkMintConfig, 
  BulkMintProgress, 
  NFT, 
  NFTCollection, 
  NFTTrait, 
  TokenStandard, 
  BlockchainNetwork 
} from '../types';
import { useWeb3 } from '../context/Web3Context';
import { 
  parseSpreadsheetFile, 
  parseCSVText, 
  SAMPLE_SPREADSHEETS, 
  downloadCSVTemplate, 
  downloadJSONTemplate,
  exportBatchToCSV,
  exportBatchToJSON,
  generateAIBatchMetadata,
  validateBulkNFTItem
} from '../services/spreadsheetService';
import { formatCrypto, formatUsd } from '../services/gasService';
import { generateArtSVG, generateSeedAttributes } from '../services/generativeArt';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';

interface BulkMintStudioProps {
  onNavigateToDashboard?: () => void;
  onNavigateToMarketplace?: () => void;
  initialItems?: BulkNFTItem[];
}

export const BulkMintStudio: React.FC<BulkMintStudioProps> = ({
  onNavigateToDashboard,
  onNavigateToMarketplace,
  initialItems,
}) => {
  const {
    activeChain,
    currentChainConfig,
    activeAccount,
    gasData,
    collections,
    bulkMintNFTs,
    claimFaucetTokens,
  } = useWeb3();

  // Active items in the bulk batch
  const [batchItems, setBatchItems] = useState<BulkNFTItem[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems;
    }
    // Default initial sample to make the UI immediately interactive and rich
    return parseCSVText(SAMPLE_SPREADSHEETS.cyberpunkPFP.csv);
  });

  // Sync if initialItems changes
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setBatchItems(initialItems);
    }
  }, [initialItems]);

  // Target Destination Configuration
  const [targetMode, setTargetMode] = useState<'new_collection' | 'existing_collection' | 'standalone'>('new_collection');
  const [existingCollectionId, setExistingCollectionId] = useState<string>(collections[0]?.id || '');
  
  // New Collection Parameters
  const [newCollectionName, setNewCollectionName] = useState('Cyberpunk Syndicate');
  const [newCollectionSymbol, setNewCollectionSymbol] = useState('CYBER');
  const [newCollectionDescription, setNewCollectionDescription] = useState('Elite batch-minted cybernetic avatars with immutable traits.');
  const [newCollectionCategory, setNewCollectionCategory] = useState<'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility'>('pfp');
  const [newCollectionRoyalty, setNewCollectionRoyalty] = useState<number>(7.5);
  const [newCollectionStandard, setNewCollectionStandard] = useState<TokenStandard>('ERC-721');

  // Batch Listing Options
  const [isInstantListAll, setIsInstantListAll] = useState(true);
  const [defaultBatchPrice, setDefaultBatchPrice] = useState<number>(0.05);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'warning' | 'selected'>('all');

  // Preview Drawer / Modal Item
  const [previewingItem, setPreviewingItem] = useState<BulkNFTItem | null>(null);
  const [editingItem, setEditingItem] = useState<BulkNFTItem | null>(null);

  // Direct CSV/JSON Paste Modal
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // AI Batch Metadata Generator Modal State
  const [isAIGeneratorModalOpen, setIsAIGeneratorModalOpen] = useState(false);
  const [aiThemePrompt, setAiThemePrompt] = useState('Cosmic Cyber Vanguard');
  const [aiBatchCount, setAiBatchCount] = useState<number>(10);
  const [aiStyle, setAiStyle] = useState<'cyberpunk' | 'cosmic' | 'geometric' | 'glitch' | 'minimal'>('cyberpunk');
  const [aiCategory, setAiCategory] = useState<'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility'>('pfp');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Drag-and-drop state
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<BulkMintProgress>({
    step: 'idle',
    totalItems: 0,
    completedItems: 0,
    currentMintingName: '',
    txHashes: [],
    mintedNFTs: [],
    totalGasUsedCrypto: 0,
    totalGasUsedUsd: 0,
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.length === 0) {
        showNotification('No valid rows found in file', 'error');
        return;
      }
      setBatchItems(parsed);
      
      // Auto-suggest collection name from file
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNewCollectionName(baseName.charAt(0).toUpperCase() + baseName.slice(1) + ' Collection');
      setNewCollectionSymbol(baseName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'NFT');

      showNotification(`Successfully loaded ${parsed.length} NFT items from ${file.name}!`);
    } catch (err: any) {
      console.error(err);
      showNotification(`Failed to parse file: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop file upload
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDropFile = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.length === 0) {
        showNotification('No valid NFT metadata rows found in dropped file', 'error');
        return;
      }
      setBatchItems(parsed);
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setNewCollectionName(baseName.charAt(0).toUpperCase() + baseName.slice(1) + ' Collection');
      setNewCollectionSymbol(baseName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'NFT');

      showNotification(`Successfully imported ${parsed.length} NFTs from ${file.name}!`);
    } catch (err: any) {
      console.error(err);
      showNotification(`Failed to parse dropped file: ${err?.message || 'Unknown format'}`, 'error');
    }
  };

  // Trigger AI Batch Metadata Generation
  const handleExecuteAIGeneration = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      try {
        const generated = generateAIBatchMetadata({
          theme: aiThemePrompt,
          count: aiBatchCount,
          style: aiStyle,
          category: aiCategory,
          defaultPrice: defaultBatchPrice,
          defaultRoyalty: newCollectionRoyalty,
        });

        setBatchItems(generated);
        setNewCollectionName(`${aiThemePrompt} Series`);
        setNewCollectionSymbol(aiThemePrompt.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'NFT');
        setNewCollectionDescription(`Official batch collection of ${aiBatchCount} generative ${aiThemePrompt} digital collectibles with verified on-chain traits.`);
        setNewCollectionCategory(aiCategory);

        setIsAIGeneratorModalOpen(false);
        setIsGeneratingAI(false);
        showNotification(`Generated ${generated.length} unique NFT metadata items with lore, traits & artwork!`);
        
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#06b6d4', '#8b5cf6', '#a855f7', '#ec4899']
        });
      } catch (err: any) {
        setIsGeneratingAI(false);
        showNotification(`Error generating metadata: ${err?.message}`, 'error');
      }
    }, 600);
  };

  // Load sample dataset
  const loadSample = (key: keyof typeof SAMPLE_SPREADSHEETS) => {
    const sample = SAMPLE_SPREADSHEETS[key];
    const parsed = parseCSVText(sample.csv);
    setBatchItems(parsed);
    setNewCollectionName(sample.title.replace(/\s*\(\d+\s*NFTs\)/i, ''));
    setNewCollectionSymbol(sample.id.slice(0, 5).toUpperCase());
    setNewCollectionDescription(sample.description);
    showNotification(`Loaded sample: ${sample.title}`);
  };

  // Apply Raw Paste
  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;
    try {
      let parsed: BulkNFTItem[] = [];
      if (pasteText.trim().startsWith('[') || pasteText.trim().startsWith('{')) {
        const json = JSON.parse(pasteText.trim());
        const rows = Array.isArray(json) ? json : (json.items || [json]);
        // parse JSON rows
        parsed = parseCSVText(Papa.unparse(rows));
      } else {
        parsed = parseCSVText(pasteText);
      }

      if (parsed.length === 0) {
        showNotification('No valid NFT rows detected in pasted content', 'error');
        return;
      }

      setBatchItems(parsed);
      setIsPasteModalOpen(false);
      setPasteText('');
      showNotification(`Parsed ${parsed.length} items from pasted spreadsheet data!`);
    } catch (err: any) {
      showNotification(`Error parsing text: ${err?.message}`, 'error');
    }
  };

  // Toggle Selection
  const toggleItemSelection = (id: string) => {
    setBatchItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const selectAll = (selected: boolean) => {
    setBatchItems(prev => prev.map(item => ({ ...item, selected })));
  };

  // Remove single item
  const removeItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  // Add blank row
  const addBlankRow = () => {
    const newIdx = batchItems.length + 1;
    const name = `New Artifact #${String(newIdx).padStart(3, '0')}`;
    const newItem: BulkNFTItem = {
      id: `bulk-row-manual-${Date.now()}`,
      rowIndex: newIdx,
      name,
      description: 'Handcrafted unique collectible on ' + currentChainConfig.name,
      image: generateArtSVG(name, 'cyberpunk'),
      price: defaultBatchPrice,
      royaltyPercentage: newCollectionRoyalty,
      category: newCollectionCategory,
      traits: generateSeedAttributes(name, 'cyberpunk') as NFTTrait[],
      selected: true,
      validationStatus: 'valid',
      validationIssues: [],
    };
    setBatchItems(prev => [...prev, newItem]);
    showNotification(`Added new item #${newIdx}`);
  };

  // AI Batch Enhancer (Fills missing descriptions or traits)
  const handleAIBatchEnhance = () => {
    setBatchItems(prev => prev.map((item, idx) => {
      let updatedDesc = item.description;
      if (!updatedDesc || updatedDesc.length < 20) {
        updatedDesc = `An authentic digital relic #${idx + 1} generated in the decentralized nexus, imbued with quantum resonance and immutable provenance.`;
      }
      
      let updatedTraits = [...item.traits];
      if (updatedTraits.length === 0) {
        updatedTraits = generateSeedAttributes(item.name, 'cyberpunk') as NFTTrait[];
      } else {
        // Ensure Rarity Tier exists
        if (!updatedTraits.some(t => t.trait_type.toLowerCase().includes('rarity'))) {
          const tiers = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon'];
          const picked = idx === 0 ? 'Mythic' : (idx < 3 ? 'Legendary' : (idx < 6 ? 'Epic' : 'Rare'));
          updatedTraits.unshift({ trait_type: 'Rarity Tier', value: picked, rarityPercentage: picked === 'Mythic' ? 4 : (picked === 'Legendary' ? 12 : 25) });
        }
      }

      const val = validateBulkNFTItem({ ...item, description: updatedDesc, traits: updatedTraits }, idx + 1);

      return {
        ...item,
        description: updatedDesc,
        traits: updatedTraits,
        validationStatus: val.status,
        validationIssues: val.issues,
      };
    }));

    showNotification('AI Batch Enhancer upgraded lore descriptions & trait rarity distributions!');
  };

  // Selected items count
  const selectedItems = batchItems.filter(i => i.selected);
  const totalCount = batchItems.length;
  const selectedCount = selectedItems.length;

  // Filtered Items for Data Grid
  const filteredItems = batchItems.filter(item => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchTrait = item.traits.some(t => t.trait_type.toLowerCase().includes(q) || String(t.value).toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTrait) return false;
    }

    // Status filter
    if (statusFilter === 'selected') return item.selected;
    if (statusFilter === 'valid') return item.validationStatus === 'valid';
    if (statusFilter === 'warning') return item.validationStatus === 'warning' || item.validationStatus === 'error';

    return true;
  });

  // Calculate Batch Gas & Economics
  const singleMintGas = gasData.actionsEstimate.mintSingle.crypto;
  const baseMulticallGas = singleMintGas * 1.15;
  const perItemGas = singleMintGas * 0.42;
  const rawSingleTotalGas = +(singleMintGas * selectedCount).toFixed(6);
  const batchTotalMintGas = +(baseMulticallGas + Math.max(0, selectedCount - 1) * perItemGas).toFixed(6);
  const deployColGas = targetMode === 'new_collection' ? gasData.actionsEstimate.mintCollection.crypto : 0;
  const totalEstimatedGasCrypto = +(batchTotalMintGas + deployColGas).toFixed(6);
  const totalEstimatedGasUsd = +(totalEstimatedGasCrypto * currentChainConfig.usdPrice).toFixed(2);
  const gasSavingsPercent = selectedCount > 1 
    ? Math.round((1 - (batchTotalMintGas / rawSingleTotalGas)) * 100) 
    : 0;

  const currentWalletBalance = activeAccount.balances[activeChain] || 0;
  const hasSufficientBalance = currentWalletBalance >= totalEstimatedGasCrypto;

  // EXECUTE BATCH MINTING
  const handleExecuteBulkMint = async () => {
    if (selectedItems.length === 0) {
      showNotification('Please select at least 1 NFT to mint', 'error');
      return;
    }

    if (!hasSufficientBalance) {
      showNotification(`Insufficient ${currentChainConfig.symbol} balance. Claim from faucet!`, 'error');
      return;
    }

    setIsExecuting(true);
    setExecutionProgress({
      step: 'validating',
      totalItems: selectedItems.length,
      completedItems: 0,
      currentMintingName: selectedItems[0]?.name || '',
      txHashes: [],
      mintedNFTs: [],
      totalGasUsedCrypto: 0,
      totalGasUsedUsd: 0,
    });

    try {
      // Step 1: Validating schemas
      await new Promise(r => setTimeout(r, 600));

      // Step 2: Pinning to IPFS
      setExecutionProgress(prev => ({ ...prev, step: 'ipfs_upload' }));
      await new Promise(r => setTimeout(r, 800));

      // Step 3: Deploying Collection (if requested)
      if (targetMode === 'new_collection') {
        setExecutionProgress(prev => ({ ...prev, step: 'deploying_collection' }));
        await new Promise(r => setTimeout(r, 900));
      }

      // Step 4: Signing & Batch Mempool Execution
      setExecutionProgress(prev => ({ ...prev, step: 'minting_batch' }));

      const config: BulkMintConfig = {
        targetMode,
        existingCollectionId: targetMode === 'existing_collection' ? existingCollectionId : undefined,
        newCollectionName: targetMode === 'new_collection' ? newCollectionName : undefined,
        newCollectionSymbol: targetMode === 'new_collection' ? newCollectionSymbol : undefined,
        newCollectionDescription: targetMode === 'new_collection' ? newCollectionDescription : undefined,
        newCollectionCategory: targetMode === 'new_collection' ? newCollectionCategory : undefined,
        newCollectionRoyalty: targetMode === 'new_collection' ? newCollectionRoyalty : undefined,
        standard: newCollectionStandard,
        chainId: activeChain,
        isInstantListAll,
        defaultPrice: defaultBatchPrice,
        defaultRoyalty: newCollectionRoyalty,
        gasSpeed: 'fast',
      };

      const result = await bulkMintNFTs(
        selectedItems,
        config,
        (progress) => {
          setExecutionProgress(prev => ({
            ...prev,
            completedItems: progress.current,
            currentMintingName: progress.name,
          }));
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Batch minting failed');
      }

      // Step 5: Completed
      setExecutionProgress(prev => ({
        ...prev,
        step: 'completed',
        completedItems: selectedItems.length,
        mintedNFTs: result.mintedNFTs || [],
        createdCollection: result.collection,
        txHashes: result.txHash ? [result.txHash] : [],
        totalGasUsedCrypto: result.totalGasUsedCrypto || totalEstimatedGasCrypto,
        totalGasUsedUsd: result.totalGasUsedUsd || totalEstimatedGasUsd,
      }));

      // Trigger celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981'],
      });

    } catch (err: any) {
      console.error('Batch mint error:', err);
      setExecutionProgress(prev => ({
        ...prev,
        step: 'error',
        error: err?.message || 'An unexpected error occurred during batch minting',
      }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================================= */}
      {/* HEADER & INGESTION CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Batch EIP-721 & EIP-1155 Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Multicall Optimized
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Spreadsheet & JSON Bulk Minting Studio
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Upload a metadata file (CSV, JSON, Excel) or use AI to batch-create, trait-map, and deploy entire NFT collections with automated multicall gas discounts in a single transaction.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* AI Batch Metadata Auto-Generator */}
            <button
              onClick={() => setIsAIGeneratorModalOpen(true)}
              id="ai-auto-gen-metadata-btn"
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
              title="Auto-generate complete batch metadata collection with AI lore, traits, and artwork"
            >
              <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
              <span>✨ AI Auto-Generate</span>
            </button>

            {/* Template Downloads */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={downloadCSVTemplate}
                className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-850 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
                title="Download CSV spreadsheet template"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>CSV Template</span>
              </button>
              <span className="text-zinc-700">|</span>
              <button
                onClick={downloadJSONTemplate}
                className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-850 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
                title="Download ERC-721 / OpenSea JSON metadata template"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>JSON Template</span>
              </button>
            </div>

            {/* Paste Modal */}
            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 border border-zinc-700 transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Paste Code</span>
            </button>

            {/* Export Batch Dropdown / Buttons */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => exportBatchToCSV(batchItems, `${newCollectionName.replace(/\s+/g, '_')}_batch.csv`)}
                disabled={batchItems.length === 0}
                className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-850 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40"
                title="Export current batch as CSV spreadsheet"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
              <span className="text-zinc-700">|</span>
              <button
                onClick={() => exportBatchToJSON(batchItems, `${newCollectionName.replace(/\s+/g, '_')}_batch.json`)}
                disabled={batchItems.length === 0}
                className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-850 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-40"
                title="Export current batch as ERC-721 JSON array"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export JSON</span>
              </button>
            </div>

            {/* Upload File Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.json,.xlsx,.xls,.tsv,.txt"
              className="hidden"
            />
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropFile}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-5 p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDraggingFile 
              ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01]' 
              : 'border-zinc-750 hover:border-cyan-500/60 bg-zinc-950/50 hover:bg-zinc-950/80'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <span>Drag & drop metadata file or click to browse</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  CSV / JSON / XLSX
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Supports standard CSV spreadsheets, OpenSea / ERC-721 JSON metadata arrays, and Excel workbooks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAIGeneratorModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>Or Auto-Generate with AI</span>
            </button>
          </div>
        </div>

        {/* Quick Sample Loaders Pill Bar */}
        <div className="relative z-10 pt-4 mt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Quick-Load Curated Sample Sets:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SAMPLE_SPREADSHEETS).map(([k, s]) => (
              <button
                key={k}
                onClick={() => loadSample(k as any)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-purple-500/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'error'
            ? 'bg-red-950/40 border-red-500/40 text-red-300'
            : notification.type === 'info'
            ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIGURATION & DESTINATION PANEL */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Smart Contract / Collection Target (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              1. Collection & Target Smart Contract Destination
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              Chain: <strong className="text-cyan-400">{currentChainConfig.name}</strong>
            </span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-bold">
            <button
              onClick={() => setTargetMode('new_collection')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                targetMode === 'new_collection'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Contract</span>
            </button>

            <button
              onClick={() => setTargetMode('existing_collection')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                targetMode === 'existing_collection'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Existing Contract</span>
            </button>

            <button
              onClick={() => setTargetMode('standalone')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                targetMode === 'standalone'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Loose Editions</span>
            </button>
          </div>

          {/* Target Mode Specific Fields */}
          {targetMode === 'new_collection' && (
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Collection Name</label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                    placeholder="e.g. Cyberpunk Syndicate"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Symbol / Ticker</label>
                  <input
                    type="text"
                    value={newCollectionSymbol}
                    onChange={(e) => setNewCollectionSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500/60"
                    placeholder="e.g. CYBER"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Token Standard</label>
                  <select
                    value={newCollectionStandard}
                    onChange={(e) => setNewCollectionStandard(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="ERC-721">ERC-721 (Unique 1/1s)</option>
                    <option value="ERC-1155">ERC-1155 (Multi-Editions)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Category</label>
                  <select
                    value={newCollectionCategory}
                    onChange={(e) => setNewCollectionCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 capitalize focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="pfp">PFP / Avatar</option>
                    <option value="art">Fine Art / Generative</option>
                    <option value="gaming">Gaming & Metaverse</option>
                    <option value="photography">Photography</option>
                    <option value="music">Music / Audio</option>
                    <option value="utility">Utility & Access</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-400">Royalty (EIP-2981)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="25"
                      value={newCollectionRoyalty}
                      onChange={(e) => setNewCollectionRoyalty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-500/60"
                    />
                    <span className="text-xs text-zinc-500 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {targetMode === 'existing_collection' && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              <label className="text-[11px] font-semibold text-zinc-400">Select Existing Smart Contract Collection</label>
              {collections.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 text-center">
                  No deployed collections found yet. Switch to "New Contract" to deploy one!
                </div>
              ) : (
                <select
                  value={existingCollectionId}
                  onChange={(e) => setExistingCollectionId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                >
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.symbol}) — {c.currentSupply} / {c.maxSupply} minted — {c.contractAddress.slice(0, 10)}...
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {targetMode === 'standalone' && (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
              All items in the spreadsheet will be minted as individual standalone tokens under your creator address without binding to a master collection contract.
            </div>
          )}
        </div>

        {/* Right Column: Listing Defaults & Gas Multicall Summary (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              2. Batch Marketplace & Gas Economics
            </label>

            {/* Instant List Toggle */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200">Auto-List on Marketplace</span>
                <p className="text-[10px] text-zinc-500">Automatically list all minted items for sale</p>
              </div>
              <input
                type="checkbox"
                checked={isInstantListAll}
                onChange={(e) => setIsInstantListAll(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </div>

            {isInstantListAll && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-400">Default Mint Listing Price</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultBatchPrice}
                    onChange={(e) => setDefaultBatchPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500/60"
                  />
                  <span className="text-xs font-bold text-zinc-400 shrink-0">{currentChainConfig.symbol}</span>
                </div>
              </div>
            )}

            {/* Multicall Gas Breakdown */}
            <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Selected Items:</span>
                <strong className="text-zinc-200 font-mono">{selectedCount} of {totalCount}</strong>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Estimated Batch Gas:</span>
                <div className="text-right">
                  <strong className="text-cyan-400 font-mono">{totalEstimatedGasCrypto} {currentChainConfig.symbol}</strong>
                  <span className="text-[10px] text-zinc-500 block font-mono">(${totalEstimatedGasUsd} USD)</span>
                </div>
              </div>

              {gasSavingsPercent > 0 && (
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Multicall Batch Savings:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono font-bold border border-emerald-500/20">
                    ~{gasSavingsPercent}% less gas
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Balance Warning / Faucet */}
          {!hasSufficientBalance && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Low balance ({currentWalletBalance.toFixed(4)} {currentChainConfig.symbol})</span>
              </div>
              <button
                onClick={() => claimFaucetTokens(activeChain)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[10px] hover:bg-amber-400 transition-all cursor-pointer"
              >
                + Claim Faucet
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE BATCH DATA GRID & TRAIT INSPECTOR */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 overflow-hidden shadow-lg space-y-4 p-5">
        
        {/* Table Top Controls & AI Enhancer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectAll(selectedCount !== totalCount)}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                title={selectedCount === totalCount ? 'Deselect All' : 'Select All'}
              >
                {selectedCount === totalCount && totalCount > 0 ? (
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-600" />
                )}
              </button>
              <span className="text-xs font-bold text-zinc-200">
                {selectedCount} of {totalCount} Items Selected
              </span>
            </div>

            {/* Filter Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px] font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded ${statusFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setStatusFilter('valid')}
                className={`px-2 py-0.5 rounded ${statusFilter === 'valid' ? 'bg-emerald-950 text-emerald-300' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Valid
              </button>
              <button
                onClick={() => setStatusFilter('warning')}
                className={`px-2 py-0.5 rounded ${statusFilter === 'warning' ? 'bg-amber-950 text-amber-300' : 'text-zinc-400 hover:text-zinc-300'}`}
              >
                Warnings ({batchItems.filter(i => i.validationStatus !== 'valid').length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search name, traits, lore..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* AI Batch Enhancer Button */}
            <button
              onClick={handleAIBatchEnhance}
              id="ai-batch-enhance-btn"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-900/30 transition-all shrink-0 cursor-pointer"
              title="Auto-generate missing lore, descriptions, and balanced trait rarity tiers with Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span className="hidden sm:inline">✨ AI Batch Enhancer</span>
              <span className="sm:hidden">AI Enhance</span>
            </button>

            {/* Add blank row */}
            <button
              onClick={addBlankRow}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1 transition-all shrink-0"
              title="Add a new blank item row to batch"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        {/* Live Data Grid Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-[11px] uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 w-12 text-center">Asset</th>
                <th className="py-3 px-4 min-w-[180px]">NFT Title</th>
                <th className="py-3 px-4 min-w-[220px]">Narrative Lore & Description</th>
                <th className="py-3 px-3 w-28">Price</th>
                <th className="py-3 px-4 min-w-[200px]">Traits & Attributes</th>
                <th className="py-3 px-3 w-24 text-center">Status</th>
                <th className="py-3 px-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    No NFT items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-zinc-900/40 transition-colors ${
                      !item.selected ? 'opacity-50 bg-zinc-950/30' : ''
                    }`}
                  >
                    {/* Checkbox & Row Index */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Image Thumbnail */}
                    <td className="py-3 px-3 text-center">
                      <div
                        onClick={() => setPreviewingItem(item)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-cyan-400 transition-all mx-auto relative group"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    </td>

                    {/* Editable Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                        }}
                        className="w-full bg-transparent font-bold text-zinc-100 focus:outline-none focus:bg-zinc-900/80 px-1.5 py-1 rounded"
                      />
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500">
                        <span className="font-mono">Token #{String(item.rowIndex).padStart(3, '0')}</span>
                        {item.category && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 capitalize">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Description preview */}
                    <td className="py-3 px-4">
                      <p className="line-clamp-2 text-zinc-400 text-[11px] leading-relaxed">
                        {item.description}
                      </p>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={isInstantListAll ? defaultBatchPrice.toString() : 'Unlisted'}
                          value={item.price !== undefined ? item.price : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, price: val } : i));
                          }}
                          className="w-16 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
                        />
                        <span className="text-[10px] text-zinc-500">{currentChainConfig.symbol}</span>
                      </div>
                    </td>

                    {/* Traits Pills */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {item.traits.slice(0, 3).map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 truncate max-w-[110px]"
                            title={`${t.trait_type}: ${t.value}`}
                          >
                            <span className="text-zinc-500">{t.trait_type}: </span>
                            <strong className="text-purple-300">{t.value}</strong>
                          </span>
                        ))}
                        {item.traits.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold">
                            +{item.traits.length - 3} more
                          </span>
                        )}
                        {item.traits.length === 0 && (
                          <span className="text-[10px] text-zinc-600 italic">No traits</span>
                        )}
                      </div>
                    </td>

                    {/* Validation Status */}
                    <td className="py-3 px-3 text-center">
                      {item.validationStatus === 'valid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Valid
                        </span>
                      ) : item.validationStatus === 'warning' ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1 cursor-help"
                          title={item.validationIssues?.join(', ')}
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> Warning
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 inline-flex items-center gap-1 cursor-help"
                          title={item.validationIssues?.join(', ')}
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> Error
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewingItem(item)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Preview Full NFT Metadata Card"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          title="Delete from batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Primary Action Button Bar */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Ready to mint <strong>{selectedCount}</strong> items on <strong>{currentChainConfig.name}</strong> with target destination: <strong>{targetMode === 'new_collection' ? `New Collection "${newCollectionName}"` : (targetMode === 'existing_collection' ? 'Existing Smart Contract' : 'Loose Editions')}</strong>
            </span>
          </div>

          <button
            onClick={handleExecuteBulkMint}
            disabled={selectedCount === 0 || !hasSufficientBalance || isExecuting}
            id="execute-bulk-mint-btn"
            className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Execute Batch Mint ({selectedCount} NFTs)</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* PREVIEW SINGLE ITEM MODAL */}
      {/* ========================================================================= */}
      {previewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                NFT Metadata Card Preview
              </span>
              <button
                onClick={() => setPreviewingItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="aspect-square w-full max-w-xs mx-auto rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
                <img
                  src={previewingItem.image}
                  alt={previewingItem.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">{previewingItem.name}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {previewingItem.description}
                </p>
              </div>

              {previewingItem.traits.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Attributes ({previewingItem.traits.length})</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {previewingItem.traits.map((t, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase block">{t.trait_type}</span>
                        <strong className="text-xs text-cyan-300 font-semibold block truncate">{t.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewingItem.unlockableContent && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Unlockable Content
                  </span>
                  <p className="text-xs font-mono text-zinc-400">{previewingItem.unlockableContent}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button
                onClick={() => setPreviewingItem(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASTE RAW CSV / JSON MODAL */}
      {/* ========================================================================= */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Paste Raw CSV or JSON Spreadsheet Content
              </span>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-zinc-400">
                Paste raw CSV lines (e.g. from Google Sheets / Excel copy-paste) or a JSON array of NFT objects:
              </p>
              <textarea
                rows={10}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Name,Description,Price,Royalty,Trait: Archetype,Trait: Rarity Tier\nCyber Samurai #001,"Master of neon katana",0.08,7.5,Ronin,Mythic\nAegis Sentinel #002,"Heavy armored defender",0.06,7.5,Guardian,Legendary`}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500/50 leading-relaxed"
              />
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPaste}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/30"
              >
                Parse & Load Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AI AUTO-GENERATE BATCH METADATA MODAL */}
      {/* ========================================================================= */}
      {isAIGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col space-y-0">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">✨ AI Batch Metadata Generator</h3>
                  <p className="text-[11px] text-zinc-400">Synthesize a complete NFT collection with lore, traits & procedural art</p>
                </div>
              </div>
              <button
                onClick={() => setIsAIGeneratorModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Collection Theme Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span>Collection Theme & Narrative Prompt</span>
                  <span className="text-[10px] text-zinc-400 font-normal">e.g. Cyberpunk Ronin, Solarpunk Titans</span>
                </label>
                <input
                  type="text"
                  value={aiThemePrompt}
                  onChange={(e) => setAiThemePrompt(e.target.value)}
                  placeholder="e.g. Neo-Tokyo Cyber Sentinels, Cosmic Void Explorers"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500/60"
                />

                {/* Quick Theme Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Cyberpunk Mecha Vanguard',
                    'Cosmic Void Stargazers',
                    'Solarpunk Eco-Architects',
                    'Mythic Relic Keepers',
                    'Hyper-Glitch Crypto Punks',
                    'Aetherial Star Guardians'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAiThemePrompt(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                        aiThemePrompt === preset
                          ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Size Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-zinc-200">Collection Batch Size</label>
                  <span className="font-mono text-cyan-400 font-bold">{aiBatchCount} NFTs</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 15, 20, 30].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setAiBatchCount(count)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        aiBatchCount === count
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {count} items
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Style & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Visual Art Style</label>
                  <select
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500/60"
                  >
                    <option value="cyberpunk">Cyberpunk Neon</option>
                    <option value="cosmic">Cosmic Nebula</option>
                    <option value="geometric">Geometric Vector</option>
                    <option value="glitch">Glitch Protocol</option>
                    <option value="minimal">Dark Minimalist</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Metadata Category</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500/60"
                  >
                    <option value="pfp">PFP / Avatar</option>
                    <option value="art">Digital Art</option>
                    <option value="gaming">Gaming Asset</option>
                    <option value="metaverse">Metaverse Land/Prop</option>
                    <option value="utility">Membership / Pass</option>
                  </select>
                </div>
              </div>

              {/* Information Highlights */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs text-zinc-400">
                <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  What AI Metadata Auto-Generation creates:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400 pl-1">
                  <li>Unique algorithmic titles (e.g. <span className="text-zinc-200 font-mono">"{aiThemePrompt} Prime Vanguard #001"</span>)</li>
                  <li>Distinct worldbuilding narrative lore descriptions</li>
                  <li>Mathematical 5-tier rarity attributes (<span className="text-purple-300 font-semibold">Mythic, Legendary, Epic, Rare, Uncommon</span>)</li>
                  <li>Procedural SVG vector art seeds matching chosen aesthetic</li>
                  <li>Tokenized vault unlockables and access keys</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <button
                onClick={() => setIsAIGeneratorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAIGeneration}
                disabled={isGeneratingAI}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAI ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Metadata...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Generate & Populate {aiBatchCount} NFTs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MULTI-STEP BATCH EXECUTION PROGRESS MODAL */}
      {/* ========================================================================= */}
      {isExecuting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/25">
                {executionProgress.step === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : executionProgress.step === 'error' ? (
                  <AlertTriangle className="w-6 h-6 text-white" />
                ) : (
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {executionProgress.step === 'validating' && 'Validating Spreadsheet Metadata...'}
                {executionProgress.step === 'ipfs_upload' && 'Pinning Batch Metadata to IPFS Gateway...'}
                {executionProgress.step === 'deploying_collection' && `Deploying Smart Contract: ${newCollectionName}...`}
                {executionProgress.step === 'minting_batch' && `Executing Multicall Batch Mint (${executionProgress.completedItems}/${executionProgress.totalItems})...`}
                {executionProgress.step === 'completed' && `Batch Minting Complete!`}
                {executionProgress.step === 'error' && 'Batch Execution Error'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                {executionProgress.step === 'completed'
                  ? `Successfully minted and registered ${executionProgress.totalItems} NFTs on ${currentChainConfig.name}.`
                  : executionProgress.currentMintingName
                  ? `Processing: "${executionProgress.currentMintingName}"`
                  : 'Broadcasting batch signature to the decentralized mempool.'}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 transition-all duration-300 rounded-full"
                  style={{
                    width: executionProgress.step === 'completed'
                      ? '100%'
                      : executionProgress.step === 'validating'
                      ? '15%'
                      : executionProgress.step === 'ipfs_upload'
                      ? '35%'
                      : executionProgress.step === 'deploying_collection'
                      ? '60%'
                      : `${Math.max(65, (executionProgress.completedItems / Math.max(1, executionProgress.totalItems)) * 100)}%`
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>Step: {executionProgress.step.replace('_', ' ').toUpperCase()}</span>
                <span>{executionProgress.completedItems} / {executionProgress.totalItems} Tokens</span>
              </div>
            </div>

            {/* Success Results Showcase */}
            {executionProgress.step === 'completed' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Total Minted:</span>
                    <strong className="text-emerald-400 font-mono font-bold">{executionProgress.totalItems} NFTs</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Multicall Batch Tx Hash:</span>
                    <span className="font-mono text-cyan-400 text-[11px] truncate max-w-xs">
                      {executionProgress.txHashes[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Gas Spent:</span>
                    <span className="font-mono text-purple-300 font-semibold">
                      {executionProgress.totalGasUsedCrypto} {currentChainConfig.symbol} (${executionProgress.totalGasUsedUsd} USD)
                    </span>
                  </div>
                </div>

                {/* Newly Minted Mini Preview Grid */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400">Batch Preview:</span>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {executionProgress.mintedNFTs.slice(0, 6).map((nft, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0 relative group">
                        <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-mono text-white text-center truncate px-1">
                          {nft.tokenId}
                        </div>
                      </div>
                    ))}
                    {executionProgress.mintedNFTs.length > 6 && (
                      <div className="w-16 h-16 rounded-xl border border-zinc-800 bg-zinc-950 shrink-0 flex items-center justify-center text-xs font-bold text-zinc-400">
                        +{executionProgress.mintedNFTs.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {executionProgress.step === 'error' && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs space-y-1">
                <strong>Batch Minting Notice:</strong>
                <p>{executionProgress.error}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              {executionProgress.step === 'completed' ? (
                <>
                  {onNavigateToDashboard && (
                    <button
                      onClick={() => {
                        setIsExecuting(false);
                        onNavigateToDashboard();
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all"
                    >
                      View in Dashboard Portfolio
                    </button>
                  )}
                  {onNavigateToMarketplace && (
                    <button
                      onClick={() => {
                        setIsExecuting(false);
                        onNavigateToMarketplace();
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all"
                    >
                      Browse in Marketplace
                    </button>
                  )}
                  <button
                    onClick={() => setIsExecuting(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold"
                  >
                    Done
                  </button>
                </>
              ) : executionProgress.step === 'error' ? (
                <button
                  onClick={() => setIsExecuting(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
                >
                  Dismiss
                </button>
              ) : null}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
