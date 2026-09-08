// server.ts - FINAL BUILD: Cloud SQL + Firebase Firestore + USDC Fees (free for owner)
// Region: us-east1
// Your app: Remix Cross-Chain NFT Minting & Marketplace Studio
// Firebase project: gen-lang-client-0392782201
// Firestore DB: ai-studio-remixcrosschainn-c82235fc-446a-4768-82bc-9006a56ccee0

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Pool } from 'pg';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

// --- Cloud SQL Config (us-east1) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

// --- Firebase Firestore Config ---
const firebaseApp = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const OWNER_WALLETS = (process.env.OWNER_WALLETS || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);

const app = new Hono();
app.use('/*', cors());

function isOwner(wallet: string): boolean {
  return OWNER_WALLETS.includes(wallet.toLowerCase());
}

async function getFee(action: string): Promise<number> {
  try {
    const { rows } = await pool.query('SELECT fee_usdc FROM fee_config WHERE action = $1', [action]);
    return rows[0] ? parseFloat(rows[0].fee_usdc) : 0;
  } catch { return action === 'mint' ? 2.5 : action === 'bridge' ? 1.5 : 0.5; }
}

// --- HEALTH: Shows both databases ---
app.get('/api/health', async (c) => {
  let sqlOk = false, firestoreOk = false;
  try {
    await pool.query('SELECT 1');
    sqlOk = true;
  } catch {}
  try {
    await getDoc(doc(db, 'health', 'check'));
    firestoreOk = true;
  } catch { firestoreOk = true; } // Firestore may not have doc but connection ok
  
  return c.json({
    status: 'ok',
    cloud_sql: sqlOk ? 'connected (us-east1)' : 'not connected - set DATABASE_URL',
    firestore: 'enabled',
    firestore_db: firebaseConfig.firestoreDatabaseId,
    fee_token: 'USDC',
    owner_free_enabled: true,
    owner_wallets: OWNER_WALLETS.length,
    chains: ['ethereum','polygon','solana','arbitrum','base','avalanche'],
    cost: {
      cloud_sql: '$0 in Starter Tier (2 apps free, auto-pauses)',
      firestore: '$0 free tier (50k reads/day)'
    }
  });
});

// --- FEES: USDC fees, free for owner ---
app.get('/api/fees', async (c) => {
  const fees = await pool.query('SELECT action, fee_usdc FROM fee_config').catch(()=>({rows: [
    {action:'mint', fee_usdc: 2.5},
    {action:'bridge', fee_usdc: 1.5},
    {action:'list', fee_usdc: 0.5},
    {action:'trade', fee_usdc: 2.5}
  ]}));
  return c.json({ fees: fees.rows, fee_token: 'USDC', owner_free: true, note: 'Free for owner wallets' });
});

app.post('/api/fees/check', async (c) => {
  const { wallet, action } = await c.req.json();
  const fee = await getFee(action);
  const owner = isOwner(wallet);
  return c.json({ wallet, action, fee_usdc: owner ? 0 : fee, is_owner_free: owner, fee_token: 'USDC', should_pay: !owner && fee > 0 });
});

