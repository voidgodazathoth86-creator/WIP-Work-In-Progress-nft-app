import { 
  BlockchainNetwork, 
  BridgeProtocol, 
  BridgeProtocolInfo, 
  BridgeQuote, 
  BridgeStandard, 
  BridgeTransaction, 
  NFT 
} from '../types';
import { SUPPORTED_CHAINS } from '../data/chains';

export const BRIDGE_PROTOCOLS: Record<BridgeProtocol, BridgeProtocolInfo> = {
  'layerzero': {
    id: 'layerzero',
    name: 'LayerZero V2',
    shortName: 'LayerZero',
    version: 'v2.1.0',
    icon: '⚡',
    color: '#000000',
    badgeBg: 'bg-zinc-800 border-zinc-700 text-zinc-200',
    badgeText: 'text-zinc-300',
    description: 'Omnichain Interoperability Protocol with Decentralized Verifier Networks (DVN) and ONFT-721 native token standard.',
    securityModel: 'DVN Quorum (LayerZero Labs + Google Cloud DVN + Polyhedra)',
    relayerType: 'LayerZero Executor & Ultra-Light Endpoint V2',
    baseFeeUsd: 2.45,
    avgTimeSeconds: 22,
    securityRating: 'Enterprise Tier 1',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'base', 'avalanche', 'bsc', 'solana'],
  },
  'chainlink-ccip': {
    id: 'chainlink-ccip',
    name: 'Chainlink CCIP',
    shortName: 'CCIP',
    version: 'v1.5.1',
    icon: '⬡',
    color: '#375BD2',
    badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    badgeText: 'text-blue-400',
    description: 'Level-5 Cross-Chain Security backed by Independent Risk Management Network (RMN) and Decentralized Oracle Networks.',
    securityModel: 'Risk Management Network (RMN) Active Anomaly Detection + DON Consensus',
    relayerType: 'Chainlink Off-Ramp & Committer Decentralized Oracles',
    baseFeeUsd: 3.80,
    avgTimeSeconds: 45,
    securityRating: 'Maximum Security (RMN)',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'base', 'avalanche', 'bsc'],
  },
  'wormhole': {
    id: 'wormhole',
    name: 'Wormhole NTT',
    shortName: 'Wormhole',
    version: 'v3.0.4',
    icon: '🌀',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    badgeText: 'text-purple-400',
    description: 'Guardian Network attestation with Native Token Transfers (NTT) and cross-chain Verified Action Approvals (VAAs).',
    securityModel: '19-Guardian Multi-Validator Quorum Attestation',
    relayerType: 'Wormhole Specialized Relayer & Core Bridge Contract',
    baseFeeUsd: 2.85,
    avgTimeSeconds: 30,
    securityRating: 'Multi-Institutional 19-of-19',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'base', 'solana', 'avalanche', 'bsc'],
  },
  'hyperlane': {
    id: 'hyperlane',
    name: 'Hyperlane Modular',
    shortName: 'Hyperlane',
    version: 'v3.2.0',
    icon: '💠',
    color: '#06B6D4',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    badgeText: 'text-cyan-400',
    description: 'Modular Interchain Security Modules (ISMs) with permissionless mailboxes and customizable validation hooks.',
    securityModel: 'Multisig Interchain Security Module (ISM)',
    relayerType: 'Hyperlane Mailbox & Relayer Agent',
    baseFeeUsd: 2.10,
    avgTimeSeconds: 20,
    securityRating: 'Modular Configurable ISM',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'base', 'avalanche', 'bsc'],
  }
};

export const PROTOCOL_LIST: BridgeProtocolInfo[] = Object.values(BRIDGE_PROTOCOLS);

// Cross-chain bridge estimated times (matrix between chains)
export const getEstimatedTransitTime = (
  source: BlockchainNetwork, 
  destination: BlockchainNetwork, 
  protocol: BridgeProtocol
): number => {
  let baseSeconds = BRIDGE_PROTOCOLS[protocol].avgTimeSeconds;
  
  // Ethereum L1 takes longer due to block finality
  if (source === 'ethereum' || destination === 'ethereum') {
    baseSeconds += 40;
  }
  // L2 to L2 (e.g. Arbitrum <-> Base) is super fast
  if ((source === 'arbitrum' || source === 'base' || source === 'polygon') && 
      (destination === 'arbitrum' || destination === 'base' || destination === 'polygon')) {
    baseSeconds = Math.max(12, baseSeconds - 8);
  }
  // Solana cross-VM requires additional VAA signature checks
  if (source === 'solana' || destination === 'solana') {
    baseSeconds += 25;
  }

  return baseSeconds;
};

