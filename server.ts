// server.ts - PRODUCTION FINAL - EXPRESS + VITE + SUPABASE + FIRESTORE + GEMINI 3.8 FLASH - WHOLE - NO TRIMMING
// Fee Collector LIVE: 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E Polygon Block 93415806
// Fee Wallet (YOU GET PAID): 0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0
// Collections: 0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9 WIP + 0xC2dE196A2A7AFa7197ff84D7Ef1C8BC7bd9ECcc6 WIPLOGO
// SUPABASE Org: Work-in-Progress-NFTs | Project: WIP-nfts | Region: America us-east-1 | Pooler: aws-0-us-east-1.pooler.supabase.com:6543 | GitHub linked | No card needed

import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
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
import { firebaseConfig } from './firebase-config';
import { SITE_LINKS } from './deployed-config';

dotenv.config();

// === LIVE DEPLOYED - HARDCODED ===
export const FEE_COLLECTOR_ADDRESS = "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E";
export const FEE_COLLECTOR_CHAIN = "polygon";
export const FEE_WALLET = "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0";
export const ROYALTY_WALLET = "0xBaB06d358B181eB16e3189525BCc0bc4761a3762";
export const USDC_POLYGON = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352";
export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9";
export const LOGO_COLLECTION = "0xC2dE196A2A7AFa7197ff84D7Ef1C8BC7bd9ECcc6";

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

// --- SUPABASE Config - Org: Work-in-Progress-NFTs Project: WIP-nfts America us-east-1 ---
// Pooler requires SSL - DATABASE_URL format: postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase us-east-1 pooler requires SSL - Org: Work-in-Progress-NFTs Project: WIP-nfts America
      max: 20,
    });
  } catch (err) {
    console.warn('Supabase Pool initialization notice (Org: Work-in-Progress-NFTs Project: WIP-nfts):', err);
  }
}

