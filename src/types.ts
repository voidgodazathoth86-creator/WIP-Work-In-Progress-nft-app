export type BlockchainNetwork = 
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'solana'
  | 'avalanche'
  | 'bsc';

export type TokenStandard = 'ERC-721' | 'ERC-1155' | 'SPL-NFT';

export interface ChainConfig {
  id: BlockchainNetwork;
  name: string;
  shortName: string;
  symbol: string;
  nativeCurrency: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  testnetName: string;
  isTestnet: boolean;
  chainId: number | string;
  rpcUrl: string;
  blockExplorer: string;
  avgBlockTime: string;
  faucetAmount: number;
  faucetSymbol: string;
  standard: TokenStandard;
  usdPrice: number; // e.g. ETH = $3150, MATIC = $0.65, SOL = $175
  baseGwei: number;
}

export interface GasTier {
  speed: 'slow' | 'standard' | 'fast' | 'instant';
  label: string;
  baseFee: number; // Gwei or micro-lamports
  priorityFee: number; // Gwei
  totalGwei: number;
  estTime: string; // e.g. "~12 sec"
  estCostCrypto: number;
  estCostUsd: number;
}

export interface GasEstimation {
  chainId: BlockchainNetwork;
  currentGwei: number;
  gweiChangePercent: number;
  baseFee: number;
  priorityFee: number;
  lastUpdated: number;
  tiers: {
    slow: GasTier;
    standard: GasTier;
    fast: GasTier;
    instant: GasTier;
  };
  actionsEstimate: {
    mintSingle: { crypto: number; usd: number; gasUnits: number };
    mintCollection: { crypto: number; usd: number; gasUnits: number };
    listNft: { crypto: number; usd: number; gasUnits: number };
    buyNft: { crypto: number; usd: number; gasUnits: number };
    transferNft: { crypto: number; usd: number; gasUnits: number };
  };
}

export interface NFTTrait {
  trait_type: string;
  value: string | number;
  display_type?: 'string' | 'number' | 'boost_percentage' | 'boost_number' | 'date';
  max_value?: number;
  rarityPercentage?: number;
}

export interface NFT {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
  chainId: BlockchainNetwork;
  standard: TokenStandard;
  collectionId?: string;
  collectionName?: string;
  creatorAddress: string;
  creatorName?: string;
  ownerAddress: string;
  ownerName?: string;
  royaltyPercentage: number; // 0 to 25% (e.g. 7.5)
  royaltyPayoutAddress: string;
  price?: number; // In native currency if listed
  isListed: boolean;
  listedAt?: number;
  createdAt: number;
  traits: NFTTrait[];
  ipfsMetadataUri: string;
  ipfsImageUri: string;
  contractAddress: string;
  txHash: string;
  editionTotal?: number;
  editionNumber?: number;
  unlockableContent?: string;
  hasUnlockableContent?: boolean;
  viewsCount?: number;
  likesCount?: number;
}

export interface NFTCollection {
  id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  bannerImage: string;
  avatarImage: string;
  chainId: BlockchainNetwork;
  standard: TokenStandard;
  creatorAddress: string;
  creatorName?: string;
  royaltyPercentage: number;
  royaltyPayoutAddress: string;
  category: 'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility';
  maxSupply: number;
  currentSupply: number;
  floorPrice: number;
  totalVolume: number;
  ownersCount: number;
  createdAt: number;
  verified: boolean;
}

export interface WalletAccount {
  address: string;
  name: string;
  avatar: string;
  type: 'injected' | 'demo' | 'simulated';
  providerName: string; // 'MetaMask' | 'Phantom' | 'Coinbase' | 'Studio Keyring'
  balances: Record<BlockchainNetwork, number>;
  privateKey?: string;
}

export interface TransactionRecord {
  id: string;
  type: 'mint' | 'deploy_collection' | 'list' | 'delist' | 'buy' | 'sell' | 'transfer' | 'burn' | 'royalty_received' | 'faucet' | 'bridge_out' | 'bridge_in';
  txHash: string;
  chainId: BlockchainNetwork;
  fromAddress: string;
  toAddress: string;
  amountCrypto?: number;
  amountUsd?: number;
  gasUsedCrypto?: number;
  gasUsedUsd?: number;
  gasPriceGwei?: number;
  nftId?: string;
  nftName?: string;
  nftImage?: string;
  collectionId?: string;
  collectionName?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber: number;
}

export interface RoyaltyPayoutRecord {
  id: string;
  txHash: string;
  nftId: string;
  nftName: string;
  nftImage: string;
  collectionName: string;
  chainId: BlockchainNetwork;
  sellerAddress: string;
  buyerAddress: string;
  salePriceCrypto: number;
  royaltyPercent: number;
  royaltyAmountCrypto: number;
  royaltyAmountUsd: number;
  marketplaceFeeCrypto: number;
  sellerReceivedCrypto: number;
  timestamp: number;
}