// Required confirmations based on source chain
export const getRequiredConfirmations = (source: BlockchainNetwork): number => {
  switch (source) {
    case 'ethereum': return 12;
    case 'polygon': return 64;
    case 'arbitrum': return 20;
    case 'base': return 20;
    case 'avalanche': return 12;
    case 'bsc': return 15;
    case 'solana': return 32;
    default: return 15;
  }
};

// Calculate Bridge Route Quote
export function calculateBridgeQuote(
  sourceChain: BlockchainNetwork,
  destChain: BlockchainNetwork,
  protocol: BridgeProtocol,
  gasSpeed: 'slow' | 'standard' | 'fast' | 'instant' = 'standard',
  gasDropCrypto: number = 0
): BridgeQuote {
  const sourceConfig = SUPPORTED_CHAINS[sourceChain] || SUPPORTED_CHAINS.ethereum;
  const destConfig = SUPPORTED_CHAINS[destChain] || SUPPORTED_CHAINS.polygon;
  const protoInfo = BRIDGE_PROTOCOLS[protocol];

  // Multiplier for gas speed
  const speedMult = gasSpeed === 'slow' ? 0.85 : gasSpeed === 'standard' ? 1.0 : gasSpeed === 'fast' ? 1.25 : 1.6;

  // Protocol fee
  const protocolFeeUsd = protoInfo.baseFeeUsd * (speedMult > 1 ? 1.1 : 1);
  const protocolFeeCrypto = +(protocolFeeUsd / sourceConfig.usdPrice).toFixed(6);

  // Source gas estimation (approval + lock/burn on bridge gateway ~ 110,000 gas)
  const sourceGasUnits = 110000;
  const sourceGwei = sourceConfig.baseGwei * speedMult;
  const sourceGasCrypto = +( (sourceGasUnits * sourceGwei) / 1e9 ).toFixed(6);
  const sourceGasUsd = +(sourceGasCrypto * sourceConfig.usdPrice).toFixed(2);

  // Relayer gas estimation on destination chain (mint / release ~ 140,000 gas)
  const destGasUnits = 140000;
  const destGwei = destConfig.baseGwei * speedMult;
  const relayerGasCrypto = +( (destGasUnits * destGwei) / 1e9 ).toFixed(6);
  const relayerGasUsd = +(relayerGasCrypto * destConfig.usdPrice).toFixed(2);

  // Gas drop on arrival (converted to USD based on destination token price)
  const gasDropUsd = +(gasDropCrypto * destConfig.usdPrice).toFixed(2);

  // Total cost
  const totalCostUsd = +(protocolFeeUsd + sourceGasUsd + relayerGasUsd + gasDropUsd).toFixed(2);
  const totalCostCrypto = +(sourceGasCrypto + protocolFeeCrypto + (relayerGasUsd / sourceConfig.usdPrice) + (gasDropUsd / sourceConfig.usdPrice)).toFixed(6);

  const estTimeSeconds = getEstimatedTransitTime(sourceChain, destChain, protocol);

  let bridgeStandard: BridgeStandard = 'ONFT-721';
  if (protocol === 'chainlink-ccip') bridgeStandard = 'CCIP-TokenTransfer';
  else if (protocol === 'wormhole') bridgeStandard = 'ONFT-721';
  else if (protocol === 'hyperlane') bridgeStandard = 'Lock & Mint';

  let securityScore = 95;
  let securityNote = 'Enterprise-grade DVN multi-oracle consensus';
  if (protocol === 'chainlink-ccip') {
    securityScore = 99;
    securityNote = 'Independent Risk Management Network (RMN) active watchdog';
  } else if (protocol === 'wormhole') {
    securityScore = 96;
    securityNote = '19-of-19 Guardian decentralized validator attestation';
  } else if (protocol === 'hyperlane') {
    securityScore = 94;
    securityNote = 'Modular Interchain Security Module with application hooks';
  }

  return {
    protocol,
    protocolName: protoInfo.name,
    bridgeStandard,
    estTimeSeconds,
    protocolFeeCrypto,
    protocolFeeUsd,
    sourceGasCrypto,
    sourceGasUsd,
    relayerGasCrypto,
    relayerGasUsd,
    gasDropCrypto,
    gasDropUsd,
    totalCostCrypto,
    totalCostUsd,
    securityScore,
    securityNote,
  };
}

