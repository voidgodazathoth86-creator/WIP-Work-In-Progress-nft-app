import React, { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { BlockchainNetwork } from '../types';
import { ChevronDown, Check, Globe, Sparkles, Coins, Zap } from 'lucide-react';
import { SUPPORTED_CHAINS } from '../data/chains';

interface NetworkSelectorDropdownProps {
  variant?: 'form' | 'compact' | 'header' | 'inline';
  label?: string;
  id?: string;
  className?: string;
  selectedChain?: BlockchainNetwork;
  onSelectChain?: (chain: BlockchainNetwork) => void;
  showBalance?: boolean;
}

export const NetworkSelectorDropdown: React.FC<NetworkSelectorDropdownProps> = ({
  variant = 'form',
  label,
  id = 'network-to-mint-dropdown',
  className = '',
  selectedChain,
  onSelectChain,
  showBalance = true,
}) => {
  const { activeChain, switchChain, allChains, activeAccount, gasData } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentChainId = selectedChain || activeChain;
  const currentConfig = SUPPORTED_CHAINS[currentChainId] || SUPPORTED_CHAINS.polygon;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (chainId: BlockchainNetwork) => {
    if (onSelectChain) {
      onSelectChain(chainId);
    } else {
      switchChain(chainId);
    }
    setIsOpen(false);
  };

  const getChainBalance = (chainId: BlockchainNetwork) => {
    const bal = activeAccount?.balances?.[chainId] ?? 0;
    return bal.toFixed(bal < 1 && bal > 0 ? 4 : 2);
  };

  // VARIANT: COMPACT (for toolbars, preview cards, widgets)
  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select minting network"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-200 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
        >
          <span className="text-sm">{currentConfig.icon}</span>
          <span className="font-semibold">{currentConfig.shortName}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div 
            className="absolute right-0 mt-1.5 w-60 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
            role="listbox"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1">
              Select Network to Mint To
            </div>
            <div className="space-y-1">
              {allChains.map((chain) => {
                const isSelected = chain.id === currentChainId;
                return (
                  <button
                    key={chain.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    id={`${id}-opt-${chain.id}`}
                    onClick={() => handleSelect(chain.id as BlockchainNetwork)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800 text-cyan-400 font-bold border border-zinc-700'
                        : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{chain.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{chain.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {getChainBalance(chain.id as BlockchainNetwork)} {chain.symbol}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // VARIANT: HEADER / BADGE
  if (variant === 'header') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 text-xs font-bold text-zinc-200 transition-all shadow-sm group cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{currentConfig.icon}</span>
            <span className="text-zinc-400 font-medium text-[11px] hidden sm:inline">Minting on:</span>
            <span className="text-cyan-400 font-bold">{currentConfig.name}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div 
            className="absolute right-0 mt-2 w-72 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
            role="listbox"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-800/80 mb-1.5">
              <span>Target Minting Network</span>
              <span className="text-cyan-400 font-mono text-[9px]">{allChains.length} Chains</span>
            </div>
            <div className="space-y-1">
              {allChains.map((chain) => {
                const isSelected = chain.id === currentChainId;
                const bal = getChainBalance(chain.id as BlockchainNetwork);
                return (
                  <button
                    key={chain.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    id={`${id}-opt-${chain.id}`}
                    onClick={() => handleSelect(chain.id as BlockchainNetwork)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/90 text-cyan-400 font-bold border border-cyan-500/30 shadow-sm'
                        : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{chain.icon}</span>
                      <div className="text-left">
                        <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          {chain.name}
                          {chain.id === 'polygon' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">Live</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Balance: {bal} {chain.symbol}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">${chain.usdPrice}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEFAULT VARIANT: FORM (full-featured, fits directly inside forms as a first-class input)
  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-zinc-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            {label}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {currentConfig.testnetName || 'EVM'}
          </span>
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs text-zinc-200 transition-all focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 cursor-pointer shadow-inner group"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">{currentConfig.icon}</span>
            <div className="text-left flex items-center gap-2">
              <span className="font-bold text-zinc-100">{currentConfig.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                {currentConfig.symbol}
              </span>
              {currentConfig.id === 'polygon' && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showBalance && (
              <span className="hidden sm:inline text-[11px] font-mono text-zinc-400">
                Bal: <strong className="text-zinc-200">{getChainBalance(currentChainId)}</strong> {currentConfig.symbol}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div 
            className="absolute left-0 right-0 mt-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto"
            role="listbox"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-800/80 mb-1.5">
              <span>Select Destination Blockchain</span>
              <span className="text-zinc-500 text-[9px]">Tap to Switch</span>
            </div>

            <div className="space-y-1">
              {allChains.map((chain) => {
                const isSelected = chain.id === currentChainId;
                const bal = getChainBalance(chain.id as BlockchainNetwork);
                return (
                  <button
                    key={chain.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    id={`${id}-option-${chain.id}`}
                    onClick={() => handleSelect(chain.id as BlockchainNetwork)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/90 text-cyan-400 border border-cyan-500/30 shadow-sm'
                        : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-lg border border-zinc-800/80">
                        {chain.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                          {chain.name}
                          <span className="text-[10px] font-mono text-zinc-400 font-normal">
                            ({chain.symbol})
                          </span>
                          {chain.id === 'polygon' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                              Live
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 font-mono">
                          <span>{chain.testnetName || 'Mainnet'}</span>
                          <span>•</span>
                          <span>Block: {chain.avgBlockTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div className="hidden sm:block">
                        <div className="text-[11px] font-mono font-semibold text-zinc-200">
                          {bal} {chain.symbol}
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono">
                          ${chain.usdPrice} / unit
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-950/60 border border-zinc-800 group-hover:border-zinc-700" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
