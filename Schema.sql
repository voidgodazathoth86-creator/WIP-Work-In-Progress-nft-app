-- Cloud SQL PostgreSQL schema for WIP Cross-Chain NFT App
-- Region: us-east1 (change if needed)
-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Collections across chains
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(20) NOT NULL, -- ethereum, polygon, solana, arbitrum, base, avalanche
  contract_address VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  symbol VARCHAR(20),
  total_supply INT DEFAULT 0,
  floor_price DECIMAL(20,8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain, contract_address)
);

-- Tokens / NFTs
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  token_id VARCHAR(100) NOT NULL,
  owner_wallet VARCHAR(100),
  metadata_ipfs_uri TEXT,
  name VARCHAR(300),
  image_ipfs_uri TEXT,
  last_sale_price DECIMAL(20,8),
  last_sale_chain VARCHAR(20),
  rarity_score DECIMAL(10,2),
  rarity_rank INT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, token_id)
);

-- Traits for What-If Simulator + Rarity
CREATE TABLE IF NOT EXISTS traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  trait_type VARCHAR(100) NOT NULL,
  trait_value VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_traits_type_value ON traits(trait_type, trait_value);
CREATE INDEX idx_traits_token ON traits(token_id);

-- Pre-computed trait counts for fast simulator
CREATE TABLE IF NOT EXISTS trait_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  trait_type VARCHAR(100) NOT NULL,
  trait_value VARCHAR(200) NOT NULL,
  count INT NOT NULL,
  frequency DECIMAL(5,4), -- count / total_supply
  UNIQUE(collection_id, trait_type, trait_value)
);

-- Marketplace listings (Market tab)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  seller_wallet VARCHAR(100) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  price DECIMAL(20,8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'ETH',
  status VARCHAR(20) DEFAULT 'active', -- active, sold, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_listings_status ON listings(status);

-- Portfolio cache
CREATE TABLE IF NOT EXISTS portfolio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(100) NOT NULL,
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  chain VARCHAR(20),
  estimated_value DECIMAL(20,8),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet, token_id)
);

-- Bridge jobs (Bridge tab)
CREATE TABLE IF NOT EXISTS bridge_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id),
  from_chain VARCHAR(20) NOT NULL,
  to_chain VARCHAR(20) NOT NULL,
  from_tx_hash VARCHAR(200),
  to_tx_hash VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending', -- pending, locked, minted, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gas estimates cache (Gas tab)
CREATE TABLE IF NOT EXISTS gas_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(20) NOT NULL,
  gwei DECIMAL(10,2),
  usd_cost DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain)
);

-- View for rarity ranking carousel
CREATE OR REPLACE VIEW rarity_ranking AS
SELECT 
  t.id,
  t.collection_id,
  t.token_id,
  t.rarity_score,
  t.rarity_rank,
  c.name as collection_name,
  c.chain
FROM tokens t
JOIN collections c ON t.collection_id = c.id
ORDER BY t.rarity_score DESC;


-- === FEES: USDC fees, free for owner ===
CREATE TABLE IF NOT EXISTS fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL UNIQUE, -- mint, bridge, list, trade
  fee_usdc DECIMAL(10,2) NOT NULL, -- e.g. 1.00 = $1 USDC
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fee_config (action, fee_usdc) VALUES 
  ('mint', 2.50),
  ('bridge', 1.50),
  ('list', 0.50),
  ('trade', 2.5) -- 2.5% handled separately but stored
ON CONFLICT (action) DO NOTHING;

-- Fee transactions log
CREATE TABLE IF NOT EXISTS fee_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  fee_usdc DECIMAL(10,2) NOT NULL,
  tx_hash VARCHAR(200),
  chain VARCHAR(20),
  is_owner_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_fee_wallet ON fee_transactions(wallet);
CREATE INDEX idx_fee_action ON fee_transactions(action);

-- Owner wallets (free fees)
CREATE TABLE IF NOT EXISTS owner_wallets (
  wallet VARCHAR(100) PRIMARY KEY,
  label VARCHAR(100),
  added_at TIMESTAMPTZ DEFAULT NOW()
);
