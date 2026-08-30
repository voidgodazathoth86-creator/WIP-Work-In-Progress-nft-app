import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Support larger payload sizes for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy/Safe Gemini AI Client Initializer
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

/**
 * POST /api/ai/generate-metadata
 * Analyzes uploaded or generative NFT artwork and generates comprehensive OpenSea/EIP-721 metadata:
 * Name, alternative titles, narrative description, traits, lore, and pricing guidance.
 */
app.post('/api/ai/generate-metadata', async (req, res) => {
  try {
    const { 
      imageData, 
      styleHint = 'Cyberpunk / Futuristic', 
      tone = 'Epic & Narrative', 
      userContext = '',
      standard = 'ERC-721',
      chainName = 'Ethereum'
    } = req.body;

    const ai = getGeminiClient();

    // Prepare content parts for Gemini 3.7 Flash multimodal reasoning
    const parts: any[] = [];

    // Parse image if provided
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
          // Decode URL encoded or raw SVG
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
2. "alternativeNames": 3 distinct alternative name concepts with varying creative angles (e.g. one mysterious, one technical/cybernetic, one mythological).
3. "description": A rich, vivid narrative description (2-3 paragraphs) capturing the visual composition, world-building lore, aesthetic elements, and emotional mood of the piece.
4. "shortDescription": A punchy 1-2 sentence preview suitable for mobile marketplace cards.
5. "category": The best fitting category among ["art", "gaming", "pfp", "photography", "music", "metaverse", "utility"].
6. "suggestedRoyalty": An optimal secondary creator royalty percentage between 2.5 and 10.0 (e.g. 7.5).
7. "suggestedPrice": A reasonable mint price recommendation (e.g. 0.05 to 0.5).
8. "unlockableLore": Secret, immersive collector lore or access notes intended for the exclusive unlockable content section.
9. "tags": An array of 4-6 search tags prefixed with '#' (e.g. ["#GenerativeArt", "#Cyberpunk", "#Mythic", "#Ethereum"]).
10. "visualAnalysis": An object detailing:
    - "dominantColors": Array of 3-4 descriptive color names (e.g. ["Neon Cyan", "Obsidian Black", "Prismatic Purple"])
    - "aestheticStyle": e.g. "Hyper-detailed Cyberpunk Vector"
    - "mood": e.g. "Enigmatic, Electric, Transcendental"
11. "traits": An array of 4-6 structured traits/attributes adhering to standard OpenSea metadata format. Each trait must have:
    - "trait_type": string (e.g. "Rarity Tier", "Archetype", "Elemental Core", "Power Rating", "Aura", "Augmentation", "Chroma Matrix")
    - "value": string or number (e.g. "Mythic", "Void Stalker", "Quantum Plasma", 94)
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
            name: { type: Type.STRING, description: 'Primary NFT name' },
            alternativeNames: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 alternative creative title choices'
            },
            description: { type: Type.STRING, description: 'Rich narrative lore and visual description' },
            shortDescription: { type: Type.STRING, description: '1-2 sentence preview' },
            category: { type: Type.STRING, description: 'NFT category' },
            suggestedRoyalty: { type: Type.NUMBER, description: 'Suggested secondary royalty %' },
            suggestedPrice: { type: Type.NUMBER, description: 'Suggested mint price' },
            unlockableLore: { type: Type.STRING, description: 'Secret lore for unlockable content' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Hashtag keywords'
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
    if (!outputText) {
      throw new Error('Gemini API returned an empty response');
    }

    const metadata = JSON.parse(outputText);

    // Format traits to convert numeric strings to actual numbers if display_type is number
    if (Array.isArray(metadata.traits)) {
      metadata.traits = metadata.traits.map((t: any) => {
        if (t.display_type === 'number' || (!isNaN(Number(t.value)) && typeof t.value === 'string' && t.trait_type.toLowerCase().includes('power') || t.trait_type.toLowerCase().includes('level') || t.trait_type.toLowerCase().includes('rating'))) {
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
    console.error('Error generating NFT metadata:', error);
    
    // Provide a resilient fallback so the user can still test in offline/mock environments
    const fallbackMetadata = {
      name: `CyberMatrix Vanguard #${Math.floor(1000 + Math.random() * 9000)}`,
      alternativeNames: [
        `Neo-Genesis Sentinel #${Math.floor(100 + Math.random() * 900)}`,
        `Void Walker - Phase VII`,
        `Quantum Singularity Resonance`
      ],
      description: `Forged in the decentralized nexus, this digital asset bridges quantum harmonics and generative cybernetics. Rendered with high-precision vector illumination, the composition embodies an untamed frontier of on-chain artistic discovery.`,
      shortDescription: `A high-potency on-chain artifact fusing cybernetic geometry and decentralized lore.`,
      category: 'art',
      suggestedRoyalty: 7.5,
      suggestedPrice: 0.08,
      unlockableLore: `Decryption Key: NEXUS-AURORA-7749\nAccess the master 8K render and VIP Discord role via our verified holder gateway.`,
      tags: ['#Cyberpunk', '#GenerativeArt', '#OnChain', '#MythicTier'],
      visualAnalysis: {
        dominantColors: ['Cyber Cyan', 'Electric Indigo', 'Obsidian Slate'],
        aestheticStyle: 'Futuristic Cyber-Vector',
        mood: 'Transcendent & Energetic'
      },
      traits: [
        { trait_type: 'Rarity Tier', value: 'Mythic', rarityPercentage: 4 },
        { trait_type: 'Archetype', value: 'Cyber Vanguard', rarityPercentage: 12 },
        { trait_type: 'Elemental Core', value: 'Quantum Plasma', rarityPercentage: 8 },
        { trait_type: 'Power Level', value: 95, rarityPercentage: 6, display_type: 'number' },
        { trait_type: 'Chroma Matrix', value: 'Neon Obsidian', rarityPercentage: 15 }
      ]
    };

    res.json({
      success: true,
      metadata: fallbackMetadata,
      isFallback: true,
      warning: error?.message || 'Generated using local AI curation engine.'
    });
  }
});

/**
 * POST /api/ai/generate-collection-metadata
 * Generates smart contract collection identity (name, ticker symbol, lore, roadmap, supply).
 */
app.post('/api/ai/generate-collection-metadata', async (req, res) => {
  try {
    const { category = 'art', theme = 'Cyberpunk & Web3', standard = 'ERC-721' } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `Create a captivating smart contract NFT collection branding proposal.
Category: ${category}
Thematic Inspiration: ${theme}
Token Standard: ${standard}

Return JSON with:
1. "name": Collection name (e.g. "Aetheria Sentinels")
2. "symbol": 3-6 uppercase letters token ticker (e.g. "AETH")
3. "description": Comprehensive collection description and roadmap highlights
4. "maxSupply": Recommended max supply cap (e.g. 3333, 5000, 10000)
5. "mintPrice": Recommended mint price in ETH/SOL (e.g. 0.04)
6. "suggestedRoyalty": e.g. 5.0 or 7.5
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

    res.json({
      success: true,
      data: collectionData
    });
  } catch (error: any) {
    console.error('Error generating collection metadata:', error);
    res.json({
      success: true,
      data: {
        name: 'Nexus Genesis Protocol',
        symbol: 'NEXUS',
        description: 'An elite decentralized collective of generative digital assets deployed with native on-chain EIP-2981 royalties.',
        maxSupply: 3333,
        mintPrice: 0.05,
        suggestedRoyalty: 7.5,
        maxPerWallet: 5
      },
      isFallback: true
    });
  }
});

// Vite Middleware for development vs Static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Web3 Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
