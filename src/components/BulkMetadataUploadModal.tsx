import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileCode, 
  Check, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Copy, 
  ArrowRight, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  ChevronRight,
  Sliders,
  Zap,
  X
} from 'lucide-react';
import { NFTTrait, TokenStandard } from '../types';

export interface ParsedAssetItem {
  name: string;
  description?: string;
  image?: string;
  price?: number | string;
  royaltyPercentage?: number;
  traits?: NFTTrait[];
  unlockableContent?: string;
  category?: string;
  standard?: TokenStandard;
}

export interface BulkMetadataUploadProps {
  onApplySingleItem: (item: ParsedAssetItem) => void;
  onSendToBulkStudio?: (items: ParsedAssetItem[]) => void;
  currentStandard?: TokenStandard;
}

const SAMPLE_METADATA_JSON = `[
  {
    "name": "Cyber Samurai #001",
    "description": "Master of the neon katana and high-voltage kinetic shielding. Forged in Neo-Tokyo Sector 7.",
    "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    "price": 0.08,
    "royaltyPercentage": 7.5,
    "traits": [
      { "trait_type": "Faction", "value": "Shadow Ronin" },
      { "trait_type": "Cyberware", "value": "Neural Blade Mark IV" },
      { "trait_type": "Rarity Tier", "value": "Mythic" },
      { "trait_type": "Power Level", "value": 98, "display_type": "number" }
    ],
    "unlockableContent": "Vault Pass: KYOTO-NEON-001 | Discord Role: Clan Elder"
  },
  {
    "name": "Aegis Sentinel #002",
    "description": "Heavy-armored bio-mechanical guardian engineered for decentralized network defense.",
    "image": "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80",
    "price": 0.06,
    "royaltyPercentage": 7.5,
    "traits": [
      { "trait_type": "Faction", "value": "Iron Citadel" },
      { "trait_type": "Cyberware", "value": "Titanium Exo-Frame" },
      { "trait_type": "Rarity Tier", "value": "Legendary" },
      { "trait_type": "Power Level", "value": 92, "display_type": "number" }
    ],
    "unlockableContent": "Vault Pass: AEGIS-SENT-002 | Access high-res 8K render"
  },
  {
    "name": "Chroma Valkyrie #003",
    "description": "Aerial vanguard commanding supersonic propulsion arrays and plasma photon blasters.",
    "image": "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=800&q=80",
    "price": 0.075,
    "royaltyPercentage": 5.0,
    "traits": [
      { "trait_type": "Faction", "value": "Solaris Guild" },
      { "trait_type": "Cyberware", "value": "Hyper-Drive Wings" },
      { "trait_type": "Rarity Tier", "value": "Epic" },
      { "trait_type": "Power Level", "value": 89, "display_type": "number" }
    ],
    "unlockableContent": "Vault Pass: VALK-SOLAR-003 | VIP community pass"
  }
]`;

const SAMPLE_OPEN_SEA_STANDARD_JSON = `{
  "name": "Nexus Genesis Archon #777",
  "description": "The sovereign intelligence overseeing decentralized smart contracts with EIP-2981 royalities.",
  "image": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
  "external_url": "https://nexus-crosschain.io/archon/777",
  "attributes": [
    { "trait_type": "Archetype", "value": "Archon Sovereign" },
    { "trait_type": "Element", "value": "Quantum Singularity" },
    { "trait_type": "Rarity Tier", "value": "Mythic" },
    { "trait_type": "Power Level", "value": 100, "display_type": "number" }
  ],
  "seller_fee_basis_points": 750,
  "fee_recipient": "0x71C...3972"
}`;

