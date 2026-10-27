import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { 
  X, 
  Droplet, 
  Check, 
  Sparkles, 
  Coins, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '../data/chains';
import { BlockchainNetwork } from '../types';
import confetti from 'canvas-confetti';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaucetModal: React.FC<FaucetModalProps> = ({ isOpen, onClose }) => {
  const { allChains, activeAccount, claimFaucetTokens, activeChain } = useWeb3();
  const [claimingChain, setClaimingChain] = useState<string | null>(null);
  const [claimedChain, setClaimedChain] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaim = async (chainId: BlockchainNetwork) => {
    setClaimingChain(chainId);
    try {
      await claimFaucetTokens(chainId);
      setClaimedChain(chainId);
      confetti({ particleCount: 50, spread: 60 });
      setTimeout(() => setClaimedChain(null), 2500);
    } finally {
      setClaimingChain(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="faucet-dispenser-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Droplet className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Multi-Chain Testnet Faucet</h3>
              <p className="text-[11px] text-zinc-400 font-medium">Instant Test Tokens for Minting & Trading</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-faucet-modal-btn"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-sm text-zinc-300">
            This app does not distribute test tokens. Use the official faucet for the selected test network; no balance will be credited here.
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            Connected account: {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
          </div>
        </div>
        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
