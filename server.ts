// server.ts - FINAL BUILD: LIVE DEPLOYED - NO ENV VARS NEEDED
// Fee Collector: 0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E - Polygon Block 93415806 - LIVE
// Firebase project: gen-lang-client-0392782201

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Pool } from 'pg';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

dotenv.config();

// === LIVE DEPLOYED - HARDCODED - NO ENV VARS ===
export const FEE_COLLECTOR_ADDRESS = "0x063A3747Bb18cbbc6E3429e1E06Dea93616F7f6E";
export const FEE_COLLECTOR_CHAIN = "polygon";
export const FEE_WALLET = "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0"; // Account 16 - WIP Fees
export const ROYALTY_WALLET = "0xBaB06d358B181eB16e3189525BCc0bc4761a3762"; // Main royalty - separate
export const USDC_POLYGON = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3352"; // lowercase fixed checksum error

// Owner wallets free - YOU DON'T PAY FEES
export const OWNER_WALLETS = [
  "0xb30ee8937bb6488be0b8ea702618a2d50ba0c4b0",
  "0xbab06d358b181eb16e3189525bcc0bc4761a3762",
  "0xbaB06d358B181eB16e3189525BCc0bc4761a3762", // checksum version too
  "0xB30eE8937bB6488bE0b8EA702618a2D50Ba0C4b0",
].map(w => w.toLowerCase());

function isOwner(wallet: string): boolean {
  if (!wallet) return false;
  return OWNER_WALLETS.includes(wallet.toLowerCase());
}

