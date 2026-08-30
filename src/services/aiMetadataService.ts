import { AIMetadataSuggestion, AICollectionSuggestion, TokenStandard, BlockchainNetwork } from '../types';

export interface GenerateMetadataParams {
  imageData?: string;
  styleHint?: string;
  tone?: string;
  userContext?: string;
  standard?: TokenStandard;
  chainName?: string;
}

export async function requestAIMetadata(params: GenerateMetadataParams): Promise<{
  success: boolean;
  metadata?: AIMetadataSuggestion;
  error?: string;
  isFallback?: boolean;
  warning?: string;
}> {
  try {
    const response = await fetch('/api/ai/generate-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.metadata) {
      throw new Error(data.error || 'Failed to generate metadata');
    }

    return {
      success: true,
      metadata: data.metadata,
      isFallback: data.isFallback,
      warning: data.warning,
    };
  } catch (err: any) {
    console.warn('AI metadata request encountered issue, falling back to local creative synthesis:', err);
    
    // Client-side fallback if server is unreachable
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const fallback: AIMetadataSuggestion = {
      name: `CyberMatrix Vanguard #${randomId}`,
      alternativeNames: [
        `Neo-Genesis Sentinel #${randomId}`,
        `Prismatic Singularity #${Math.floor(randomId / 10)}`,
        `Void Sovereign Phase VII`
      ],
      description: `Forged at the intersection of on-chain digital craftsmanship and generative cybernetics. This asset commands high-frequency luminescence and immutable decentralized provenance, embodying the vanguard of digital aesthetics.`,
      shortDescription: `An on-chain generative artifact fusing cybernetic geometry and decentralized lore.`,
      category: 'art',
      suggestedRoyalty: 7.5,
      suggestedPrice: 0.08,
      unlockableLore: `Decryption Token: NEXUS-${randomId}-AURORA\nMaster 8K lossless render package and VIP Discord channel access unlocked for verified token holders.`,
      tags: ['#Cyberpunk', '#Generative', '#CrossChain', '#MythicTier', '#Nexus'],
      visualAnalysis: {
        dominantColors: ['Cyber Cyan', 'Electric Violet', 'Obsidian Slate'],
        aestheticStyle: params.styleHint || 'Cyberpunk High-Tech Vector',
        mood: 'Enigmatic, Electric, Transcendental'
      },
      traits: [
        { trait_type: 'Rarity Tier', value: 'Mythic', rarityPercentage: 4 },
        { trait_type: 'Archetype', value: 'Cyber Vanguard', rarityPercentage: 12 },
        { trait_type: 'Elemental Core', value: 'Quantum Plasma', rarityPercentage: 8 },
        { trait_type: 'Power Rating', value: 96, rarityPercentage: 5, display_type: 'number' },
        { trait_type: 'Chroma Matrix', value: 'Neon Obsidian', rarityPercentage: 15 }
      ]
    };

    return {
      success: true,
      metadata: fallback,
      isFallback: true,
      warning: err?.message || 'Generated using client fallback engine.'
    };
  }
}

export async function requestAICollectionBranding(params: {
  category?: string;
  theme?: string;
  standard?: TokenStandard;
}): Promise<{
  success: boolean;
  data?: AICollectionSuggestion;
  error?: string;
}> {
  try {
    const response = await fetch('/api/ai/generate-collection-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const resData = await response.json();
    return {
      success: true,
      data: resData.data,
    };
  } catch (err: any) {
    return {
      success: true,
      data: {
        name: 'Nexus Genesis Protocol',
        symbol: 'NEXUS',
        description: 'An elite decentralized collective of generative digital assets deployed with native on-chain EIP-2981 royalties.',
        maxSupply: 3333,
        mintPrice: 0.05,
        suggestedRoyalty: 7.5,
        maxPerWallet: 5,
      },
    };
  }
}
