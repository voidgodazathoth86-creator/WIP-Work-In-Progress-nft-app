// server.ts - Full build with Cloud SQL enabled for cross-chain NFT app
// Region: us-east1 (set via env)
// Stack: Vite + Bun + Hono + Cloud SQL Postgres

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from 'bun';
import { Pool } from 'pg';

// --- Cloud SQL Config ---
// For Cloud SQL, use Cloud SQL Connector or direct connection via env
// Enable Cloud SQL in us-east1 as shown in your screenshot

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Example: postgres://user:pass@/dbname?host=/cloudsql/PROJECT:us-east1:INSTANCE
  // Or: postgres://user:pass@10.x.x.x:5432/dbname for private IP
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
});

const app = new Hono();
app.use('/*', cors());

// --- Health ---
app.get('/api/health', async (c) => {
  const db = await pool.query('SELECT NOW() as now, COUNT(*) as collections FROM collections');
  return c.json({ 
    status: 'ok', 
    db_time: db.rows[0].now,
    collections: db.rows[0].collections,
    region: process.env.CLOUD_SQL_REGION || 'us-east1',
    chains: ['ethereum','polygon','solana','arbitrum','base','avalanche']
  });
});

// --- Market: Real-time token comparison (your ranking carousel) ---
app.get('/api/market/:collectionId', async (c) => {
  const collectionId = c.req.param('collectionId');
  const { rows } = await pool.query(`
    SELECT t.*, 
           (SELECT json_agg(json_build_object('trait_type', tr.trait_type, 'trait_value', tr.trait_value)) 
            FROM traits tr WHERE tr.token_id = t.id) as traits
    FROM tokens t 
    WHERE t.collection_id = $1 
    ORDER BY t.rarity_rank ASC LIMIT 50
  `, [collectionId]);
  return c.json(rows);
});

// --- Interactive What-If Trait Simulator ---
app.post('/api/simulate-rarity', async (c) => {
  const { collection_id, hypothetical_traits } = await c.req.json();
  // hypothetical_traits: [{trait_type, trait_value}, ...]
  
  // Get current counts from Cloud SQL
  const { rows: counts } = await pool.query(
    'SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1',
    [collection_id]
  );
  
  let projectedScore = 0;
  for (const ht of hypothetical_traits) {
    const match = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
    const freq = match ? parseFloat(match.frequency) : 0.01; // rare if not found
    projectedScore += 1 / freq;
  }
  
  return c.json({
    projected_rarity_score: projectedScore,
    projected_rank: Math.floor(1000 / (projectedScore + 1)), // example formula
    breakdown: hypothetical_traits.map(ht => {
      const m = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
      return { ...ht, current_count: m?.count || 0, frequency: m?.frequency || '0.01 (rare)' };
    })
  });
});

// --- Raw Metadata Inspector ---
app.get('/api/token/:id/metadata', async (c) => {
  const id = c.req.param('id');
  const { rows } = await pool.query(`
    SELECT t.*, c.name as collection_name, c.chain, c.contract_address,
           (SELECT json_agg(tr) FROM traits tr WHERE tr.token_id = t.id) as traits
    FROM tokens t JOIN collections c ON t.collection_id = c.id
    WHERE t.id = $1
  `, [id]);
  if (!rows[0]) return c.json({ error: 'Not found' }, 404);
  
  // Return formatted JSON with IPFS URI quick copy
  return c.json({
    raw: rows[0],
    ipfs_uri: rows[0].metadata_ipfs_uri,
    quick_copy: {
      ipfs: rows[0].metadata_ipfs_uri,
      image: rows[0].image_ipfs_uri,
      opensea: `https://opensea.io/assets/${rows[0].chain}/${rows[0].contract_address}/${rows[0].token_id}`
    }
  });
});

