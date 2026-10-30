import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { createPublicClient, createWalletClient, custom, decodeEventLog, getAddress, zeroAddress } from 'viem';
import { polygon } from 'viem/chains';
import { 
  BlockchainNetwork, 
  ChainConfig, 
  NetworkMode,
  NFT, 
  NFTCollection, 
  WalletAccount, 
  GasEstimation, 
  TransactionRecord, 
  RoyaltyPayoutRecord,
  NFTOffer,
  BulkNFTItem,
  BulkMintConfig,
  BridgeProtocol,
  BridgeStandard,
  BridgeTransaction,
  BridgeQuote,
  BatchRoyaltyUpdateItem,
  BatchRoyaltyResult
} from '../types';
import { SUPPORTED_CHAINS, CHAIN_LIST } from '../data/chains';
import { INITIAL_COLLECTIONS, INITIAL_NFTS, INITIAL_ROYALTY_LOGS, INITIAL_TRANSACTIONS } from '../data/catalogDefaults';
import { calculateGasTiers } from '../services/gasService';
import { 
  BRIDGE_PROTOCOLS, 
  INITIAL_BRIDGE_TRANSACTIONS, 
  calculateBridgeQuote, 
  getBridgedContractAddress, 
  getRequiredConfirmations 
} from '../services/bridgeService';
import { 
  WIP_COLLECTION, 
  WIP_LOGO_COLLECTION, 
  COLLECTION_FACTORY_1000, 
  WIP_FACTORY,
  ENFORCE_ROYALTIES, 
  ROYALTY_WALLET,
  WIP_AUTHORIZED_MINTERS,
  isAuthorizedWipMinter
} from '../config/wipCollection';
import { collectionFactoryAbi, logoCollectionAbi, wipCollectionAbi, wipFactoryAbi } from '../abi/polygonContracts';

const polygonTransferAbi = [{ type: 'event', name: 'Transfer', anonymous: false, inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: true, name: 'tokenId', type: 'uint256' }] }] as const;
const MAX_ON_CHAIN_METADATA_URI_BYTES = 24 * 1024;

