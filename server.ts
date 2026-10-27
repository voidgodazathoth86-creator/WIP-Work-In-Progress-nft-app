// server.ts - PRODUCTION FINAL - EXPRESS + VITE + SUPABASE + FIRESTORE + GEMINI 3.8 FLASH - WHOLE - NO TRIMMING
// Fee Collector LIVE: 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E Polygon Block 93415806
// Fee Wallet (YOU GET PAID): 0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0
// Collections: 0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9 WIP + 0x675fD85FbcB13CE8080DBba780424A9e571B7f46 WIP Logo
// SUPABASE Org: Work-in-Progress-NFTs | Project: WIP-nfts | Region: America us-east-1 | Pooler: aws-0-us-east-1.pooler.supabase.com:6543 | GitHub linked | No card needed

import express, { type Request, type Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import { firebaseConfig } from './firebase-config.ts';
import { SITE_LINKS } from './deployed-config.ts';
import { COLLECTION_FACTORY_1000, WIP_FACTORY } from './src/config/wipCollection.ts';
import { collectionFactoryAbi, wipFactoryAbi } from './src/abi/polygonContracts.ts';

// Prevent uncaught errors from crashing Cloud Run
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

dotenv.config();
// --- PROD ENV CHECK & INITIALIZATION ---
const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

if (!DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production; refusing to start without persistent Supabase storage.');
  }
  console.warn("Notice: DATABASE_URL not set. Running without persistent Supabase storage.");
}

// --- DATABASE POOLER (PORT 6543) WITH CIRCUIT BREAKER ---
export let pool: Pool | null = null;
let dbDisabledUntil = 0;
let dbLastErrorMsg = '';

if (DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
    });
    pool.on('error', (err: any) => {
      const msg = err?.message || String(err);
      dbLastErrorMsg = msg;
      if (msg.includes('tenant/user') || msg.includes('ENOTFOUND') || err?.code === 'XX000') {
        dbDisabledUntil = Date.now() + 120_000;
      }
    });
  } catch (err: any) {
    console.warn('Database Pool initialization notice:', err?.message || err);
  }
}

export async function safeQuery<T = any>(sql: string, params?: any[]): Promise<T[] | null> {
  if (!pool) return null;
  const now = Date.now();
  if (now < dbDisabledUntil) {
    return null;
  }
  try {
    const res = await pool.query(sql, params);
    return res.rows as T[];
  } catch (err: any) {
    const msg = err?.message || String(err);
    dbLastErrorMsg = msg;
    if (msg.includes('tenant/user') || msg.includes('ENOTFOUND') || err?.code === 'XX000' || err?.code === '28P01') {
      dbDisabledUntil = Date.now() + 120_000;
      console.warn(`[Database Notice] Remote DB unreachable (${msg.slice(0, 80)}). Operating in resilient fallback mode for 2m.`);
    } else {
      console.warn('[Database Notice]:', msg.slice(0, 100));
    }
    return null;
  }
}

async function persistOnChainSnapshot(collectionData: { contractAddress: string; name: string; symbol: string; totalSupply: number; tokens: any[] }) {
  const address = collectionData.contractAddress.toLowerCase();
  const savedCollection = await safeQuery<any>(
    `INSERT INTO collections (chain, contract_address, name, symbol, total_supply)
     VALUES ('polygon', $1, $2, $3, $4)
     ON CONFLICT (chain, contract_address) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, total_supply = EXCLUDED.total_supply
     RETURNING id`,
    [address, collectionData.name, collectionData.symbol, collectionData.totalSupply]
  );
  const collectionId = savedCollection?.[0]?.id;
  if (!collectionId || !collectionData.tokens.length) return;

  const changedTokenIds: string[] = [];
  for (let offset = 0; offset < collectionData.tokens.length; offset += 500) {
    const chunk = collectionData.tokens.slice(offset, offset + 500);
    const params: any[] = [];
    const valueSql = chunk.map((token: any, index: number) => {
      const start = index * 6;
      params.push(collectionId, String(token.token_id ?? token.tokenId).replace(/^#/, ''), token.owner_wallet || null, token.metadata_ipfs_uri || null, token.name || null, token.image_ipfs_uri || token.image || null);
      return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6})`;
    }).join(',');
    const changedRows = await safeQuery<any>(
      `INSERT INTO tokens (collection_id, token_id, owner_wallet, metadata_ipfs_uri, name, image_ipfs_uri)
       VALUES ${valueSql}
       ON CONFLICT (collection_id, token_id) DO UPDATE SET owner_wallet = EXCLUDED.owner_wallet,
         metadata_ipfs_uri = EXCLUDED.metadata_ipfs_uri, name = EXCLUDED.name,
         image_ipfs_uri = EXCLUDED.image_ipfs_uri, updated_at = NOW()
       WHERE tokens.owner_wallet IS DISTINCT FROM EXCLUDED.owner_wallet
          OR tokens.metadata_ipfs_uri IS DISTINCT FROM EXCLUDED.metadata_ipfs_uri
          OR tokens.name IS DISTINCT FROM EXCLUDED.name
          OR tokens.image_ipfs_uri IS DISTINCT FROM EXCLUDED.image_ipfs_uri
       RETURNING token_id`,
      params
    );
    changedTokenIds.push(...(changedRows || []).map(row => String(row.token_id)));
  }
  return [...new Set(changedTokenIds)];
}

async function refreshExternalMarketplaceMetadata(contractAddress: string, tokenId: string) {
  const tasks: Promise<{ provider: string; status: string }>[] = [];
  const openSeaKey = (process.env.OPENSEA_API_KEY || '').trim();
  if (openSeaKey) {
    tasks.push(fetch(`https://api.opensea.io/api/v2/chain/polygon/contract/${contractAddress}/nfts/${encodeURIComponent(tokenId)}/refresh`, {
      method: 'POST', headers: { 'X-API-KEY': openSeaKey }, signal: AbortSignal.timeout(8000),
    }).then(response => ({ provider: 'opensea', status: response.ok ? 'queued' : `http_${response.status}` })));
  }
  const thirdwebClientId = (process.env.THIRDWEB_CLIENT_ID || '').trim();
  if (thirdwebClientId) {
    const url = new URL(`https://insight.thirdweb.com/v1/nfts/metadata/refresh/${contractAddress}/${encodeURIComponent(tokenId)}`);
    url.searchParams.set('chain', '137');
    tasks.push(fetch(url, { headers: { 'x-client-id': thirdwebClientId }, signal: AbortSignal.timeout(8000) })
      .then(response => ({ provider: 'thirdweb', status: response.ok ? 'queued' : `http_${response.status}` })));
  }
  return Promise.allSettled(tasks);
}

const pendingMarketplaceRefreshes = new Map<string, { contractAddress: string; tokenId: string }>();

async function queueAndRefreshMarketplaceMetadata(contractAddress: string, tokenIds: string[]) {
  if (!process.env.OPENSEA_API_KEY && !process.env.THIRDWEB_CLIENT_ID) return { queued: 0, attempted: 0 };
  for (const tokenId of tokenIds) {
    const id = String(tokenId).replace(/^#/, '');
    if (/^\d+$/.test(id)) pendingMarketplaceRefreshes.set(`${contractAddress.toLowerCase()}:${id}`, { contractAddress, tokenId: id });
  }
  const batch = Array.from(pendingMarketplaceRefreshes.entries()).slice(0, 20);
  for (const [key] of batch) pendingMarketplaceRefreshes.delete(key);
  const outcomes = await Promise.allSettled(batch.map(([, token]) => refreshExternalMarketplaceMetadata(token.contractAddress, token.tokenId)));
  outcomes.forEach((outcome, index) => {
    if (outcome.status === 'rejected') {
      const token = batch[index][1];
      pendingMarketplaceRefreshes.set(`${token.contractAddress.toLowerCase()}:${token.tokenId}`, token);
    }
  });
  return { queued: pendingMarketplaceRefreshes.size, attempted: batch.length };
}

// Safe Gemini AI Initializer - uses secret injected at runtime
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Gemini client initialization error:', err);
    return null;
  }
}

