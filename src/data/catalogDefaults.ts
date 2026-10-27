import { NFT, NFTCollection, RoyaltyPayoutRecord, TransactionRecord } from '../types';
import { WIP_COLLECTION, WIP_LOGO_COLLECTION } from '../config/wipCollection';

/**
 * Marketplace items and collection records are loaded from the Polygon indexer
 * and the application database. Keep these defaults empty so sample data can
 * never be mistaken for a deployed asset or a confirmed transaction.
 */
const configuredCollection = (config: typeof WIP_COLLECTION | typeof WIP_LOGO_COLLECTION, supply: number): NFTCollection => ({
  id: config.id,
  contractAddress: config.contractAddress,
  name: config.name,
  symbol: config.symbol,
  description: 'Polygon collection tracked from its deployed contract and marketplace index.',
  bannerImage: '',
  avatarImage: '',
  chainId: 'polygon',
  standard: 'ERC-721',
  creatorAddress: config.royaltyReceiver,
  creatorName: 'WIP',
  royaltyPercentage: config.royaltyBps / 100,
  royaltyPayoutAddress: config.royaltyReceiver,
  category: 'art',
  maxSupply: config.maxSupply,
  currentSupply: supply,
  floorPrice: 0,
  totalVolume: 0,
  ownersCount: 0,
  createdAt: 0,
  verified: false,
});

export const INITIAL_COLLECTIONS: NFTCollection[] = [
  configuredCollection(WIP_COLLECTION, 5),
  configuredCollection(WIP_LOGO_COLLECTION, 0),
];
export const INITIAL_NFTS: NFT[] = [];
export const INITIAL_ROYALTY_LOGS: RoyaltyPayoutRecord[] = [];
export const INITIAL_TRANSACTIONS: TransactionRecord[] = [];