// --- Mint: Create new token entry + trigger on-chain mint (client handles wallet) ---
app.post('/api/mint', async (c) => {
  const { collection_id, token_id, owner_wallet, metadata_ipfs_uri, traits } = await c.req.json();
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO tokens (collection_id, token_id, owner_wallet, metadata_ipfs_uri)
      VALUES ($1,$2,$3,$4) RETURNING id
    `, [collection_id, token_id, owner_wallet, metadata_ipfs_uri]);
    
    const tokenDbId = rows[0].id;
    
    for (const tr of traits || []) {
      await client.query(
        'INSERT INTO traits (token_id, trait_type, trait_value) VALUES ($1,$2,$3)',
        [tokenDbId, tr.trait_type, tr.trait_value]
      );
    }
    
    // Update trait_counts for simulator
    for (const tr of traits || []) {
      await client.query(`
        INSERT INTO trait_counts (collection_id, trait_type, trait_value, count, frequency)
        VALUES ($1,$2,$3,1,0)
        ON CONFLICT (collection_id, trait_type, trait_value) 
        DO UPDATE SET count = trait_counts.count + 1
      `, [collection_id, tr.trait_type, tr.trait_value]);
    }
    
    await client.query('COMMIT');
    return c.json({ success: true, tokenDbId });
  } catch (e) {
    await client.query('ROLLBACK');
    return c.json({ error: String(e) }, 500);
  } finally {
    client.release();
  }
});

// --- Bridge (cross-chain) ---
app.post('/api/bridge', async (c) => {
  const { token_id, from_chain, to_chain } = await c.req.json();
  const { rows } = await pool.query(`
    INSERT INTO bridge_jobs (token_id, from_chain, to_chain, status)
    VALUES ($1,$2,$3,'pending') RETURNING *
  `, [token_id, from_chain, to_chain]);
  return c.json(rows[0]);
});

// --- Portfolio ---
app.get('/api/portfolio/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  const { rows } = await pool.query(`
    SELECT t.*, c.name, c.chain, pc.estimated_value
    FROM portfolio_cache pc
    JOIN tokens t ON pc.token_id = t.id
    JOIN collections c ON t.collection_id = c.id
    WHERE pc.wallet = $1
    ORDER BY pc.estimated_value DESC
  `, [wallet]);
  return c.json(rows);
});

// --- App Access Paywall (PUBLIC - not hidden) ---
// Check if wallet has app access
app.get('/api/app-access/:wallet', async (c) => {
  const wallet = c.req.param('wallet').toLowerCase();
  
  // Owner wallets free
  const ownerWallets = ['0xb30ee8937bb6488be0b8ea702618a2d50ba0c4b0', '0xbab06d358b181eb16e3189525bcc0bc4761a3762'];
  if (ownerWallets.includes(wallet)) {
    return c.json({ hasAccess: true, isOwner: true, subscription: { wallet, plan: 'owner', is_owner_free: true, expires_at: null } });
  }

  const { rows } = await pool.query('SELECT * FROM app_subscriptions WHERE LOWER(wallet) = $1 ORDER BY created_at DESC LIMIT 1', [wallet]);
  if (!rows[0]) return c.json({ hasAccess: false, subscription: null });
  
  const sub = rows[0];
  if (!sub.expires_at) return c.json({ hasAccess: true, subscription: sub }); // lifetime
  const hasAccess = new Date(sub.expires_at) > new Date();
  return c.json({ hasAccess, subscription: sub });
});

// Create app access after payment
app.post('/api/app-access', async (c) => {
  const { wallet, plan, fee_usdc, tx_hash, chain } = await c.req.json();
  const plans: any = {
    one_time: { days: 1, fee: 5.00 },
    monthly: { days: 30, fee: 9.99 },
    lifetime: { days: null, fee: 49.99 },
    app_access: { days: 1, fee: 5.00 }
  };
  const selected = plans[plan] || plans.one_time;
  const expires_at = selected.days ? new Date(Date.now() + selected.days * 24*60*60*1000).toISOString() : null;
  
  const { rows } = await pool.query(`
    INSERT INTO app_subscriptions (wallet, plan, fee_usdc, tx_hash, chain, expires_at)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (wallet) DO UPDATE SET plan=$2, fee_usdc=$3, tx_hash=$4, chain=$5, expires_at=$6, created_at=NOW()
    RETURNING *
  `, [wallet.toLowerCase(), plan, fee_usdc || selected.fee, tx_hash, chain || 'polygon', expires_at]);

  // Also log to fee_transactions (uses your live fee collector 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E)
  await pool.query(`
    INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free)
    VALUES ($1, 'app_access', $2, $3, $4, false)
  `, [wallet.toLowerCase(), fee_usdc || selected.fee, tx_hash, chain || 'polygon']);

  return c.json({ success: true, subscription: rows[0] });
});

// List fees (public)
app.get('/api/fees', async (c) => {
  const { rows } = await pool.query('SELECT action, fee_usdc, enabled FROM fee_config WHERE enabled=true ORDER BY action');
  return c.json(rows);
});

// --- Gas cache ---
app.get('/api/gas', async (c) => {
  const { rows } = await pool.query('SELECT chain, gwei, usd_cost, updated_at FROM gas_cache ORDER BY chain');
  return c.json(rows);
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};

console.log(`🚀 WIP NFT App server running with Cloud SQL (us-east1) enabled`);
console.log(`Market + What-If Simulator + Metadata Inspector ready`);