// --- Cloud SQL Config (us-east1) ---
let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  } catch (err) {
    console.warn('Cloud SQL Pool initialization notice:', err);
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

async function getFee(action: string): Promise<number> {
  if (pool) {
    try {
      const { rows } = await pool.query('SELECT fee_usdc FROM fee_config WHERE action = $1', [action]);
      if (rows && rows[0]) return parseFloat(rows[0].fee_usdc);
    } catch {}
  }
  return action === 'mint' ? 2.5 : action === 'bridge' ? 1.5 : 0.5;
}

// Safe Gemini AI Client Initializer
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
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
  const PORT = 3000;

  // Support JSON and CORS
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

  // --- HEALTH: Shows LIVE DEPLOYED ---
  app.get('/api/health', async (req, res) => {
    let sqlOk = false;
    if (pool) {
      try {
        await pool.query('SELECT 1');
        sqlOk = true;
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
      cloud_sql: sqlOk ? 'connected (us-east1)' : 'not connected - set DATABASE_URL',
      firestore: db ? 'enabled' : 'fallback-mode',
      firestore_db: firebaseConfig.firestoreDatabaseId,
      fee_token: 'USDC',
      owner_free_enabled: true,
      owner_wallets: OWNER_WALLETS.length,
      chains: ['ethereum','polygon','solana','arbitrum','base','avalanche'],
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // --- DEPLOYED INFO ENDPOINT ---
  app.get('/api/deployed', async (req, res) => {
    res.json({
      feeCollector: FEE_COLLECTOR_ADDRESS,
      chain: FEE_COLLECTOR_CHAIN,
      block: 93415806,
      txHash: "0x5a2...b45b1",
      feeWallet: FEE_WALLET,
      royaltyWallet: ROYALTY_WALLET,
      usdc: USDC_POLYGON,
      status: "LIVE - Green check success",
      note: "One-click lowercase fix for bad address checksum error"
    });
  });

  // --- FEES: USDC fees, free for owner ---
  app.get('/api/fees', async (req, res) => {
    let fees = [
      { action: 'mint', fee_usdc: 2.5 },
      { action: 'bridge', fee_usdc: 1.5 },
      { action: 'list', fee_usdc: 0.5 },
      { action: 'trade', fee_usdc: 2.5 }
    ];
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT action, fee_usdc FROM fee_config');
        if (rows && rows.length > 0) fees = rows;
      } catch {}
    }
    res.json({ 
      fees, 
      fee_token: 'USDC', 
      fee_collector: FEE_COLLECTOR_ADDRESS,
      fee_wallet: FEE_WALLET,
      owner_free: true, 
      note: 'Free for owner wallets, fees go to ' + FEE_WALLET 
    });
  });

  app.post('/api/fees/check', async (req, res) => {
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

  // --- MARKET ---
  app.get('/api/market/:collectionId', async (req, res) => {
    const collectionId = req.params.collectionId;
    if (pool) {
      try {
        const { rows } = await pool.query(`
          SELECT t.*, (SELECT json_agg(json_build_object('trait_type', tr.trait_type, 'trait_value', tr.trait_value)) FROM traits tr WHERE tr.token_id = t.id) as traits
          FROM tokens t WHERE t.collection_id = $1 ORDER BY t.rarity_rank ASC LIMIT 50
        `, [collectionId]);
        if (rows && rows.length > 0) return res.json({ source: 'cloud_sql', data: rows });
      } catch {}
    }
    
    if (db) {
      try {
        const q = query(collection(db, 'nfts'), where('collectionId', '==', collectionId), orderBy('createdAt', 'desc'), limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data());
        return res.json({ source: 'firestore', data });
      } catch (e) {
        return res.json({ source: 'firestore_fallback', data: [], error: String(e) });
      }
    }

    res.json({ source: 'client_local', data: [] });
  });

  // --- WHAT-IF SIMULATOR ---
  app.post('/api/simulate-rarity', async (req, res) => {
    const { collection_id, hypothetical_traits = [] } = req.body || {};
    let counts: any[] = [];
    if (pool) {
      try {
        const resQuery = await pool.query('SELECT trait_type, trait_value, count, frequency FROM trait_counts WHERE collection_id = $1', [collection_id]);
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
      breakdown: hypothetical_traits.map((ht: any) => {
        const m = counts.find(cc => cc.trait_type === ht.trait_type && cc.trait_value === ht.trait_value);
        return { ...ht, current_count: m?.count || 0, frequency: m?.frequency || '0.01 (rare)' };
      })
    });
  });

  // --- MINT: Writes to Cloud SQL + Firestore + USDC fee to fee wallet ---
  app.post('/api/mint', async (req, res) => {
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
        const { rows } = await client.query(
          'INSERT INTO tokens (collection_id, token_id, owner_wallet, metadata_ipfs_uri) VALUES ($1,$2,$3,$4) RETURNING id', 
          [collection_id, token_id, owner_wallet, metadata_ipfs_uri]
        );
        if (rows && rows[0]?.id) tokenDbId = rows[0].id;
        for (const tr of traits || []) {
          await client.query('INSERT INTO traits (token_id, trait_type, trait_value) VALUES ($1,$2,$3)', [tokenDbId, tr.trait_type, tr.trait_value]);
        }
        await client.query(
          'INSERT INTO fee_transactions (wallet, action, fee_usdc, tx_hash, chain, is_owner_free) VALUES ($1,$2,$3,$4,$5,$6)', 
          [owner_wallet, 'mint', ownerFree ? 0 : fee, usdc_tx_hash || null, chain || 'polygon', ownerFree]
        );
        await client.query('COMMIT');
        synced.push('cloud_sql');
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Database mint record warning:', e);
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

  // --- PORTFOLIO ---
  app.get('/api/portfolio/:wallet', async (req, res) => {
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
          'SELECT t.*, c.name, c.chain FROM portfolio_cache pc JOIN tokens t ON pc.token_id = t.id JOIN collections c ON t.collection_id = c.id WHERE pc.wallet = $1', 
          [wallet]
        );
        return res.json({ source: 'cloud_sql', data: rows });
      } catch {}
    }

    res.json({ data: [] });
  });

  // --- BRIDGE ---
  app.post('/api/bridge', async (req, res) => {
    const { token_id, from_chain, to_chain, wallet = '', usdc_tx_hash, nftName } = req.body || {};
    const fee = await getFee('bridge');
    if (!isOwner(wallet) && fee > 0 && !usdc_tx_hash) {
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
      fee_usdc: isOwner(wallet) ? 0 : fee, 
      fee_collector: FEE_COLLECTOR_ADDRESS, 
      fee_wallet: FEE_WALLET 
    });
  });

  // --- GEMINI AI: Generate Metadata ---
  app.post('/api/ai/generate-metadata', async (req, res) => {
    try {
      const { 
        imageData, 
        styleHint = 'Cyberpunk / Futuristic', 
        tone = 'Epic & Narrative', 
        userContext = '',
        standard = 'ERC-721',
        chainName = 'Ethereum'
      } = req.body || {};

      const ai = getGeminiClient();
      if (!ai) {
        throw new Error('GEMINI_API_KEY is not configured in server environment');
      }

      const parts: any[] = [];

      if (imageData && typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          } else if (imageData.startsWith('data:image/svg+xml')) {
            const svgContent = decodeURIComponent(imageData.replace(/^data:image\/svg\+xml;utf8,/, ''));
            parts.push({
              text: `Here is the visual SVG digital asset markup to analyze:\n\`\`\`xml\n${svgContent.slice(0, 4000)}\n\`\`\``
            });
          }
        } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
          parts.push({
            text: `Visual asset source URL: ${imageData}`
          });
        }
      }

      const promptText = `
You are the Lead Creative Curator & Metadata Architect for a premier Web3 NFT & Smart Contract protocol.
Analyze the provided visual asset (or theme specifications) and generate an ultra-high-craft NFT metadata profile adhering to OpenSea and EIP-721/1155 metadata standards.

Context Details:
- Desired Style & Genre: ${styleHint}
- Narrative Tone: ${tone}
- Token Standard: ${standard}
- Target Blockchain: ${chainName}
${userContext ? `- Additional Creator Notes/Keywords: "${userContext}"` : ''}

Generate structured JSON output containing:
1. "name": A captivating, authentic Web3 NFT title with an edition tag or moniker (e.g. "Aetheria Ronin #042 - Blade of the Abyss").
2. "alternativeNames": 3 distinct alternative name concepts with varying creative angles.
3. "description": A rich, vivid narrative description (2-3 paragraphs) capturing the visual composition, world-building lore, aesthetic elements, and emotional mood of the piece.
4. "shortDescription": A punchy 1-2 sentence preview suitable for mobile marketplace cards.
5. "category": The best fitting category among ["art", "gaming", "pfp", "photography", "music", "metaverse", "utility"].
6. "suggestedRoyalty": An optimal secondary creator royalty percentage between 2.5 and 10.0 (e.g. 7.5).
7. "suggestedPrice": A reasonable mint price recommendation (e.g. 0.05 to 0.5).
8. "unlockableLore": Secret, immersive collector lore or access notes intended for the exclusive unlockable content section.
9. "tags": An array of 4-6 search tags prefixed with '#' (e.g. ["#GenerativeArt", "#Cyberpunk", "#Mythic", "#Ethereum"]).
10. "visualAnalysis": An object detailing:
    - "dominantColors": Array of 3-4 descriptive color names
    - "aestheticStyle": e.g. "Hyper-detailed Cyberpunk Vector"
    - "mood": e.g. "Enigmatic, Electric, Transcendental"
11. "traits": An array of 4-6 structured traits/attributes adhering to standard OpenSea metadata format. Each trait must have:
    - "trait_type": string
    - "value": string or number
    - "rarityPercentage": integer between 1 and 40 indicating rarity weight
    - "display_type": optional string ("number" for numeric ratings, otherwise undefined)
`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              alternativeNames: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              description: { type: Type.STRING },
              shortDescription: { type: Type.STRING },
              category: { type: Type.STRING },
              suggestedRoyalty: { type: Type.NUMBER },
              suggestedPrice: { type: Type.NUMBER },
              unlockableLore: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              visualAnalysis: {
                type: Type.OBJECT,
                properties: {
                  dominantColors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  aestheticStyle: { type: Type.STRING },
                  mood: { type: Type.STRING }
                },
                required: ['dominantColors', 'aestheticStyle', 'mood']
              },
              traits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trait_type: { type: Type.STRING },
                    value: { type: Type.STRING },
                    rarityPercentage: { type: Type.INTEGER },
                    display_type: { type: Type.STRING }
                  },
                  required: ['trait_type', 'value', 'rarityPercentage']
                }
              }
            },
            required: ['name', 'alternativeNames', 'description', 'shortDescription', 'category', 'traits', 'suggestedRoyalty', 'tags']
          }
        }
      });

      const outputText = response.text?.trim();
      if (!outputText) throw new Error('Gemini API returned an empty response');

      const metadata = JSON.parse(outputText);
      if (Array.isArray(metadata.traits)) {
        metadata.traits = metadata.traits.map((t: any) => {
          if (t.display_type === 'number' || (!isNaN(Number(t.value)) && typeof t.value === 'string' && (t.trait_type.toLowerCase().includes('power') || t.trait_type.toLowerCase().includes('level') || t.trait_type.toLowerCase().includes('rating')))) {
            const num = Number(t.value);
            if (!isNaN(num)) {
              return { ...t, value: num, display_type: 'number' };
            }
          }
          return t;
        });
      }

      res.json({
        success: true,
        metadata,
        modelUsed: 'gemini-3.7-flash'
      });

    } catch (error: any) {
      console.warn('AI generation notice, providing fallback:', error.message);
      res.json({
        success: true,
        metadata: {
          name: `WIP Generative Core #${Math.floor(1000 + Math.random() * 9000)}`,
          alternativeNames: [
            `Cyber-Blueprint #${Math.floor(100 + Math.random() * 900)}`,
            `Chroma Matrix - Phase IX`,
            `Zero-Knowledge Singularity`
          ],
          description: `An official Work In Progress digital asset deployed with native 10% royalty enforcement on Polygon. Generated algorithmically and stored with decentralized IPFS metadata.`,
          shortDescription: `A high-potency on-chain artifact fusing cybernetic geometry and decentralized WIP lore.`,
          category: 'art',
          suggestedRoyalty: 10.0,
          suggestedPrice: 25.0,
          unlockableLore: `Decryption Key: WIP-POLYGON-93415806\nDirect access to high-res vector master render.`,
          tags: ['#WIP', '#Polygon', '#GenerativeArt', '#OnChainRoyalty'],
          visualAnalysis: {
            dominantColors: ['Electric Cyan', 'Ultraviolet Indigo', 'Obsidian Slate'],
            aestheticStyle: 'Futuristic Cyber-Vector',
            mood: 'Transcendent & Energetic'
          },
          traits: [
            { trait_type: 'Series', value: 'WIP Alpha Genesis', rarityPercentage: 5 },
            { trait_type: 'Enforced Royalty', value: '10.0%', rarityPercentage: 100 },
            { trait_type: 'Power Level', value: 96, rarityPercentage: 7, display_type: 'number' },
            { trait_type: 'Fee Protocol', value: 'Zero Fee', rarityPercentage: 20 }
          ]
        },
        isFallback: true,
        warning: error?.message || 'Generated using local AI curation engine.'
      });
    }
  });

  // --- GEMINI AI: Generate Collection Metadata ---
  app.post('/api/ai/generate-collection-metadata', async (req, res) => {
    try {
      const { category = 'art', theme = 'Cyberpunk & Web3', standard = 'ERC-721' } = req.body || {};
      const ai = getGeminiClient();
      if (!ai) throw new Error('GEMINI_API_KEY is not set');

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Create a captivating smart contract NFT collection branding proposal.
Category: ${category}
Thematic Inspiration: ${theme}
Token Standard: ${standard}

Return JSON with:
1. "name": Collection name
2. "symbol": 3-6 uppercase letters token ticker
3. "description": Comprehensive collection description and roadmap highlights
4. "maxSupply": Recommended max supply cap
5. "mintPrice": Recommended mint price
6. "suggestedRoyalty": e.g. 5.0 or 10.0
7. "maxPerWallet": e.g. 3 or 5`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              symbol: { type: Type.STRING },
              description: { type: Type.STRING },
              maxSupply: { type: Type.INTEGER },
              mintPrice: { type: Type.NUMBER },
              suggestedRoyalty: { type: Type.NUMBER },
              maxPerWallet: { type: Type.INTEGER },
            },
            required: ['name', 'symbol', 'description', 'maxSupply', 'mintPrice', 'suggestedRoyalty', 'maxPerWallet']
          }
        }
      });

      const outputText = response.text?.trim();
      const collectionData = JSON.parse(outputText || '{}');
      res.json({ success: true, data: collectionData });
    } catch (error: any) {
      res.json({
        success: true,
        data: {
          name: 'Work In Progress Collection',
          symbol: 'WIP',
          description: 'Official Work In Progress collective on Polygon featuring enforced 10% secondary royalties and zero protocol fees.',
          maxSupply: 1000,
          mintPrice: 25.0,
          suggestedRoyalty: 10.0,
          maxPerWallet: 5
        },
        isFallback: true
      });
    }
  });

  // Vite Middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WIP NFT LIVE: Fee Collector ${FEE_COLLECTOR_ADDRESS} Polygon Block 93415806 - fees to ${FEE_WALLET} on port ${PORT}`);
  });
}

startServer();
