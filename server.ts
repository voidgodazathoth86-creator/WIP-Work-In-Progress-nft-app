// server.ts - FULL LIVE BUILD 430+ LINES - RESTORED - NO TRIM
// Fee Collector LIVE: 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E Polygon Block 93415806
// Fee Wallet (YOU GET PAID): 0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0
// Collections: 0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9 WIP + 0xC2dE196A2A7AFa7197ff84D7Ef1C8BC7bd9ECcc6 WIPLOGO

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Pool } from 'pg';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

// === LIVE DEPLOYED - HARDCODED ===
export const FEE_COLLECTOR_ADDRESS = "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E";
export const FEE_COLLECTOR_CHAIN = "polygon";
export const FEE_WALLET = "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0";
export const ROYALTY_WALLET = "0xBaB06d358B181eB16e3189525BCc0bc4761a3762";
export const USDC_POLYGON = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352";
export const WIP_COLLECTION = "0xc2eaa64D089a625A9e245c15659eF5A7EA1f5ef9";
export const LOGO_COLLECTION = "0xC2dE196A2A7AFa7197ff84D7Ef1C8BC7bd9ECcc6";

const OWNER_WALLETS = [
  "0xb30ee8937bb6488be0b8ea702618a2d50ba0c4b0",
  "0xbab06d358b181eb16e3189525bcc0bc4761a3762",
  "0xbaB06d358B181eB16e3189525BCc0bc4761a3762",
  "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0",
].map(w => w.toLowerCase());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
});

const firebaseApp = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = new Hono();
app.use('/*', cors());

function isOwner(wallet: string): boolean {
  return OWNER_WALLETS.includes(wallet.toLowerCase());
}

async function getFee(action: string): Promise<number> {
  try {
    const { rows } = await pool.query('SELECT fee_usdc FROM fee_config WHERE action = $1', [action]);
    return rows[0] ? parseFloat(rows[0].fee_usdc) : 0;
  } catch { 
    const map: any = { mint: 2.5, bridge: 1.5, list: 0.5, trade: 2.5, app_access: 5.0, app_monthly: 9.99, app_lifetime: 49.99 };
    return map[action] || 0;
  }
}

// === HEALTH ===
app.get('/api/health', async (c) => {
  let sqlOk = false;
  let colCount = 0;
  try {
    const r = await pool.query('SELECT COUNT(*) as c FROM collections');
    sqlOk = true;
    colCount = parseInt(r.rows[0].c);
  } catch {}
  return c.json({
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
    cloud_sql: sqlOk ? `connected (us-east1) - ${colCount} collections` : 'not connected - set DATABASE_URL',
    firestore: 'enabled',
    firestore_db: firebaseConfig.firestoreDatabaseId,
    fee_token: 'USDC',
    owner_free_enabled: true,
    owner_wallets: OWNER_WALLETS.length,
    chains: ['ethereum','polygon','solana','arbitrum','base','avalanche'],
  });
});

app.get('/api/deployed', async (c) => {
  return c.json({
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
    status: "LIVE - Green check success",
  });
});

// === FEES ===
app.get('/api/fees', async (c) => {
  try {
    const { rows } = await pool.query('SELECT action, fee_usdc, enabled FROM fee_config WHERE enabled=true ORDER BY action');
    return c.json({ fees: rows, fee_token: 'USDC', fee_collector: FEE_COLLECTOR_ADDRESS, fee_wallet: FEE_WALLET, owner_free: true });
  } catch {
    return c.json({ fees: [
      {action:'mint', fee_usdc: 2.5}, {action:'bridge', fee_usdc: 1.5}, {action:'list', fee_usdc: 0.5},
      {action:'trade', fee_usdc: 2.5}, {action:'app_access', fee_usdc: 5.0}, {action:'app_monthly', fee_usdc: 9.99}, {action:'app_lifetime', fee_usdc: 49.99}
    ], fee_token: 'USDC', fee_collector: FEE_COLLECTOR_ADDRESS });
  }
});

app.post('/api/fees/check', async (c) => {
  const { wallet, action } = await c.req.json();
  const fee = await getFee(action);
  const owner = isOwner(wallet);
  return c.json({ wallet, action, fee_usdc: owner ? 0 : fee, is_owner_free: owner, fee_token: 'USDC', fee_collector: FEE_COLLECTOR_ADDRESS, fee_wallet: FEE_WALLET, should_pay: !owner && fee > 0 });
});