// --- GEMINI 3.8 FLASH ---
export const ai = getGeminiClient();

// --- FIRESTORE ---
let firebaseApp: any = null;
export let db: any = null;
try {
  firebaseApp = initializeApp({
    apiKey: FIREBASE_API_KEY || firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}

// === LIVE DEPLOYED - HARDCODED ===
export const FEE_COLLECTOR_ADDRESS = "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E";
export const FEE_COLLECTOR_CHAIN = "polygon";
export const FEE_WALLET = "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0";
export const ROYALTY_WALLET = "0xBaB06d358B181eB16e3189525BCc0bc4761a3762";
export const USDC_POLYGON = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352";
export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9";
export const LOGO_COLLECTION = "0x675fD85FbcB13CE8080DBba780424A9e571B7f46";

export const OWNER_WALLETS = [
  "0xb30ee8937bb6488be0b8ea702618a2d50ba0c4b0",
  "0xbab06d358b181eb16e3189525bcc0bc4761a3762",
  "0xbaB06d358B181eB16e3189525BCc0bc4761a3762",
  "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0",
].map(w => w.toLowerCase());

export function isOwner(wallet: string): boolean {
  if (!wallet) return false;
  return OWNER_WALLETS.includes(wallet.toLowerCase());
}

// In-memory cache for live minted tokens across sessions

// Polygon Public RPC Failover list
const POLYGON_RPCS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.llamarpc.com',
  'https://1rpc.io/matic',
  'https://rpc.ankr.com/polygon'
];

let onChainCache: any = null;
let lastOnChainFetch = 0;
const polygonCollectionCache = new Map<string, { expiresAt: number; value: any }>();

async function readFactoryCollectionAddresses(factoryAddress: string, abi: readonly unknown[], functionName: 'getAllCollections' | 'getWIPCollections'): Promise<string[]> {
  for (const rpc of POLYGON_RPCS) {
    try {
      const client = createPublicClient({ chain: polygon, transport: http(rpc, { timeout: 8000 }) });
      const addresses = await (client as any).readContract({ address: factoryAddress as `0x${string}`, abi, functionName });
      return Array.isArray(addresses) ? addresses.filter((address): address is string => typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address)) : [];
    } catch { /* Try the next Polygon RPC. */ }
  }
  return [];
}

async function fetchPolygonScanTokenIds(contractAddress: string): Promise<string[] | null> {
  const apiKey = (process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '').trim();
  if (!apiKey) return null;
  const records: any[] = [];
  const pageSize = 10000;
  for (let page = 1; page <= 10; page++) {
    const url = new URL('https://api.etherscan.io/v2/api');
    url.search = new URLSearchParams({
      chainid: '137', module: 'account', action: 'tokennfttx', contractaddress: contractAddress,
      page: String(page), offset: String(pageSize), sort: 'asc', apikey: apiKey,
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Polygonscan API returned HTTP ${response.status}.`);
    const body: any = await response.json();
    if (!Array.isArray(body.result)) throw new Error(`Polygonscan API error: ${String(body.result || body.message || 'unknown response')}`);
    records.push(...body.result);
    if (body.result.length < pageSize) break;
  }
  return [...new Set(records.map(record => String(record.tokenID)).filter(id => /^\d+$/.test(id)))].slice(0, 5000);
}

async function fetchPolygonCollection(contractAddress: string) {
  const cacheKey = contractAddress.toLowerCase();
  const cached = polygonCollectionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const abi = [
    { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
    { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
    { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
    { name: 'tokenURI', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'string' }] },
    { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
  ];
  const address = contractAddress as `0x${string}`;
  let lastError: unknown;

  for (const rpc of POLYGON_RPCS) {
    try {
      const client = createPublicClient({ chain: polygon, transport: http(rpc, { timeout: 8000 }) });
      const bytecode = await client.getBytecode({ address });
      if (!bytecode || bytecode === '0x') throw new Error('Address is not a deployed contract on Polygon.');
      const c = client as any;
      const [name, symbol, supply, owner, currentBlock] = await Promise.all([
        c.readContract({ address, abi, functionName: 'name' }),
        c.readContract({ address, abi, functionName: 'symbol' }),
        c.readContract({ address, abi, functionName: 'totalSupply' }).catch(() => null),
        c.readContract({ address, abi, functionName: 'owner' }).catch(() => ''),
        client.getBlockNumber(),
      ]);
      const indexedTokenIds = await fetchPolygonScanTokenIds(contractAddress).catch((error) => {
        console.warn(`Polygonscan token index unavailable for ${contractAddress}; using sequential IDs only:`, error instanceof Error ? error.message : error);
        return null;
      });
      const supplyCount = supply === null ? indexedTokenIds?.length : Number(supply);
      if (supplyCount === undefined || !Number.isSafeInteger(supplyCount) || supplyCount < 0 || supplyCount > 5000) {
        throw new Error(`Could not read a supported total supply for ${contractAddress}; configure a valid Polygonscan API key to index its transfers.`);
      }
      if (indexedTokenIds && indexedTokenIds.length > 5000) throw new Error('Collection exceeds the 5,000 item index limit.');
      const tokenIds = indexedTokenIds || Array.from({ length: supplyCount }, (_, tokenId) => String(tokenId));
      const tokens: any[] = [];
      for (let offset = 0; offset < tokenIds.length; offset += 40) {
        const batch = await Promise.all(tokenIds.slice(offset, offset + 40).map(async (tokenId) => {
        try {
          const [tokenOwner, tokenUri] = await Promise.all([
            c.readContract({ address, abi, functionName: 'ownerOf', args: [BigInt(tokenId)] }),
            c.readContract({ address, abi, functionName: 'tokenURI', args: [BigInt(tokenId)] }),
          ]);
          const metadataUri = String(tokenUri || '');
          const metadataUrl = metadataUri.startsWith('ipfs://')
            ? `https://ipfs.io/ipfs/${metadataUri.slice('ipfs://'.length)}`
            : metadataUri.startsWith('ar://') ? `https://arweave.net/${metadataUri.slice('ar://'.length)}` : metadataUri;
          let metadata: any = {};
          if (metadataUri.startsWith('data:application/json;base64,')) {
            try { metadata = JSON.parse(Buffer.from(metadataUri.slice('data:application/json;base64,'.length), 'base64').toString('utf8')); } catch {}
          } else if (metadataUrl.startsWith('https://') || metadataUrl.startsWith('http://')) {
            const response = await fetch(metadataUrl, { signal: AbortSignal.timeout(6000) }).catch(() => null);
            if (response?.ok) metadata = await response.json().catch(() => ({}));
          }
          const rawImage = String(metadata.image || metadata.image_url || '');
          const image = rawImage.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${rawImage.slice(7)}` : rawImage.startsWith('ar://') ? `https://arweave.net/${rawImage.slice(5)}` : rawImage;
          return {
            tokenId,
            token_id: tokenId,
            owner_wallet: String(tokenOwner),
            metadata_ipfs_uri: metadataUri,
            name: String(metadata.name || `${name} #${tokenId}`),
            description: String(metadata.description || ''),
            image,
            image_ipfs_uri: rawImage,
            animation_url: metadata.animation_url || metadata.animation || '',
            traits: Array.isArray(metadata.attributes) ? metadata.attributes : [],
            contract_address: contractAddress,
            chain: 'polygon',
            polygonscanUrl: `https://polygonscan.com/token/${contractAddress}?a=${tokenId}`,
          };
        } catch {
          return null;
        }
      }));
        tokens.push(...batch.filter(Boolean));
      }

      const data = { contractAddress, name: String(name), symbol: String(symbol), totalSupply: supplyCount, owner: String(owner), currentBlock: Number(currentBlock), tokens, rpcUsed: rpc, indexSource: indexedTokenIds ? 'polygonscan+polygon-rpc' : 'sequential-contract-enumeration', fetchedAt: Date.now() };
      polygonCollectionCache.set(cacheKey, { value: data, expiresAt: Date.now() + 15_000 });
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to read Polygon contract ${contractAddress}.`);
}

export async function getOnChainWipData() {
  const now = Date.now();
  if (onChainCache && now - lastOnChainFetch < 15_000) {
    return onChainCache;
  }

  const data = await fetchPolygonCollection(WIP_COLLECTION);
  onChainCache = data;
  lastOnChainFetch = now;
  return data;
}

// Fee resolution helper with resilient fallback
async function getFee(action: string): Promise<number> {
  const rows = await safeQuery('SELECT fee_usdc FROM fee_config WHERE action = $1', [action]);
  if (rows && rows[0]) return parseFloat((rows[0] as any).fee_usdc);

  const defaults: Record<string, number> = {
    mint: 2.5,
    bridge: 1.5,
    list: 0.5,
    trade: 2.5,
    app_access: 5.0,
    app_monthly: 9.99,
    app_lifetime: 49.99,
  };
  return defaults[action] ?? 0.5;
}

// =========================================================================
// === ON-CHAIN POLYGON & POLYGONSCAN COLLECTION REGISTRY ===
// =========================================================================
interface TrackedOnChainCollection {
  address: string;
  name: string;
  symbol: string;
  totalSupply: number;
  maxSupply?: number;
  owner: string;
  royaltyPercentage: number;
  royaltyReceiver: string;
  description: string;
  category: string;
  tokens: any[];
  lastSyncedAt: number;
  polygonscanUrl: string;
  source: 'on-chain';
  verified: boolean;
}

const trackedOnChainCollections = new Map<string, TrackedOnChainCollection>();

// Preload verified official Polygon collections
trackedOnChainCollections.set(WIP_COLLECTION.toLowerCase(), {
  address: WIP_COLLECTION,
  name: 'Work-In-Progress-NFTs',
  symbol: 'WIP',
  totalSupply: 5,
  maxSupply: 1000,
  owner: ROYALTY_WALLET,
  royaltyPercentage: 0,
  royaltyReceiver: '',
  description: 'Work In Progress collection on Polygon. Collection details are refreshed from the deployed contract.',
  category: 'art',
  tokens: [],
  lastSyncedAt: 0,
  polygonscanUrl: `https://polygonscan.com/address/${WIP_COLLECTION}`,
  source: 'on-chain',
  verified: false
});