export interface NFTOffer {
  id: string;
  nftId: string;
  bidderAddress: string;
  bidderName?: string;
  amountCrypto: number;
  amountUsd: number;
  chainId: BlockchainNetwork;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'accepted' | 'rejected' | 'expired';
}

export interface AIMetadataSuggestion {
  name: string;
  alternativeNames: string[];
  description: string;
  shortDescription: string;
  category: 'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility';
  suggestedRoyalty: number;
  suggestedPrice: number;
  unlockableLore: string;
  tags: string[];
  visualAnalysis: {
    dominantColors: string[];
    aestheticStyle: string;
    mood: string;
  };
  traits: NFTTrait[];
}

export interface AICollectionSuggestion {
  name: string;
  symbol: string;
  description: string;
  maxSupply: number;
  mintPrice: number;
  suggestedRoyalty: number;
  maxPerWallet: number;
}

export interface BulkNFTItem {
  id: string;
  rowIndex: number;
  name: string;
  description: string;
  image: string;
  price?: number;
  royaltyPercentage?: number;
  category?: 'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility';
  unlockableContent?: string;
  traits: NFTTrait[];
  editionTotal?: number;
  editionNumber?: number;
  selected: boolean;
  validationStatus: 'valid' | 'warning' | 'error';
  validationIssues?: string[];
}

export interface BulkMintConfig {
  targetMode: 'existing_collection' | 'new_collection' | 'standalone';
  existingCollectionId?: string;
  newCollectionName?: string;
  newCollectionSymbol?: string;
  newCollectionDescription?: string;
  newCollectionCategory?: 'art' | 'gaming' | 'pfp' | 'photography' | 'music' | 'metaverse' | 'utility';
  newCollectionRoyalty?: number;
  newCollectionMaxSupply?: number;
  newCollectionBanner?: string;
  newCollectionAvatar?: string;
  standard: TokenStandard;
  chainId: BlockchainNetwork;
  isInstantListAll?: boolean;
  defaultPrice?: number;
  defaultRoyalty?: number;
  gasSpeed: 'slow' | 'standard' | 'fast' | 'instant';
}

export interface BulkMintProgress {
  step: 'idle' | 'validating' | 'ipfs_upload' | 'deploying_collection' | 'signing' | 'minting_batch' | 'completed' | 'error';
  totalItems: number;
  completedItems: number;
  currentMintingName: string;
  txHashes: string[];
  collectionContractAddress?: string;
  createdCollection?: NFTCollection;
  mintedNFTs: NFT[];
  totalGasUsedCrypto: number;
  totalGasUsedUsd: number;
  error?: string;
}

export type BridgeProtocol = 'layerzero' | 'chainlink-ccip' | 'wormhole' | 'hyperlane';

export type BridgeStandard = 'ONFT-721' | 'Lock & Mint' | 'CCIP-TokenTransfer';

export interface BridgeProtocolInfo {
  id: BridgeProtocol;
  name: string;
  shortName: string;
  version: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  securityModel: string;
  relayerType: string;
  baseFeeUsd: number;
  avgTimeSeconds: number;
  securityRating: string;
  supportedChains: BlockchainNetwork[];
}

export interface BridgeTransaction {
  id: string;
  nftId: string;
  nftName: string;
  nftImage: string;
  sourceChain: BlockchainNetwork;
  destinationChain: BlockchainNetwork;
  sourceContract: string;
  destinationContract: string;
  sourceTokenId: string;
  destinationTokenId: string;
  senderAddress: string;
  recipientAddress: string;
  protocol: BridgeProtocol;
  bridgeStandard: BridgeStandard;
  sourceTxHash: string;
  destinationTxHash?: string;
  messageId: string;
  timestamp: number;
  completedAt?: number;
  status: 'initiating' | 'source_confirmed' | 'verifying_relayers' | 'dest_executing' | 'completed' | 'failed';
  step: number; // 1 to 4
  estTimeRemainingSeconds: number;
  protocolFeeCrypto: number;
  protocolFeeUsd: number;
  gasRelayFeeCrypto: number;
  gasRelayFeeUsd: number;
  gasDropCrypto?: number;
  gasDropUsd?: number;
  securityConfirmations: { current: number; required: number };
  explorerUrlSource: string;
  explorerUrlDest: string;
  errorMessage?: string;
}

export interface BridgeQuote {
  protocol: BridgeProtocol;
  protocolName: string;
  bridgeStandard: BridgeStandard;
  estTimeSeconds: number;
  protocolFeeCrypto: number;
  protocolFeeUsd: number;
  sourceGasCrypto: number;
  sourceGasUsd: number;
  relayerGasCrypto: number;
  relayerGasUsd: number;
  gasDropCrypto: number;
  gasDropUsd: number;
  totalCostCrypto: number;
  totalCostUsd: number;
  securityScore: number; // 1-100
  securityNote: string;
}

