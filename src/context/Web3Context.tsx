import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  BlockchainNetwork, 
  ChainConfig, 
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
import { INITIAL_COLLECTIONS, INITIAL_NFTS, INITIAL_ROYALTY_LOGS, INITIAL_TRANSACTIONS } from '../data/mockData';
import { calculateGasTiers } from '../services/gasService';
import { 
  BRIDGE_PROTOCOLS, 
  INITIAL_BRIDGE_TRANSACTIONS, 
  calculateBridgeQuote, 
  generateRandomHex, 
  getBridgedContractAddress, 
  getRequiredConfirmations 
} from '../services/bridgeService';

// Built-in Keyring accounts for immediate full-featured testing
export const DEMO_ACCOUNTS: WalletAccount[] = [
  {
    address: '0xDemoWalletCreator000000000000000000001',
    name: 'Primary Creator Keyring',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    type: 'demo',
    providerName: 'Studio Keyring',
    balances: {
      ethereum: 2.85,
      polygon: 280.0,
      arbitrum: 1.45,
      base: 3.20,
      solana: 18.5,
      avalanche: 45.0,
      bsc: 4.8,
    },
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  {
    address: '0xDemoCollectorWhale000000000000000000002',
    name: 'Whale Collector Vault',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    type: 'demo',
    providerName: 'Studio Keyring',
    balances: {
      ethereum: 15.0,
      polygon: 1500.0,
      arbitrum: 8.5,
      base: 12.0,
      solana: 95.0,
      avalanche: 220.0,
      bsc: 25.0,
    },
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
];

interface Web3ContextType {
  // Network
  activeChain: BlockchainNetwork;
  currentChainConfig: ChainConfig;
  allChains: ChainConfig[];
  switchChain: (chain: BlockchainNetwork) => void;

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
  connectDemoAccount: (account: WalletAccount) => void;
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

  // Actions
  mintNFT: (nftData: Partial<NFT>, gasSpeed?: 'slow' | 'standard' | 'fast' | 'instant') => Promise<{ success: boolean; nft?: NFT; txHash?: string; error?: string }>;
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
  deployCollection: (collectionData: Partial<NFTCollection>) => Promise<{ success: boolean; collection?: NFTCollection; txHash?: string; error?: string }>;
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
  
  // Stats
  totalPortfolioValueUsd: number;
  totalRoyaltyEarnedUsd: number;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const STORAGE_KEYS = {
  NFTS: 'crosschain_nft_platform_nfts_v1',
  COLLECTIONS: 'crosschain_nft_platform_collections_v1',
  TRANSACTIONS: 'crosschain_nft_platform_txs_v1',
  ROYALTIES: 'crosschain_nft_platform_royalties_v1',
  ACTIVE_CHAIN: 'crosschain_nft_platform_active_chain',
  WALLET_INDEX: 'crosschain_nft_platform_wallet_index',
  BALANCES: 'crosschain_nft_platform_wallet_balances_v1',
  BRIDGE_TXS: 'crosschain_nft_platform_bridge_txs_v1',
};

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Active Chain
  const [activeChain, setActiveChain] = useState<BlockchainNetwork>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAIN);
    return (saved && SUPPORTED_CHAINS[saved as BlockchainNetwork]) ? (saved as BlockchainNetwork) : 'ethereum';
  });

  // Wallet
  const [accounts, setAccounts] = useState<WalletAccount[]>(() => {
    const savedBalances = localStorage.getItem(STORAGE_KEYS.BALANCES);
    if (savedBalances) {
      try {
        const parsed = JSON.parse(savedBalances);
        return DEMO_ACCOUNTS.map((acc, i) => ({
          ...acc,
          balances: parsed[acc.address] || acc.balances,
        }));
      } catch {
        return DEMO_ACCOUNTS;
      }
    }
    return DEMO_ACCOUNTS;
  });

  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WALLET_INDEX);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isConnected, setIsConnected] = useState<boolean>(true);

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

  // Data collections
  const [nfts, setNfts] = useState<NFT[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NFTS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_NFTS;
  });

  const [collections, setCollections] = useState<NFTCollection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_COLLECTIONS;
  });

  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_TRANSACTIONS;
  });

  const [royaltyLogs, setRoyaltyLogs] = useState<RoyaltyPayoutRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROYALTIES);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_ROYALTY_LOGS;
  });

  const [offers, setOffers] = useState<NFTOffer[]>([]);

  const [bridgeTransactions, setBridgeTransactions] = useState<BridgeTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRIDGE_TXS);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_BRIDGE_TRANSACTIONS;
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NFTS, JSON.stringify(nfts));
  }, [nfts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROYALTIES, JSON.stringify(royaltyLogs));
  }, [royaltyLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRIDGE_TXS, JSON.stringify(bridgeTransactions));
  }, [bridgeTransactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAIN, activeChain);
  }, [activeChain]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WALLET_INDEX, activeAccountIndex.toString());
  }, [activeAccountIndex]);

  useEffect(() => {
    const balanceMap: Record<string, Record<BlockchainNetwork, number>> = {};
    accounts.forEach(a => {
      balanceMap[a.address] = a.balances;
    });
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(balanceMap));
  }, [accounts]);

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

  const currentChainConfig = SUPPORTED_CHAINS[activeChain];
  const activeAccount = accounts[activeAccountIndex] || accounts[0];
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

        // If provider is found and has request method, attempt to request accounts with a timeout
        if (provider && typeof provider.request === 'function') {
          try {
            // Use timeout race to prevent hanging if iframe blocks extension popup
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Connection request timed out')), 3500)
            );
            const requestPromise = provider.request({ method: 'eth_requestAccounts' });
            
            const res = await Promise.race([requestPromise, timeoutPromise]) as string[];
            if (res && res.length > 0) {
              const injectedAddress = res[0];
              const existing = accounts.find(a => a.address.toLowerCase() === injectedAddress.toLowerCase());
              if (existing) {
                setActiveAccountIndex(accounts.indexOf(existing));
              } else {
                const newAcc: WalletAccount = {
                  address: injectedAddress,
                  name: `${providerName} User (${injectedAddress.slice(0, 6)}...${injectedAddress.slice(-4)})`,
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                  type: 'injected',
                  providerName,
                  balances: {
                    ethereum: 1.85,
                    polygon: 150.0,
                    arbitrum: 1.2,
                    base: 1.5,
                    solana: 12.0,
                    avalanche: 25.0,
                    bsc: 3.5,
                  },
                };
                setAccounts(prev => [newAcc, ...prev]);
                setActiveAccountIndex(0);
              }
              setIsConnected(true);
              return true;
            }
          } catch (err) {
            console.warn(`Direct injected connection to ${providerName} failed or rejected in this environment. Initializing active ${providerName} session:`, err);
          }
        }
      }
    } catch (e) {
      console.warn(`Error resolving injected provider ${providerName}:`, e);
    }

    // Seamless Sandbox/Testnet Session Connection (ensures users are never blocked in iframe preview)
    const existingSim = accounts.find(a => a.providerName === providerName && a.type === 'injected');
    if (existingSim) {
      setActiveAccountIndex(accounts.indexOf(existingSim));
      setIsConnected(true);
      return true;
    }

    const simAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const newAcc: WalletAccount = {
      address: simAddress,
      name: `${providerName} Wallet (${simAddress.slice(0, 6)}...${simAddress.slice(-4)})`,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      type: 'injected',
      providerName,
      balances: {
        ethereum: 3.5,
        polygon: 250.0,
        arbitrum: 2.0,
        base: 2.5,
        solana: 15.0,
        avalanche: 30.0,
        bsc: 3.0,
      },
    };
    setAccounts(prev => [newAcc, ...prev]);
    setActiveAccountIndex(0);
    setIsConnected(true);
    return true;
  };

  const connectDemoAccount = (account: WalletAccount) => {
    const idx = accounts.findIndex(a => a.address === account.address);
    if (idx !== -1) {
      setActiveAccountIndex(idx);
    } else {
      setAccounts(prev => [...prev, account]);
      setActiveAccountIndex(accounts.length);
    }
    setIsConnected(true);
  };

  const disconnectWallet = () => {
    setIsConnected(false);
  };

  const claimFaucetTokens = async (targetChain?: BlockchainNetwork): Promise<number> => {
    const c = targetChain || activeChain;
    const chainConfig = SUPPORTED_CHAINS[c];
    const amount = chainConfig.faucetAmount;

    setAccounts(prev => prev.map((acc, i) => {
      if (i === activeAccountIndex) {
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [c]: (acc.balances[c] || 0) + amount,
          },
        };
      }
      return acc;
    }));

    // Record Faucet Transaction
    const newTx: TransactionRecord = {
      id: `tx-faucet-${Date.now()}`,
      type: 'faucet',
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
      chainId: c,
      fromAddress: `${chainConfig.name} Testnet Dispenser`,
      toAddress: activeAccount.address,
      amountCrypto: amount,
      amountUsd: +(amount * chainConfig.usdPrice).toFixed(2),
      gasUsedCrypto: 0,
      gasUsedUsd: 0,
      gasPriceGwei: 0,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };

    setTransactions(prev => [newTx, ...prev]);
    return amount;
  };

  // MINT NFT METHOD
  const mintNFT = async (
    nftData: Partial<NFT>, 
    speed: 'slow' | 'standard' | 'fast' | 'instant' = selectedGasSpeed
  ): Promise<{ success: boolean; nft?: NFT; txHash?: string; error?: string }> => {
    const targetChain = nftData.chainId || activeChain;
    const chainConfig = SUPPORTED_CHAINS[targetChain];
    const tier = gasData.tiers[speed];
    const gasFee = tier.estCostCrypto;

    // Verify balance
    const currentBal = activeAccount.balances[targetChain] || 0;
    if (currentBal < gasFee) {
      return {
        success: false,
        error: `Insufficient ${chainConfig.symbol} balance for gas fee (${gasFee} ${chainConfig.symbol} required). Use the faucet to claim free test tokens!`,
      };
    }

    // Deduct gas
    setAccounts(prev => prev.map((acc, i) => {
      if (i === activeAccountIndex) {
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [targetChain]: +(acc.balances[targetChain] - gasFee).toFixed(6),
          },
        };
      }
      return acc;
    }));

    const txHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    const tokenIdHex = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newNftId = `nft-${Date.now()}`;
    const contractAddr = nftData.contractAddress || `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    const newNft: NFT = {
      id: newNftId,
      tokenId: tokenIdHex,
      name: nftData.name || 'Untitled Masterpiece',
      description: nftData.description || 'Exclusive on-chain NFT minted with cross-chain standard.',
      image: nftData.image || '',
      animationUrl: nftData.animationUrl,
      chainId: targetChain,
      standard: nftData.standard || chainConfig.standard,
      collectionId: nftData.collectionId,
      collectionName: nftData.collectionName || (nftData.collectionId ? collections.find(c => c.id === nftData.collectionId)?.name : 'Single Editions'),
      creatorAddress: activeAccount.address,
      creatorName: activeAccount.name,
      ownerAddress: activeAccount.address,
      ownerName: activeAccount.name,
      royaltyPercentage: nftData.royaltyPercentage ?? 5.0,
      royaltyPayoutAddress: nftData.royaltyPayoutAddress || activeAccount.address,
      price: nftData.price,
      isListed: !!nftData.price && (nftData.price > 0),
      listedAt: nftData.price ? Date.now() : undefined,
      createdAt: Date.now(),
      traits: nftData.traits || [],
      ipfsMetadataUri: `ipfs://Qm${Array.from({length: 44}, () => Math.floor(Math.random()*36).toString(36)).join('')}`,
      ipfsImageUri: `ipfs://Qm${Array.from({length: 44}, () => Math.floor(Math.random()*36).toString(36)).join('')}`,
      contractAddress: contractAddr,
      txHash,
      editionTotal: nftData.editionTotal || 1,
      editionNumber: 1,
      unlockableContent: nftData.unlockableContent,
      hasUnlockableContent: !!nftData.unlockableContent,
      viewsCount: 1,
      likesCount: 0,
    };

    setNfts(prev => [newNft, ...prev]);

    // Record Mint Transaction
    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: 'mint',
      txHash,
      chainId: targetChain,
      fromAddress: activeAccount.address,
      toAddress: contractAddr,
      amountCrypto: 0,
      amountUsd: 0,
      gasUsedCrypto: gasFee,
      gasUsedUsd: tier.estCostUsd,
      gasPriceGwei: tier.totalGwei,
      nftId: newNftId,
      nftName: newNft.name,
      nftImage: newNft.image,
      collectionId: newNft.collectionId,
      collectionName: newNft.collectionName,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update collection currentSupply if associated
    if (nftData.collectionId) {
      setCollections(prev => prev.map(c => {
        if (c.id === nftData.collectionId) {
          return { ...c, currentSupply: c.currentSupply + 1 };
        }
        return c;
      }));
    }

    return { success: true, nft: newNft, txHash };
  };

  // DEPLOY COLLECTION METHOD
  const deployCollection = async (
    colData: Partial<NFTCollection>
  ): Promise<{ success: boolean; collection?: NFTCollection; txHash?: string; error?: string }> => {
    const targetChain = colData.chainId || activeChain;
    const chainConfig = SUPPORTED_CHAINS[targetChain];
    const deployGasCost = gasData.actionsEstimate.mintCollection.crypto;

    const currentBal = activeAccount.balances[targetChain] || 0;
    if (currentBal < deployGasCost) {
      return {
        success: false,
        error: `Insufficient ${chainConfig.symbol} for smart contract deployment (${deployGasCost} ${chainConfig.symbol} required). Use faucet!`,
      };
    }

    // Deduct gas
    setAccounts(prev => prev.map((acc, i) => {
      if (i === activeAccountIndex) {
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [targetChain]: +(acc.balances[targetChain] - deployGasCost).toFixed(6),
          },
        };
      }
      return acc;
    }));

    const contractAddress = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    const txHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    const colId = `col-${Date.now()}`;

    const newCollection: NFTCollection = {
      id: colId,
      contractAddress,
      name: colData.name || 'New Collection',
      symbol: (colData.symbol || 'NFT').toUpperCase(),
      description: colData.description || 'Smart contract deployed on ' + chainConfig.name,
      bannerImage: colData.bannerImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      avatarImage: colData.avatarImage || 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&q=80',
      chainId: targetChain,
      standard: colData.standard || chainConfig.standard,
      creatorAddress: activeAccount.address,
      creatorName: activeAccount.name,
      royaltyPercentage: colData.royaltyPercentage ?? 5.0,
      royaltyPayoutAddress: colData.royaltyPayoutAddress || activeAccount.address,
      category: colData.category || 'art',
      maxSupply: colData.maxSupply || 1000,
      currentSupply: 0,
      floorPrice: colData.floorPrice || 0,
      totalVolume: 0,
      ownersCount: 1,
      createdAt: Date.now(),
      verified: false,
    };

    setCollections(prev => [newCollection, ...prev]);

    // Record deployment tx
    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      type: 'deploy_collection',
      txHash,
      chainId: targetChain,
      fromAddress: activeAccount.address,
      toAddress: contractAddress,
      amountCrypto: 0,
      amountUsd: 0,
      gasUsedCrypto: deployGasCost,
      gasUsedUsd: +(deployGasCost * chainConfig.usdPrice).toFixed(2),
      gasPriceGwei: gasData.currentGwei,
      collectionId: colId,
      collectionName: newCollection.name,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };

    setTransactions(prev => [newTx, ...prev]);
    return { success: true, collection: newCollection, txHash };
  };

  // BULK BATCH MINTING METHOD
  const bulkMintNFTs = async (
    items: BulkNFTItem[],
    config: BulkMintConfig,
    onProgress?: (progress: { current: number; total: number; name: string }) => void
  ): Promise<{
    success: boolean;
    mintedNFTs?: NFT[];
    collection?: NFTCollection;
    txHash?: string;
    totalGasUsedCrypto?: number;
    totalGasUsedUsd?: number;
    error?: string;
  }> => {
    if (!items || items.length === 0) {
      return { success: false, error: 'No NFT items provided for bulk minting' };
    }

    const targetChain = config.chainId || activeChain;
    const chainConfig = SUPPORTED_CHAINS[targetChain];

    // Compute batch gas savings with multicall simulation
    const singleMintGas = gasData.actionsEstimate.mintSingle.crypto;
    const baseMulticallGas = singleMintGas * 1.15;
    const perItemAdditionalGas = singleMintGas * 0.42; // ~58% savings per additional token in batch
    let totalGasCrypto = +(baseMulticallGas + (items.length - 1) * perItemAdditionalGas).toFixed(6);

    let deployGasCost = 0;
    let newlyCreatedCollection: NFTCollection | undefined = undefined;

    if (config.targetMode === 'new_collection') {
      deployGasCost = gasData.actionsEstimate.mintCollection.crypto;
      totalGasCrypto = +(totalGasCrypto + deployGasCost).toFixed(6);
    }

    const currentBal = activeAccount.balances[targetChain] || 0;
    if (currentBal < totalGasCrypto) {
      return {
        success: false,
        error: `Insufficient ${chainConfig.symbol} balance for batch minting. Estimated gas: ${totalGasCrypto} ${chainConfig.symbol}, but wallet has ${currentBal.toFixed(4)} ${chainConfig.symbol}. Claim tokens from the faucet!`,
      };
    }

    // Deduct gas from active account
    setAccounts(prev => prev.map((acc, i) => {
      if (i === activeAccountIndex) {
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [targetChain]: +(acc.balances[targetChain] - totalGasCrypto).toFixed(6),
          },
        };
      }
      return acc;
    }));

    const batchTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    let targetCollectionId: string | undefined = undefined;
    let targetCollectionName: string | undefined = undefined;
    let targetContractAddress = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    // Handle New Collection Deployment
    if (config.targetMode === 'new_collection') {
      const colId = `col-bulk-${Date.now()}`;
      newlyCreatedCollection = {
        id: colId,
        contractAddress: targetContractAddress,
        name: config.newCollectionName || 'Genesis Batch Collection',
        symbol: (config.newCollectionSymbol || 'BATCH').toUpperCase(),
        description: config.newCollectionDescription || `Official batch-minted collection on ${chainConfig.name}.`,
        bannerImage: config.newCollectionBanner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        avatarImage: config.newCollectionAvatar || items[0]?.image || 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&q=80',
        chainId: targetChain,
        standard: config.standard || chainConfig.standard,
        creatorAddress: activeAccount.address,
        creatorName: activeAccount.name,
        royaltyPercentage: config.newCollectionRoyalty ?? (config.defaultRoyalty ?? 7.5),
        royaltyPayoutAddress: activeAccount.address,
        category: config.newCollectionCategory || 'art',
        maxSupply: config.newCollectionMaxSupply || Math.max(items.length, 1000),
        currentSupply: items.length,
        floorPrice: config.defaultPrice || (items.find(i => i.price && i.price > 0)?.price || 0),
        totalVolume: 0,
        ownersCount: 1,
        createdAt: Date.now(),
        verified: true,
      };

      targetCollectionId = colId;
      targetCollectionName = newlyCreatedCollection.name;

      setCollections(prev => [newlyCreatedCollection!, ...prev]);

      // Record Collection Deployment Tx
      const deployTx: TransactionRecord = {
        id: `tx-col-deploy-${Date.now()}`,
        type: 'deploy_collection',
        txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
        chainId: targetChain,
        fromAddress: activeAccount.address,
        toAddress: targetContractAddress,
        amountCrypto: 0,
        amountUsd: 0,
        gasUsedCrypto: deployGasCost,
        gasUsedUsd: +(deployGasCost * chainConfig.usdPrice).toFixed(2),
        gasPriceGwei: gasData.currentGwei,
        collectionId: colId,
        collectionName: newlyCreatedCollection.name,
        timestamp: Date.now(),
        status: 'confirmed',
        blockNumber: Math.floor(18000000 + Math.random() * 500000),
      };
      setTransactions(prev => [deployTx, ...prev]);
    } else if (config.targetMode === 'existing_collection' && config.existingCollectionId) {
      const existingCol = collections.find(c => c.id === config.existingCollectionId);
      if (existingCol) {
        targetCollectionId = existingCol.id;
        targetCollectionName = existingCol.name;
        targetContractAddress = existingCol.contractAddress;

        // Update supply
        setCollections(prev => prev.map(c => {
          if (c.id === config.existingCollectionId) {
            return { ...c, currentSupply: c.currentSupply + items.length };
          }
          return c;
        }));
      }
    }

    // Build all NFT entities
    const createdNFTs: NFT[] = [];
    const now = Date.now();

    items.forEach((item, index) => {
      const itemTxHash = index === 0 ? batchTxHash : `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
      const tokenIdNumber = index + 1;
      const tokenIdString = `#${String(tokenIdNumber).padStart(3, '0')}`;
      const itemPrice = item.price !== undefined ? item.price : (config.isInstantListAll ? config.defaultPrice : undefined);
      const isListed = !!itemPrice && itemPrice > 0;

      const newNFT: NFT = {
        id: `nft-bulk-${now}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        tokenId: tokenIdString,
        name: item.name || `Batch NFT ${tokenIdString}`,
        description: item.description || 'Verified multi-chain NFT minted via Nexus Bulk Minting Studio.',
        image: item.image,
        chainId: targetChain,
        standard: config.standard || chainConfig.standard,
        collectionId: targetCollectionId,
        collectionName: targetCollectionName || 'Batch Mint Series',
        creatorAddress: activeAccount.address,
        creatorName: activeAccount.name,
        ownerAddress: activeAccount.address,
        ownerName: activeAccount.name,
        royaltyPercentage: item.royaltyPercentage ?? (config.defaultRoyalty ?? 7.5),
        royaltyPayoutAddress: activeAccount.address,
        price: itemPrice,
        isListed,
        listedAt: isListed ? now : undefined,
        createdAt: now + index * 10,
        traits: item.traits && item.traits.length > 0 ? item.traits : [],
        ipfsMetadataUri: `ipfs://QmBatchManifest${Array.from({length: 32}, () => Math.floor(Math.random()*36).toString(36)).join('')}/${tokenIdNumber}.json`,
        ipfsImageUri: `ipfs://QmBatchImages${Array.from({length: 32}, () => Math.floor(Math.random()*36).toString(36)).join('')}/${tokenIdNumber}.png`,
        contractAddress: targetContractAddress,
        txHash: itemTxHash,
        editionTotal: item.editionTotal || items.length,
        editionNumber: item.editionNumber || tokenIdNumber,
        unlockableContent: item.unlockableContent,
        hasUnlockableContent: !!item.unlockableContent,
        viewsCount: 1,
        likesCount: 0,
      };

      createdNFTs.push(newNFT);

      if (onProgress) {
        onProgress({
          current: index + 1,
          total: items.length,
          name: newNFT.name,
        });
      }
    });

    // Add all NFTs to state
    setNfts(prev => [...createdNFTs, ...prev]);

    // Record Batch Multicall Transaction
    const totalGasUsd = +(totalGasCrypto * chainConfig.usdPrice).toFixed(2);
    const batchTx: TransactionRecord = {
      id: `tx-bulk-${now}`,
      type: 'mint',
      txHash: batchTxHash,
      chainId: targetChain,
      fromAddress: activeAccount.address,
      toAddress: targetContractAddress,
      amountCrypto: 0,
      amountUsd: 0,
      gasUsedCrypto: totalGasCrypto,
      gasUsedUsd: totalGasUsd,
      gasPriceGwei: gasData.currentGwei,
      nftName: `Batch Mint: ${items.length} NFTs (${items[0]?.name}...)`,
      nftImage: items[0]?.image,
      collectionId: targetCollectionId,
      collectionName: targetCollectionName,
      timestamp: now,
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };
    setTransactions(prev => [batchTx, ...prev]);

    return {
      success: true,
      mintedNFTs: createdNFTs,
      collection: newlyCreatedCollection,
      txHash: batchTxHash,
      totalGasUsedCrypto: totalGasCrypto,
      totalGasUsedUsd: totalGasUsd,
    };
  };

  // LIST / DELIST NFT
  const listNFTForSale = async (nftId: string, price: number): Promise<boolean> => {
    setNfts(prev => prev.map(item => {
      if (item.id === nftId) {
        return {
          ...item,
          price,
          isListed: true,
          listedAt: Date.now(),
        };
      }
      return item;
    }));

    const nft = nfts.find(n => n.id === nftId);
    if (nft) {
      const chainConfig = SUPPORTED_CHAINS[nft.chainId];
      const newTx: TransactionRecord = {
        id: `tx-list-${Date.now()}`,
        type: 'list',
        txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
        chainId: nft.chainId,
        fromAddress: activeAccount.address,
        toAddress: nft.contractAddress,
        amountCrypto: price,
        amountUsd: +(price * chainConfig.usdPrice).toFixed(2),
        nftId: nft.id,
        nftName: nft.name,
        nftImage: nft.image,
        timestamp: Date.now(),
        status: 'confirmed',
        blockNumber: Math.floor(18000000 + Math.random() * 500000),
      };
      setTransactions(prev => [newTx, ...prev]);
    }
    return true;
  };

  const delistNFT = async (nftId: string): Promise<boolean> => {
    setNfts(prev => prev.map(item => {
      if (item.id === nftId) {
        return {
          ...item,
          price: undefined,
          isListed: false,
          listedAt: undefined,
        };
      }
      return item;
    }));
    return true;
  };

  // BUY NFT WITH AUTOMATED CREATOR ROYALTY SPLIT
  const buyNFT = async (nftId: string): Promise<{ success: boolean; royaltyPaid?: number; error?: string; txHash?: string }> => {
    const nft = nfts.find(n => n.id === nftId);
    if (!nft || !nft.price || !nft.isListed) {
      return { success: false, error: 'NFT is not listed for sale' };
    }

    const price = nft.price;
    const chainConfig = SUPPORTED_CHAINS[nft.chainId];
    const buyerBalance = activeAccount.balances[nft.chainId] || 0;

    const gasFee = gasData.actionsEstimate.buyNft.crypto;
    const totalCost = price + gasFee;

    if (buyerBalance < totalCost) {
      return {
        success: false,
        error: `Insufficient balance. You need ${totalCost.toFixed(4)} ${chainConfig.symbol} (${price} price + ${gasFee.toFixed(4)} gas), but have ${buyerBalance.toFixed(4)} ${chainConfig.symbol}. Claim from faucet!`,
      };
    }

    // Royalty Calculations
    const royaltyPercent = nft.royaltyPercentage || 0;
    const royaltyAmount = +(price * (royaltyPercent / 100)).toFixed(6);
    const marketplaceFee = +(price * 0.015).toFixed(6); // 1.5% protocol fee
    const sellerPayout = +(price - royaltyAmount - marketplaceFee).toFixed(6);

    const txHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    // 1. Update Accounts balances:
    // - Deduct from buyer (price + gas)
    // - Credit to seller (sellerPayout)
    // - Credit to creator if different from seller (royaltyAmount)
    setAccounts(prev => prev.map(acc => {
      let updatedBalances = { ...acc.balances };

      // Deduct from buyer
      if (acc.address === activeAccount.address) {
        updatedBalances[nft.chainId] = +(updatedBalances[nft.chainId] - totalCost).toFixed(6);
      }

      // Credit seller if demo account
      if (acc.address === nft.ownerAddress && acc.address !== activeAccount.address) {
        updatedBalances[nft.chainId] = +( (updatedBalances[nft.chainId] || 0) + sellerPayout ).toFixed(6);
      }

      // Credit creator royalty if demo account
      if (acc.address === nft.royaltyPayoutAddress && acc.address !== nft.ownerAddress && acc.address !== activeAccount.address) {
        updatedBalances[nft.chainId] = +( (updatedBalances[nft.chainId] || 0) + royaltyAmount ).toFixed(6);
      }

      return { ...acc, balances: updatedBalances };
    }));

    // 2. Transfer NFT ownership
    const previousOwner = nft.ownerAddress;
    setNfts(prev => prev.map(item => {
      if (item.id === nftId) {
        return {
          ...item,
          ownerAddress: activeAccount.address,
          ownerName: activeAccount.name,
          isListed: false,
          price: undefined,
          listedAt: undefined,
        };
      }
      return item;
    }));

    // 3. Log Royalty Payout Audit Record
    if (royaltyAmount > 0) {
      const royaltyRecord: RoyaltyPayoutRecord = {
        id: `roy-${Date.now()}`,
        txHash,
        nftId: nft.id,
        nftName: nft.name,
        nftImage: nft.image,
        collectionName: nft.collectionName || 'Single Editions',
        chainId: nft.chainId,
        sellerAddress: previousOwner,
        buyerAddress: activeAccount.address,
        salePriceCrypto: price,
        royaltyPercent,
        royaltyAmountCrypto: royaltyAmount,
        royaltyAmountUsd: +(royaltyAmount * chainConfig.usdPrice).toFixed(2),
        marketplaceFeeCrypto: marketplaceFee,
        sellerReceivedCrypto: sellerPayout,
        timestamp: Date.now(),
      };
      setRoyaltyLogs(prev => [royaltyRecord, ...prev]);
    }

    // 4. Record Buy Transaction
    const newTx: TransactionRecord = {
      id: `tx-buy-${Date.now()}`,
      type: 'buy',
      txHash,
      chainId: nft.chainId,
      fromAddress: activeAccount.address,
      toAddress: previousOwner,
      amountCrypto: price,
      amountUsd: +(price * chainConfig.usdPrice).toFixed(2),
      gasUsedCrypto: gasFee,
      gasUsedUsd: +(gasFee * chainConfig.usdPrice).toFixed(2),
      gasPriceGwei: gasData.currentGwei,
      nftId: nft.id,
      nftName: nft.name,
      nftImage: nft.image,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };
    setTransactions(prev => [newTx, ...prev]);

    return { success: true, royaltyPaid: royaltyAmount, txHash };
  };

  // TRANSFER NFT
  const transferNFT = async (nftId: string, recipientAddress: string): Promise<boolean> => {
    const nft = nfts.find(n => n.id === nftId);
    if (!nft) return false;

    setNfts(prev => prev.map(item => {
      if (item.id === nftId) {
        return {
          ...item,
          ownerAddress: recipientAddress,
          ownerName: `Owner (${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)})`,
          isListed: false,
          price: undefined,
        };
      }
      return item;
    }));

    const newTx: TransactionRecord = {
      id: `tx-transfer-${Date.now()}`,
      type: 'transfer',
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
      chainId: nft.chainId,
      fromAddress: activeAccount.address,
      toAddress: recipientAddress,
      nftId: nft.id,
      nftName: nft.name,
      nftImage: nft.image,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };
    setTransactions(prev => [newTx, ...prev]);
    return true;
  };

  // BURN NFT
  const burnNFT = async (nftId: string): Promise<boolean> => {
    const nft = nfts.find(n => n.id === nftId);
    if (!nft) return false;

    setNfts(prev => prev.filter(item => item.id !== nftId));

    const newTx: TransactionRecord = {
      id: `tx-burn-${Date.now()}`,
      type: 'burn',
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`,
      chainId: nft.chainId,
      fromAddress: activeAccount.address,
      toAddress: '0x000000000000000000000000000000000000dEaD',
      nftId: nft.id,
      nftName: nft.name,
      nftImage: nft.image,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };
    setTransactions(prev => [newTx, ...prev]);
    return true;
  };

  // MAKE & ACCEPT OFFERS
  const makeOffer = async (nftId: string, amount: number): Promise<boolean> => {
    const nft = nfts.find(n => n.id === nftId);
    if (!nft) return false;

    const chainConfig = SUPPORTED_CHAINS[nft.chainId];
    const newOffer: NFTOffer = {
      id: `offer-${Date.now()}`,
      nftId,
      bidderAddress: activeAccount.address,
      bidderName: activeAccount.name,
      amountCrypto: amount,
      amountUsd: +(amount * chainConfig.usdPrice).toFixed(2),
      chainId: nft.chainId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000 * 3,
      status: 'active',
    };
    setOffers(prev => [newOffer, ...prev]);
    return true;
  };

  const acceptOffer = async (offerId: string): Promise<boolean> => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return false;
    
    // Process offer sale
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o));
    return true;
  };

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
  const bridgeNFT = async ({
    nftId,
    destinationChain,
    recipientAddress,
    protocol,
    gasSpeed = 'standard',
    gasDropCrypto = 0,
    onStepUpdate
  }: {
    nftId: string;
    destinationChain: BlockchainNetwork;
    recipientAddress: string;
    protocol: BridgeProtocol;
    gasSpeed?: 'slow' | 'standard' | 'fast' | 'instant';
    gasDropCrypto?: number;
    onStepUpdate?: (step: number, message: string) => void;
  }): Promise<{ success: boolean; bridgeTx?: BridgeTransaction; error?: string }> => {
    const nft = nfts.find(n => n.id === nftId);
    if (!nft) {
      return { success: false, error: 'NFT not found in studio index' };
    }

    if (nft.chainId === destinationChain) {
      return { success: false, error: 'Destination chain must be different from source chain' };
    }

    const sourceChain = nft.chainId;
    const sourceConfig = SUPPORTED_CHAINS[sourceChain];
    const destConfig = SUPPORTED_CHAINS[destinationChain];
    const quote = calculateBridgeQuote(sourceChain, destinationChain, protocol, gasSpeed, gasDropCrypto);

    // Check user balance on source chain
    const currentSourceBalance = activeAccount.balances[sourceChain] || 0;
    const totalSourceCostCrypto = +(quote.sourceGasCrypto + quote.protocolFeeCrypto + (gasDropCrypto ? (gasDropCrypto * destConfig.usdPrice) / sourceConfig.usdPrice : 0)).toFixed(6);

    if (currentSourceBalance < totalSourceCostCrypto) {
      return {
        success: false,
        error: `Insufficient ${sourceConfig.symbol} balance. Total bridge cost is ${totalSourceCostCrypto} ${sourceConfig.symbol} (Gas + Protocol Fee), but your balance is ${currentSourceBalance.toFixed(4)} ${sourceConfig.symbol}. Claim free testnet tokens from the Faucet!`
      };
    }

    const sourceTxHash = generateRandomHex(64);
    const destinationTxHash = generateRandomHex(64);
    const messageId = protocol === 'layerzero' 
      ? `LZ-GUID-${generateRandomHex(16)}`
      : protocol === 'chainlink-ccip'
      ? `CCIP-MSG-${generateRandomHex(16)}`
      : protocol === 'wormhole'
      ? `VAA-SEQ-${generateRandomHex(16)}`
      : `HYPER-MSG-${generateRandomHex(16)}`;

    const destContract = getBridgedContractAddress(destinationChain, nft.contractAddress);
    const reqConfirms = getRequiredConfirmations(sourceChain);

    const bridgeTxRecord: BridgeTransaction = {
      id: `bridge-tx-${Date.now()}`,
      nftId: nft.id,
      nftName: nft.name,
      nftImage: nft.image,
      sourceChain,
      destinationChain,
      sourceContract: nft.contractAddress,
      destinationContract: destContract,
      sourceTokenId: nft.tokenId,
      destinationTokenId: nft.tokenId,
      senderAddress: activeAccount.address,
      recipientAddress: recipientAddress || activeAccount.address,
      protocol,
      bridgeStandard: quote.bridgeStandard,
      sourceTxHash,
      destinationTxHash,
      messageId,
      timestamp: Date.now(),
      status: 'initiating',
      step: 1,
      estTimeRemainingSeconds: quote.estTimeSeconds,
      protocolFeeCrypto: quote.protocolFeeCrypto,
      protocolFeeUsd: quote.protocolFeeUsd,
      gasRelayFeeCrypto: quote.relayerGasCrypto,
      gasRelayFeeUsd: quote.relayerGasUsd,
      gasDropCrypto,
      gasDropUsd: quote.gasDropUsd,
      securityConfirmations: { current: Math.min(3, reqConfirms), required: reqConfirms },
      explorerUrlSource: `${sourceConfig.blockExplorer}/tx/${sourceTxHash}`,
      explorerUrlDest: `${destConfig.blockExplorer}/tx/${destinationTxHash}`,
    };

    // Add initial pending bridge tx
    setBridgeTransactions(prev => [bridgeTxRecord, ...prev]);

    // 1. Deduct source balance
    setAccounts(prev => prev.map(acc => {
      if (acc.address === activeAccount.address) {
        const updated = { ...acc.balances };
        updated[sourceChain] = +(Math.max(0, updated[sourceChain] - totalSourceCostCrypto)).toFixed(6);
        return { ...acc, balances: updated };
      }
      return acc;
    }));

    // Step 1 Callback
    onStepUpdate?.(1, `Transmitting lock/burn transaction on ${sourceConfig.name}...`);
    await new Promise(r => setTimeout(r, 800));

    // Update to source_confirmed
    setBridgeTransactions(prev => prev.map(tx => {
      if (tx.id === bridgeTxRecord.id) {
        return {
          ...tx,
          status: 'source_confirmed',
          step: 2,
          securityConfirmations: { current: reqConfirms, required: reqConfirms }
        };
      }
      return tx;
    }));

    // Step 2 Callback
    onStepUpdate?.(2, `${BRIDGE_PROTOCOLS[protocol].name} oracles & DVN verifiers verifying packet cryptographic proof...`);
    await new Promise(r => setTimeout(r, 1100));

    // Update to verifying_relayers
    setBridgeTransactions(prev => prev.map(tx => {
      if (tx.id === bridgeTxRecord.id) {
        return {
          ...tx,
          status: 'dest_executing',
          step: 3,
        };
      }
      return tx;
    }));

    // Step 3 Callback
    onStepUpdate?.(3, `Relayer executing contract mint & transfer on ${destConfig.name}...`);
    await new Promise(r => setTimeout(r, 1000));

    // 2. If gas drop was requested, credit destination balance of recipient
    if (gasDropCrypto > 0) {
      setAccounts(prev => prev.map(acc => {
        if (acc.address === recipientAddress || acc.address === activeAccount.address) {
          const updated = { ...acc.balances };
          updated[destinationChain] = +( (updated[destinationChain] || 0) + gasDropCrypto ).toFixed(6);
          return { ...acc, balances: updated };
        }
        return acc;
      }));
    }

    // 3. Update the NFT itself to be on the destination chain
    setNfts(prev => prev.map(item => {
      if (item.id === nft.id) {
        return {
          ...item,
          chainId: destinationChain,
          contractAddress: destContract,
          ownerAddress: recipientAddress || activeAccount.address,
          txHash: destinationTxHash,
          isListed: false, // delist upon cross-chain migration
          price: undefined,
          listedAt: undefined,
        };
      }
      return item;
    }));

    // 4. Log transactions on both chains
    const sourceTx: TransactionRecord = {
      id: `tx-bridgeout-${Date.now()}`,
      type: 'bridge_out',
      txHash: sourceTxHash,
      chainId: sourceChain,
      fromAddress: activeAccount.address,
      toAddress: destConfig.blockExplorer,
      amountCrypto: quote.protocolFeeCrypto,
      amountUsd: quote.protocolFeeUsd,
      gasUsedCrypto: quote.sourceGasCrypto,
      gasUsedUsd: quote.sourceGasUsd,
      nftId: nft.id,
      nftName: nft.name,
      nftImage: nft.image,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };

    const destTx: TransactionRecord = {
      id: `tx-bridgein-${Date.now()}`,
      type: 'bridge_in',
      txHash: destinationTxHash,
      chainId: destinationChain,
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: recipientAddress || activeAccount.address,
      amountCrypto: gasDropCrypto,
      amountUsd: quote.gasDropUsd,
      gasUsedCrypto: quote.relayerGasCrypto,
      gasUsedUsd: quote.relayerGasUsd,
      nftId: nft.id,
      nftName: nft.name,
      nftImage: nft.image,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(25000000 + Math.random() * 500000),
    };

    setTransactions(prev => [destTx, sourceTx, ...prev]);

    // 5. Finalize Bridge Transaction record
    const finalBridgeTx: BridgeTransaction = {
      ...bridgeTxRecord,
      status: 'completed',
      step: 4,
      estTimeRemainingSeconds: 0,
      completedAt: Date.now(),
    };

    setBridgeTransactions(prev => prev.map(tx => tx.id === bridgeTxRecord.id ? finalBridgeTx : tx));

    // Step 4 Callback
    onStepUpdate?.(4, `Teleport complete! NFT is now live on ${destConfig.name}.`);

    return {
      success: true,
      bridgeTx: finalBridgeTx
    };
  };

  const clearBridgeHistory = () => {
    setBridgeTransactions([]);
    localStorage.removeItem(STORAGE_KEYS.BRIDGE_TXS);
  };

  // BATCH UPDATE ROYALTIES
  const batchUpdateRoyalties = async (
    updates: BatchRoyaltyUpdateItem[]
  ): Promise<BatchRoyaltyResult> => {
    if (!updates || updates.length === 0) {
      return { success: false, updatedCount: 0, error: 'No collection updates provided' };
    }

    const targetChain = activeChain;
    const chainConfig = SUPPORTED_CHAINS[targetChain];
    const baseMulticallGas = 0.0004; // Multicall batch optimization
    const perCollectionGas = 0.00012;
    const totalGasCrypto = +(baseMulticallGas + perCollectionGas * updates.length).toFixed(6);
    const totalGasUsd = +(totalGasCrypto * chainConfig.usdPrice).toFixed(2);

    // Deduct gas from active account balance
    setAccounts(prev => prev.map((acc, i) => {
      if (i === activeAccountIndex) {
        return {
          ...acc,
          balances: {
            ...acc.balances,
            [targetChain]: +(Math.max(0, (acc.balances[targetChain] || 0) - totalGasCrypto)).toFixed(6),
          },
        };
      }
      return acc;
    }));

    const updateMap = new Map(updates.map(u => [u.collectionId, u]));

    // Update collections state
    setCollections(prev => prev.map(c => {
      const update = updateMap.get(c.id);
      if (update) {
        return {
          ...c,
          royaltyPercentage: update.royaltyPercentage,
          royaltyPayoutAddress: update.royaltyPayoutAddress || c.royaltyPayoutAddress || activeAccount.address,
        };
      }
      return c;
    }));

    // Update all matching NFTs in state so marketplace and details stay in sync
    setNfts(prev => prev.map(nft => {
      if (nft.collectionId && updateMap.has(nft.collectionId)) {
        const update = updateMap.get(nft.collectionId)!;
        return {
          ...nft,
          royaltyPercentage: update.royaltyPercentage,
          royaltyPayoutAddress: update.royaltyPayoutAddress || nft.royaltyPayoutAddress || activeAccount.address,
        };
      }
      return nft;
    }));

    // Generate confirmed transaction record
    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const royaltyTx: TransactionRecord = {
      id: `tx-royalty-update-${Date.now()}`,
      type: 'update_royalties',
      txHash,
      chainId: targetChain,
      fromAddress: activeAccount.address,
      toAddress: '0x0000000000000000000000000000000000000000',
      amountCrypto: 0,
      amountUsd: 0,
      gasUsedCrypto: totalGasCrypto,
      gasUsedUsd: totalGasUsd,
      gasPriceGwei: gasData.currentGwei,
      collectionName: `${updates.length} Collections (ERC-2981 Batch)`,
      timestamp: Date.now(),
      status: 'confirmed',
      blockNumber: Math.floor(18000000 + Math.random() * 500000),
    };
    setTransactions(prev => [royaltyTx, ...prev]);

    return {
      success: true,
      updatedCount: updates.length,
      txHash,
      totalGasUsedCrypto: totalGasCrypto,
      totalGasUsedUsd: totalGasUsd,
    };
  };

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

  return (
    <Web3Context.Provider
      value={{
        activeChain,
        currentChainConfig,
        allChains: CHAIN_LIST,
        switchChain,

        gasData,
        selectedGasSpeed,
        setSelectedGasSpeed,
        gasHistory,

        isConnected,
        activeAccount,
        allAccounts: accounts,
        connectInjectedWallet,
        connectDemoAccount,
        disconnectWallet,
        claimFaucetTokens,
        activeBalance,

        nfts,
        collections,
        transactions,
        royaltyLogs,
        offers,
        bridgeTransactions,

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
