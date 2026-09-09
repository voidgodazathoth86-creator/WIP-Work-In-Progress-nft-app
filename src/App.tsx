import React, { useState } from 'react';
import { Web3Provider, useWeb3 } from './context/Web3Context';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Marketplace } from './components/Marketplace';
import { MintStudio } from './components/MintStudio';
import { Dashboard } from './components/Dashboard';
import { GasTrackerWidget } from './components/GasTrackerWidget';
import { NFTBridge } from './components/NFTBridge';
import { NFTDetailModal } from './components/NFTDetailModal';
import { WalletModal } from './components/WalletModal';
import { FaucetModal } from './components/FaucetModal';
import { NFT } from './types';
import { Sparkles, Layers, ShieldCheck, Fuel, Droplet, PlusCircle, ArrowLeftRight } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<'marketplace' | 'mint' | 'collections' | 'dashboard' | 'gas-hub' | 'bridge'>('marketplace');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [bridgeTargetNFT, setBridgeTargetNFT] = useState<NFT | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);

  const handleMintSuccess = (nft: NFT) => {
    setSelectedNFT(nft);
  };

  const handleOpenBridgeForNFT = (nft?: NFT) => {
    if (nft) {
      setBridgeTargetNFT(nft);
    }
    setCurrentTab('bridge');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Navbar with Live Gas Ticker & Multi-Chain Switcher */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab !== 'bridge') {
            setBridgeTargetNFT(null);
          }
          setCurrentTab(tab);
        }}
        openWalletModal={() => setIsWalletModalOpen(true)}
        openFaucetModal={() => setIsFaucetModalOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {currentTab === 'marketplace' && (
          <Marketplace
            onSelectNFT={(nft) => setSelectedNFT(nft)}
            onOpenMintStudio={() => setCurrentTab('mint')}
          />
        )}

        {currentTab === 'mint' && (
          <MintStudio
            onSuccess={handleMintSuccess}
            onOpenDashboard={() => setCurrentTab('dashboard')}
            onOpenMarketplace={() => setCurrentTab('marketplace')}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard
            onSelectNFT={(nft) => setSelectedNFT(nft)}
            onOpenMintStudio={() => setCurrentTab('mint')}
            onOpenBridge={handleOpenBridgeForNFT}
          />
        )}

        {currentTab === 'gas-hub' && (
          <GasTrackerWidget />
        )}

        {currentTab === 'bridge' && (
          <NFTBridge
            initialNFT={bridgeTargetNFT}
            onNavigateToDashboard={() => setCurrentTab('dashboard')}
            onNavigateToMarketplace={() => setCurrentTab('marketplace')}
            openFaucetModal={() => setIsFaucetModalOpen(true)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
              N
            </div>
            <span className="font-semibold text-zinc-400">NexusNFT Cross-Chain Protocol</span>
            <span>•</span>
            <span>Automated Royalty & Omnichain ONFT Gateways</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <button onClick={() => setCurrentTab('bridge')} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
              Omnichain Bridge
            </button>
            <button onClick={() => setCurrentTab('gas-hub')} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5" />
              Gas Tracker
            </button>
            <button onClick={() => setIsFaucetModalOpen(true)} className="hover:text-indigo-400 transition-colors flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5" />
              Testnet Faucet
            </button>
            <button onClick={() => setCurrentTab('dashboard')} className="hover:text-purple-400 transition-colors">
              Royalty Ledger
            </button>
            <div className="border-l border-zinc-800 pl-4 ml-1 hidden sm:block">
              <ThemeSwitcher variant="pill" />
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NFTDetailModal
        nft={selectedNFT}
        onClose={() => setSelectedNFT(null)}
        onOpenBridge={handleOpenBridgeForNFT}
      />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        openFaucet={() => {
          setIsWalletModalOpen(false);
          setIsFaucetModalOpen(true);
        }}
      />

      <FaucetModal
        isOpen={isFaucetModalOpen}
        onClose={() => setIsFaucetModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <AppContent />
      </Web3Provider>
    </ThemeProvider>
  );
}