trackedOnChainCollections.set(LOGO_COLLECTION.toLowerCase(), {
  address: LOGO_COLLECTION,
  name: 'WIP Logo Collection',
  symbol: 'WIPLOGO',
  totalSupply: 0,
  maxSupply: 1000,
  owner: ROYALTY_WALLET,
  royaltyPercentage: 0,
  royaltyReceiver: '',
  description: 'WIP Logo collection on Polygon. Collection details are refreshed from the deployed contract.',
  category: 'art',
  tokens: [],
  lastSyncedAt: 0,
  polygonscanUrl: `https://polygonscan.com/address/${LOGO_COLLECTION}`,
  source: 'on-chain',
  verified: false
});

// Generic reader for ANY ERC721 collection on Polygon Mainnet
async function fetchOnChainERC721(contractAddress: string) {
  try {
      const data = await fetchPolygonCollection(contractAddress);
      const collData: TrackedOnChainCollection = {
        address: contractAddress,
        name: data.name,
        symbol: data.symbol,
        totalSupply: data.totalSupply,
        owner: data.owner,
        royaltyPercentage: 0,
        royaltyReceiver: data.owner,
        description: `Verified Polygon ERC-721 collection indexed at block ${data.currentBlock}.`,
        category: 'art',
        tokens: data.tokens,
        lastSyncedAt: data.fetchedAt,
        polygonscanUrl: `https://polygonscan.com/address/${contractAddress}`,
        source: 'on-chain',
        verified: true
      };

      trackedOnChainCollections.set(contractAddress.toLowerCase(), collData);
      return { success: true, currentBlock: data.currentBlock, collection: collData };
  } catch (err: any) {
      throw err;
  }
}