// --- Firebase Firestore Config ---
let firebaseApp: any = null;
let db: any = null;
try {
  firebaseApp = initializeApp({
    apiKey: firebaseConfig.apiKey,
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

// Fee resolution helper
async function getFee(action: string): Promise<number> {
  if (pool) {
    try {
      const { rows } = await pool.query('SELECT fee_usdc FROM fee_config WHERE action = $1', [action]);
      if (rows && rows[0]) return parseFloat(rows[0].fee_usdc);
    } catch {}
  }
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

// Safe Gemini AI Initializer - uses secret injected at runtime
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // === HEALTH - SUPABASE EDITION ===
  app.get('/api/health', async (req: Request, res: Response) => {
    let sqlOk = false;
    let colCount = 0;
    if (pool) {
      try {
        const r = await pool.query('SELECT COUNT(*) as c FROM collections');
        sqlOk = true;
        colCount = parseInt(r.rows[0].c, 10);
      } catch {}
    }

    res.json({
      status: 'ok',
      live_deployed: true,
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_collector_chain: FEE_COLLECTOR_CHAIN,
      fee_collector_block: 93415806,
      fee_wallet: FEE_WALLET,
      royalty_wallet: ROYALTY_WALLET,
      usdc: USDC_POLYGON,
      collections_live: [
        { address: WIP_COLLECTION, name: 'Work-In-Progress-NFTs', symbol: 'WIP', hasNFTs: true },
        { address: LOGO_COLLECTION, name: 'WIP Logo Collection', symbol: 'WIPLOGO', hasNFTs: true, label: 'Independent Single 1/1 Edition (Direct Smart Contract)' }
      ],
      supabase: sqlOk ? `connected (America us-east-1) - Org: Work-in-Progress-NFTs Project: WIP-nfts - ${colCount} collections` : (process.env.DATABASE_URL ? 'connecting - check DATABASE_URL pooler 6543' : 'not connected - set DATABASE_URL - Supabase Org Work-in-Progress-NFTs Project WIP-nfts'),
      cloud_sql: sqlOk ? `connected (us-east1) - ${colCount} collections` : (process.env.DATABASE_URL ? 'connecting' : 'not connected - set DATABASE_URL'), // legacy alias for compatibility
      database_provider: 'supabase',
      database_org: 'Work-in-Progress-NFTs',
      database_project: 'WIP-nfts',
      database_region: 'America us-east-1',
      database_pooler: 'aws-0-us-east-1.pooler.supabase.com:6543',
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
      txHash: "0x5a2...b45b1",
      feeWallet: FEE_WALLET,
      royaltyWallet: ROYALTY_WALLET,
      usdc: USDC_POLYGON,
      collections: [
        { name: 'Work-In-Progress-NFTs', address: WIP_COLLECTION, symbol: 'WIP', chain: 'polygon', source: 'thirdweb', hasNFTs: true },
        { name: 'WIP Logo Collection', address: LOGO_COLLECTION, symbol: 'WIPLOGO', chain: 'polygon', source: 'wipfactory', hasNFTs: true, label: 'Independent Single 1/1 Edition (Direct Smart Contract)' }
      ],
      status: "LIVE - Green check success - Supabase Org Work-in-Progress-NFTs Project WIP-nfts America us-east-1",
      supabase: { org: 'Work-in-Progress-NFTs', project: 'WIP-nfts', region: 'America us-east-1', pooler: 'aws-0-us-east-1.pooler.supabase.com:6543' },
      note: "One-click lowercase fix for bad address checksum error + Supabase SSL fix"
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
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT action, fee_usdc, enabled FROM fee_config WHERE enabled = true ORDER BY action');
        if (rows && rows.length > 0) fees = rows;
      } catch {}
    }
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
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM collections ORDER BY created_at DESC');
        if (rows && rows.length > 0) return res.json({ source: 'supabase', data: rows });
      } catch {}
    }
    res.json({
      source: 'hardcoded',
      data: [
        { chain: 'polygon', contract_address: WIP_COLLECTION, name: 'Work-In-Progress-NFTs', symbol: 'WIP', total_supply: 1 },
        { chain: 'polygon', contract_address: LOGO_COLLECTION, name: 'WIP Logo Collection', symbol: 'WIPLOGO', total_supply: 1 }
      ]
    });
  });

  // === MARKET / RARITY ===
  app.get('/api/market/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    if (pool) {
      try {
        const { rows } = await pool.query(`
          SELECT t.*, 
            (SELECT json_agg(json_build_object('trait_type', tr.trait_type, 'trait_value', tr.trait_value)) 
             FROM traits tr WHERE tr.token_id = t.id) as traits
          FROM tokens t 
          WHERE t.collection_id = $1 OR t.collection_id IN (SELECT id FROM collections WHERE contract_address = $1)
          ORDER BY t.rarity_rank ASC NULLS LAST, t.created_at DESC 
          LIMIT 100
        `, [collectionId]);
        if (rows && rows.length > 0) return res.json({ source: 'supabase', data: rows });
      } catch {}
    }

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
    if (pool) {
      try {
        const { rows } = await pool.query(
          'SELECT * FROM rarity_ranking WHERE collection_id = $1 OR chain = $1 ORDER BY rarity_score DESC LIMIT 100',
          [collectionId]
        );
        return res.json(rows);
      } catch {}
    }
    res.json([]);
  });

  app.get('/api/traits/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    if (pool) {
      try {
        const { rows } = await pool.query(
          'SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1 OR collection_id IN (SELECT id FROM collections WHERE contract_address = $1) ORDER BY count DESC',
          [collectionId]
        );
        return res.json(rows);
      } catch {}
    }
    res.json([]);
  });

  // === WHAT-IF TRAIT SIMULATOR ===
  app.post('/api/simulate-rarity', async (req: Request, res: Response) => {
    const { collection_id, hypothetical_traits = [] } = req.body || {};
    let counts: any[] = [];
    if (pool) {
      try {
        const resQuery = await pool.query(
          'SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1 OR collection_id IN (SELECT id FROM collections WHERE contract_address = $1)',
          [collection_id]
        );
        counts = resQuery.rows;
      } catch {}
    }
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
    if (pool) {
      try {
        const { rows } = await pool.query(`
          SELECT t.*, c.name as collection_name, c.chain, c.contract_address,
                 (SELECT json_agg(tr) FROM traits tr WHERE tr.token_id = t.id) as traits
          FROM tokens t JOIN collections c ON t.collection_id = c.id
          WHERE t.id = $1 OR t.token_id = $1
        `, [id]);
        if (rows && rows[0]) {
          return res.json({
            raw: rows[0],
            ipfs_uri: rows[0].metadata_ipfs_uri,
            quick_copy: {
              ipfs: rows[0].metadata_ipfs_uri,
              image: rows[0].image_ipfs_uri,
              opensea: `https://opensea.io/assets/${rows[0].chain}/${rows[0].contract_address}/${rows[0].token_id}`
            }
          });
        }
      } catch {}
    }
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'nfts', id));
        if (snap.exists()) return res.json({ raw: snap.data(), source: 'firestore' });
      } catch {}
    }
    res.status(404).json({ error: 'Token metadata not found' });
  });

  // === MINT RECORD & FEE LOGGING ===
  app.post('/api/mint', async (req: Request, res: Response) => {
    const { collection_id, token_id, owner_wallet = '', metadata_ipfs_uri, traits, usdc_tx_hash, chain, name, image } = req.body || {};
    const fee = await getFee('mint');
    const ownerFree = isOwner(owner_wallet);

    if (!ownerFree && fee > 0 && !usdc_tx_hash) {
      return res.status(402).json({
        error: 'USDC fee required',
        fee_usdc: fee,
        fee_token: 'USDC',
        fee_collector: FEE_COLLECTOR_ADDRESS,
        fee_wallet: FEE_WALLET
      });
    }

    let tokenDbId = `token-${Date.now()}`;
    const synced: string[] = [];

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        let collId = collection_id;
        if (collection_id && String(collection_id).startsWith('0x')) {
          const { rows: collRows } = await client.query('SELECT id FROM collections WHERE contract_address = $1', [collection_id]);
          collId = collRows[0]?.id || collection_id;
        }

        const { rows } = await client.query(
          'INSERT INTO tokens (collection_id, token_id, owner_wallet, metadata_ipfs_uri, name, image_ipfs_uri) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [collId, token_id, owner_wallet, metadata_ipfs_uri, name || token_id, image || '']
        );
        if (rows && rows[0]?.id) tokenDbId = rows[0].id;

        for (const tr of traits || []) {
          await client.query('INSERT INTO traits (token_id, trait_type, trait_value) VALUES ($1,$2,$3)', [tokenDbId, tr.trait_type, tr.trait_value]);
          await client.query(
            'INSERT INTO trait_counts (collection_id, trait_type, trait_value, count, frequency) VALUES ($1,$2,$3,1,0) ON CONFLICT (collection_id, trait_type, trait_value) DO UPDATE SET count = trait_counts.count + 1',
            [collId, tr.trait_type, tr.trait_value]
          );
        }

        await client.query(
          'INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,$2,$3,$4,$5,$6)',
          [owner_wallet, 'mint', ownerFree ? 0 : fee, usdc_tx_hash || null, chain || 'polygon', ownerFree]
        );
        await client.query('COMMIT');
        synced.push('supabase');
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Database mint record notice:', e);
      } finally {
        client.release();
      }
    }

    if (db) {
      try {
        await setDoc(doc(db, 'nfts', tokenDbId), {
          id: tokenDbId,
          tokenId: token_id,
          name: name || token_id,
          image: image || '',
          chainId: chain || 'polygon',
          standard: 'ERC-721',
          collectionId: collection_id,
          creatorAddress: owner_wallet,
          ownerAddress: owner_wallet,
          royaltyPercentage: 5,
          price: 0,
          isListed: false,
          createdAt: Date.now(),
          ipfsMetadataUri: metadata_ipfs_uri,
          ipfsImageUri: image || '',
          txHash: usdc_tx_hash || '',
          feeCollector: FEE_COLLECTOR_ADDRESS,
        });
        synced.push('firestore');
      } catch (e) {
        console.warn('Firestore setDoc notice:', e);
      }
    }

    res.json({
      success: true,
      tokenDbId,
      fee_charged: ownerFree ? 0 : fee,
      is_owner_free: ownerFree,
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_wallet: FEE_WALLET,
      synced_to: synced.length > 0 ? synced : ['memory']
    });
  });

  // === LISTINGS / MARKETPLACE ===
  app.get('/api/listings', async (req: Request, res: Response) => {
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT l.*, t.token_id, t.name, c.name as collection_name FROM listings l JOIN tokens t ON l.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE l.status='active' ORDER BY l.created_at DESC LIMIT 100`
        );
        return res.json(rows);
      } catch {}
    }
    res.json([]);
  });

  app.get('/api/listings/:collectionId', async (req: Request, res: Response) => {
    const collectionId = req.params.collectionId;
    if (pool) {
      try {
        const { rows } = await pool.query(
          `SELECT l.*, t.token_id, t.name, t.image_ipfs_uri, c.name as collection_name FROM listings l JOIN tokens t ON l.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE (c.contract_address = $1 OR t.collection_id = $1) AND l.status='active' ORDER BY l.created_at DESC`,
          [collectionId]
        );
        return res.json(rows);
      } catch {}
    }
    res.json([]);
  });

  app.post('/api/list', async (req: Request, res: Response) => {
    const { token_id, seller_wallet, chain, price, currency, usdc_tx_hash } = req.body || {};
    const fee = await getFee('list');
    const ownerFree = isOwner(seller_wallet);
    if (!ownerFree && fee > 0 && !usdc_tx_hash) {
      return res.status(402).json({ error: 'USDC fee required for listing', fee_usdc: fee });
    }
    if (pool) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO listings (token_id, seller_wallet, chain, price, currency, status) VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
          [token_id, seller_wallet, chain || 'polygon', price, currency || 'USDC']
        );
        await pool.query(
          `INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,'list',$2,$3,$4,$5)`,
          [seller_wallet, ownerFree ? 0 : fee, usdc_tx_hash || null, chain || 'polygon', ownerFree]
        );
        return res.json(rows[0]);
      } catch (e) {
        return res.status(500).json({ error: String(e) });
      }
    }
    res.json({ success: true, listed: true });
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

    if (pool) {
      try {
        const { rows } = await pool.query(
          'SELECT t.*, c.name, c.chain, c.contract_address, pc.estimated_value FROM portfolio_cache pc JOIN tokens t ON pc.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE LOWER(pc.wallet) = LOWER($1) ORDER BY pc.estimated_value DESC NULLS LAST',
          [wallet]
        );
        if (rows && rows.length > 0) return res.json({ source: 'supabase', data: rows });
      } catch {}
    }

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
    if (pool) {
      try {
        const { rows } = await pool.query(
          'INSERT INTO bridge_jobs (token_id, from_chain, to_chain, status) VALUES ($1,$2,$3,\'pending\') RETURNING *',
          [token_id, from_chain, to_chain]
        );
        if (rows && rows[0]?.id) jobId = rows[0].id;
        await pool.query(
          'INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,\'bridge\',$2,$3,$4,$5)',
          [wallet, ownerFree ? 0 : fee, usdc_tx_hash || null, from_chain, ownerFree]
        );
      } catch (e) {
        console.warn('Bridge job insert notice:', e);
      }
    }

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
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM bridge_jobs ORDER BY created_at DESC LIMIT 20');
        return res.json(rows);
      } catch {}
    }
    res.json([]);
  });

  // === GAS ===
  app.get('/api/gas', async (req: Request, res: Response) => {
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT chain, gwei, usd_cost, updated_at FROM gas_cache ORDER BY chain');
        if (rows && rows.length > 0) return res.json(rows);
      } catch {}
    }
    res.json([
      { chain: 'polygon', gwei: 50, usd_cost: 0.02 },
      { chain: 'ethereum', gwei: 20, usd_cost: 2.5 },
      { chain: 'arbitrum', gwei: 0.1, usd_cost: 0.05 }
    ]);
  });

  app.post('/api/gas/update', async (req: Request, res: Response) => {
    const { chain, gwei, usd_cost } = req.body || {};
    if (pool && chain) {
      try {
        await pool.query(
          'INSERT INTO gas_cache (chain, gwei, usd_cost, updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (chain) DO UPDATE SET gwei=$2, usd_cost=$3, updated_at=NOW()',
          [chain, gwei, usd_cost]
        );
        return res.json({ success: true });
      } catch (e) {
        return res.status(500).json({ error: String(e) });
      }
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

    if (pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM app_subscriptions WHERE LOWER(wallet) = $1 ORDER BY created_at DESC LIMIT 1', [wallet]);
        if (!rows || !rows[0]) return res.json({ hasAccess: false, subscription: null });
        const sub = rows[0];
        if (!sub.expires_at) return res.json({ hasAccess: true, subscription: sub });
        const hasAccess = new Date(sub.expires_at) > new Date();
        return res.json({ hasAccess, subscription: sub });
      } catch (e) {
        return res.json({ hasAccess: true, subscription: null, note: 'app_subscriptions table not yet migrated' });
      }
    }
    res.json({ hasAccess: true, subscription: null, fallback: true });
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

    if (pool) {
      try {
        const { rows } = await pool.query(`
          INSERT INTO app_subscriptions (wallet, plan, fee_usdc, tx_hash, chain, expires_at)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (wallet) DO UPDATE SET plan=$2, fee_usdc=$3, tx_hash=$4, chain=$5, expires_at=$6, created_at=NOW()
          RETURNING *
        `, [wallet, plan, fee_usdc, tx_hash, chain, expires_at]);

        await pool.query(
          'INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1, \'app_access\', $2, $3, $4, false)',
          [wallet, fee_usdc, tx_hash, chain]
        );
        return res.json({ success: true, subscription: rows[0] });
      } catch (e) {
        return res.status(500).json({ error: String(e) });
      }
    }
    res.json({ success: true, localOnly: true });
  });

  // === TRANSACTIONS LOG - RESTORED WHOLE ===
  app.get('/api/transactions/:wallet', async (req: Request, res: Response) => {
    const wallet = req.params.wallet;
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM fee_transactions WHERE LOWER(wallet) = LOWER($1) ORDER BY created_at DESC LIMIT 100', [wallet]);
        return res.json(rows);
      } catch {}
    }
    res.json([]);
  });

  // === SITE LINKS - Website, Socials, Blog, Newsletter ===
  app.get('/api/site-links', async (req: Request, res: Response) => {
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM site_links ORDER BY category, label');
        if (rows && rows.length > 0) {
          const grouped: any = { website: null, socials: {}, blog: null, newsletter: null };
          for (const r of rows) {
            if (r.category === 'website') grouped.website = r;
            else if (r.category === 'social') grouped.socials[r.key] = r;
            else if (r.category === 'blog') grouped.blog = r;
            else if (r.category === 'newsletter') grouped.newsletter = r;
          }
          return res.json({ source: 'db', links: grouped, all: rows });
        }
      } catch {}
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
    const { imageData, styleHint, tone, userContext, standard, chainName } = req.body || {};

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        warning: 'Gemini API key not found. Using algorithmic NFT metadata generator.',
        metadata: {
          name: `Vanguard Synthesis #${Math.floor(1000 + Math.random() * 9000)}`,
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 WIP NFT LIVE FULL SUPABASE EDITION - Running on http://0.0.0.0:${PORT}`);
    console.log(`Fee Collector: ${FEE_COLLECTOR_ADDRESS} (Block 93415806) | Fee Wallet: ${FEE_WALLET} YOU GET PAID`);
    console.log(`Collections: WIP (${WIP_COLLECTION}) & WIPLOGO (${LOGO_COLLECTION}) - Independent Single 1/1 Edition`);
    console.log(`Supabase Org: Work-in-Progress-NFTs Project: WIP-nfts America us-east-1 Pooler: aws-0-us-east-1.pooler.supabase.com:6543 - SSL: rejectUnauthorized false`);
    console.log(`Firestore DB: ${firebaseConfig.firestoreDatabaseId} - Gemini: gemini-3.8-flash - API: /api/health, /api/ai/*, /api/site-links, /api/app-access (public)`);
  });
}

startServer();
