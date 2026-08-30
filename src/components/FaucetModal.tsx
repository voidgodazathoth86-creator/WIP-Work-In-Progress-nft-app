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

        {/* Faucet Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tokens are automatically deposited to your connected wallet: <strong className="font-mono text-zinc-100">{activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}</strong></span>
          </div>

          <div className="space-y-2.5">
            {allChains.map((chain) => {
              const isClaiming = claimingChain === chain.id;
              const isClaimed = claimedChain === chain.id;
              const balance = activeAccount.balances[chain.id as BlockchainNetwork] || 0;

              return (
                <div
                  key={chain.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{chain.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        {chain.name}
                        <span className="text-[10px] text-zinc-500 font-mono">({chain.testnetName})</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Current: <strong className="text-zinc-200">{balance.toFixed(2)} {chain.symbol}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaim(chain.id as BlockchainNetwork)}
                    disabled={isClaiming}
                    id={`claim-faucet-${chain.id}`}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      isClaimed
                        ? 'bg-emerald-500 text-zinc-950 font-black'
                        : 'bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300'
                    }`}
                  >
                    {isClaiming ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isClaimed ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Claimed!
                      </>
                    ) : (
                      <>
                        <Droplet className="w-3.5 h-3.5" />
                        Claim +{chain.faucetAmount} {chain.faucetSymbol}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
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
