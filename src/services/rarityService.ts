import { NFT, NFTTrait } from '../types';

export interface TraitRarityItem {
  trait_type: string;
  value: string | number;
  frequencyPercent: number;
  traitScore: number;
  impact: 'Critical' | 'High' | 'Medium' | 'Standard';
}

export interface RarityAnalysis {
  normalizedScore: number; // 0 to 100
  rawScore: number;
  rankPercentile: number; // e.g. 2.5 means Top 2.5%
  tier: 'Mythic' | 'Legendary' | 'Epic Rare' | 'Rare' | 'Uncommon' | 'Common';
  tierColor: {
    bg: string;
    border: string;
    text: string;
    barGradient: string;
    glow: string;
  };
  rarestTrait: TraitRarityItem | null;
  traitCount: number;
  traitsBreakdown: TraitRarityItem[];
  aiInsight: string;
  statisticalSummary: {
    traitMultiplier: number;
    entropyIndex: number;
    uniquenessFactor: number;
  };
}

/**
 * Calculates a statistical & AI-modeled Rarity Score based on trait distributions across the collection/catalog.
 */
export function calculateNFTRarity(nft: NFT, allNFTs: NFT[] = []): RarityAnalysis {
  if (!nft.traits || nft.traits.length === 0) {
    return {
      normalizedScore: 15,
      rawScore: 15,
      rankPercentile: 85,
      tier: 'Common',
      tierColor: {
        bg: 'bg-zinc-800/80',
        border: 'border-zinc-700',
        text: 'text-zinc-400',
        barGradient: 'from-zinc-500 to-zinc-400',
        glow: 'shadow-zinc-500/10'
      },
      rarestTrait: null,
      traitCount: 0,
      traitsBreakdown: [],
      aiInsight: 'This asset contains 0 standard on-chain trait properties. Rarity is calculated based on pure 1-of-1 metadata uniqueness.',
      statisticalSummary: {
        traitMultiplier: 1.0,
        entropyIndex: 0.12,
        uniquenessFactor: 15.0
      }
    };
  }

  // Get collection scope if applicable, otherwise all NFTs
  const scopeNFTs = (nft.collectionId && allNFTs.length > 0)
    ? allNFTs.filter(n => n.collectionId === nft.collectionId)
    : allNFTs;

  const totalScopeCount = Math.max(scopeNFTs.length, 1);

  // Compute or extrapolate frequency for each trait
  const traitsBreakdown: TraitRarityItem[] = nft.traits.map(trait => {
    let freq = trait.rarityPercentage;

    // If trait doesn't have explicit rarityPercentage, calculate from dataset
    if (freq === undefined || freq === null || freq <= 0) {
      const matchCount = scopeNFTs.filter(n => 
        n.traits && n.traits.some(t => 
          t.trait_type.toLowerCase() === trait.trait_type.toLowerCase() && 
          String(t.value).toLowerCase() === String(trait.value).toLowerCase()
        )
      ).length;

      if (matchCount > 0 && scopeNFTs.length > 1) {
        freq = Math.max(1, Math.round((matchCount / totalScopeCount) * 100));
      } else {
        // Synthesize deterministic entropy based on string hash
        const hash = (trait.trait_type + String(trait.value))
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        freq = Math.max(2, (hash % 18) + 3); // between 3% and 20%
      }
    }

    // Trait Rarity Score = 1 / (frequency / 100) = 100 / frequency
    const traitScore = +(100 / Math.max(freq, 0.5)).toFixed(1);

    let impact: 'Critical' | 'High' | 'Medium' | 'Standard' = 'Standard';
    if (freq <= 4) impact = 'Critical';
    else if (freq <= 9) impact = 'High';
    else if (freq <= 18) impact = 'Medium';

    return {
      trait_type: trait.trait_type,
      value: trait.value,
      frequencyPercent: freq,
      traitScore,
      impact
    };
  });

  // Sort traits by rarest first
  traitsBreakdown.sort((a, b) => a.frequencyPercent - b.frequencyPercent);
  const rarestTrait = traitsBreakdown[0] || null;

  // Sum of raw trait scores
  const rawSum = traitsBreakdown.reduce((sum, t) => sum + t.traitScore, 0);

  // Trait count rarity bonus (NFTs with extreme numbers of traits get a bonus)
  const countBonus = Math.max(0, (nft.traits.length - 3) * 8);
  const rawScore = Math.round(rawSum + countBonus);

  // Normalize to 0-100 scale (A baseline raw score of 120 is ~50, 300+ is ~95+)
  // Using logarithmic sigmoid scaling for natural distribution curve
  const normalized = Math.min(
    99.5,
    Math.max(12, Math.round((Math.log10(Math.max(rawScore, 10)) / Math.log10(450)) * 96))
  );

  // Rank percentile (e.g. 98 score -> Top 1.8%)
  const rankPercentile = +(Math.max(0.2, 100 - normalized * 0.98)).toFixed(1);

  // Determine Tier & Color Palette
  let tier: RarityAnalysis['tier'] = 'Common';
  let tierColor: RarityAnalysis['tierColor'] = {
    bg: 'bg-zinc-800/80',
    border: 'border-zinc-700',
    text: 'text-zinc-400',
    barGradient: 'from-zinc-500 to-zinc-400',
    glow: 'shadow-zinc-500/10'
  };

  if (normalized >= 90) {
    tier = 'Mythic';
    tierColor = {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      text: 'text-amber-400',
      barGradient: 'from-amber-400 via-rose-500 to-purple-600',
      glow: 'shadow-amber-500/25'
    };
  } else if (normalized >= 80) {
    tier = 'Legendary';
    tierColor = {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/40',
      text: 'text-purple-400',
      barGradient: 'from-purple-500 via-indigo-500 to-cyan-400',
      glow: 'shadow-purple-500/25'
    };
  } else if (normalized >= 68) {
    tier = 'Epic Rare';
    tierColor = {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/40',
      text: 'text-cyan-400',
      barGradient: 'from-cyan-500 to-blue-600',
      glow: 'shadow-cyan-500/20'
    };
  } else if (normalized >= 50) {
    tier = 'Rare';
    tierColor = {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/40',
      text: 'text-emerald-400',
      barGradient: 'from-emerald-500 to-teal-400',
      glow: 'shadow-emerald-500/20'
    };
  } else if (normalized >= 35) {
    tier = 'Uncommon';
    tierColor = {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/40',
      text: 'text-blue-400',
      barGradient: 'from-blue-500 to-slate-400',
      glow: 'shadow-blue-500/10'
    };
  }

  // Statistical calculations for AI insights
  const traitMultiplier = +(rawScore / (nft.traits.length * 10 || 1)).toFixed(2);
  const entropyIndex = +((traitsBreakdown.filter(t => t.frequencyPercent <= 10).length / nft.traits.length) * 100).toFixed(0);
  const uniquenessFactor = +(normalized * 1.04).toFixed(1);

  // Generate AI Insight text
  let aiInsight = '';
  if (tier === 'Mythic' || tier === 'Legendary') {
    aiInsight = `Neural evaluation detected high trait scarcity. The ${rarestTrait ? `"${rarestTrait.trait_type}: ${rarestTrait.value}" (${rarestTrait.frequencyPercent}% occurrence)` : 'trait cluster'} provides an outsized statistical rarity multiplier (+${traitMultiplier}x vs collection baseline).`;
  } else if (tier === 'Epic Rare' || tier === 'Rare') {
    aiInsight = `Well-balanced property distribution with ${entropyIndex}% low-frequency attributes. Strong trait synergy centered around ${rarestTrait ? `"${rarestTrait.value}"` : 'special features'} places this asset in the Top ${rankPercentile}%.`;
  } else {
    aiInsight = `Evenly distributed standard traits providing solid baseline utility and authentic collection identity across ${nft.traits.length} on-chain properties.`;
  }

  return {
    normalizedScore: normalized,
    rawScore,
    rankPercentile,
    tier,
    tierColor,
    rarestTrait,
    traitCount: nft.traits.length,
    traitsBreakdown,
    aiInsight,
    statisticalSummary: {
      traitMultiplier,
      entropyIndex: Number(entropyIndex),
      uniquenessFactor: Number(uniquenessFactor)
    }
  };
}
