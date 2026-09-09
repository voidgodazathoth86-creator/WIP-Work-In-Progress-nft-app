import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { 
  Fuel, 
  Wallet, 
  ChevronDown, 
  Layers, 
  Sparkles, 
  ShoppingBag, 
  LayoutDashboard, 
  Flame, 
  Droplet,
  ExternalLink,
  CheckCircle2,
  Copy,
  PlusCircle,
  Network,
  ArrowLeftRight
} from 'lucide-react';
import { formatCrypto, formatUsd } from '../services/gasService';
import { BlockchainNetwork } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';

interface NavbarProps {
  currentTab: 'marketplace' | 'mint' | 'collections' | 'dashboard' | 'gas-hub' | 'bridge';
  setCurrentTab: (tab: 'marketplace' | 'mint' | 'collections' | 'dashboard' | 'gas-hub' | 'bridge') => void;
  openWalletModal: () => void;
  openFaucetModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openWalletModal,
  openFaucetModal,
}) => {
  const { 
    activeChain, 
    currentChainConfig, 
    allChains, 
    switchChain, 
    gasData, 
    isConnected, 
    activeAccount, 
    activeBalance 
  } = useWeb3();

  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isGasPopoverOpen, setIsGasPopoverOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(activeAccount.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setCurrentTab('marketplace')}
              className="flex items-center gap-2.5 text-left group"
              id="app-logo-btn"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-base tracking-tight text-zinc-100 flex items-center gap-1.5">
                  Nexus<span className="text-cyan-400">NFT</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                    Cross-Chain
                  </span>
                </span>
                <p className="text-[11px] text-zinc-400 font-medium">Mint • Trade • Auto-Royalty</p>
              </div>
            </button>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/70 p-1 rounded-xl">
              <button
                onClick={() => setCurrentTab('marketplace')}
                id="nav-tab-marketplace"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'marketplace'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Marketplace
              </button>
              <button
                onClick={() => setCurrentTab('mint')}
                id="nav-tab-mint"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'mint'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                Mint Studio
              </button>
              <button
                onClick={() => setCurrentTab('dashboard')}
                id="nav-tab-dashboard"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                Portfolio & Royalties
              </button>
              <button
                onClick={() => setCurrentTab('gas-hub')}
                id="nav-tab-gas-hub"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'gas-hub'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                Gas Tracker
              </button>
              <button
                onClick={() => setCurrentTab('bridge')}
                id="nav-tab-bridge"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'bridge'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 shadow-sm border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                Bridge
                <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  New
                </span>
              </button>
            </nav>
          </div>

          {/* Right Header: Gas Ticker + Network Switcher + Faucet + Wallet */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live Gas Ticker Pill */}
            <div className="relative">
              <button
                onClick={() => setIsGasPopoverOpen(!isGasPopoverOpen)}
                id="gas-ticker-pill-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition-colors"
                title="Live Gas Tracker"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-zinc-200 font-mono text-[11px] font-semibold">
                  {gasData.currentGwei} <span className="text-zinc-400 font-normal">{activeChain === 'solana' ? 'CU' : 'Gwei'}</span>
                </span>
              </button>

              {/* Gas Popover Breakdown */}
              {isGasPopoverOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setIsGasPopoverOpen(false)}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Fuel className="w-4 h-4 text-emerald-400" />
                      {currentChainConfig.name} Gas Tiers
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Live Mempool</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {Object.values(gasData.tiers).map((t) => (
                      <div key={t.speed} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t.speed}</div>
                        <div className="text-xs font-bold text-zinc-100 font-mono">{t.totalGwei} {activeChain === 'solana' ? 'CU' : 'Gwei'}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">{formatUsd(t.estCostUsd)}</div>
                        <div className="text-[9px] text-zinc-500">{t.estTime}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Mint Gas Estimate:</span>
                    <span className="font-semibold text-zinc-200 font-mono">
                      {formatCrypto(gasData.actionsEstimate.mintSingle.crypto, currentChainConfig.symbol)} ({formatUsd(gasData.actionsEstimate.mintSingle.usd)})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Network Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                id="network-switcher-btn"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <span className="text-sm">{currentChainConfig.icon}</span>
                <span className="hidden sm:inline">{currentChainConfig.shortName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {isNetworkDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50"
                  onMouseLeave={() => setIsNetworkDropdownOpen(false)}
                >
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Switch Network
                  </div>
                  <div className="space-y-1">
                    {allChains.map((chain) => (
                      <button
                        key={chain.id}
                        id={`switch-chain-${chain.id}`}
                        onClick={() => {
                          switchChain(chain.id as BlockchainNetwork);
                          setIsNetworkDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          activeChain === chain.id
                            ? 'bg-zinc-800 text-cyan-400 font-bold border border-zinc-700'
                            : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{chain.icon}</span>
                          <div className="text-left">
                            <div>{chain.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">${chain.usdPrice}</div>
                          </div>
                        </div>
                        {activeChain === chain.id && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Faucet Claim Button */}
            <button
              onClick={openFaucetModal}
              id="faucet-modal-trigger-btn"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold transition-all"
              title="Claim free testnet tokens"
            >
              <Droplet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Faucet</span>
            </button>

            {/* Theme Switcher Toggle */}
            <ThemeSwitcher />

            {/* Wallet Connect / Account Button */}
            {isConnected ? (
              <button
                onClick={openWalletModal}
                id="wallet-profile-btn"
                className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-xs"
              >
                <img 
                  src={activeAccount.avatar} 
                  alt={activeAccount.name} 
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-cyan-500/50"
                />
                <div className="text-left hidden sm:block">
                  <div className="font-mono text-[11px] font-bold text-zinc-200">
                    {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
                  </div>
                  <div className="text-[10px] font-medium text-emerald-400 font-mono">
                    {activeBalance.toFixed(3)} {currentChainConfig.symbol}
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={openWalletModal}
                id="connect-wallet-btn"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}

          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-zinc-900 text-xs">
          <button
            onClick={() => setCurrentTab('marketplace')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${currentTab === 'marketplace' ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Market
          </button>
          <button
            onClick={() => setCurrentTab('mint')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${currentTab === 'mint' ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Mint
          </button>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${currentTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Portfolio
          </button>
          <button
            onClick={() => setCurrentTab('gas-hub')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${currentTab === 'gas-hub' ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}
          >
            <Fuel className="w-3.5 h-3.5" />
            Gas
          </button>
          <button
            onClick={() => setCurrentTab('bridge')}
            className={`flex items-center gap-1 py-1 px-2 rounded ${currentTab === 'bridge' ? 'text-cyan-400 font-bold' : 'text-zinc-400'}`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Bridge
          </button>
        </div>

      </div>
    </header>
  );
};