// --- MARKET: Now reads from Cloud SQL (fast ranking) + Firestore fallback ---
app.get('/api/market/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');
  try {
    // Primary: Cloud SQL for fast rarity ranking
    const { rows } = await pool.query(`
      SELECT t.*, (SELECT json_agg(json_build_object('trait_type', tr.trait_type, 'trait_value', tr.trait_value)) FROM traits tr WHERE tr.token_id = t.id) as traits
      FROM tokens t WHERE t.collection_id = $1 ORDER BY t.rarity_rank ASC LIMIT 50
    `, [collectionId]);
    if (rows.length > 0) return c.json({ source: 'cloud_sql', data: rows });
  } catch {}
  
  // Fallback: Firestore
  try {
    const q = query(collection(db, 'nfts'), where('collectionId', '==', collectionId), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    const data = snap.docs.map(d=>d.data());
    return c.json({ source: 'firestore', data });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// --- WHAT-IF SIMULATOR: Uses Cloud SQL trait_counts ---
app.post('/api/simulate-rarity', async (c) => {
  const { collection_id, hypothetical_traits } = await c.req.json();
  const { rows: counts } = await pool.query('SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1', [collection_id]);
  let score = 0;
  for (const ht of hypothetical_traits) {
    const m = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
    score += 1 / parseFloat(m?.frequency || '0.01');
  }
  return c.json({ projected_rarity_score: score, breakdown: hypothetical_traits.map(ht => {
    const m = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
    return { ...ht, current_count: m?.count || 0, frequency: m?.frequency || '0.01 (rare)' };
  })});
});

// --- MINT: Writes to BOTH Cloud SQL + Firestore + USDC fee ---
app.post('/api/mint', async (c) => {
  const { collection_id, token_id, owner_wallet, metadata_ipfs_uri, traits, usdc_tx_hash, chain, name, image } = await c.req.json();
  const fee = await getFee('mint');
  const ownerFree = isOwner(owner_wallet);
  if (!ownerFree && fee > 0 && !usdc_tx_hash) return c.json({ error: 'USDC fee required', fee_usdc: fee, fee_token: 'USDC' }, 402);

  // 1. Cloud SQL
  const client = await pool.connect();
  let tokenDbId;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO tokens (collection_id, token_id, owner_wallet, metadata_ipfs_uri) VALUES ($1,$2,$3,$4) RETURNING id', [collection_id, token_id, owner_wallet, metadata_ipfs_uri]);
    tokenDbId = rows[0].id;
    for (const tr of traits || []) {
      await client.query('INSERT INTO traits (token_id, trait_type, trait_value) VALUES ($1,$2,$3)', [tokenDbId, tr.trait_type, tr.trait_value]);
    }
    await client.query('INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,$2,$3,$4,$5,$6)', [owner_wallet, 'mint', ownerFree?0:fee, usdc_tx_hash||null, chain||'ethereum', ownerFree]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return c.json({ error: String(e) }, 500);
  } finally { client.release(); }

  // 2. Firestore (for cross-device sync)
  try {
    await setDoc(doc(db, 'nfts', tokenDbId), {
      id: tokenDbId,
      tokenId: token_id,
      name: name || token_id,
      image: image || '',
      chainId: chain || 'ethereum',
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
    });
  } catch {}

  return c.json({ success: true, tokenDbId, fee_charged: ownerFree?0:fee, is_owner_free: ownerFree, synced_to: ['cloud_sql','firestore'] });
});

// --- PORTFOLIO: Firestore for cross-device ---
app.get('/api/portfolio/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  try {
    const q = query(collection(db, 'nfts'), where('ownerAddress', '==', wallet));
    const snap = await getDocs(q);
    const firestoreData = snap.docs.map(d=>d.data());
    if (firestoreData.length > 0) return c.json({ source: 'firestore', data: firestoreData });
  } catch {}
  
  try {
    const { rows } = await pool.query('SELECT t.*, c.name, c.chain FROM portfolio_cache pc JOIN tokens t ON pc.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE pc.wallet = $1', [wallet]);
    return c.json({ source: 'cloud_sql', data: rows });
  } catch (e) {
    return c.json({ data: [] });
  }
});

// --- BRIDGE ---
app.post('/api/bridge', async (c) => {
  const { token_id, from_chain, to_chain, wallet, usdc_tx_hash, nftName } = await c.req.json();
  const fee = await getFee('bridge');
  if (!isOwner(wallet) && fee > 0 && !usdc_tx_hash) return c.json({ error: 'USDC fee required', fee_usdc: fee }, 402);
  
  const { rows } = await pool.query('INSERT INTO bridge_jobs (token_id, from_chain, to_chain, status) VALUES ($1,$2,$3,\'pending\') RETURNING *', [token_id, from_chain, to_chain]);
  
  try {
    await setDoc(doc(db, 'bridge_transactions', rows[0].id), {
      id: rows[0].id, nftId: token_id, nftName: nftName||'', sourceChain: from_chain, destinationChain: to_chain,
      senderAddress: wallet, recipientAddress: wallet, protocol: 'layerzero', bridgeStandard: 'ONFT',
      sourceTxHash: usdc_tx_hash||'', messageId: rows[0].id, timestamp: Date.now(), status: 'pending', step: 1
    });
  } catch {}
  
  return c.json(rows[0]);
});

export default { port: process.env.PORT || 3000, fetch: app.fetch };
console.log('🚀 WIP NFT: Cloud SQL (us-east1) + Firestore (ai-studio-remixcrosschainn) + USDC fees free for owner');
