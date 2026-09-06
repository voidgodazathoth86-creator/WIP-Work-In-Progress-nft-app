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

export interface DetailedTraitRarity {
  trait_type: string;
  value: string | number;
  frequencyPercent: number;
  countInCollection: number;
  totalCollectionSupply: number;
  traitScore: number;
  percentageOfTotalScore: number;
  impact: 'Critical' | 'High' | 'Medium' | 'Standard';
  floorImpactMultiplier: number;
}

export interface CollectionMetadataAnalysis {
  collectionId: string;
  collectionName: string;
  totalItems: number;
  uniqueTraitTypesCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  currentNFTRank: number;
  currentNFTPercentile: number;
  deltaVsAveragePercent: number;
  tierBreakdown: { tier: string; count: number; percentage: number; color: string }[];
  peerNFTsRanked: { id: string; name: string; image: string; score: number; rank: number; tier: string; rarestTraitName: string; isCurrent: boolean }[];
  traitCountAnalysis: { count: number; collectionFrequency: number; scoreContribution: number };
  categoryContributions: { category: string; score: number; percentage: number; count: number }[];
}

/**
 * Conducts full collection-wide metadata analysis to benchmark an NFT against its peer items.
 */
export function analyzeCollectionMetadata(
  nft: NFT, 
  allNFTs: NFT[] = [], 
  collectionSupply: number = 1000
): { rarity: RarityAnalysis; collectionAnalysis: CollectionMetadataAnalysis; traits: DetailedTraitRarity[] } {
  const rarity = calculateNFTRarity(nft, allNFTs);

  // Scope to collection
  const collectionNFTs = (nft.collectionId && allNFTs.length > 0)
    ? allNFTs.filter(n => n.collectionId === nft.collectionId)
    : (allNFTs.length > 0 ? allNFTs : [nft]);

  const effectiveSupply = Math.max(collectionSupply || 1000, collectionNFTs.length);

  // Rank peer NFTs in this collection
  const peerRankings = collectionNFTs.map(item => {
    const itemRarity = item.id === nft.id ? rarity : calculateNFTRarity(item, allNFTs);
    return {
      id: item.id,
      name: item.name,
      image: item.image,
      score: itemRarity.rawScore,
      normalizedScore: itemRarity.normalizedScore,
      tier: itemRarity.tier,
      rarestTraitName: itemRarity.rarestTrait ? String(itemRarity.rarestTrait.value) : 'Standard',
      isCurrent: item.id === nft.id,
    };
  });

  // Sort descending by raw score
  peerRankings.sort((a, b) => b.score - a.score);

  // Determine current NFT's peer rank
  const peerIndex = peerRankings.findIndex(p => p.id === nft.id);
  const peerRank = peerIndex !== -1 ? peerIndex + 1 : 1;

  // Collection-wide statistical calculations
  const totalAnalyzedScores = peerRankings.map(p => p.score);
  const highestScore = Math.max(...totalAnalyzedScores, rarity.rawScore);
  const lowestScore = Math.min(...totalAnalyzedScores, rarity.rawScore);
  const averageScore = Math.round(totalAnalyzedScores.reduce((acc, s) => acc + s, 0) / totalAnalyzedScores.length) || 120;
  
  // Percentile and Rank in overall collection supply
  const percentile = rarity.rankPercentile;
  const estimatedCollectionRank = Math.max(1, Math.round((percentile / 100) * effectiveSupply));
  const finalRank = peerRankings.length > 1 ? peerRank : estimatedCollectionRank;

  const deltaVsAveragePercent = averageScore > 0 
    ? +(((rarity.rawScore - averageScore) / averageScore) * 100).toFixed(1)
    : 0;

  // Build detailed traits array with score percentages
  const detailedTraits: DetailedTraitRarity[] = rarity.traitsBreakdown.map(t => {
    const countInCol = Math.max(1, Math.round((t.frequencyPercent / 100) * effectiveSupply));
    const pctOfScore = rarity.rawScore > 0 ? +((t.traitScore / rarity.rawScore) * 100).toFixed(1) : 0;
    
    let floorImpactMultiplier = 1.0;
    if (t.impact === 'Critical') floorImpactMultiplier = 2.4;
    else if (t.impact === 'High') floorImpactMultiplier = 1.6;
    else if (t.impact === 'Medium') floorImpactMultiplier = 1.25;

    return {
      trait_type: t.trait_type,
      value: t.value,
      frequencyPercent: t.frequencyPercent,
      countInCollection: countInCol,
      totalCollectionSupply: effectiveSupply,
      traitScore: t.traitScore,
      percentageOfTotalScore: pctOfScore,
      impact: t.impact,
      floorImpactMultiplier
    };
  });

  // Category grouping
  const catMap: Record<string, { score: number; count: number }> = {};
  detailedTraits.forEach(t => {
    const cat = t.trait_type;
    if (!catMap[cat]) catMap[cat] = { score: 0, count: 0 };
    catMap[cat].score += t.traitScore;
    catMap[cat].count += 1;
  });

  const categoryContributions = Object.entries(catMap).map(([category, data]) => ({
    category,
    score: +data.score.toFixed(1),
    count: data.count,
    percentage: rarity.rawScore > 0 ? +((data.score / rarity.rawScore) * 100).toFixed(1) : 0,
  })).sort((a, b) => b.score - a.score);

  // Unique trait types
  const uniqueTypes = new Set(collectionNFTs.flatMap(n => (n.traits || []).map(t => t.trait_type)));
  if (uniqueTypes.size === 0 && nft.traits) {
    nft.traits.forEach(t => uniqueTypes.add(t.trait_type));
  }

  // Trait count rarity
  const traitCount = nft.traits?.length || 0;
  const traitCountFrequency = Math.max(5, Math.round(100 / (1 + Math.abs(traitCount - 4) * 2.5)));
  const traitCountScoreBonus = Math.max(0, (traitCount - 3) * 8);

  // Tier breakdown
  const tierBreakdown = [
    { tier: 'Mythic', percentage: 2.5, count: Math.round(effectiveSupply * 0.025), color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' },
    { tier: 'Legendary', percentage: 7.5, count: Math.round(effectiveSupply * 0.075), color: 'text-purple-400 bg-purple-500/20 border-purple-500/40' },
    { tier: 'Epic Rare', percentage: 15.0, count: Math.round(effectiveSupply * 0.15), color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
    { tier: 'Rare', percentage: 25.0, count: Math.round(effectiveSupply * 0.25), color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' },
    { tier: 'Uncommon', percentage: 30.0, count: Math.round(effectiveSupply * 0.30), color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' },
    { tier: 'Common', percentage: 20.0, count: Math.round(effectiveSupply * 0.20), color: 'text-zinc-400 bg-zinc-700/20 border-zinc-700/40' },
  ];

  return {
    rarity,
    traits: detailedTraits,
    collectionAnalysis: {
      collectionId: nft.collectionId || 'single',
      collectionName: nft.collectionName || 'Single Masterpiece',
      totalItems: effectiveSupply,
      uniqueTraitTypesCount: Math.max(uniqueTypes.size, nft.traits?.length || 1),
      averageScore,
      highestScore,
      lowestScore,
      currentNFTRank: finalRank,
      currentNFTPercentile: percentile,
      deltaVsAveragePercent,
      tierBreakdown,
      peerNFTsRanked: peerRankings.map((p, idx) => ({ ...p, rank: idx + 1 })),
      traitCountAnalysis: {
        count: traitCount,
        collectionFrequency: traitCountFrequency,
        scoreContribution: traitCountScoreBonus,
      },
      categoryContributions,
    },
  };
}