function encodeJsonDataUri(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:application/json;base64,${btoa(binary)}`;
}

function buildNftMetadataUri(nftData: Partial<NFT>, image: string): string {
  return encodeJsonDataUri({
    name: nftData.name,
    description: nftData.description || '',
    image,
    attributes: (nftData.traits || []).map(trait => ({ trait_type: trait.trait_type, value: trait.value })),
  });
}

async function optimizeInlineImageForOnChainMetadata(
  source: string,
  metadataUriForImage: (image: string) => string,
): Promise<{ image: string; metadataUri: string }> {
  let metadataUri = metadataUriForImage(source);
  if (new TextEncoder().encode(metadataUri).length <= MAX_ON_CHAIN_METADATA_URI_BYTES) {
    return { image: source, metadataUri };
  }

  if (!source.startsWith('data:image/')) {
    throw new Error('The metadata is too large for this collection. Shorten the description or use an IPFS/HTTPS image URL.');
  }
  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    throw new Error('This image is too large to embed on-chain. Use an IPFS or HTTPS image URL instead.');
  }

  const loadedImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The uploaded image could not be optimized. Use an IPFS or HTTPS image URL instead.'));
    image.src = source;
  });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image optimization is unavailable in this browser. Use an IPFS or HTTPS image URL instead.');

  for (const maxDimension of [1024, 768, 512, 384, 256, 192, 128]) {
    const scale = Math.min(1, maxDimension / Math.max(loadedImage.naturalWidth, loadedImage.naturalHeight));
    canvas.width = Math.max(1, Math.round(loadedImage.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(loadedImage.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.78, 0.62, 0.46, 0.32]) {
      let optimizedImage = canvas.toDataURL('image/webp', quality);
      if (!optimizedImage.startsWith('data:image/webp,')) {
        optimizedImage = canvas.toDataURL('image/jpeg', quality);
      }
      metadataUri = metadataUriForImage(optimizedImage);
      if (new TextEncoder().encode(metadataUri).length <= MAX_ON_CHAIN_METADATA_URI_BYTES) {
        return { image: optimizedImage, metadataUri };
      }
    }
  }

  throw new Error('This image is still too large after automatic optimization. Use a hosted IPFS or HTTPS image URL to keep its full resolution.');
}

async function getConnectedPolygonClients(accountAddress: string): Promise<{ wallet: any; public: any; account: `0x${string}` }> {
  if (typeof window === 'undefined') throw new Error('Connect a Polygon wallet to continue.');
  const win = window as any;
  const providers = Array.from(new Set([
    ...(Array.isArray(win.ethereum?.providers) ? win.ethereum.providers : []),
    win.ethereum,
    win.coinbaseWalletExtension,
    win.phantom?.ethereum,
  ].filter(Boolean)));
  for (const provider of providers) {
    if (!provider || typeof provider.request !== 'function') continue;
    const accounts = await provider.request({ method: 'eth_accounts' }).catch(() => []);
    if (!Array.isArray(accounts) || !accounts.some((address: string) => address.toLowerCase() === accountAddress.toLowerCase())) continue;
    const chainId = Number.parseInt(await provider.request({ method: 'eth_chainId' }), 16);
    if (chainId !== 137) throw new Error('Switch your wallet to Polygon Mainnet (chain 137), then try again.');
    const account = getAddress(accountAddress);
    return {
      wallet: createWalletClient({ account, chain: polygon, transport: custom(provider) }),
      public: createPublicClient({ chain: polygon, transport: custom(provider) }),
      account,
    };
  }
  throw new Error('Reconnect the currently selected wallet before submitting a Polygon transaction.');
}

// Verified On-Chain Polygon Creator Wallets & Web3 Keyring
export const AUTHORIZED_ACCOUNTS: WalletAccount[] = [
  // Wallets must be connected through an injected provider. Never seed private-looking
  // accounts or balances into a production session.
];

export const DEMO_ACCOUNTS = AUTHORIZED_ACCOUNTS;

interface Web3ContextType {
  // Network
  activeChain: BlockchainNetwork;
  currentChainConfig: ChainConfig;
  allChains: ChainConfig[];
  switchChain: (chain: BlockchainNetwork) => void;
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  toggleNetworkMode: () => void;

  // Gas
  gasData: GasEstimation;
  selectedGasSpeed: 'slow' | 'standard' | 'fast' | 'instant';
  setSelectedGasSpeed: (speed: 'slow' | 'standard' | 'fast' | 'instant') => void;
  gasHistory: { time: string; gwei: number }[];

  // Wallet
  isConnected: boolean;
  activeAccount: WalletAccount;
  allAccounts: WalletAccount[];
  connectInjectedWallet: (providerName: string) => Promise<boolean>;
  connectAccount: (account: WalletAccount) => void;
  connectDemoAccount: (account: WalletAccount) => void;
  connectPublicAddress: (address: string) => void;
  disconnectWallet: () => void;
  claimFaucetTokens: (chain?: BlockchainNetwork) => Promise<number>;
  activeBalance: number;

  // NFTs & Collections
  nfts: NFT[];
  collections: NFTCollection[];
  transactions: TransactionRecord[];
  royaltyLogs: RoyaltyPayoutRecord[];
  offers: NFTOffer[];
  bridgeTransactions: BridgeTransaction[];
  wipConfig: typeof WIP_COLLECTION;
  isWipCollection: (contractOrCollectionId: string) => boolean;
  isAuthorizedWipMinter: (address?: string) => boolean;
  isCurrentUserAuthorizedWipMinter: boolean;
  wipAuthorizedMinters: readonly string[];
  importOnChainCollection: (contractAddress: string) => Promise<{ success: boolean; collection?: NFTCollection; error?: string; tokensCount?: number }>;
  polygonBlockNumber: number;

  // Actions
  mintNFT: (nftData: Partial<NFT>, gasSpeed?: 'slow' | 'standard' | 'fast' | 'instant', onSubmitted?: (txHash: string) => void) => Promise<{ success: boolean; nft?: NFT; txHash?: string; error?: string }>;
  bulkMintNFTs: (
    items: BulkNFTItem[],
    config: BulkMintConfig,
    onProgress?: (progress: { current: number; total: number; name: string }) => void
  ) => Promise<{
    success: boolean;
    mintedNFTs?: NFT[];
    collection?: NFTCollection;
    txHash?: string;
    totalGasUsedCrypto?: number;
    totalGasUsedUsd?: number;
    error?: string;
  }>;
  deployCollection: (collectionData: Partial<NFTCollection>, onSubmitted?: (txHash: string) => void, factoryType?: 'collection' | 'wip') => Promise<{ success: boolean; collection?: NFTCollection; txHash?: string; error?: string }>;
  listNFTForSale: (nftId: string, price: number) => Promise<boolean>;
  delistNFT: (nftId: string) => Promise<boolean>;
  buyNFT: (nftId: string) => Promise<{ success: boolean; royaltyPaid?: number; error?: string; txHash?: string }>;
  transferNFT: (nftId: string, recipientAddress: string) => Promise<boolean>;
  burnNFT: (nftId: string) => Promise<boolean>;
  makeOffer: (nftId: string, amount: number) => Promise<boolean>;
  acceptOffer: (offerId: string) => Promise<boolean>;
  toggleLikeNFT: (nftId: string) => void;
  bridgeNFT: (params: {
    nftId: string;
    destinationChain: BlockchainNetwork;
    recipientAddress: string;
    protocol: BridgeProtocol;
    gasSpeed?: 'slow' | 'standard' | 'fast' | 'instant';
    gasDropCrypto?: number;
    onStepUpdate?: (step: number, message: string) => void;
  }) => Promise<{ success: boolean; bridgeTx?: BridgeTransaction; error?: string }>;
  clearBridgeHistory: () => void;
  batchUpdateRoyalties: (updates: BatchRoyaltyUpdateItem[]) => Promise<BatchRoyaltyResult>;

  // Auto-Sync for Work In Progress - WIP & Logo Collections & On-Chain Contracts
  isAutoSyncing: boolean;
  autoSyncEnabled: boolean;
  toggleAutoSync: () => void;
  lastSyncTimestamp: number | null;
  syncWipCollections: (silent?: boolean) => Promise<{ success: boolean; totalWipCount: number; newCount: number }>;
  wipTotalCount: number;
  
  // Stats
  totalPortfolioValueUsd: number;
  totalRoyaltyEarnedUsd: number;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const STORAGE_KEYS = {
  NFTS: 'crosschain_nft_platform_nfts_v3_chain_indexed',
  COLLECTIONS: 'crosschain_nft_platform_collections_v3_chain_indexed',
  TRANSACTIONS: 'crosschain_nft_platform_txs_v3_chain_only',
  ROYALTIES: 'crosschain_nft_platform_royalties_v3_chain_only',
  ACTIVE_CHAIN: 'crosschain_nft_platform_active_chain',
  NETWORK_MODE: 'crosschain_nft_platform_network_mode',
  WALLET_INDEX: 'crosschain_nft_platform_wallet_index',
  BALANCES: 'crosschain_nft_platform_wallet_balances_v3_chain_only',
  BRIDGE_TXS: 'crosschain_nft_platform_bridge_txs_v3_chain_only',
};

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[Storage] Failed to write key "${key}" to localStorage:`, err);
    try {
      // If quota exceeded, clear non-critical caches to free up quota
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.BRIDGE_TXS);
      localStorage.removeItem(STORAGE_KEYS.ROYALTIES);
      localStorage.setItem(key, value);
    } catch {
      // Gracefully continue in memory
    }
  }
};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Active Chain
  const [activeChain, setActiveChain] = useState<BlockchainNetwork>(() => {
    const defaultApplied = safeGetItem('wip_nft_default_polygon_applied_v1');
    if (!defaultApplied) {
      safeSetItem('wip_nft_default_polygon_applied_v1', 'true');
      safeSetItem(STORAGE_KEYS.ACTIVE_CHAIN, 'polygon');
      return 'polygon';
    }
    const saved = safeGetItem(STORAGE_KEYS.ACTIVE_CHAIN);
    return (saved && SUPPORTED_CHAINS[saved as BlockchainNetwork]) ? (saved as BlockchainNetwork) : 'polygon';
  });

  // Network Mode: Mainnet vs Testnet
  const [networkMode, setNetworkMode] = useState<NetworkMode>(() => {
    const saved = safeGetItem(STORAGE_KEYS.NETWORK_MODE);
    return (saved === 'mainnet' || saved === 'testnet') ? (saved as NetworkMode) : 'mainnet';
  });

  const toggleNetworkMode = () => {
    setNetworkMode(prev => (prev === 'mainnet' ? 'testnet' : 'mainnet'));
  };

  // Helper to filter out legacy demo materials if stored in local storage
  const isDemoNft = (nft: any): boolean => {
    if (!nft) return true;
    const owner = String(nft.ownerAddress || '').toLowerCase();
    const creator = String(nft.creatorAddress || '').toLowerCase();
    const id = String(nft.id || '').toLowerCase();
    const colId = String(nft.collectionId || '').toLowerCase();
    if (owner.includes('demowallet') || creator.includes('demowallet')) return true;
    if (['nft-1', 'nft-2', 'nft-3', 'nft-4', 'nft-5', 'nft-seed-1', 'nft-seed-2'].includes(id)) return true;
    if (['col-cyber-samurais', 'col-void-punks', 'col-sol-astrals', 'col-arbitrum-mecha', 'col-aether-drifters', 'col-terra-roots'].includes(colId)) return true;
    return false;
  };

  const isDemoCollection = (col: any): boolean => {
    if (!col) return true;
    const id = String(col.id || '').toLowerCase();
    const creator = String(col.creatorAddress || '').toLowerCase();
    if (creator.includes('demowallet')) return true;
    if (['col-cyber-samurais', 'col-void-punks', 'col-sol-astrals', 'col-arbitrum-mecha', 'col-aether-drifters', 'col-terra-roots'].includes(id)) return true;
    return false;
  };

  // Wallet
  const [accounts, setAccounts] = useState<WalletAccount[]>(() => {
    const savedBalances = safeGetItem(STORAGE_KEYS.BALANCES);
    if (savedBalances) {
      try {
        const parsed = JSON.parse(savedBalances);
        return AUTHORIZED_ACCOUNTS.map((acc) => ({
          ...acc,
          balances: parsed[acc.address] || acc.balances,
        }));
      } catch {
        return AUTHORIZED_ACCOUNTS;
      }
    }
    return AUTHORIZED_ACCOUNTS;
  });

  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(() => {
    const saved = safeGetItem(STORAGE_KEYS.WALLET_INDEX);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [polygonBlockNumber, setPolygonBlockNumber] = useState<number>(0);

  // Gas Engine State
  const [selectedGasSpeed, setSelectedGasSpeed] = useState<'slow' | 'standard' | 'fast' | 'instant'>('standard');
  const [baseGweiMultiplier, setBaseGweiMultiplier] = useState<number>(1);
  const [gasHistory, setGasHistory] = useState<{ time: string; gwei: number }[]>([
    { time: '10m ago', gwei: 16.5 },
    { time: '8m ago', gwei: 17.2 },
    { time: '6m ago', gwei: 19.8 },
    { time: '4m ago', gwei: 18.1 },
    { time: '2m ago', gwei: 17.6 },
    { time: 'Now', gwei: 18.0 },
  ]);

  // Data collections - strictly deduplicated by ID and on-chain contract/token key, zero demo items
  const [nfts, setNfts] = useState<NFT[]>(() => {
    let list: NFT[] = [];
    const saved = safeGetItem(STORAGE_KEYS.NFTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.filter(n => !isDemoNft(n));
        }
      } catch {}
    }

    const combined = [...list, ...INITIAL_NFTS.filter(n => !isDemoNft(n))];
    const uniqueMap = new Map<string, NFT>();
    const seenContractTokens = new Set<string>();

    for (const nft of combined) {
      if (!nft || !nft.id || isDemoNft(nft)) continue;
      const lowerId = String(nft.id).toLowerCase();
      if (uniqueMap.has(lowerId)) continue;

      if (nft.contractAddress && nft.tokenId) {
        const tokenKey = `${nft.contractAddress.toLowerCase()}:${String(nft.tokenId).replace(/^#/, '').toLowerCase()}`;
        if (seenContractTokens.has(tokenKey)) continue;
        seenContractTokens.add(tokenKey);
      }

      uniqueMap.set(lowerId, nft);
    }

    const result = Array.from(uniqueMap.values());
    safeSetItem(STORAGE_KEYS.NFTS, JSON.stringify(result));
    return result;
  });

  const [collections, setCollections] = useState<NFTCollection[]>(() => {
    let list = INITIAL_COLLECTIONS.filter(c => !isDemoCollection(c));
    const saved = safeGetItem(STORAGE_KEYS.COLLECTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(c => !isDemoCollection(c));
          const existingIds = new Set(filtered.map((c: NFTCollection) => c.id || c.contractAddress?.toLowerCase()));
          const missingInitial = INITIAL_COLLECTIONS.filter(c => !isDemoCollection(c) && !existingIds.has(c.id) && !existingIds.has(c.contractAddress?.toLowerCase()));
          list = [...filtered, ...missingInitial];
        }
      } catch {}
    }

    // Deduplicate collections
    const uniqueMap = new Map<string, NFTCollection>();
    for (const col of list) {
      if (!col || isDemoCollection(col)) continue;
      const key = col.id ? col.id.toLowerCase() : col.contractAddress?.toLowerCase();
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, col);
      }
    }
    list = Array.from(uniqueMap.values());
    safeSetItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(list));
    return list;
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter(tx => typeof tx?.txHash === 'string' && /^0x[a-f0-9]{64}$/i.test(tx.txHash)) : [];
      } catch {}
    }
    return INITIAL_TRANSACTIONS;
  });

  const [royaltyLogs, setRoyaltyLogs] = useState<RoyaltyPayoutRecord[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.ROYALTIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter(log => typeof log?.txHash === 'string' && /^0x[a-f0-9]{64}$/i.test(log.txHash)) : [];
      } catch {}
    }
    return INITIAL_ROYALTY_LOGS;
  });

  const [offers, setOffers] = useState<NFTOffer[]>([]);

  const [bridgeTransactions, setBridgeTransactions] = useState<BridgeTransaction[]>(() => {
    const saved = safeGetItem(STORAGE_KEYS.BRIDGE_TXS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_BRIDGE_TRANSACTIONS;
  });

  // Safe Sync to local storage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.NFTS, JSON.stringify(nfts));
  }, [nfts]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.ROYALTIES, JSON.stringify(royaltyLogs));
  }, [royaltyLogs]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.BRIDGE_TXS, JSON.stringify(bridgeTransactions));
  }, [bridgeTransactions]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.ACTIVE_CHAIN, activeChain);
  }, [activeChain]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.NETWORK_MODE, networkMode);
  }, [networkMode]);

  useEffect(() => {
    safeSetItem(STORAGE_KEYS.WALLET_INDEX, activeAccountIndex.toString());
  }, [activeAccountIndex]);

  useEffect(() => {
    const balanceMap: Record<string, Record<BlockchainNetwork, number>> = {};
    accounts.forEach(a => {
      balanceMap[a.address] = a.balances;
    });
    safeSetItem(STORAGE_KEYS.BALANCES, JSON.stringify(balanceMap));
  }, [accounts]);

  const activeAccount = accounts[activeAccountIndex] || accounts[0] || {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Wallet not connected',
    avatar: '',
    type: 'watcher' as const,
    providerName: 'None',
    balances: { ethereum: 0, polygon: 0, arbitrum: 0, base: 0, solana: 0, avalanche: 0, bsc: 0 },
  };

  // === AUTO-SYNC WORK IN PROGRESS - WIP & LOGO COLLECTIONS ===
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);

  const wipTotalCount = nfts.filter(n => 
    n.collectionId === 'col-wip-polygon' || 
    n.collectionId === 'col-wip-logo-polygon' ||
    n.contractAddress?.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase() ||
    n.contractAddress?.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase()
  ).length;

  const toggleAutoSync = useCallback(() => {
    setAutoSyncEnabled(prev => !prev);
  }, []);

  const syncWipCollections = useCallback(async (silent = false): Promise<{ success: boolean; totalWipCount: number; newCount: number }> => {
    if (!silent) setIsAutoSyncing(true);
    let newItemsAdded = 0;
    let finalWipCount = 0;
    let finalLogoCount = 0;
    let syncSucceeded = false;

    try {
      let tokensFromBackend: any[] = [];
      try {
        const [wipRes, onchainRes, colRes] = await Promise.allSettled([
          fetch('/api/wip/tokens'),
          fetch('/api/onchain/marketplace-sync'),
          fetch('/api/onchain/collections'),
        ]);

        if (wipRes.status === 'fulfilled' && wipRes.value.ok) {
          const json = await wipRes.value.json();
          if (json.success && Array.isArray(json.tokens)) {
            tokensFromBackend.push(...json.tokens);
            syncSucceeded = true;
          }
        }

        if (onchainRes.status === 'fulfilled' && onchainRes.value.ok) {
          const json = await onchainRes.value.json();
          if (json.currentBlock) {
            setPolygonBlockNumber(json.currentBlock);
          }
          if (json.success && Array.isArray(json.tokens)) {
            tokensFromBackend.push(...json.tokens);
            syncSucceeded = true;
          }
        }

        if (colRes.status === 'fulfilled' && colRes.value.ok) {
          const json = await colRes.value.json();
          if (json.success && Array.isArray(json.collections)) {
            syncSucceeded = true;
            setCollections(prevCols => {
              const prevMap = new Map<string, NFTCollection>(prevCols.map(c => [c.contractAddress?.toLowerCase() || c.id.toLowerCase(), c]));
              for (const col of (json.collections as any[])) {
                const key = String(col.contractAddress || col.id || '').toLowerCase();
                if (!key) continue;
                const existing = prevMap.get(key);
                if (existing) {
                  prevMap.set(key, {
                    ...existing,
                    name: col.name || existing.name,
                    symbol: col.symbol || existing.symbol,
                    currentSupply: Number.isFinite(Number(col.currentSupply)) ? Number(col.currentSupply) : existing.currentSupply,
                    maxSupply: Number.isFinite(Number(col.maxSupply)) && Number(col.maxSupply) > 0 ? Number(col.maxSupply) : existing.maxSupply,
                    verified: true,
                  });
                } else {
                  prevMap.set(key, {
                    id: col.id || col.contractAddress?.toLowerCase(),
                    contractAddress: col.contractAddress,
                    name: col.name,
                    symbol: col.symbol,
                    description: col.description || '',
                    bannerImage: '',
                    avatarImage: '',
                    chainId: 'polygon',
                    standard: 'ERC-721',
                    creatorAddress: col.creatorAddress || col.owner,
                    creatorName: col.creatorName || 'Verified Polygon Creator',
                    royaltyPercentage: Number(col.royaltyPercentage) || 0,
                    royaltyPayoutAddress: col.royaltyPayoutAddress || col.royaltyReceiver || col.owner,
                    category: col.category || 'art',
                    maxSupply: Number(col.maxSupply) || (String(col.contractAddress || '').toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase() || String(col.contractAddress || '').toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase() ? 1000 : 0),
                    currentSupply: Number(col.currentSupply) || 0,
                    floorPrice: Number(col.floorPrice) || 0,
                    totalVolume: Number(col.totalVolume) || 0,
                    ownersCount: Number(col.ownersCount) || 0,
                    createdAt: Number(col.createdAt) || 0,
                    verified: Boolean(col.verified),
                  });
                }
              }
              const merged = Array.from(prevMap.values());
              safeSetItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch {
        // Fallback to local on-chain cache
      }

      setNfts(currentNfts => {
        // Track seen IDs and contract+token keys
        const seenIdSet = new Set<string>();
        const seenContractTokenSet = new Set<string>();

        // Deduplicate current state
        const deduplicatedCurrent: NFT[] = [];
        for (const nft of currentNfts) {
          if (!nft || !nft.id) continue;
          const lowerId = String(nft.id).toLowerCase();
          if (seenIdSet.has(lowerId)) continue;
          seenIdSet.add(lowerId);

          if (nft.contractAddress && nft.tokenId) {
            const tokenKey = `${nft.contractAddress.toLowerCase()}:${String(nft.tokenId).replace(/^#/, '').toLowerCase()}`;
            seenContractTokenSet.add(tokenKey);
          }
          deduplicatedCurrent.push(nft);
        }

        // Check if any initial WIP NFTs are missing
        const missingInitialWip: NFT[] = [];
        for (const n of INITIAL_NFTS) {
          if (!n || !n.id) continue;
          const lowerId = String(n.id).toLowerCase();
          if (seenIdSet.has(lowerId)) continue;
          
          if (n.contractAddress && n.tokenId) {
            const tokenKey = `${n.contractAddress.toLowerCase()}:${String(n.tokenId).replace(/^#/, '').toLowerCase()}`;
            if (seenContractTokenSet.has(tokenKey)) continue;
            seenContractTokenSet.add(tokenKey);
          }

          const isWipOrLogo = 
            n.collectionId === 'col-wip-polygon' ||
            n.collectionId === 'col-wip-logo-polygon' ||
            n.contractAddress.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase() ||
            n.contractAddress.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase();

          if (isWipOrLogo) {
            seenIdSet.add(lowerId);
            missingInitialWip.push(n);
          }
        }

        // Treat the chain/database snapshot as the source of truth for token data.
        const newRemoteNFTs: NFT[] = [];
        const seenRemoteTokenKeys = new Set<string>();
        for (const t of tokensFromBackend) {
          if (t.source !== 'on-chain') continue;
          const contractAddr = String(t.contract_address || t.contractAddress || '').trim();
          const cleanTokenId = String(t.token_id ?? t.tokenId ?? '').replace(/^#/, '').trim();
          if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddr) || !/^\d+$/.test(cleanTokenId)) continue;
          const tokenKey = `${contractAddr.toLowerCase()}:${cleanTokenId}`;
          if (seenRemoteTokenKeys.has(tokenKey)) continue;
          seenRemoteTokenKeys.add(tokenKey);
          const targetId = `nft-chain-${contractAddr.slice(2).toLowerCase()}-${cleanTokenId}`;

          const isLogo = String(contractAddr).toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase();
          const col = isLogo ? WIP_LOGO_COLLECTION : WIP_COLLECTION;
          const collectionId = String(t.collection_id || col.id);
          const collectionName = String(t.collection_name || col.name);
          const rawImage = String(t.image || t.image_ipfs_uri || '');
          const image = rawImage.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${rawImage.slice(7)}` : rawImage.startsWith('ar://') ? `https://arweave.net/${rawImage.slice(5)}` : rawImage;

          const newNft: NFT = {
            id: targetId,
            tokenId: t.token_id ? (String(t.token_id).startsWith('#') ? t.token_id : `#${t.token_id}`) : (t.tokenId !== undefined ? `#${t.tokenId}` : `#0`),
            name: t.name || `${col.name} #${t.token_id ?? t.tokenId ?? 0}`,
            description: t.description || '',
            image,
            animationUrl: t.animation_url || undefined,
            chainId: 'polygon',
            standard: 'ERC-721',
            collectionId,
            collectionName,
            creatorAddress: t.collection_creator_address || '',
            creatorName: '',
            ownerAddress: t.owner_wallet || '',
            ownerName: t.owner_wallet ? `${t.owner_wallet.slice(0, 6)}...${t.owner_wallet.slice(-4)}` : '',
            royaltyPercentage: Number(t.royalty_percentage) || 0,
            royaltyPayoutAddress: t.royalty_receiver || '',
            price: t.is_listed && t.price !== null && t.price !== undefined ? Number(t.price) : undefined,
            isListed: Boolean(t.is_listed),
            listedAt: t.is_listed && t.listed_at ? new Date(t.listed_at).getTime() : undefined,
            createdAt: t.created_at ? new Date(t.created_at).getTime() : 0,
            traits: Array.isArray(t.traits) ? t.traits.map((trait: any) => ({ trait_type: trait.trait_type, value: trait.value ?? trait.trait_value })) : [],
            ipfsMetadataUri: t.metadata_ipfs_uri || '',
            ipfsImageUri: t.image_ipfs_uri || '',
            contractAddress: contractAddr,
            onChainVerified: true,
            txHash: t.tx_hash || '',
            editionTotal: 1,
            editionNumber: 1,
            viewsCount: 0,
            likesCount: 0,
          };
          newRemoteNFTs.push(newNft);
        }

        const currentTokenKeys = new Set(deduplicatedCurrent.map(n => n.contractAddress && n.tokenId
          ? `${n.contractAddress.toLowerCase()}:${String(n.tokenId).replace(/^#/, '')}`
          : '').filter(Boolean));
        const addedCount = newRemoteNFTs.filter(n => !currentTokenKeys.has(`${n.contractAddress.toLowerCase()}:${String(n.tokenId).replace(/^#/, '')}`)).length;
        newItemsAdded = addedCount;
        const remoteByToken = new Map(newRemoteNFTs.map(n => [`${n.contractAddress.toLowerCase()}:${String(n.tokenId).replace(/^#/, '')}`, n]));
        const refreshedCurrent = deduplicatedCurrent.map(existing => {
          if (!existing.contractAddress || !existing.tokenId) return existing;
          const key = `${existing.contractAddress.toLowerCase()}:${String(existing.tokenId).replace(/^#/, '')}`;
          const fresh = remoteByToken.get(key);
          if (!fresh) return existing;
          remoteByToken.delete(key);
          return { ...existing, ...fresh, id: existing.id, likesCount: existing.likesCount, viewsCount: existing.viewsCount };
        });
        const merged = [...remoteByToken.values(), ...missingInitialWip, ...refreshedCurrent];

        // Final strict deduplication pass
        const finalMap = new Map<string, NFT>();
        for (const item of merged) {
          if (item && item.id && !finalMap.has(item.id.toLowerCase())) {
            finalMap.set(item.id.toLowerCase(), item);
          }
        }
        const finalList = Array.from(finalMap.values());

        finalWipCount = finalList.filter(n => n.collectionId === 'col-wip-polygon' || n.contractAddress?.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase()).length;
        finalLogoCount = finalList.filter(n => n.collectionId === 'col-wip-logo-polygon' || n.contractAddress?.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase()).length;

        // If list was deduplicated or new items were added, update and persist
        if (JSON.stringify(finalList) !== JSON.stringify(currentNfts)) {
          safeSetItem(STORAGE_KEYS.NFTS, JSON.stringify(finalList));
          return finalList;
        }

        return currentNfts;
      });

      if (syncSucceeded) setLastSyncTimestamp(Date.now());
      return { success: syncSucceeded, totalWipCount: finalWipCount + finalLogoCount, newCount: newItemsAdded };
    } finally {
      if (!silent) {
        setTimeout(() => setIsAutoSyncing(false), 400);
      }
    }
  }, [activeAccount.address, activeAccount.name]);

  // Periodic Auto-Sync Effect for WIP Mints
  useEffect(() => {
    if (!autoSyncEnabled) return;
    syncWipCollections(true);

    const intervalId = setInterval(() => {
      syncWipCollections(true);
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoSyncEnabled, syncWipCollections]);

  // Intercept extension unhandled errors and rejections (e.g. MetaMask inpage script errors in iframes)
  useEffect(() => {
    const isExtensionError = (msg?: string, source?: string) => {
      const str = String(msg || '');
      const file = String(source || '');
      return (
        file.includes('chrome-extension://') ||
        file.includes('moz-extension://') ||
        file.includes('inpage.js') ||
        str.includes('MetaMask') ||
        str.includes('Failed to connect') ||
        str.includes('User rejected') ||
        str.includes('inpage.js') ||
        str.includes('chrome.runtime')
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event?.reason?.message || event?.reason || '');
      const stackStr = String(event?.reason?.stack || '');
      if (isExtensionError(reasonStr, stackStr)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event?.message || event?.error?.message || '');
      const file = String(event?.filename || event?.error?.stack || '');
      if (isExtensionError(msg, file)) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection, true);
    window.addEventListener('error', handleError, true);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);

  // Live fluctuating gas fee estimation
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuates slightly between 0.9 and 1.15
      const jitter = 0.92 + Math.random() * 0.16;
      setBaseGweiMultiplier(jitter);

      const chain = SUPPORTED_CHAINS[activeChain];
      const newGwei = +(chain.baseGwei * jitter).toFixed(2);

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setGasHistory(prev => [...prev.slice(-9), { time: nowStr, gwei: newGwei }]);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeChain]);

  // Dynamically resolve currentChainConfig based on networkMode (mainnet vs testnet)
  const currentChainConfig: ChainConfig = useMemo(() => {
    const rawConfig = SUPPORTED_CHAINS[activeChain] || SUPPORTED_CHAINS.polygon;
    const isMain = networkMode === 'mainnet';
    return {
      ...rawConfig,
      isTestnet: !isMain,
      chainId: isMain ? (rawConfig.mainnetChainId || rawConfig.chainId) : rawConfig.chainId,
      rpcUrl: isMain ? (rawConfig.mainnetRpcUrl || rawConfig.rpcUrl) : rawConfig.rpcUrl,
      blockExplorer: isMain ? (rawConfig.mainnetExplorer || rawConfig.blockExplorer) : rawConfig.blockExplorer,
      testnetName: isMain ? (rawConfig.mainnetName || rawConfig.name) : rawConfig.testnetName,
    };
  }, [activeChain, networkMode]);

  // Dynamically configure CHAIN_LIST based on active networkMode
  const dynamicChainList = useMemo(() => {
    return CHAIN_LIST.map(chain => {
      const isMain = networkMode === 'mainnet';
      return {
        ...chain,
        isTestnet: !isMain,
        chainId: isMain ? (chain.mainnetChainId || chain.chainId) : chain.chainId,
        rpcUrl: isMain ? (chain.mainnetRpcUrl || chain.rpcUrl) : chain.rpcUrl,
        blockExplorer: isMain ? (chain.mainnetExplorer || chain.blockExplorer) : chain.blockExplorer,
        testnetName: isMain ? (chain.mainnetName || chain.name) : chain.testnetName,
      };
    });
  }, [networkMode]);

  const activeBalance = activeAccount.balances[activeChain] ?? 0;

  const gasData = calculateGasTiers(activeChain, currentChainConfig.baseGwei * baseGweiMultiplier);

  const switchChain = (chain: BlockchainNetwork) => {
    setActiveChain(chain);
  };

  const connectInjectedWallet = async (providerName: string): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined') {
        const anyWin = window as any;
        let provider: any = null;

        if (providerName === 'Phantom') {
          provider = anyWin.phantom?.ethereum || anyWin.phantom?.solana || anyWin.solana || null;
        } else if (providerName === 'Coinbase Wallet') {
          if (anyWin.coinbaseWalletExtension) {
            provider = anyWin.coinbaseWalletExtension;
          } else if (anyWin.ethereum?.providers) {
            provider = anyWin.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
          } else if (anyWin.ethereum?.isCoinbaseWallet) {
            provider = anyWin.ethereum;
          }
        } else if (providerName === 'MetaMask') {
          if (anyWin.ethereum?.providers) {
            provider = anyWin.ethereum.providers.find((p: any) => p.isMetaMask && !p.isBraveWallet) || anyWin.ethereum.providers.find((p: any) => p.isMetaMask);
          } else if (anyWin.ethereum?.isMetaMask) {
            provider = anyWin.ethereum;
          } else if (anyWin.ethereum) {
            provider = anyWin.ethereum;
          }
        } else if (anyWin.ethereum) {
          provider = anyWin.ethereum;
        }

        // If provider is found and has request method, attempt to request accounts with safe error capture
        if (provider && typeof provider.request === 'function') {
          try {
            let requestResolved = false;
            const timeoutPromise = new Promise<null>((resolve) => 
              setTimeout(() => {
                if (!requestResolved) resolve(null);
              }, 2500)
            );

            const requestPromise = provider.request({ method: 'eth_requestAccounts' })
              .then((res: any) => {
                requestResolved = true;
                return res as string[];
              })
              .catch((err: any) => {
                requestResolved = true;
                console.info(`[Wallet] Extension request handled for ${providerName}:`, err?.message || err);
                return null;
              });

            const res = await Promise.race([requestPromise, timeoutPromise]);
            if (Array.isArray(res) && res.length > 0) {
              const injectedAddress = res[0];
              const balances: WalletAccount['balances'] = {
                ethereum: 0, polygon: 0, arbitrum: 0, base: 0, solana: 0, avalanche: 0, bsc: 0,
              };
              try {
                const providerChainId = Number.parseInt(await provider.request({ method: 'eth_chainId' }), 16);
                const providerChain = CHAIN_LIST.find(c => c.chainId === providerChainId || c.mainnetChainId === providerChainId);
                if (providerChain) {
                  const balanceHex = await provider.request({ method: 'eth_getBalance', params: [injectedAddress, 'latest'] });
                  balances[providerChain.id] = Number(BigInt(balanceHex)) / 1e18;
                  setActiveChain(providerChain.id);
                }
              } catch (balanceError) {
                console.info('[Wallet] Could not read the connected account balance:', balanceError);
              }
              const existing = accounts.find(a => a.address.toLowerCase() === injectedAddress.toLowerCase());
              if (existing) {
                setActiveAccountIndex(accounts.indexOf(existing));
                setAccounts(prev => prev.map(a => a.address.toLowerCase() === injectedAddress.toLowerCase() ? { ...a, balances } : a));
              } else {
                const newAcc: WalletAccount = {
                  address: injectedAddress,
                  name: `${providerName} User (${injectedAddress.slice(0, 6)}...${injectedAddress.slice(-4)})`,
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                  type: 'injected',
                  providerName,
                  balances,
                };
                setAccounts(prev => [newAcc, ...prev]);
                setActiveAccountIndex(0);
              }
              setIsConnected(true);
              return true;
            }
          } catch (err) {
            console.info(`[Wallet] Direct connection to ${providerName} deferred. Initializing active session:`, err);
          }
        }
      }
    } catch (e) {
      console.warn(`Error resolving injected provider ${providerName}:`, e);
    }

    setIsConnected(false);
    return false;
  };

  const connectAccount = (account: WalletAccount) => {
    const idx = accounts.findIndex(a => a.address.toLowerCase() === account.address.toLowerCase());
    if (idx !== -1) {
      setActiveAccountIndex(idx);
    } else {
      setAccounts(prev => [...prev, account]);
      setActiveAccountIndex(accounts.length);
    }
    setIsConnected(account.type === 'injected');
  };

  const connectDemoAccount = connectAccount;

  const connectPublicAddress = (address: string) => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      throw new Error('Invalid Polygon address format. Expected 0x followed by 40 hex characters.');
    }
    const cleanAddr = address.trim();
    const existing = accounts.find(a => a.address.toLowerCase() === cleanAddr.toLowerCase());
    if (existing) {
      connectAccount(existing);
      return;
    }
    const newWatcher: WalletAccount = {
      address: cleanAddr,
      name: `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)} (Polygon Watcher)`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      type: 'watcher',
      providerName: 'Polygon Explorer',
      balances: {
        ethereum: 0,
        polygon: 0,
        arbitrum: 0,
        base: 0,
        solana: 0,
        avalanche: 0,
        bsc: 0,
      }
    };
    setAccounts(prev => [...prev, newWatcher]);
    setActiveAccountIndex(accounts.length);
    setIsConnected(false);
  };

  const importOnChainCollection = async (contractAddress: string): Promise<{ success: boolean; collection?: NFTCollection; error?: string; tokensCount?: number }> => {
    try {
      const res = await fetch('/api/onchain/import-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress })
      });
      const data = await res.json();
      if (!data.success || !data.collection) {
        return { success: false, error: data.error || 'Failed to import collection' };
      }

      const c = data.collection;
      const importedCol: NFTCollection = {
        id: c.address.toLowerCase(),
        contractAddress: c.address,
        name: c.name,
        symbol: c.symbol,
        description: c.description,
        bannerImage: '',
        avatarImage: '',
        chainId: 'polygon',
        standard: 'ERC-721',
        creatorAddress: c.owner,
        creatorName: '',
        royaltyPercentage: Number(c.royaltyPercentage) || 0,
        royaltyPayoutAddress: c.royaltyReceiver || c.owner,
        category: c.category || 'art',
        maxSupply: Number(c.maxSupply) || (c.address.toLowerCase() === WIP_COLLECTION.contractAddress.toLowerCase() || c.address.toLowerCase() === WIP_LOGO_COLLECTION.contractAddress.toLowerCase() ? 1000 : 0),
        currentSupply: c.totalSupply || (c.tokens ? c.tokens.length : 0),
        floorPrice: 0,
        totalVolume: 0,
        ownersCount: 0,
        createdAt: 0,
        verified: true,
      };

      // Add to collections state
      setCollections(prev => {
        const next = [importedCol, ...prev.filter(col => col.contractAddress?.toLowerCase() !== c.address.toLowerCase())];
        safeSetItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(next));
        return next;
      });

      // Add tokens to NFTs state
      if (c.tokens && Array.isArray(c.tokens)) {
        const importedNfts: NFT[] = c.tokens.map((t: any) => ({
          id: `nft-poly-${c.address.slice(2, 8)}-${t.tokenId ?? t.token_id}`,
          tokenId: t.token_id ? (String(t.token_id).startsWith('#') ? t.token_id : `#${t.token_id}`) : (t.tokenId !== undefined ? `#${t.tokenId}` : `#0`),
          name: t.name || `${c.name} #${t.tokenId ?? t.token_id}`,
          description: t.description || '',
          image: t.image || '',
          animationUrl: t.animation_url || undefined,
          chainId: 'polygon',
          standard: 'ERC-721',
          collectionId: importedCol.id,
          collectionName: importedCol.name,
          creatorAddress: importedCol.creatorAddress,
          creatorName: importedCol.creatorName,
          ownerAddress: t.owner_wallet || '',
          ownerName: t.owner_wallet ? `${t.owner_wallet.slice(0, 6)}...${t.owner_wallet.slice(-4)}` : 'On-Chain Holder',
          royaltyPercentage: importedCol.royaltyPercentage,
          royaltyPayoutAddress: importedCol.royaltyPayoutAddress,
          isListed: false,
          createdAt: 0,
          traits: Array.isArray(t.traits) ? t.traits.map((trait: any) => ({ trait_type: trait.trait_type, value: trait.value ?? trait.trait_value })) : [],
          ipfsMetadataUri: t.metadata_ipfs_uri || '',
          ipfsImageUri: t.image_ipfs_uri || '',
          contractAddress: c.address,
          onChainVerified: true,
          txHash: '',
          viewsCount: 0,
          likesCount: 0
        }));

        setNfts(prev => {
          const next = [...importedNfts, ...prev.filter(n => n.contractAddress?.toLowerCase() !== c.address.toLowerCase())];
          safeSetItem(STORAGE_KEYS.NFTS, JSON.stringify(next));
          return next;
        });
      }

      if (data.currentBlock) {
        setPolygonBlockNumber(data.currentBlock);
      }

      return { success: true, collection: importedCol, tokensCount: c.tokens ? c.tokens.length : 0 };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to import collection' };
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
  };

  const claimFaucetTokens = async (targetChain?: BlockchainNetwork): Promise<number> => {
    void targetChain;
    return 0;
  };

  const mintNFT = async (
    nftData: Partial<NFT>,
    _speed: 'slow' | 'standard' | 'fast' | 'instant' = selectedGasSpeed,
    onSubmitted?: (txHash: string) => void,
  ): Promise<{ success: boolean; nft?: NFT; txHash?: string; error?: string }> => {
    try {
      if (!isConnected || activeAccount.type !== 'injected') throw new Error('Connect an authorized wallet before minting.');
      if (!isAuthorizedWipMinter(activeAccount.address)) throw new Error('This wallet is not authorized to mint to the WIP collections.');
      const address = nftData.contractAddress?.toLowerCase();
      const isWip = address === WIP_COLLECTION.contractAddress.toLowerCase();
      const isLogo = address === WIP_LOGO_COLLECTION.contractAddress.toLowerCase();
      if (!isWip && !isLogo) throw new Error('On-chain minting is currently enabled only for the configured WIP and Logo contracts.');
      if (!nftData.name?.trim()) throw new Error('Enter a name for this NFT.');
      let image = String(nftData.image || '');
      if (!image || (!image.startsWith('data:image/') && !image.startsWith('ipfs://') && !image.startsWith('ar://') && !/^https:\/\//i.test(image))) {
        throw new Error('Choose an image or provide an IPFS, Arweave, or HTTPS image URL.');
      }
      const { image: mintImage, metadataUri } = await optimizeInlineImageForOnChainMetadata(
        image,
        candidateImage => buildNftMetadataUri(nftData, candidateImage),
      );
      image = mintImage;
      const { wallet, public: publicClient, account } = await getConnectedPolygonClients(activeAccount.address);
      const collectionAddress = getAddress(nftData.contractAddress!);
      const supply = isWip
        ? await publicClient.readContract({ address: collectionAddress, abi: wipCollectionAbi, functionName: 'totalSupply' })
        : await publicClient.readContract({ address: collectionAddress, abi: logoCollectionAbi, functionName: 'totalSupply' });
      if (supply >= 1000n) throw new Error('This collection has reached its 1,000 NFT supply limit.');

      let requestedId: bigint | undefined;
      if (isWip) {
        const tokenText = String(nftData.tokenId || '').replace(/^#/, '');
        if (!/^\d+$/.test(tokenText)) throw new Error('WIP minting requires an explicit numeric token ID.');
        requestedId = BigInt(tokenText);
        if (requestedId >= 1000n) throw new Error('WIP token IDs must be between 0 and 999.');
      }

      const hash = isWip && requestedId !== undefined
        ? await wallet.writeContract({ address: collectionAddress, chain: polygon, abi: wipCollectionAbi, functionName: 'mintToWithId', args: [account, requestedId, metadataUri] })
        : await wallet.writeContract({ address: collectionAddress, chain: polygon, abi: logoCollectionAbi, functionName: 'mintTo', args: [account, metadataUri] });
      onSubmitted?.(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
      if (receipt.status !== 'success') throw new Error(`Mint transaction reverted: ${hash}`);

      let mintedId = requestedId;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== collectionAddress.toLowerCase()) continue;
        try {
          const decoded: any = decodeEventLog({ abi: polygonTransferAbi, data: log.data, topics: (log as any).topics, strict: true });
          if (decoded.eventName === 'Transfer' && decoded.args.from.toLowerCase() === zeroAddress && decoded.args.to.toLowerCase() === account.toLowerCase()) {
            mintedId = decoded.args.tokenId;
            break;
          }
        } catch { /* Ignore unrelated events and inspect the next log. */ }
      }
      if (mintedId === undefined) throw new Error(`Mint confirmed (${hash}), but the contract did not emit a standard ERC-721 mint Transfer event. Refresh the collection to verify the token.`);

      const tokenId = `#${mintedId.toString()}`;
      const nft: NFT = {
        id: `${collectionAddress.toLowerCase()}:${mintedId.toString()}`,
        tokenId,
        name: nftData.name,
        description: nftData.description || '',
        image,
        chainId: 'polygon',
        standard: 'ERC-721',
        collectionId: isWip ? WIP_COLLECTION.id : WIP_LOGO_COLLECTION.id,
        collectionName: isWip ? WIP_COLLECTION.name : WIP_LOGO_COLLECTION.name,
        creatorAddress: account,
        creatorName: activeAccount.name,
        ownerAddress: account,
        ownerName: activeAccount.name,
        royaltyPercentage: isWip ? WIP_COLLECTION.royaltyBps / 100 : WIP_LOGO_COLLECTION.royaltyBps / 100,
        royaltyPayoutAddress: isWip ? WIP_COLLECTION.royaltyReceiver : WIP_LOGO_COLLECTION.royaltyReceiver,
        isListed: false,
        createdAt: Date.now(),
        traits: nftData.traits || [],
        ipfsMetadataUri: metadataUri,
        ipfsImageUri: image,
        contractAddress: collectionAddress,
        onChainVerified: true,
        txHash: hash,
        viewsCount: 0,
        likesCount: 0,
      };
      setNfts(prev => [nft, ...prev.filter(item => !(item.contractAddress?.toLowerCase() === collectionAddress.toLowerCase() && item.tokenId.replace(/^#/, '') === mintedId!.toString()))]);
      setTransactions(prev => [{
        id: hash,
        type: 'mint',
        txHash: hash,
        chainId: 'polygon',
        fromAddress: account,
        toAddress: collectionAddress,
        nftId: nft.id,
        nftName: nft.name,
        nftImage: nft.image,
        collectionId: nft.collectionId,
        collectionName: nft.collectionName,
        timestamp: Date.now(),
        status: 'confirmed',
        blockNumber: Number(receipt.blockNumber),
      }, ...prev]);
      void syncWipCollections(true);
      return { success: true, nft, txHash: hash };
    } catch (error: any) {
      return { success: false, error: error?.shortMessage || error?.message || 'Polygon mint failed.' };
    }
  };

  const deployCollection = async (
    colData: Partial<NFTCollection>,
    onSubmitted?: (txHash: string) => void,
    factoryType: 'collection' | 'wip' = 'collection',
  ): Promise<{ success: boolean; collection?: NFTCollection; txHash?: string; error?: string }> => {
    try {
      if (!isConnected || activeAccount.type !== 'injected') throw new Error('Connect a Polygon wallet before creating a collection.');
      if (activeChain !== 'polygon') throw new Error('Switch to Polygon Mainnet before creating a collection.');
      if (colData.standard !== 'ERC-721') throw new Error('The configured Polygon factories create ERC-721 collections.');
      if (factoryType === 'collection' && Number(colData.maxSupply) !== 1000) throw new Error('The Collection Factory creates collections with a fixed 1,000 token supply.');
      if (!colData.name?.trim() || !colData.symbol?.trim()) throw new Error('Collection name and symbol are required.');
      const royaltyRecipient = getAddress(colData.royaltyPayoutAddress || ROYALTY_WALLET);
      const royaltyBps = BigInt(Math.round(Number(colData.royaltyPercentage || 0) * 100));
      if (royaltyBps < 0n || royaltyBps > 10000n) throw new Error('Royalty must be between 0% and 100%.');
      const { wallet, public: publicClient, account } = await getConnectedPolygonClients(activeAccount.address);
      const factoryAddress = getAddress(factoryType === 'wip' ? WIP_FACTORY.address : COLLECTION_FACTORY_1000.contractAddress);
      const beforeAddresses: string[] = factoryType === 'wip'
        ? await publicClient.readContract({ address: factoryAddress, abi: wipFactoryAbi, functionName: 'getWIPCollections' })
        : await publicClient.readContract({ address: factoryAddress, abi: collectionFactoryAbi, functionName: 'getAllCollections' });
      const hash = factoryType === 'wip'
        ? await wallet.writeContract({
            address: factoryAddress,
            chain: polygon,
            abi: wipFactoryAbi,
            functionName: 'createWIPCollection',
            args: [colData.name.trim(), colData.symbol.trim().toUpperCase(), royaltyRecipient],
          })
        : await wallet.writeContract({
            address: factoryAddress,
            chain: polygon,
            abi: collectionFactoryAbi,
            functionName: 'createCollection',
            args: [colData.name.trim(), colData.symbol.trim().toUpperCase(), royaltyRecipient, royaltyBps],
          });
      onSubmitted?.(hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
      if (receipt.status !== 'success') throw new Error(`Collection factory transaction reverted: ${hash}`);

      let createdAddress = '';
      if (factoryType === 'wip') {
        const afterAddresses: string[] = await publicClient.readContract({ address: factoryAddress, abi: wipFactoryAbi, functionName: 'getWIPCollections' });
        const newAddresses = afterAddresses.filter(address => !beforeAddresses.some(before => before.toLowerCase() === address.toLowerCase()));
        if (newAddresses.length !== 1) throw new Error(`WIP Factory transaction confirmed (${hash}), but its registry did not identify exactly one newly created collection.`);
        createdAddress = getAddress(newAddresses[0]);
      } else {
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
          try {
            const decoded: any = decodeEventLog({ abi: collectionFactoryAbi, data: log.data, topics: (log as any).topics, strict: true });
            if (decoded.eventName === 'CollectionCreated') {
              createdAddress = getAddress(decoded.args.collection);
              break;
            }
          } catch { /* Ignore other factory events. */ }
        }
        if (!createdAddress) throw new Error(`Factory transaction confirmed (${hash}), but no CollectionCreated event was found.`);
        const isRegistered = await publicClient.readContract({ address: factoryAddress, abi: collectionFactoryAbi, functionName: 'isCollection', args: [getAddress(createdAddress)] });
        if (!isRegistered) throw new Error(`Factory emitted ${createdAddress}, but its registry does not recognize the collection.`);
      }

      const collection: NFTCollection = {
        id: createdAddress.toLowerCase(),
        contractAddress: createdAddress,
        name: colData.name.trim(),
        symbol: colData.symbol.trim().toUpperCase(),
        description: colData.description || '',
        bannerImage: colData.bannerImage || '',
        avatarImage: colData.avatarImage || '',
        chainId: 'polygon',
        standard: 'ERC-721',
        creatorAddress: account,
        creatorName: activeAccount.name,
        royaltyPercentage: factoryType === 'collection' ? Number(royaltyBps) / 100 : 0,
        royaltyPayoutAddress: royaltyRecipient,
        category: colData.category || 'art',
        maxSupply: factoryType === 'collection' ? 1000 : 0,
        currentSupply: 0,
        floorPrice: 0,
        totalVolume: 0,
        ownersCount: 0,
        createdAt: Date.now(),
        verified: true,
      };
      setCollections(prev => [collection, ...prev.filter(existing => existing.contractAddress.toLowerCase() !== createdAddress.toLowerCase())]);
      setTransactions(prev => [{ id: hash, type: 'deploy_collection', txHash: hash, chainId: 'polygon', fromAddress: account, toAddress: createdAddress, timestamp: Date.now(), status: 'confirmed', blockNumber: Number(receipt.blockNumber) }, ...prev]);
      void fetch('/api/onchain/import-collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractAddress: createdAddress }) }).catch(() => {});
      return { success: true, collection, txHash: hash };
    } catch (error: any) {
      return { success: false, error: error?.shortMessage || error?.message || 'Collection creation failed.' };
    }
  };

  // BULK BATCH MINTING METHOD
  // Batch minting stays disabled until a verified batch-mint ABI is available.
  const bulkMintNFTs = async (
    _items: BulkNFTItem[],
    _config: BulkMintConfig,
    _onProgress?: (progress: { current: number; total: number; name: string }) => void
  ): Promise<{
    success: boolean;
    mintedNFTs?: NFT[];
    collection?: NFTCollection;
    txHash?: string;
    totalGasUsedCrypto?: number;
    totalGasUsedUsd?: number;
    error?: string;
  }> => ({
    success: false,
    error: 'Bulk minting is unavailable: no verified batch mint contract method is configured. No transaction was sent.',
  });

  // LIST / DELIST NFT
  const listNFTForSale = async (_nftId: string, _price: number): Promise<boolean> => false;

  const delistNFT = async (_nftId: string): Promise<boolean> => false;

  // BUY NFT WITH AUTOMATED CREATOR ROYALTY SPLIT
  const buyNFT = async (_nftId: string): Promise<{ success: boolean; error?: string }> => ({ success: false, error: 'Purchases are unavailable until an audited marketplace contract is integrated. No transaction was sent.' });

  // TRANSFER NFT
  const transferNFT = async (_nftId: string, _recipientAddress: string): Promise<boolean> => false;

  // BURN NFT
  const burnNFT = async (_nftId: string): Promise<boolean> => false;

  // MAKE & ACCEPT OFFERS
  const makeOffer = async (_nftId: string, _amount: number): Promise<boolean> => false;

  const acceptOffer = async (_offerId: string): Promise<boolean> => false;

  const toggleLikeNFT = (nftId: string) => {
    setNfts(prev => prev.map(item => {
      if (item.id === nftId) {
        const count = (item.likesCount || 0) + 1;
        return { ...item, likesCount: count };
      }
      return item;
    }));
  };

  // CROSS-CHAIN NFT BRIDGE EXECUTION
  const bridgeNFT = async (_params: {
    nftId: string; destinationChain: BlockchainNetwork; recipientAddress: string; protocol: BridgeProtocol;
    gasSpeed?: 'slow' | 'standard' | 'fast' | 'instant'; gasDropCrypto?: number;
    onStepUpdate?: (step: number, message: string) => void;
  }): Promise<{ success: boolean; bridgeTx?: BridgeTransaction; error?: string }> => ({
    success: false,
    error: 'Bridging is unavailable until a production bridge protocol and contracts are integrated. No transaction was sent.',
  });

  const clearBridgeHistory = () => {
    setBridgeTransactions([]);
    localStorage.removeItem(STORAGE_KEYS.BRIDGE_TXS);
  };

  // BATCH UPDATE ROYALTIES
  const batchUpdateRoyalties = async (
    _updates: BatchRoyaltyUpdateItem[]
  ): Promise<BatchRoyaltyResult> => ({
    success: false,
    updatedCount: 0,
    error: 'Royalty updates are unavailable until an audited contract method is configured. No transaction was sent.',
  });

  // Aggregated Stats
  const totalPortfolioValueUsd = nfts
    .filter(n => n.ownerAddress.toLowerCase() === activeAccount.address.toLowerCase())
    .reduce((sum, item) => {
      const price = item.price || 0.1;
      const chainConfig = SUPPORTED_CHAINS[item.chainId];
      return sum + (price * chainConfig.usdPrice);
    }, 0);

  const totalRoyaltyEarnedUsd = royaltyLogs
    .filter(r => r.sellerAddress.toLowerCase() === activeAccount.address.toLowerCase() || r.buyerAddress.toLowerCase() === activeAccount.address.toLowerCase() || true)
    .reduce((sum, r) => sum + r.royaltyAmountUsd, 0);

  const isWipCollection = (contractOrColId: string): boolean => {
    if (!contractOrColId) return false;
    const lower = contractOrColId.toLowerCase();
    return (
      lower === WIP_COLLECTION.contractAddress.toLowerCase() ||
      lower === WIP_COLLECTION.id.toLowerCase() ||
      lower === WIP_LOGO_COLLECTION.contractAddress.toLowerCase() ||
      lower === WIP_LOGO_COLLECTION.id.toLowerCase()
    );
  };

  return (
    <Web3Context.Provider
      value={{
        activeChain,
        currentChainConfig,
        allChains: dynamicChainList,
        switchChain,
        networkMode,
        setNetworkMode,
        toggleNetworkMode,

        gasData,
        selectedGasSpeed,
        setSelectedGasSpeed,
        gasHistory,

        isConnected,
        activeAccount,
        allAccounts: accounts,
        connectInjectedWallet,
        connectAccount,
        connectDemoAccount,
        connectPublicAddress,
        disconnectWallet,
        claimFaucetTokens,
        activeBalance,

        nfts,
        collections,
        transactions,
        royaltyLogs,
        offers,
        bridgeTransactions,
        wipConfig: WIP_COLLECTION,
        isWipCollection,
        isAuthorizedWipMinter,
        isCurrentUserAuthorizedWipMinter: isConnected && activeAccount.type === 'injected' && isAuthorizedWipMinter(activeAccount.address),
        wipAuthorizedMinters: WIP_AUTHORIZED_MINTERS,
        importOnChainCollection,
        polygonBlockNumber,

        mintNFT,
        bulkMintNFTs,
        deployCollection,
        listNFTForSale,
        delistNFT,
        buyNFT,
        transferNFT,
        burnNFT,
        makeOffer,
        acceptOffer,
        toggleLikeNFT,
        bridgeNFT,
        clearBridgeHistory,
        batchUpdateRoyalties,

        // Auto-Sync for Work In Progress - WIP & Logo Collections
        isAutoSyncing,
        autoSyncEnabled,
        toggleAutoSync,
        lastSyncTimestamp,
        syncWipCollections,
        wipTotalCount,

        totalPortfolioValueUsd,
        totalRoyaltyEarnedUsd,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