async function startServer(shouldListen = true) {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // === HEALTH - RESILIENT CLOUD RUN ENDPOINT ===
  app.get('/api/health', async (req: Request, res: Response) => {
    let sqlOk = false;
    let colCount = 0;
    const r = await safeQuery('SELECT COUNT(*) as c FROM collections');
    if (r && r[0]) {
      sqlOk = true;
      colCount = parseInt((r[0] as any).c, 10);
    }

    res.json({
      status: 'ok',
      live_deployed: true,
      port: process.env.PORT || 3000,
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_collector_chain: FEE_COLLECTOR_CHAIN,
      fee_collector_block: 93415806,
      fee_wallet: FEE_WALLET,
      royalty_wallet: ROYALTY_WALLET,
      usdc: USDC_POLYGON,
      collections_live: Array.from(trackedOnChainCollections.values()).map(collection => ({
        address: collection.address,
        name: collection.name,
        symbol: collection.symbol,
        hasNFTs: collection.verified && collection.totalSupply > 0,
        totalSupply: collection.verified ? collection.totalSupply : null,
        maxSupply: collection.maxSupply ?? null,
      })),
      supabase: sqlOk ? `connected (America us-east-1) - ${colCount} collections` : (Date.now() < dbDisabledUntil ? 'circuit-breaker standby (memory/firestore fallback active)' : (process.env.DATABASE_URL ? 'connecting' : 'not configured')),
      cloud_sql: sqlOk ? `connected - ${colCount} collections` : 'fallback-mode',
      firestore: db ? 'enabled' : 'fallback-mode',
      firestore_db: firebaseConfig.firestoreDatabaseId,
      fee_token: 'USDC',
      owner_free_enabled: true,
      owner_wallets: OWNER_WALLETS.length,
      chains: ['ethereum', 'polygon', 'solana', 'arbitrum', 'base', 'avalanche'],
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      gemini_model: 'gemini-3.8-flash'
    });
  });

  // === DEPLOYED INFO ===
  app.get('/api/deployed', (req: Request, res: Response) => {
    res.json({
      feeCollector: FEE_COLLECTOR_ADDRESS,
      chain: FEE_COLLECTOR_CHAIN,
      block: 93415806,
      feeWallet: FEE_WALLET,
      royaltyWallet: ROYALTY_WALLET,
      usdc: USDC_POLYGON,
      collections: Array.from(trackedOnChainCollections.values()).map(collection => ({
        name: collection.name,
        address: collection.address,
        symbol: collection.symbol,
        chain: 'polygon',
        source: collection.verified ? 'on-chain' : 'configured',
        totalSupply: collection.verified ? collection.totalSupply : null,
        maxSupply: collection.maxSupply ?? null,
        hasNFTs: collection.verified && collection.totalSupply > 0,
      })),
      status: "Polygon collections are verified after an RPC sync",
      note: "Port binding and resilient database circuit-breaker active"
    });
  });

  // === FEES ===
  app.get('/api/fees', async (req: Request, res: Response) => {
    let fees = [
      { action: 'mint', fee_usdc: 2.5, enabled: true },
      { action: 'bridge', fee_usdc: 1.5, enabled: true },
      { action: 'list', fee_usdc: 0.5, enabled: true },
      { action: 'trade', fee_usdc: 2.5, enabled: true },
      { action: 'app_access', fee_usdc: 5.0, enabled: true },
      { action: 'app_monthly', fee_usdc: 9.99, enabled: true },
      { action: 'app_lifetime', fee_usdc: 49.99, enabled: true }
    ];
    const rows = await safeQuery('SELECT action, fee_usdc, enabled FROM fee_config WHERE enabled = true ORDER BY action');
    if (rows && rows.length > 0) fees = rows as any;

    res.json({
      fees,
      fee_token: 'USDC',
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_wallet: FEE_WALLET,
      owner_free: true,
      note: 'Free for owner wallets, fees routed to ' + FEE_WALLET
    });
  });

  app.post('/api/fees/check', async (req: Request, res: Response) => {
    const { wallet = '', action = 'mint' } = req.body || {};
    const fee = await getFee(action);
    const owner = isOwner(wallet);
    res.json({
      wallet,
      action,
      fee_usdc: owner ? 0 : fee,
      is_owner_free: owner,
      fee_token: 'USDC',
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_wallet: FEE_WALLET,
      should_pay: !owner && fee > 0
    });
  });

  // === COLLECTIONS ===
  app.get('/api/collections', async (req: Request, res: Response) => {
    const rows = await safeQuery('SELECT * FROM collections ORDER BY created_at DESC');
    if (rows && rows.length > 0) return res.json({ source: 'supabase', data: rows });

    res.json({
      source: 'on-chain',
      data: Array.from(trackedOnChainCollections.values()).filter(collection => collection.verified).map(collection => ({
        chain: 'polygon', contract_address: collection.address, name: collection.name,
        symbol: collection.symbol, total_supply: collection.totalSupply,
      })),
    });
  });

  // === AUTO-SYNC WIP & LOGO TOKENS ===
  app.get('/api/wip/tokens', async (req: Request, res: Response) => {
    let dbTokens: any[] = [];
    const rows = await safeQuery(`
      SELECT t.*, c.contract_address, c.name as collection_name,
             (active_listing.price IS NOT NULL) AS is_listed,
             active_listing.price, active_listing.created_at AS listed_at
      FROM tokens t
      LEFT JOIN collections c ON t.collection_id = c.id
      LEFT JOIN LATERAL (
        SELECT l.price, l.created_at FROM listings l
        WHERE l.token_id = t.id AND l.status = 'active'
        ORDER BY l.created_at DESC LIMIT 1
      ) active_listing ON TRUE
      WHERE c.contract_address IN ($1, $2)
         OR t.collection_id IN ('col-wip-polygon', 'col-wip-logo-polygon', $1, $2)
      ORDER BY t.created_at DESC
    `, [WIP_COLLECTION, LOGO_COLLECTION]);
    if (rows) dbTokens = rows.map((row: any) => ({ ...row, collection_id: String(row.contract_address || '').toLowerCase() }));

    // Fetch verified on-chain tokens from Polygon
    let onChainTokens: any[] = [];
    for (const address of [WIP_COLLECTION, LOGO_COLLECTION]) {
      try {
        const onChain = address.toLowerCase() === WIP_COLLECTION.toLowerCase()
          ? await getOnChainWipData()
          : await fetchPolygonCollection(address);
        if (onChain?.tokens) {
          onChainTokens.push(...onChain.tokens);
          const changed = await persistOnChainSnapshot({ contractAddress: address, name: onChain.name, symbol: onChain.symbol, totalSupply: onChain.totalSupply, tokens: onChain.tokens });
          await queueAndRefreshMarketplaceMetadata(address, changed || []);
        }
      } catch (error) {
        console.warn(`Polygon collection sync failed for ${address}:`, error instanceof Error ? error.message : error);
      }
    }

    res.json({
      success: onChainTokens.length > 0 || dbTokens.length > 0,
      syncedAt: Date.now(),
      onChainSupply: onChainTokens.length,
      tokens: [
        ...onChainTokens.map((token: any) => ({ ...token, source: 'on-chain' })),
        ...dbTokens.map((token: any) => ({ ...token, source: 'supabase' })),
      ]
    });
  });

  // === ON-CHAIN WIP CHECK ENDPOINT ===
  app.get('/api/wip/on-chain', async (req: Request, res: Response) => {
    try {
      const onChain = await getOnChainWipData();
      res.json({
        success: true,
        network: 'polygon',
        chainId: 137,
        ...onChain,
        authorizedMinters: [
          '0xBaB06d358B181eB16e3189525BCc0bc4761a3762',
          '0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0'
        ]
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // =========================================================================
  // === ON-CHAIN & POLYGONSCAN MARKETPLACE SYNC & DISCOVERY ===
  // =========================================================================
  app.get('/api/onchain/collections', async (req: Request, res: Response) => {
    try {
      const saved = await safeQuery<any>('SELECT chain, contract_address, name, symbol FROM collections WHERE LOWER(chain) = $1', ['polygon']);
      const addresses = new Map<string, string>([
        [WIP_COLLECTION.toLowerCase(), WIP_COLLECTION],
        [LOGO_COLLECTION.toLowerCase(), LOGO_COLLECTION],
      ]);
      const [factoryCollections, wipFactoryCollections] = await Promise.all([
        readFactoryCollectionAddresses(COLLECTION_FACTORY_1000.contractAddress, collectionFactoryAbi, 'getAllCollections'),
        readFactoryCollectionAddresses(WIP_FACTORY.address, wipFactoryAbi, 'getWIPCollections'),
      ]);
      for (const address of [...factoryCollections, ...wipFactoryCollections]) addresses.set(address.toLowerCase(), address);
      for (const row of saved || []) {
        if (typeof row.contract_address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(row.contract_address)) {
          addresses.set(row.contract_address.toLowerCase(), row.contract_address);
        }
      }
      for (const address of trackedOnChainCollections.keys()) addresses.set(address, address);

      const synced = await Promise.allSettled(Array.from(addresses.values(), async (address) => {
        const data = address.toLowerCase() === WIP_COLLECTION.toLowerCase()
          ? await getOnChainWipData()
          : await fetchPolygonCollection(address);
        const previous = trackedOnChainCollections.get(address.toLowerCase());
        const entry: TrackedOnChainCollection = {
          address,
          name: data.name,
          symbol: data.symbol,
          totalSupply: data.totalSupply,
          maxSupply: previous?.maxSupply ?? (address.toLowerCase() === WIP_COLLECTION.toLowerCase() || address.toLowerCase() === LOGO_COLLECTION.toLowerCase() ? 1000 : undefined),
          owner: data.owner || previous?.owner || '',
          royaltyPercentage: previous?.royaltyPercentage || 0,
          royaltyReceiver: previous?.royaltyReceiver || data.owner || '',
          description: previous?.description || '',
          category: previous?.category || 'art',
          tokens: data.tokens,
          lastSyncedAt: data.fetchedAt,
          polygonscanUrl: `https://polygonscan.com/address/${address}`,
          source: 'on-chain',
          verified: true,
        };
        trackedOnChainCollections.set(address.toLowerCase(), entry);
        const changed = await persistOnChainSnapshot({ contractAddress: address, name: data.name, symbol: data.symbol, totalSupply: data.totalSupply, tokens: data.tokens });
        await queueAndRefreshMarketplaceMetadata(address, changed || []);
        return entry;
      }));

      const successful = synced.filter((r): r is PromiseFulfilledResult<TrackedOnChainCollection> => r.status === 'fulfilled').map(r => r.value);
      const failed = synced.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      const list = successful.map(c => ({
        id: c.address.toLowerCase(),
        contractAddress: c.address,
        name: c.name,
        symbol: c.symbol,
        description: c.description,
        chainId: 'polygon',
        standard: 'ERC-721',
        creatorAddress: c.owner,
        creatorName: '',
        royaltyPercentage: c.royaltyPercentage,
        royaltyPayoutAddress: c.royaltyReceiver,
        category: c.category,
          maxSupply: c.maxSupply ?? null,
        currentSupply: c.totalSupply,
        floorPrice: null,
        totalVolume: null,
        ownersCount: null,
        createdAt: 0,
        verified: true,
        polygonscanUrl: c.polygonscanUrl,
        source: 'on-chain'
      }));

      res.json({
        success: successful.length > 0,
        count: list.length,
        collections: list,
        errors: failed.map(result => String(result.reason?.message || result.reason)),
        polygonscanBaseUrl: 'https://polygonscan.com',
        syncedAt: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/onchain/import-collection', async (req: Request, res: Response) => {
    const { contractAddress } = req.body || {};
    if (!contractAddress || typeof contractAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Polygon contract address format. Expected 0x followed by 40 hex characters.'
      });
    }

    try {
      const cleanAddr = contractAddress.trim();
      const result = await fetchOnChainERC721(cleanAddr);
      const changed = await persistOnChainSnapshot({ contractAddress: result.collection.address, name: result.collection.name, symbol: result.collection.symbol, totalSupply: result.collection.totalSupply, tokens: result.collection.tokens });
      await queueAndRefreshMarketplaceMetadata(result.collection.address, changed || []);
      res.json({
        success: true,
        message: `Successfully verified and imported ${result.collection.name} from Polygonscan & Polygon Mainnet!`,
        collection: result.collection,
        currentBlock: result.currentBlock,
        polygonscanUrl: result.collection.polygonscanUrl
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to verify and import collection from on-chain data.'
      });
    }
  });

  app.get('/api/onchain/marketplace-sync', async (req: Request, res: Response) => {
    try {
      const collections = await safeQuery<any>('SELECT contract_address FROM collections WHERE LOWER(chain) = $1', ['polygon']);
      const addresses = new Map<string, string>([
        [WIP_COLLECTION.toLowerCase(), WIP_COLLECTION],
        [LOGO_COLLECTION.toLowerCase(), LOGO_COLLECTION],
      ]);
      const [factoryCollections, wipFactoryCollections] = await Promise.all([
        readFactoryCollectionAddresses(COLLECTION_FACTORY_1000.contractAddress, collectionFactoryAbi, 'getAllCollections'),
        readFactoryCollectionAddresses(WIP_FACTORY.address, wipFactoryAbi, 'getWIPCollections'),
      ]);
      for (const address of [...factoryCollections, ...wipFactoryCollections]) addresses.set(address.toLowerCase(), address);
      for (const row of collections || []) if (/^0x[a-fA-F0-9]{40}$/.test(row.contract_address || '')) addresses.set(row.contract_address.toLowerCase(), row.contract_address);
      for (const address of trackedOnChainCollections.values()) addresses.set(address.address.toLowerCase(), address.address);
      const results = await Promise.allSettled(Array.from(addresses.values(), address => fetchPolygonCollection(address)));
      const successful = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      const dedupedTokens = successful.flatMap(c => c.tokens);
      const currentBlock = successful[0]?.currentBlock;
      const activeListings = await safeQuery<any>(
        `SELECT LOWER(c.contract_address) AS contract_address, t.token_id, l.price, l.currency, l.created_at
         FROM listings l JOIN tokens t ON t.id = l.token_id JOIN collections c ON c.id = t.collection_id
         WHERE LOWER(c.chain) = 'polygon' AND l.status = 'active'`
      );
      const listingMap = new Map((activeListings || []).map(listing => [`${listing.contract_address}:${String(listing.token_id).replace(/^#/, '')}`, listing]));
      for (const c of successful) {
        const existing = trackedOnChainCollections.get(c.contractAddress.toLowerCase());
        if (existing) {
          existing.totalSupply = c.totalSupply;
          existing.tokens = c.tokens;
          existing.lastSyncedAt = c.fetchedAt;
          existing.verified = true;
        }
        const changed = await persistOnChainSnapshot({ contractAddress: c.contractAddress, name: c.name, symbol: c.symbol, totalSupply: c.totalSupply, tokens: c.tokens });
        await queueAndRefreshMarketplaceMetadata(c.contractAddress, changed || []);
      }

      res.json({
        success: successful.length > 0,
        network: 'polygon',
        chainId: 137,
        currentBlock,
        syncedAt: Date.now(),
        collectionsCount: successful.length,
        totalTokens: dedupedTokens.length,
        tokens: successful.flatMap(c => c.tokens.map((token: any) => {
          const listing = listingMap.get(`${c.contractAddress.toLowerCase()}:${String(token.token_id).replace(/^#/, '')}`);
          return {
            ...token,
            source: 'on-chain',
            collection_id: c.contractAddress.toLowerCase(),
            collection_name: c.name,
            collection_creator_address: c.owner,
            royalty_percentage: trackedOnChainCollections.get(c.contractAddress.toLowerCase())?.royaltyPercentage || 0,
            royalty_receiver: trackedOnChainCollections.get(c.contractAddress.toLowerCase())?.royaltyReceiver || '',
            is_listed: Boolean(listing),
            price: listing?.price,
            currency: listing?.currency,
            listed_at: listing?.created_at,
          };
        })),
        errors: results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => String(r.reason?.message || r.reason)),
        polygonscanBaseUrl: 'https://polygonscan.com'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/onchain/verify/:address', async (req: Request, res: Response) => {
    const address = req.params.address;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ success: false, error: 'Invalid address format' });
    }

    try {
      let isContract = false;
      let currentBlock = 0;
      for (const rpc of POLYGON_RPCS) {
        try {
          const client = createPublicClient({ chain: polygon, transport: http(rpc, { timeout: 6000 }) });
          const [bytecode, block] = await Promise.all([
            client.getBytecode({ address: address as `0x${string}` }),
            client.getBlockNumber()
          ]);
          isContract = Boolean(bytecode && bytecode !== '0x');
          currentBlock = Number(block);
          break;
        } catch {}
      }

      res.json({
        success: true,
        address,
        isContract,
        currentBlock,
        polygonscanUrl: `https://polygonscan.com/address/${address}`,
        polygonscanTokenUrl: `https://polygonscan.com/token/${address}`
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // === MARKET / RARITY ===
  app.get('/api/market/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    const rows = await safeQuery(`
      SELECT t.*, 
        (SELECT json_agg(json_build_object('trait_type', tr.trait_type, 'trait_value', tr.trait_value)) 
         FROM traits tr WHERE tr.token_id = t.id) as traits
      FROM tokens t 
      WHERE t.collection_id = $1 OR t.collection_id IN (SELECT id FROM collections WHERE contract_address = $1)
      ORDER BY t.rarity_rank ASC NULLS LAST, t.created_at DESC 
      LIMIT 100
    `, [collectionId]);
    if (rows && rows.length > 0) return res.json({ source: 'supabase', data: rows });

    if (db) {
      try {
        const q = query(collection(db, 'nfts'), where('collectionId', '==', collectionId), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        return res.json({ source: 'firestore', data });
      } catch (e) {
        return res.json({ source: 'firestore_fallback', data: [], error: String(e) });
      }
    }

    res.json({ source: 'client_local', data: [] });
  });

  app.get('/api/rarity/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    const rows = await safeQuery(
      'SELECT * FROM rarity_ranking WHERE collection_id = $1 OR chain = $1 ORDER BY rarity_score DESC LIMIT 100',
      [collectionId]
    );
    if (rows) return res.json(rows);
    res.json([]);
  });

  app.get('/api/traits/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    const rows = await safeQuery(
      'SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1 OR collection_id IN (SELECT id FROM collections WHERE contract_address = $1) ORDER BY count DESC',
      [collectionId]
    );
    if (rows) return res.json(rows);
    res.json([]);
  });

  // === WHAT-IF TRAIT SIMULATOR ===
  app.post('/api/simulate-rarity', async (req: Request, res: Response) => {
    const { collection_id, hypothetical_traits = [] } = req.body || {};
    let counts: any[] = [];
    const resQuery = await safeQuery(
      'SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1 OR collection_id IN (SELECT id FROM collections WHERE contract_address = $1)',
      [collection_id]
    );
    if (resQuery) counts = resQuery;

    let score = 0;
    for (const ht of hypothetical_traits) {
      const m = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
      score += 1 / parseFloat(m?.frequency || '0.01');
    }
    res.json({
      projected_rarity_score: score,
      projected_rank: Math.floor(1000 / (score + 1)),
      breakdown: hypothetical_traits.map((ht: any) => {
        const m = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
        return { ...ht, current_count: m?.count || 0, frequency: m?.frequency || '0.01 (rare)' };
      })
    });
  });

  // === TOKEN METADATA & QUICK COPY ===
  app.get('/api/token/:id/metadata', async (req: Request, res: Response) => {
    const id = req.params.id;
    const rows = await safeQuery(`
      SELECT t.*, c.name as collection_name, c.chain, c.contract_address,
             (SELECT json_agg(tr) FROM traits tr WHERE tr.token_id = t.id) as traits
      FROM tokens t JOIN collections c ON t.collection_id = c.id
      WHERE t.id = $1 OR t.token_id = $1
    `, [id]);
    if (rows && rows[0]) {
      return res.json({
        raw: rows[0],
        ipfs_uri: (rows[0] as any).metadata_ipfs_uri,
        quick_copy: {
          ipfs: (rows[0] as any).metadata_ipfs_uri,
          image: (rows[0] as any).image_ipfs_uri,
          opensea: `https://opensea.io/assets/${(rows[0] as any).chain}/${(rows[0] as any).contract_address}/${(rows[0] as any).token_id}`
        }
      });
    }

    if (db) {
      try {
        const snap = await getDoc(doc(db, 'nfts', id));
        if (snap.exists()) return res.json({ raw: snap.data(), source: 'firestore' });
      } catch {}
    }
    res.status(404).json({ error: 'Token metadata not found' });
  });

  // Legacy mint-record endpoint is retired; the Polygon indexer writes verified chain snapshots only.
  app.post('/api/mint', (_req: Request, res: Response) => {
    res.status(410).json({ success: false, error: 'Mint recording is disabled. Submit a real on-chain mint; the indexer will discover it.' });
  });

  // === LISTINGS / MARKETPLACE ===
  app.get('/api/listings', async (req: Request, res: Response) => {
    const rows = await safeQuery(
      `SELECT l.*, t.token_id, t.name, c.name as collection_name FROM listings l JOIN tokens t ON l.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE l.status='active' ORDER BY l.created_at DESC LIMIT 100`
    );
    if (rows) return res.json(rows);
    res.json([]);
  });

  app.get('/api/listings/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    const rows = await safeQuery(
      `SELECT l.*, t.token_id, t.name, t.image_ipfs_uri, c.name as collection_name FROM listings l JOIN tokens t ON l.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE (c.contract_address = $1 OR t.collection_id = $1) AND l.status='active' ORDER BY l.created_at DESC`,
      [collectionId]
    );
    if (rows) return res.json(rows);
    res.json([]);
  });

  app.post('/api/list', (_req: Request, res: Response) => {
    res.status(410).json({ success: false, error: 'Off-chain listing simulation is disabled. A verified marketplace contract is not configured.' });
  });

  // === PORTFOLIO ===
  app.get('/api/portfolio/:wallet', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    if (db) {
      try {
        const q = query(collection(db, 'nfts'), where('ownerAddress', '==', wallet));
        const snap = await getDocs(q);
        const firestoreData = snap.docs.map(d => d.data());
        if (firestoreData.length > 0) return res.json({ source: 'firestore', data: firestoreData });
      } catch {}
    }

    const rows = await safeQuery(
      'SELECT t.*, c.name, c.chain, c.contract_address, pc.estimated_value FROM portfolio_cache pc JOIN tokens t ON pc.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE LOWER(pc.wallet) = LOWER($1) ORDER BY pc.estimated_value DESC NULLS LAST',
      [wallet]
    );
    if (rows && rows.length > 0) return res.json({ source: 'supabase', data: rows });

    res.json({ source: 'none', data: [] });
  });

  // === USER CROSS-DEVICE SYNC ===
  app.get('/api/user/:wallet/sync', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', wallet.toLowerCase()));
        if (snap.exists()) return res.json({ data: snap.data() });
      } catch {}
    }
    res.json({ data: null });
  });

  app.post('/api/user/:wallet/sync', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    const body = req.body || {};
    if (db) {
      try {
        await setDoc(doc(db, 'users', wallet.toLowerCase()), { wallet: wallet.toLowerCase(), ...body, updatedAt: Date.now() }, { merge: true });
        return res.json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: String(e) });
      }
    }
    res.json({ success: true, localOnly: true });
  });

  // === FAVORITES ===
  app.get('/api/favorites/:wallet', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    if (db) {
      try {
        const q = query(collection(db, 'favorites'), where('wallet', '==', wallet.toLowerCase()));
        const snap = await getDocs(q);
        return res.json(snap.docs.map(d => d.data()));
      } catch {}
    }
    res.json([]);
  });

  app.post('/api/favorites', async (req: Request, res: Response) => {
    const { wallet, tokenId } = req.body || {};
    if (db && wallet && tokenId) {
      try {
        await setDoc(doc(db, 'favorites', `${wallet.toLowerCase()}_${tokenId}`), { wallet: wallet.toLowerCase(), tokenId, createdAt: Date.now() });
        return res.json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: String(e) });
      }
    }
    res.json({ success: true });
  });

  // === BRIDGE ===
  app.post('/api/bridge', async (req: Request, res: Response) => {
    const { token_id, from_chain, to_chain, wallet = '', usdc_tx_hash, nftName } = req.body || {};
    const fee = await getFee('bridge');
    const ownerFree = isOwner(wallet);

    if (!ownerFree && fee > 0 && !usdc_tx_hash) {
      return res.status(402).json({ error: 'USDC fee required', fee_usdc: fee, fee_collector: FEE_COLLECTOR_ADDRESS });
    }

    let jobId = `job-${Date.now()}`;
    await safeQuery(
      'INSERT INTO bridge_jobs (token_id, from_chain, to_chain, status) VALUES ($1,$2,$3,\'pending\') RETURNING *',
      [token_id, from_chain, to_chain]
    );
    await safeQuery(
      'INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,\'bridge\',$2,$3,$4,$5)',
      [wallet, ownerFree ? 0 : fee, usdc_tx_hash || null, from_chain, ownerFree]
    );

    if (db) {
      try {
        await setDoc(doc(db, 'bridge_transactions', jobId), {
          id: jobId,
          nftId: token_id,
          nftName: nftName || '',
          sourceChain: from_chain,
          destinationChain: to_chain,
          senderAddress: wallet,
          recipientAddress: wallet,
          protocol: 'layerzero',
          bridgeStandard: 'ONFT',
          sourceTxHash: usdc_tx_hash || '',
          messageId: jobId,
          timestamp: Date.now(),
          status: 'pending',
          step: 1
        });
      } catch (e) {
        console.warn('Bridge setDoc notice:', e);
      }
    }

    res.json({
      id: jobId,
      token_id,
      from_chain,
      to_chain,
      status: 'pending',
      fee_usdc: ownerFree ? 0 : fee,
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_wallet: FEE_WALLET
    });
  });

  app.get('/api/bridge/:wallet', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    if (db) {
      try {
        const q = query(collection(db, 'bridge_transactions'), where('senderAddress', '==', wallet), orderBy('timestamp', 'desc'), limit(20));
        const snap = await getDocs(q);
        return res.json(snap.docs.map(d => d.data()));
      } catch {}
    }
    const rows = await safeQuery('SELECT * FROM bridge_jobs ORDER BY created_at DESC LIMIT 20');
    if (rows) return res.json(rows);
    res.json([]);
  });

  // === GAS ===
  app.get('/api/gas', async (req: Request, res: Response) => {
    const rows = await safeQuery('SELECT chain, gwei, usd_cost, updated_at FROM gas_cache ORDER BY chain');
    if (rows && rows.length > 0) return res.json(rows);

    res.json([
      { chain: 'polygon', gwei: 50, usd_cost: 0.02 },
      { chain: 'ethereum', gwei: 20, usd_cost: 2.5 },
      { chain: 'arbitrum', gwei: 0.1, usd_cost: 0.05 }
    ]);
  });

  app.post('/api/gas/update', async (req: Request, res: Response) => {
    const { chain, gwei, usd_cost } = req.body || {};
    if (chain) {
      await safeQuery(
        'INSERT INTO gas_cache (chain, gwei, usd_cost, updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (chain) DO UPDATE SET gwei=$2, usd_cost=$3, updated_at=NOW()',
        [chain, gwei, usd_cost]
      );
      return res.json({ success: true });
    }
    res.json({ success: true });
  });

  // === APP ACCESS PAYWALL ===
  app.get('/api/app-access/:wallet', async (req: Request, res: Response) => {
    const wallet = (req.params.wallet || '').toLowerCase();
    if (isOwner(wallet)) {
      return res.json({
        hasAccess: true,
        isOwner: true,
        subscription: { wallet, plan: 'owner', is_owner_free: true, expires_at: null }
      });
    }

    const rows = await safeQuery('SELECT * FROM app_subscriptions WHERE LOWER(wallet) = $1 ORDER BY created_at DESC LIMIT 1', [wallet]);
    if (!rows || !rows[0]) return res.json({ hasAccess: true, subscription: null, fallback: true });
    const sub = rows[0] as any;
    if (!sub.expires_at) return res.json({ hasAccess: true, subscription: sub });
    const hasAccess = new Date(sub.expires_at) > new Date();
    return res.json({ hasAccess, subscription: sub });
  });

  app.post('/api/app-access', async (req: Request, res: Response) => {
    const body = req.body || {};
    const wallet = (body.wallet || '').toLowerCase();
    const plan = body.plan || 'one_time';
    const fee_usdc = body.fee_usdc || 5.00;
    const tx_hash = body.tx_hash || '0x';
    const chain = body.chain || 'polygon';

    const daysMap: Record<string, number | null> = {
      one_time: 1,
      monthly: 30,
      lifetime: null,
      app_access: 1,
      app_monthly: 30,
      app_lifetime: null
    };
    const days = daysMap[plan] ?? 1;
    const expires_at = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

    const rows = await safeQuery(`
      INSERT INTO app_subscriptions (wallet, plan, fee_usdc, tx_hash, chain, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (wallet) DO UPDATE SET plan=$2, fee_usdc=$3, tx_hash=$4, chain=$5, expires_at=$6, created_at=NOW()
      RETURNING *
    `, [wallet, plan, fee_usdc, tx_hash, chain, expires_at]);

    await safeQuery(
      'INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1, \'app_access\', $2, $3, $4, false)',
      [wallet, fee_usdc, tx_hash, chain]
    );
    if (rows && rows[0]) {
      return res.json({ success: true, subscription: rows[0] });
    }
    res.json({ success: true, localOnly: true });
  });

  // === TRANSACTIONS LOG ===
  app.get('/api/transactions/:wallet', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    const rows = await safeQuery('SELECT * FROM fee_transactions WHERE LOWER(wallet) = LOWER($1) ORDER BY created_at DESC LIMIT 100', [wallet]);
    if (rows) return res.json(rows);
    res.json([]);
  });

  // === SITE LINKS - Website, Socials, Blog, Newsletter ===
  app.get('/api/site-links', async (req: Request, res: Response) => {
    const rows = await safeQuery('SELECT * FROM site_links ORDER BY category, label');
    if (rows && rows.length > 0) {
      const grouped: any = { website: null, socials: {}, blog: null, newsletter: null };
      for (const r of (rows as any[])) {
        if (r.category === 'website') grouped.website = r;
        else if (r.category === 'social') grouped.socials[r.key] = r;
        else if (r.category === 'blog') grouped.blog = r;
        else if (r.category === 'newsletter') grouped.newsletter = r;
      }
      return res.json({ source: 'db', links: grouped, all: rows });
    }
    res.json({
      source: 'hardcoded',
      links: SITE_LINKS,
      note: "Update deployed-config.ts SITE_LINKS when your site/socials/blog/newsletter are live"
    });
  });

  app.get('/api/links', (req: Request, res: Response) => {
    res.redirect('/api/site-links');
  });

  // =========================================================================
  // === GEMINI AI API: SUGGEST TRAITS & RARITY FROM IMAGE (GEMINI 3.8 FLASH) ===
  // =========================================================================
  app.post('/api/ai/suggest-traits', async (req: Request, res: Response) => {
    const { imageData, styleHint = 'Cyberpunk High-Tech', userNotes = '', focusArea = 'all' } = req.body || {};

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        warning: 'Gemini API key is not configured in server environment. Using synthetic generative traits.',
        modelUsed: 'synthetic-heuristic-v1',
        visualInspection: {
          summary: 'Simulated artwork inspection: Identified luminescent cyber-vector layering with high geometric density.',
          detectedSubject: 'Synthetic Vanguard Artifact',
          dominantColors: ['Cyber Cyan', 'Neon Violet', 'Obsidian Slate'],
          artStyle: styleHint
        },
        overallRarityTier: 'Legendary',
        traits: [
          { trait_type: 'Archetype', value: 'Nexus Vanguard', rarityPercentage: 7, rarityTier: 'Legendary', description: 'Elite frontline cyber-construct engineered for high-throughput metadata synthesis' },
          { trait_type: 'Energy Matrix', value: 'Quantum Singularity', rarityPercentage: 3, rarityTier: 'Mythic', description: 'Self-sustaining zero-point energy manifold' },
          { trait_type: 'Armor Plating', value: 'Obsidian Nanoweave', rarityPercentage: 14, rarityTier: 'Epic', description: 'Reflective stealth alloy with reactive dampening fields' },
          { trait_type: 'Power Core', value: 94, display_type: 'number', rarityPercentage: 6, rarityTier: 'Legendary', description: 'Calibrated combat index for metaverse interoperability' },
          { trait_type: 'Aesthetic Palette', value: 'Ultraviolet Cyan', rarityPercentage: 22, rarityTier: 'Rare', description: 'Spectral wavelength dispersion across outer refractive hull' }
        ]
      });
    }

    try {
      const parts: any[] = [];

      if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            }
          });
        }
      }

      parts.push({
        text: `You are an elite Web3 NFT Chief Art Director, Lore Author, and Rarity Architect.
Analyze the provided artwork image and extract 4 to 8 distinctive on-chain NFT traits/attributes, rarity scores, and rich lore descriptions.
Aesthetic direction requested: "${styleHint}".
Creator notes/context: "${userNotes || 'None'}".
Analysis focus: "${focusArea}".

Return JSON strictly matching this schema:
{
  "visualInspection": {
    "summary": "Concise visual analysis of artwork composition, lighting, style and texture (max 2 sentences)",
    "detectedSubject": "Specific detected focal subject",
    "dominantColors": ["Primary color 1", "Accent color 2", "Background color 3"],
    "artStyle": "Specific recognized artistic movement or rendering technique"
  },
  "suggestedTitle": "Evocative NFT artwork title based on visual inspection",
  "suggestedDescription": "Compelling 2-sentence museum/marketplace exhibition description",
  "overallRarityTier": "Mythic" | "Legendary" | "Epic" | "Rare" | "Common",
  "traits": [
    {
      "trait_type": "Specific attribute category (e.g. Headwear, Weapon, Aura, Armor, Background, Power Rating)",
      "value": "Detected visual value (string or number)",
      "description": "Short 1-sentence lore or visual justification explaining why this trait belongs to this item",
      "rarityPercentage": "Estimated occurrence frequency number from 1 to 100 (e.g., 2 for ultra-rare Mythic, 25 for Rare, 60 for Common)",
      "rarityTier": "Mythic (<=3%) | Legendary (4-8%) | Epic (9-18%) | Rare (19-35%) | Common (>35%)",
      "display_type": "string" | "number" | "boost_percentage"
    }
  ]
}`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualInspection: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  detectedSubject: { type: Type.STRING },
                  dominantColors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  artStyle: { type: Type.STRING },
                },
                required: ['summary', 'detectedSubject', 'dominantColors', 'artStyle'],
              },
              suggestedTitle: { type: Type.STRING },
              suggestedDescription: { type: Type.STRING },
              overallRarityTier: { type: Type.STRING },
              traits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trait_type: { type: Type.STRING },
                    value: { type: Type.STRING },
                    description: { type: Type.STRING },
                    rarityPercentage: { type: Type.NUMBER },
                    rarityTier: { type: Type.STRING },
                    display_type: { type: Type.STRING },
                  },
                  required: ['trait_type', 'value', 'rarityPercentage', 'rarityTier'],
                },
              },
            },
            required: ['visualInspection', 'overallRarityTier', 'traits'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        modelUsed: 'gemini-3.8-flash',
        visualInspection: parsed.visualInspection,
        suggestedTitle: parsed.suggestedTitle,
        suggestedDescription: parsed.suggestedDescription,
        overallRarityTier: parsed.overallRarityTier || 'Legendary',
        traits: parsed.traits || [],
      });
    } catch (err: any) {
      console.error('Gemini trait analysis error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to analyze traits with Gemini AI',
      });
    }
  });

  // =========================================================================
  // === GEMINI AI API: GENERATE METADATA (GEMINI 3.8 FLASH) ===
  // =========================================================================
  app.post('/api/ai/generate-metadata', async (req: Request, res: Response) => {
    const { imageData, styleHint, tone, userContext, standard, chainName, count } = req.body || {};

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        warning: 'Gemini API key not found. Using algorithmic NFT metadata generator.',
        metadata: {
          name: `Vanguard Synthesis #${count !== undefined ? count : 0}`,
          description: `Forged as an immutable on-chain token on ${chainName || 'Polygon'}. Embodying high-fidelity digital provenance and aesthetic precision.`,
          shortDescription: `Curated digital asset with verified on-chain royalty and provenance.`,
          category: 'art',
          suggestedRoyalty: 5.0,
          suggestedPrice: 0.05,
          unlockableLore: 'Holders receive access to raw vector master files and Discord VIP access.',
          tags: ['#WIP', '#Nexus', '#Polygon', '#Generative'],
          traits: [
            { trait_type: 'Protocol Tier', value: 'Genesis', rarityPercentage: 5 },
            { trait_type: 'Network Standard', value: standard || 'ERC-721', rarityPercentage: 15 },
          ]
        }
      });
    }

    try {
      const parts: any[] = [];
      if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            }
          });
        }
      }

      parts.push({
        text: `You are an elite NFT curator and copywriter.
Generate rich metadata for an NFT token.
Standard: ${standard || 'ERC-721'}
Blockchain: ${chainName || 'Polygon'}
Style Hint: ${styleHint || 'Modern Generative'}
Tone: ${tone || 'Cyberpunk & Exclusive'}
User Context: ${userContext || 'None'}

Return structured JSON according to OpenSea & ERC-721 metadata standards.`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              shortDescription: { type: Type.STRING },
              category: { type: Type.STRING },
              suggestedRoyalty: { type: Type.NUMBER },
              suggestedPrice: { type: Type.NUMBER },
              unlockableLore: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              traits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trait_type: { type: Type.STRING },
                    value: { type: Type.STRING },
                    rarityPercentage: { type: Type.NUMBER },
                  },
                  required: ['trait_type', 'value'],
                },
              },
            },
            required: ['name', 'description', 'category', 'traits'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        metadata: parsed,
      });
    } catch (err: any) {
      console.error('Gemini metadata generation error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate metadata with Gemini AI',
      });
    }
  });

  // =========================================================================
  // === GEMINI AI API: COLLECTION BRANDING (GEMINI 3.8 FLASH) ===
  // =========================================================================
  app.post('/api/ai/collection-branding', async (req: Request, res: Response) => {
    const { theme, count = 100, standard = 'ERC-721' } = req.body || {};
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        branding: {
          name: `${theme || 'Genesis'} Protocol`,
          symbol: `${(theme || 'WIP').toUpperCase().slice(0, 4)}`,
          tagline: 'Decentralized High-Fidelity Asset Ecosystem',
          description: `A limited collection of ${count} tokens implementing ${standard} on Polygon with on-chain metadata.`,
        }
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create branding, lore, and token symbol for an NFT collection with theme: "${theme}". Total Supply: ${count}, Standard: ${standard}.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              symbol: { type: Type.STRING },
              tagline: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['name', 'symbol', 'description'],
          },
        },
      });

      return res.json({
        success: true,
        branding: JSON.parse(response.text || '{}'),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // === VITE / STATIC SERVING ===
  const isProd = process.env.NODE_ENV === "production" || 
    (typeof __filename !== 'undefined' && __filename.includes('dist')) || 
    (typeof process.argv[1] === 'string' && process.argv[1].includes('dist'));

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false,
          ws: false,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite dev middleware initialization error:', err);
    }
  } else {
    const clientPath = path.join(process.cwd(), 'public');
    app.use(express.static(clientPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(clientPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          res.status(500).send('Application bundle is starting up...');
        }
      });
    });
  }

  if (shouldListen) {
    const PORT = Number(process.env.PORT || 3000);
    if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
      throw new Error(`Invalid PORT value: ${process.env.PORT}`);
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 WIP NFT LIVE APP - Running on http://0.0.0.0:${PORT} (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})`);
      console.log(`Fee Collector: ${FEE_COLLECTOR_ADDRESS} (Block 93415806) | Fee Wallet: ${FEE_WALLET}`);
      console.log(`Collections: WIP (${WIP_COLLECTION}) & WIPLOGO (${LOGO_COLLECTION})`);
      console.log('On-chain supply is read live from the configured Polygon collections.');
    });

    server.on('error', (err: any) => {
      const msg = String(err?.message || '');
      if (err?.code === 'EADDRINUSE' || msg.includes('EADDRINUSE') || msg.includes('already in use')) {
        console.warn(`[Server] Port ${PORT} busy during reload (EADDRINUSE). Continuing...`);
        return;
      }
      console.warn(`[Server] Port ${PORT} notice:`, msg || err);
    });

    process.on('SIGTERM', () => { try { server.close(); } catch {} });
    process.on('SIGINT', () => { try { server.close(); } catch {} });
  }
  return app;
}

const isVercelRuntime = process.env.VERCEL === '1';
const app = await startServer(!isVercelRuntime);
export default app;