export const BulkMetadataUploadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApplySingleItem: (item: ParsedAssetItem) => void;
  onSendToBulkStudio?: (items: ParsedAssetItem[]) => void;
}> = ({ isOpen, onClose, onApplySingleItem, onSendToBulkStudio }) => {
  const [jsonText, setJsonText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedAssetItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'samples'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper parser for varying JSON formats (OpenSea standard, ERC-721 metadata standard, arrays, items wrapper)
  const parseJsonData = (rawText: string): ParsedAssetItem[] => {
    const trimmed = rawText.trim();
    if (!trimmed) throw new Error('Input text cannot be empty');

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e: any) {
      throw new Error(`Invalid JSON syntax: ${e.message || 'Check commas and brackets'}`);
    }

    let itemsArray: any[] = [];
    if (Array.isArray(parsed)) {
      itemsArray = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      itemsArray = parsed.items;
    } else if (parsed.nfts && Array.isArray(parsed.nfts)) {
      itemsArray = parsed.nfts;
    } else if (parsed.tokens && Array.isArray(parsed.tokens)) {
      itemsArray = parsed.tokens;
    } else if (typeof parsed === 'object' && parsed !== null) {
      itemsArray = [parsed];
    } else {
      throw new Error('Could not identify NFT asset list or single object in JSON');
    }

    if (itemsArray.length === 0) {
      throw new Error('Zero assets found in the parsed structure');
    }

    // Map each item to standard ParsedAssetItem
    return itemsArray.map((item, idx) => {
      // Name
      const name = item.name || item.title || item.token_name || item.nft_name || `Asset #${idx + 1}`;
      
      // Description
      const description = item.description || item.desc || item.lore || item.about || '';
      
      // Image
      const image = item.image || item.image_url || item.imageurl || item.artwork || item.media || item.imageUrl || '';
      
      // Price
      let price: number | undefined = undefined;
      if (item.price !== undefined && item.price !== null && item.price !== '') {
        const num = Number(item.price);
        if (!isNaN(num)) price = num;
      }

      // Royalty
      let royaltyPercentage: number | undefined = undefined;
      if (item.royaltyPercentage !== undefined && item.royaltyPercentage !== '') {
        const rNum = Number(item.royaltyPercentage);
        if (!isNaN(rNum)) royaltyPercentage = rNum;
      } else if (item.seller_fee_basis_points !== undefined) {
        // e.g. 750 -> 7.5%
        royaltyPercentage = Number(item.seller_fee_basis_points) / 100;
      } else if (item.royalty !== undefined) {
        const rNum = Number(item.royalty);
        if (!isNaN(rNum)) royaltyPercentage = rNum;
      }

      // Unlockable
      const unlockableContent = item.unlockableContent || item.unlockable || item.secret || item.privateContent || '';

      // Traits/Attributes extraction
      const rawAttrs = item.traits || item.attributes || item.properties || [];
      const traits: NFTTrait[] = [];

      if (Array.isArray(rawAttrs)) {
        rawAttrs.forEach((attr: any) => {
          if (attr && (attr.trait_type || attr.name || attr.key) && (attr.value !== undefined)) {
            traits.push({
              trait_type: String(attr.trait_type || attr.name || attr.key),
              value: attr.value,
              display_type: attr.display_type,
              rarityPercentage: attr.rarityPercentage || Math.floor(4 + Math.random() * 20),
            });
          }
        });
      } else if (typeof rawAttrs === 'object' && rawAttrs !== null) {
        // Key-value map: { "Faction": "Cyber", "Power": 90 }
        Object.entries(rawAttrs).forEach(([k, v]) => {
          if (v !== undefined && v !== null && typeof v !== 'object') {
            traits.push({
              trait_type: k,
              value: v as any,
              display_type: typeof v === 'number' ? 'number' : undefined,
              rarityPercentage: Math.floor(4 + Math.random() * 20),
            });
          }
        });
      }

      return {
        name,
        description,
        image,
        price,
        royaltyPercentage,
        unlockableContent,
        traits: traits.length > 0 ? traits : undefined,
        category: item.category || 'art',
      };
    });
  };

  const handleParseText = () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const items = parseJsonData(jsonText);
      setParsedItems(items);
      setSelectedIndex(0);
      setSuccessMsg(`Successfully parsed ${items.length} ${items.length === 1 ? 'asset' : 'assets'} from JSON metadata!`);
    } catch (e: any) {
      setError(e.message || 'Failed to parse JSON');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setJsonText(text);
        const items = parseJsonData(text);
        setParsedItems(items);
        setSelectedIndex(0);
        setSuccessMsg(`Loaded and parsed ${items.length} assets from "${file.name}"!`);
      } catch (err: any) {
        setError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCurrent = (itemToApply?: ParsedAssetItem) => {
    const target = itemToApply || parsedItems[selectedIndex];
    if (!target) return;
    onApplySingleItem(target);
    onClose();
  };

  const handleLoadSample = (sampleType: 'array' | 'opensea') => {
    const sample = sampleType === 'array' ? SAMPLE_METADATA_JSON : SAMPLE_OPEN_SEA_STANDARD_JSON;
    setJsonText(sample);
    try {
      const items = parseJsonData(sample);
      setParsedItems(items);
      setSelectedIndex(0);
      setError(null);
      setSuccessMsg(`Loaded sample: ${sampleType === 'array' ? '3-Item Cyberpunk Batch' : 'OpenSea / EIP Metadata Standard'}`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSendAllToBulkStudio = () => {
    if (onSendToBulkStudio && parsedItems.length > 0) {
      onSendToBulkStudio(parsedItems);
      onClose();
    }
  };

  const selectedAsset = parsedItems[selectedIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Bulk Metadata JSON Parser & Auto-Fill</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  OpenSea / ERC-721 Compliant
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Upload or paste structured JSON metadata to instantly auto-populate single asset forms or multi-item batches.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'paste' 
                    ? 'bg-zinc-800 text-cyan-400 border border-zinc-700' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste JSON
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'upload' 
                    ? 'bg-zinc-800 text-cyan-400 border border-zinc-700' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload JSON File
              </button>
              <button
                onClick={() => setActiveTab('samples')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'samples' 
                    ? 'bg-zinc-800 text-amber-400 border border-zinc-700' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sample Templates
              </button>
            </div>

            {parsedItems.length > 0 && (
              <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {parsedItems.length} {parsedItems.length === 1 ? 'Asset Loaded' : 'Assets Loaded'}
              </div>
            )}
          </div>

          {/* Tab 1: Direct JSON Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Enter JSON array (e.g. <code className="text-cyan-400">[&#123; "name": "...", "traits": [...] &#125;]</code>) or standard metadata object:</span>
                <button
                  onClick={() => handleLoadSample('array')}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Insert Sample Array
                </button>
              </div>

              <textarea
                rows={7}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={SAMPLE_METADATA_JSON}
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500/50 leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleParseText}
                  disabled={!jsonText.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Parse & Extract Metadata
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Upload JSON File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-zinc-700 hover:border-cyan-500/50 bg-zinc-950/60 hover:bg-zinc-950 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-200">Click to browse or drop JSON file here</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Supports .json, .txt containing standard NFT metadata</div>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.txt"
                className="hidden"
              />
            </div>
          )}

          {/* Tab 3: Sample Templates */}
          {activeTab === 'samples' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Multi-Asset Array (3 Items)
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Batch Array
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Multiple cybernetic avatar assets with names, descriptions, images, prices, traits, and secret unlockables.
                </p>
                <button
                  onClick={() => handleLoadSample('array')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                >
                  Load Multi-Asset Sample
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    OpenSea / EIP-721 Single Object
                  </span>
                  <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Single Object
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Standard ERC-721 token metadata with <code className="text-purple-300">attributes</code> array and <code className="text-purple-300">seller_fee_basis_points</code>.
                </p>
                <button
                  onClick={() => handleLoadSample('opensea')}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                >
                  Load Single Metadata Sample
                </button>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Parsed Results Inspector & Asset Selector */}
          {parsedItems.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              
              {/* Asset Selector Carousel / List (If multiple items) */}
              {parsedItems.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-300">Select Asset to Auto-Fill into Form:</span>
                    <span className="text-zinc-500 font-mono">
                      Asset {selectedIndex + 1} of {parsedItems.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {parsedItems.map((item, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-zinc-800 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                              : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-zinc-900 border border-zinc-800 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                                #{idx + 1}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold text-zinc-100 truncate">{item.name}</div>
                              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                {item.price ? `${item.price} Crypto` : 'Unpriced'} • {item.traits?.length || 0} traits
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[10px]">
                            <span className="text-zinc-500">Royalty: {item.royaltyPercentage ?? 7.5}%</span>
                            <span className={`font-bold ${isSelected ? 'text-cyan-400' : 'text-zinc-400'}`}>
                              {isSelected ? '✓ Selected' : 'Click to Pick'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detail Inspection Card of Selected Item */}
              {selectedAsset && (
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-zinc-200">
                        Parsed Fields Preview: <strong className="text-cyan-400 font-sans">{selectedAsset.name}</strong>
                      </span>
                    </div>
                    {selectedAsset.royaltyPercentage !== undefined && (
                      <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {selectedAsset.royaltyPercentage}% Royalty
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="sm:col-span-2 space-y-1">
                      <span className="text-zinc-500">Description:</span>
                      <p className="text-zinc-300 text-xs bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/60 leading-relaxed">
                        {selectedAsset.description || 'No description specified in JSON.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-zinc-500 block">Listing Price:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {selectedAsset.price ? `${selectedAsset.price} Native Token` : 'Not configured'}
                        </span>
                      </div>

                      {selectedAsset.unlockableContent && (
                        <div>
                          <span className="text-zinc-500 block">Unlockable Content:</span>
                          <span className="text-amber-400 font-mono text-[11px] truncate block">
                            {selectedAsset.unlockableContent}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Traits List */}
                  {selectedAsset.traits && selectedAsset.traits.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-bold text-zinc-400">
                        Parsed On-Chain Traits ({selectedAsset.traits.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAsset.traits.map((t, idx) => (
                          <div key={idx} className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] flex items-center gap-1.5">
                            <span className="text-zinc-500">{t.trait_type}:</span>
                            <span className="text-cyan-300 font-mono font-semibold">{t.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            {parsedItems.length > 1 ? (
              <span>You have <strong>{parsedItems.length}</strong> items in this JSON file.</span>
            ) : parsedItems.length === 1 ? (
              <span>1 asset ready to fill into form.</span>
            ) : (
              <span>Paste or upload JSON to auto-fill form inputs.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>

            {parsedItems.length > 1 && onSendToBulkStudio && (
              <button
                onClick={handleSendAllToBulkStudio}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/30"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open All {parsedItems.length} in Bulk Studio</span>
              </button>
            )}

            {parsedItems.length > 0 && (
              <button
                onClick={() => handleApplyCurrent()}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {parsedItems.length > 1
                    ? `Auto-Fill Selected (#${selectedIndex + 1})`
                    : 'Auto-Fill Form Fields'}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
