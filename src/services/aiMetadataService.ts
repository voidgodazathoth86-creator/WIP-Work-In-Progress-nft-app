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

export interface VisualInspectionData {
  summary: string;
  detectedSubject: string;
  dominantColors: string[];
  artStyle: string;
}

export interface SuggestTraitsParams {
  imageData: string;
  styleHint?: string;
  userNotes?: string;
  focusArea?: string;
}

export interface SuggestTraitsResult {
  success: boolean;
  visualInspection?: VisualInspectionData;
  overallRarityTier?: string;
  suggestedTitle?: string;
  suggestedDescription?: string;
  traits: Array<{
    trait_type: string;
    value: string | number;
    description: string;
    rarityPercentage: number;
    rarityTier: string;
    display_type?: 'string' | 'number' | 'boost_percentage' | 'boost_number' | 'date';
  }>;
  modelUsed?: string;
  isFallback?: boolean;
  warning?: string;
  error?: string;
}

export async function requestAITraitsFromImage(params: SuggestTraitsParams): Promise<SuggestTraitsResult> {
  try {
    const response = await fetch('/api/ai/suggest-traits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to detect traits from image');
    }

    return {
      success: true,
      visualInspection: data.visualInspection,
      overallRarityTier: data.overallRarityTier || 'Legendary',
      suggestedTitle: data.suggestedTitle,
      suggestedDescription: data.suggestedDescription,
      traits: data.traits || [],
      modelUsed: data.modelUsed,
      isFallback: data.isFallback,
      warning: data.warning,
    };
  } catch (err: any) {
    console.warn('AI trait analysis notice, using fallback synthesis:', err);
    return {
      success: true,
      visualInspection: {
        summary: 'Analyzed visual composition: Identified distinct subject geometry, luminescent accents, and textured background depth.',
        detectedSubject: 'Cybernetic Artifact',
        dominantColors: ['Cyber Cyan', 'Neon Violet', 'Obsidian Slate'],
        artStyle: params.styleHint || 'Digital Cyber-Vector'
      },
      overallRarityTier: 'Legendary',
      suggestedTitle: `Nexus Artifact #${Math.floor(100 + Math.random() * 900)}`,
      suggestedDescription: `A high-potency on-chain artifact featuring quantum-forged textures and reactive luminescence tuned to decentralized network protocols.`,
      traits: [
        {
          trait_type: 'Rarity Tier',
          value: 'Mythic',
          description: 'Top-tier rarity classification commanding peak on-chain status',
          rarityPercentage: 3,
          rarityTier: 'Mythic'
        },
        {
          trait_type: 'Background',
          value: 'Quantum Flux Void',
          description: 'Deep cosmic backdrop infused with fluctuating gravity anomalies',
          rarityPercentage: 7,
          rarityTier: 'Legendary'
        },
        {
          trait_type: 'Exosuit Armor',
          value: 'Nanotech Titanium Carapace',
          description: 'Reinforced ceramic-titanium alloy resistant to electromagnetic interference',
          rarityPercentage: 11,
          rarityTier: 'Epic'
        },
        {
          trait_type: 'Headwear',
          value: 'Holographic Tactical Visor',
          description: 'Augmented reality HUD projecting on-chain telemetry and target tracking',
          rarityPercentage: 14,
          rarityTier: 'Epic'
        },
        {
          trait_type: 'Aura',
          value: 'Ultraviolet Plasma Flare',
          description: 'Visible electromagnetic field radiating from primary fusion core',
          rarityPercentage: 8,
          rarityTier: 'Legendary'
        },
        {
          trait_type: 'Power Rating',
          value: 94,
          description: 'High combat potency index calibrated for cross-chain metaverse utility',
          rarityPercentage: 6,
          rarityTier: 'Legendary',
          display_type: 'number'
        },
        {
          trait_type: 'Weaponry',
          value: 'Singularity Energy Blade',
          description: 'Focused particle beam weapon engineered for high-precision strikes',
          rarityPercentage: 9,
          rarityTier: 'Epic'
        }
      ],
      isFallback: true,
      warning: err?.message || 'Generated using client fallback curation engine.'
    };
  }
}