// Generate a random hex string for cross-chain hashes
export function generateRandomHex(length: number = 64): string {
  const chars = '0123456789abcdef';
  let result = '0x';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Generate synthetic destination contract address for bridged NFT
export function getBridgedContractAddress(destChain: BlockchainNetwork, originalContract: string): string {
  const prefix = destChain === 'solana' ? 'OmniSol' : '0xBridge';
  const clean = originalContract.replace('0x', '').slice(0, 8);
  if (destChain === 'solana') {
    return `OmniNFT${clean}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  return `0x${clean}721${Math.random().toString(16).substring(2, 28).padEnd(28, '0')}`;
}

// Initial seed mock bridge transactions for rich history display
export const INITIAL_BRIDGE_TRANSACTIONS: BridgeTransaction[] = [
  {
    id: 'bridge-tx-1001',
    nftId: 'nft-seed-1',
    nftName: 'Cyber Samurai #0842',
    nftImage: 'https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?auto=format&fit=crop&w=800&q=80',
    sourceChain: 'ethereum',
    destinationChain: 'polygon',
    sourceContract: '0x71C8363841F80Db8CC96D0E7e89139d41E79ba41',
    destinationContract: '0x8247E58941F80Db8CC96D0E7e89139d41E79ba01',
    sourceTokenId: '842',
    destinationTokenId: '842',
    senderAddress: '0xDemoWalletCreator000000000000000000001',
    recipientAddress: '0xDemoWalletCreator000000000000000000001',
    protocol: 'layerzero',
    bridgeStandard: 'ONFT-721',
    sourceTxHash: '0x3a4b91f82c4e610d7a8e9102c4b81092e4a8b71029c8e1029384756102938475',
    destinationTxHash: '0x992c4b81092e4a8b71029c8e10293847561029384753a4b91f82c4e610d7a8e',
    messageId: 'LZ-GUID-0x4a2e819b02f9e410b84c9e81',
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
    completedAt: Date.now() - 1000 * 60 * 44,
    status: 'completed',
    step: 4,
    estTimeRemainingSeconds: 0,
    protocolFeeCrypto: 0.0008,
    protocolFeeUsd: 2.54,
    gasRelayFeeCrypto: 0.0005,
    gasRelayFeeUsd: 1.59,
    gasDropCrypto: 5.0,
    gasDropUsd: 3.10,
    securityConfirmations: { current: 12, required: 12 },
    explorerUrlSource: 'https://sepolia.etherscan.io/tx/0x3a4b91f82c4e610d7a8e9102c4b81092e4a8b71029c8e1029384756102938475',
    explorerUrlDest: 'https://amoy.polygonscan.com/tx/0x992c4b81092e4a8b71029c8e10293847561029384753a4b91f82c4e610d7a8e',
  },
  {
    id: 'bridge-tx-1002',
    nftId: 'nft-seed-2',
    nftName: 'Celestial Nebula Orb',
    nftImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    sourceChain: 'arbitrum',
    destinationChain: 'base',
    sourceContract: '0x28A0F03841F80Db8CC96D0E7e89139d41E79ba02',
    destinationContract: '0x0052FF3841F80Db8CC96D0E7e89139d41E79ba03',
    sourceTokenId: '109',
    destinationTokenId: '109',
    senderAddress: '0xDemoWalletCreator000000000000000000001',
    recipientAddress: '0xDemoWalletCreator000000000000000000001',
    protocol: 'chainlink-ccip',
    bridgeStandard: 'CCIP-TokenTransfer',
    sourceTxHash: '0x7b81920394857610293847561029384753a4b91f82c4e610d7a8e9102c4b8109',
    destinationTxHash: '0x10293847561029384753a4b91f82c4e610d7a8e9102c4b81097b819203948576',
    messageId: 'CCIP-MSG-0x98f410a7bc9e1028471928410293',
    timestamp: Date.now() - 1000 * 60 * 180, // 3 hours ago
    completedAt: Date.now() - 1000 * 60 * 179,
    status: 'completed',
    step: 4,
    estTimeRemainingSeconds: 0,
    protocolFeeCrypto: 0.0012,
    protocolFeeUsd: 3.80,
    gasRelayFeeCrypto: 0.0003,
    gasRelayFeeUsd: 0.95,
    securityConfirmations: { current: 20, required: 20 },
    explorerUrlSource: 'https://sepolia.arbiscan.io/tx/0x7b81920394857610293847561029384753a4b91f82c4e610d7a8e9102c4b8109',
    explorerUrlDest: 'https://sepolia.basescan.org/tx/0x10293847561029384753a4b91f82c4e610d7a8e9102c4b81097b819203948576',
  }
];