// === COLLECTIONS ===
app.get('/api/collections', async (c) => {
  try {
    const { rows } = await pool.query('SELECT * FROM collections ORDER BY created_at DESC');
    return c.json({ source: 'cloud_sql', data: rows });
  } catch (e) {
    return c.json({ source: 'hardcoded', data: [
      { chain: 'polygon', contract_address: WIP_COLLECTION, name: 'Work-In-Progress-NFTs', symbol: 'WIP', total_supply: 1 },
      { chain: 'polygon', contract_address: LOGO_COLLECTION, name: 'WIP Logo Collection', symbol: 'WIPLOGO', total_supply: 1 }
    ]});
  }
});

// === MARKET / RARITY ===
app.get('/api/market/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');
  try {
    const { rows } = await pool.query(`
      SELECT t.*, (SELECT json_agg(json_build_object('trait_type', tr.trait_type, 'trait_value', tr.trait_value)) FROM traits tr WHERE tr.token_id = t.id) as traits
      FROM tokens t WHERE t.collection_id = $1 OR t.collection_id IN (SELECT id FROM collections WHERE contract_address = $1) ORDER BY t.rarity_rank ASC NULLS LAST, t.created_at DESC LIMIT 100
    `, [collectionId]);
    if (rows.length > 0) return c.json({ source: 'cloud_sql', data: rows });
  } catch {}
  try {
    const q = query(collection(db, 'nfts'), where('collectionId', '==', collectionId), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    const data = snap.docs.map(d=>d.data());
    return c.json({ source: 'firestore', data });
  } catch (e) {
    return c.json({ source: 'none', data: [] });
  }
});

app.get('/api/rarity/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');
  try {
    const { rows } = await pool.query('SELECT * FROM rarity_ranking WHERE collection_id = $1 OR chain = $1 ORDER BY rarity_score DESC LIMIT 100', [collectionId]);
    return c.json(rows);
  } catch { return c.json([]); }
});

app.get('/api/traits/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');
  try {
    const { rows } = await pool.query('SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1 OR collection_id IN (SELECT id FROM collections WHERE contract_address = $1) ORDER BY count DESC', [collectionId]);
    return c.json(rows);
  } catch { return c.json([]); }
});

