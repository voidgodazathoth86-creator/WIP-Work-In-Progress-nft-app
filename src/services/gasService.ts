import { BlockchainNetwork, GasEstimation, GasTier } from '../types';
import { SUPPORTED_CHAINS } from '../data/chains';

// Realistic Gas units required per action type
export const ACTION_GAS_UNITS = {
  mintSingle: 145000,
  mintCollection: 680000,
  listNft: 45000, // EIP-712 / Approval
  buyNft: 185000,
  transferNft: 65000,
};

export function calculateGasTiers(chainId: BlockchainNetwork, currentBaseGwei: number): GasEstimation {
  const chain = SUPPORTED_CHAINS[chainId];
  const usdPrice = chain.usdPrice;

  // Modifiers per tier
  const slowMultiplier = 0.85;
  const standardMultiplier = 1.0;
  const fastMultiplier = 1.25;
  const instantMultiplier = 1.6;

  const createTier = (
    speed: GasTier['speed'],
    label: string,
    multiplier: number,
    priorityGwei: number,
    estTime: string
  ): GasTier => {
    const baseFee = Math.max(0.01, +(currentBaseGwei * multiplier).toFixed(2));
    const priorityFee = +(priorityGwei).toFixed(2);
    const totalGwei = +(baseFee + priorityFee).toFixed(2);

    let estCostCrypto = 0;
    if (chainId === 'solana') {
      // Solana uses compute unit fee in lamports (1 SOL = 1,000,000,000 lamports)
      // Standard signature fee 5000 lamports + priority micro-lamports
      estCostCrypto = (5000 + totalGwei * 200) / 1e9;
    } else {
      // EVM: Gas Cost = (Gas Units * Total Gwei) / 10^9 ETH
      const typicalGasUnits = ACTION_GAS_UNITS.mintSingle;
      estCostCrypto = (typicalGasUnits * totalGwei) / 1e9;
    }

    const estCostUsd = +(estCostCrypto * usdPrice).toFixed(4);

    return {
      speed,
      label,
      baseFee,
      priorityFee,
      totalGwei,
      estTime,
      estCostCrypto: +estCostCrypto.toFixed(6),
      estCostUsd: Math.max(0.001, estCostUsd),
    };
  };

  const slow = createTier('slow', 'Slow (Eco)', slowMultiplier, currentBaseGwei * 0.05, '~45 sec');
  const standard = createTier('standard', 'Standard', standardMultiplier, currentBaseGwei * 0.1, '~15 sec');
  const fast = createTier('fast', 'Fast (Priority)', fastMultiplier, currentBaseGwei * 0.25, '~5 sec');
  const instant = createTier('instant', 'Instant (Max Speed)', instantMultiplier, currentBaseGwei * 0.5, '~1 sec');

  const calcActionCost = (units: number) => {
    let crypto = 0;
    if (chainId === 'solana') {
      crypto = (5000 + standard.totalGwei * 250) / 1e9;
    } else {
      crypto = (units * standard.totalGwei) / 1e9;
    }
    const usd = +(crypto * usdPrice).toFixed(4);
    return {
      crypto: +crypto.toFixed(6),
      usd: Math.max(0.001, usd),
      gasUnits: units,
    };
  };

  return {
    chainId,
    currentGwei: standard.totalGwei,
    gweiChangePercent: +((Math.random() * 4 - 2)).toFixed(1),
    baseFee: standard.baseFee,
    priorityFee: standard.priorityFee,
    lastUpdated: Date.now(),
    tiers: {
      slow,
      standard,
      fast,
      instant,
    },
    actionsEstimate: {
      mintSingle: calcActionCost(ACTION_GAS_UNITS.mintSingle),
      mintCollection: calcActionCost(ACTION_GAS_UNITS.mintCollection),
      listNft: calcActionCost(ACTION_GAS_UNITS.listNft),
      buyNft: calcActionCost(ACTION_GAS_UNITS.buyNft),
      transferNft: calcActionCost(ACTION_GAS_UNITS.transferNft),
    },
  };
}

export function formatCrypto(val: number, symbol: string): string {
  if (val === 0) return `0 ${symbol}`;
  if (val < 0.0001) return `< 0.0001 ${symbol}`;
  return `${val.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
}

export function formatUsd(val: number): string {
  if (val === 0) return '$0.00';
  if (val < 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