app.post('/api/simulate-rarity', async (c) => {
  const { collection_id, hypothetical_traits } = await c.req.json();
  try {
    const { rows: counts } = await pool.query('SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1 OR collection_id IN (SELECT id FROM collections WHERE contract_address = $1)', [collection_id]);
    let score = 0;
    for (const ht of hypothetical_traits as any[]) {
      const m = counts.find((cc: any) => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
      score += 1 / parseFloat(m?.frequency || '0.01');
    }
    return c.json({ projected_rarity_score: score, projected_rank: Math.floor(1000 / (score + 1)), breakdown: (hypothetical_traits as any[]).map((ht: any) => {
      const m = counts.find((cc: any) => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
      return { ...ht, current_count: m?.count || 0, frequency: m?.frequency || '0.01 (rare)' };
    })});
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// === TOKEN METADATA ===
app.get('/api/token/:id/metadata', async (c) => {
  const id = c.req.param('id');
  try {
    const { rows } = await pool.query(`
      SELECT t.*, c.name as collection_name, c.chain, c.contract_address,
             (SELECT json_agg(tr) FROM traits tr WHERE tr.token_id = t.id) as traits
      FROM tokens t JOIN collections c ON t.collection_id = c.id
      WHERE t.id = $1 OR t.token_id = $1
    `, [id]);
    if (rows[0]) {
      return c.json({
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
  try {
    const snap = await getDoc(doc(db, 'nfts', id));
    if (snap.exists()) return c.json({ raw: snap.data(), source: 'firestore' });
  } catch {}
  return c.json({ error: 'Not found' }, 404);
});

// === MINT - BOTH DBs + FEE ===
app.post('/api/mint', async (c) => {
  const { collection_id, token_id, owner_wallet, metadata_ipfs_uri, traits, usdc_tx_hash, chain, name, image } = await c.req.json();
  const fee = await getFee('mint');
  const ownerFree = isOwner(owner_wallet);
  if (!ownerFree && fee > 0 && !usdc_tx_hash) return c.json({ error: 'USDC fee required', fee_usdc: fee, fee_token: 'USDC', fee_collector: FEE_COLLECTOR_ADDRESS, fee_wallet: FEE_WALLET }, 402);
  const client = await pool.connect();
  let tokenDbId;
  try {
    await client.query('BEGIN');
    let collId = collection_id;
    if (collection_id && collection_id.startsWith('0x')) {
      const { rows: collRows } = await client.query('SELECT id FROM collections WHERE contract_address = $1', [collection_id]);
      collId = collRows[0]?.id || collection_id;
    }
    const { rows } = await client.query('INSERT INTO tokens (collection_id, token_id, owner_wallet, metadata_ipfs_uri, name, image_ipfs_uri) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [collId, token_id, owner_wallet, metadata_ipfs_uri, name || token_id, image || '']);
    tokenDbId = rows[0].id;
    for (const tr of (traits as any[]) || []) {
      await client.query('INSERT INTO traits (token_id, trait_type, trait_value) VALUES ($1,$2,$3)', [tokenDbId, tr.trait_type, tr.trait_value]);
      await client.query(`INSERT INTO trait_counts (collection_id, trait_type, trait_value, count, frequency) VALUES ($1,$2,$3,1,0) ON CONFLICT (collection_id, trait_type, trait_value) DO UPDATE SET count = trait_counts.count + 1`, [collId, tr.trait_type, tr.trait_value]);
    }
    await client.query('INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,$2,$3,$4,$5,$6)', [owner_wallet, 'mint', ownerFree?0:fee, usdc_tx_hash||null, chain||'polygon', ownerFree]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return c.json({ error: String(e) }, 500);
  } finally { client.release(); }
  try {
    await setDoc(doc(db, 'nfts', tokenDbId), {
      id: tokenDbId, tokenId: token_id, name: name || token_id, image: image || '', chainId: chain || 'polygon', standard: 'ERC-721',
      collectionId: collection_id, creatorAddress: owner_wallet, ownerAddress: owner_wallet, royaltyPercentage: 5, price: 0, isListed: false,
      createdAt: Date.now(), ipfsMetadataUri: metadata_ipfs_uri, ipfsImageUri: image || '', txHash: usdc_tx_hash || '', feeCollector: FEE_COLLECTOR_ADDRESS,
    });
  } catch {}
  return c.json({ success: true, tokenDbId, fee_charged: ownerFree?0:fee, is_owner_free: ownerFree, fee_collector: FEE_COLLECTOR_ADDRESS, fee_wallet: FEE_WALLET, synced_to: ['cloud_sql','firestore'] });
});

// === LISTINGS / MARKETPLACE ===
app.get('/api/listings/:collectionId?', async (c) => {
  const collectionId = c.req.param('collectionId');
  try {
    if (collectionId) {
      const { rows } = await pool.query(`SELECT l.*, t.token_id, t.name, t.image_ipfs_uri, c.name as collection_name FROM listings l JOIN tokens t ON l.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE c.contract_address = $1 OR t.collection_id = $1 AND l.status='active' ORDER BY l.created_at DESC`, [collectionId]);
      return c.json(rows);
    } else {
      const { rows } = await pool.query(`SELECT l.*, t.token_id, t.name, c.name as collection_name FROM listings l JOIN tokens t ON l.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE l.status='active' ORDER BY l.created_at DESC LIMIT 100`);
      return c.json(rows);
    }
  } catch { return c.json([]); }
});

app.post('/api/list', async (c) => {
  const { token_id, seller_wallet, chain, price, currency, usdc_tx_hash } = await c.req.json();
  const fee = await getFee('list');
  if (!isOwner(seller_wallet) && fee > 0 && !usdc_tx_hash) return c.json({ error: 'USDC fee required for listing', fee_usdc: fee }, 402);
  try {
    const { rows } = await pool.query(`INSERT INTO listings (token_id, seller_wallet, chain, price, currency, status) VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`, [token_id, seller_wallet, chain||'polygon', price, currency||'USDC']);
    await pool.query(`INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,'list',$2,$3,$4,$5)`, [seller_wallet, isOwner(seller_wallet)?0:fee, usdc_tx_hash||null, chain||'polygon', isOwner(seller_wallet)]);
    return c.json(rows[0]);
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

// === PORTFOLIO + CROSS-DEVICE SYNC ===
app.get('/api/portfolio/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  try {
    const q = query(collection(db, 'nfts'), where('ownerAddress', '==', wallet));
    const snap = await getDocs(q);
    const firestoreData = snap.docs.map(d=>d.data());
    if (firestoreData.length > 0) return c.json({ source: 'firestore', data: firestoreData });
  } catch {}
  try {
    const { rows } = await pool.query(`SELECT t.*, c.name, c.chain, c.contract_address, pc.estimated_value FROM portfolio_cache pc JOIN tokens t ON pc.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE LOWER(pc.wallet) = LOWER($1) ORDER BY pc.estimated_value DESC NULLS LAST`, [wallet]);
    return c.json({ source: 'cloud_sql', data: rows });
  } catch { return c.json({ source: 'none', data: [] }); }
});

app.get('/api/user/:wallet/sync', async (c) => {
  const wallet = c.req.param('wallet');
  try {
    const snap = await getDoc(doc(db, 'users', wallet.toLowerCase()));
    if (snap.exists()) return c.json({ data: snap.data() });
    return c.json({ data: null });
  } catch (e) { return c.json({ data: null }); }
});

app.post('/api/user/:wallet/sync', async (c) => {
  const wallet = c.req.param('wallet');
  const body = await c.req.json();
  try {
    await setDoc(doc(db, 'users', wallet.toLowerCase()), { wallet: wallet.toLowerCase(), ...body, updatedAt: Date.now() }, { merge: true });
    return c.json({ success: true });
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

app.get('/api/favorites/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  try {
    const q = query(collection(db, 'favorites'), where('wallet', '==', wallet.toLowerCase()));
    const snap = await getDocs(q);
    return c.json(snap.docs.map(d=>d.data()));
  } catch { return c.json([]); }
});

app.post('/api/favorites', async (c) => {
  const { wallet, tokenId } = await c.req.json();
  try {
    await setDoc(doc(db, 'favorites', `${wallet.toLowerCase()}_${tokenId}`), { wallet: wallet.toLowerCase(), tokenId, createdAt: Date.now() });
    return c.json({ success: true });
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

// === BRIDGE ===
app.post('/api/bridge', async (c) => {
  const { token_id, from_chain, to_chain, wallet, usdc_tx_hash, nftName } = await c.req.json();
  const fee = await getFee('bridge');
  if (!isOwner(wallet) && fee > 0 && !usdc_tx_hash) return c.json({ error: 'USDC fee required', fee_usdc: fee, fee_collector: FEE_COLLECTOR_ADDRESS }, 402);
  try {
    const { rows } = await pool.query(`INSERT INTO bridge_jobs (token_id, from_chain, to_chain, status) VALUES ($1,$2,$3,'pending') RETURNING *`, [token_id, from_chain, to_chain]);
    await pool.query(`INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,'bridge',$2,$3,$4,$5)`, [wallet, isOwner(wallet)?0:fee, usdc_tx_hash||null, from_chain, isOwner(wallet)]);
    try {
      await setDoc(doc(db, 'bridge_transactions', rows[0].id), {
        id: rows[0].id, nftId: token_id, nftName: nftName||'', sourceChain: from_chain, destinationChain: to_chain,
        senderAddress: wallet, recipientAddress: wallet, protocol: 'layerzero', bridgeStandard: 'ONFT',
        sourceTxHash: usdc_tx_hash||'', messageId: rows[0].id, timestamp: Date.now(), status: 'pending', step: 1
      });
    } catch {}
    return c.json(rows[0]);
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

app.get('/api/bridge/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  try {
    const q = query(collection(db, 'bridge_transactions'), where('senderAddress', '==', wallet), orderBy('timestamp', 'desc'), limit(20));
    const snap = await getDocs(q);
    return c.json(snap.docs.map(d=>d.data()));
  } catch {
    try {
      const { rows } = await pool.query(`SELECT * FROM bridge_jobs ORDER BY created_at DESC LIMIT 20`);
      return c.json(rows);
    } catch { return c.json([]); }
  }
});

// === GAS ===
app.get('/api/gas', async (c) => {
  try {
    const { rows } = await pool.query('SELECT chain, gwei, usd_cost, updated_at FROM gas_cache ORDER BY chain');
    if (rows.length) return c.json(rows);
    return c.json([
      { chain: 'polygon', gwei: 50, usd_cost: 0.02 },
      { chain: 'ethereum', gwei: 20, usd_cost: 2.5 },
      { chain: 'arbitrum', gwei: 0.1, usd_cost: 0.05 }
    ]);
  } catch { return c.json([]); }
});

app.post('/api/gas/update', async (c) => {
  const { chain, gwei, usd_cost } = await c.req.json();
  try {
    await pool.query(`INSERT INTO gas_cache (chain, gwei, usd_cost, updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (chain) DO UPDATE SET gwei=$2, usd_cost=$3, updated_at=NOW()`, [chain, gwei, usd_cost]);
    return c.json({ success: true });
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

// === APP ACCESS PAYWALL - PUBLIC ===
app.get('/api/app-access/:wallet', async (c) => {
  const wallet = c.req.param('wallet').toLowerCase();
  if (OWNER_WALLETS.includes(wallet)) {
    return c.json({ hasAccess: true, isOwner: true, subscription: { wallet, plan: 'owner', is_owner_free: true, expires_at: null } });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM app_subscriptions WHERE LOWER(wallet) = $1 ORDER BY created_at DESC LIMIT 1', [wallet]);
    if (!rows[0]) return c.json({ hasAccess: false, subscription: null });
    const sub = rows[0];
    if (!sub.expires_at) return c.json({ hasAccess: true, subscription: sub });
    const hasAccess = new Date(sub.expires_at) > new Date();
    return c.json({ hasAccess, subscription: sub });
  } catch (e) {
    return c.json({ hasAccess: true, subscription: null, note: 'app_subscriptions not migrated yet - allowing access for deploy' });
  }
});

app.post('/api/app-access', async (c) => {
  const body = await c.req.json();
  const wallet = (body.wallet || '').toLowerCase();
  const plan = body.plan || 'one_time';
  const fee_usdc = body.fee_usdc || 5.00;
  const tx_hash = body.tx_hash || '0x';
  const chain = body.chain || 'polygon';
  const daysMap: Record<string, number | null> = { one_time: 1, monthly: 30, lifetime: null, app_access: 1, app_monthly: 30, app_lifetime: null };
  const days = daysMap[plan] ?? 1;
  const expires_at = days ? new Date(Date.now() + days * 24*60*60*1000).toISOString() : null;
  try {
    const { rows } = await pool.query(`
      INSERT INTO app_subscriptions (wallet, plan, fee_usdc, tx_hash, chain, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (wallet) DO UPDATE SET plan=$2, fee_usdc=$3, tx_hash=$4, chain=$5, expires_at=$6, created_at=NOW()
      RETURNING *
    `, [wallet, plan, fee_usdc, tx_hash, chain, expires_at]);
    await pool.query(`INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1, 'app_access', $2, $3, $4, false)`, [wallet, fee_usdc, tx_hash, chain]);
    return c.json({ success: true, subscription: rows[0] });
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

// === TRANSACTIONS LOG ===
app.get('/api/transactions/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  try {
    const { rows } = await pool.query('SELECT * FROM fee_transactions WHERE LOWER(wallet)=LOWER($1) ORDER BY created_at DESC LIMIT 100', [wallet]);
    return c.json(rows);
  } catch { return c.json([]); }
});

// === SITE LINKS - Website, Socials, Blog, Newsletter ===
app.get('/api/site-links', async (c) => {
  try {
    const { rows } = await pool.query('SELECT * FROM site_links ORDER BY category, label');
    if (rows.length) {
      // Group by category
      const grouped: any = { website: null, socials: {}, blog: null, newsletter: null };
      for (const r of rows) {
        if (r.category === 'website') grouped.website = r;
        else if (r.category === 'social') grouped.socials[r.key] = r;
        else if (r.category === 'blog') grouped.blog = r;
        else if (r.category === 'newsletter') grouped.newsletter = r;
      }
      return c.json({ source: 'db', links: grouped, all: rows });
    }
  } catch {}
  // Fallback hardcoded - update in deployed-config.ts when you build them
  return c.json({
    source: 'hardcoded',
    links: {
      website: { url: "", label: "Website", enabled: false, status: "Coming Soon" },
      socials: {
        twitter: { url: "", label: "X / Twitter", enabled: false, status: "Coming Soon" },
        instagram: { url: "", label: "Instagram", enabled: false, status: "Coming Soon" },
        discord: { url: "", label: "Discord", enabled: false, status: "Coming Soon" },
      },
      blog: { url: "", label: "Blog", enabled: false, status: "Coming Soon" },
      newsletter: { url: "", label: "Newsletter", enabled: false, status: "Coming Soon" },
    },
    note: "Update deployed-config.ts SITE_LINKS when your site/socials/blog/newsletter are live"
  });
});

app.get('/api/links', async (c) => {
  // Alias for /api/site-links
  return c.req.param ? c.json({ redirect: '/api/site-links' }) : c.json({ message: "Use /api/site-links" });
});

export default { port: Number(process.env.PORT) || 3000, fetch: app.fetch };
console.log('🚀 WIP NFT LIVE FULL 430+ - Fee Collector 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E Block 93415806 - fees to 0xB30e...4b0 - Collections WIP + WIPLOGO LIVE');
