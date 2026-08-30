import React, { useState } from 'react';
import { useWeb3, DEMO_ACCOUNTS } from '../context/Web3Context';
import { 
  X, 
  Wallet, 
  Copy, 
  Check, 
  Key, 
  ShieldCheck, 
  Droplet, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Coins
} from 'lucide-react';
import { formatCrypto, formatUsd } from '../services/gasService';
import { SUPPORTED_CHAINS } from '../data/chains';
import { BlockchainNetwork } from '../types';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  openFaucet: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, openFaucet }) => {
  const { 
    activeAccount, 
    allAccounts, 
    connectInjectedWallet, 
    connectDemoAccount, 
    disconnectWallet, 
    activeChain, 
    currentChainConfig, 
    allChains,
    claimFaucetTokens 
  } = useWeb3();

  const [copied, setCopied] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'connect' | 'balances'>('profile');
  const [connectNotification, setConnectNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInjectedConnect = async (providerName: string) => {
    setIsConnecting(providerName);
    setConnectNotification(null);
    try {
      await connectInjectedWallet(providerName);
      setConnectNotification({
        type: 'success',
        message: `Successfully connected ${providerName} wallet!`
      });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (e: any) {
      setConnectNotification({
        type: 'info',
        message: `${providerName} initialized in sandbox testnet mode.`
      });
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setIsConnecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="wallet-management-modal"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Web3 Wallet Integration</h3>
              <p className="text-[11px] text-zinc-400 font-medium">Multi-Chain Identity & Keyring</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            id="close-wallet-modal-btn"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800/60 px-5 pt-2 bg-zinc-900/20">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Active Account
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'balances'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Multi-Chain Balances
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'connect'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Switch / Connect
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {activeTab === 'profile' && (
            <div className="space-y-4">
              
              {/* Account Card */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={activeAccount.avatar} 
                      alt={activeAccount.name} 
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/30"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        {activeAccount.name}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {activeAccount.providerName}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                        <span>{activeAccount.address.slice(0, 10)}...{activeAccount.address.slice(-6)}</span>
                        <button 
                          onClick={() => copyToClipboard(activeAccount.address)}
                          className="hover:text-zinc-200 transition-colors p-0.5"
                          title="Copy address"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Balance on Active Chain */}
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      {currentChainConfig.name} Balance
                    </div>
                    <div className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                      {formatCrypto(activeAccount.balances[activeChain] || 0, currentChainConfig.symbol)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-emerald-400 font-mono">
                      {formatUsd((activeAccount.balances[activeChain] || 0) * currentChainConfig.usdPrice)}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      1 {currentChainConfig.symbol} = ${currentChainConfig.usdPrice}
                    </div>
                  </div>
                </div>

                {/* Faucet Quick Top-up Button */}
                <button
                  onClick={() => {
                    claimFaucetTokens(activeChain);
                  }}
                  id="wallet-quick-faucet-btn"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
                >
                  <Droplet className="w-3.5 h-3.5 text-indigo-400" />
                  Claim +{currentChainConfig.faucetAmount} {currentChainConfig.faucetSymbol} Testnet Tokens
                </button>
              </div>

              {/* Private Key / Security Box */}
              {activeAccount.privateKey && (
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      Keyring Private Key
                    </span>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                    >
                      {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showPrivateKey ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] font-mono break-all text-zinc-400 select-all">
                    {showPrivateKey ? activeAccount.privateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'balances' && (
            <div className="space-y-2.5">
              <div className="text-[11px] text-zinc-400">
                Balances across all supported blockchain networks for this active wallet:
              </div>
              <div className="space-y-2">
                {allChains.map((chain) => {
                  const bal = activeAccount.balances[chain.id as BlockchainNetwork] || 0;
                  const usdVal = bal * chain.usdPrice;
                  return (
                    <div 
                      key={chain.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{chain.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-zinc-200">{chain.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{chain.testnetName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-zinc-100 font-mono">
                          {bal.toFixed(3)} {chain.symbol}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {formatUsd(usdVal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="space-y-4">
              
              {connectNotification && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
                  connectNotification.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{connectNotification.message}</span>
                </div>
              )}

              {/* External Injected Providers */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Browser Web3 Providers
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleInjectedConnect('MetaMask')}
                    id="connect-metamask-btn"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-lg">
                        🦊
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-100">MetaMask</div>
                        <div className="text-[10px] text-zinc-400">Browser extension / Mobile browser</div>
                      </div>
                    </div>
                    {isConnecting === 'MetaMask' ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <span className="text-[11px] font-semibold text-cyan-400">Connect</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleInjectedConnect('Phantom')}
                    id="connect-phantom-btn"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg">
                        👻
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-100">Phantom</div>
                        <div className="text-[10px] text-zinc-400">Solana & Multi-Chain support</div>
                      </div>
                    </div>
                    {isConnecting === 'Phantom' ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <span className="text-[11px] font-semibold text-cyan-400">Connect</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleInjectedConnect('Coinbase Wallet')}
                    id="connect-coinbase-btn"
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-lg">
                        🔵
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-100">Coinbase Wallet</div>
                        <div className="text-[10px] text-zinc-400">Base & EVM Smart Wallet</div>
                      </div>
                    </div>
                    {isConnecting === 'Coinbase Wallet' ? (
                      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <span className="text-[11px] font-semibold text-cyan-400">Connect</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Pre-funded Studio Keyring Accounts */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Pre-Funded Studio Accounts
                </div>
                <div className="space-y-2">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const isSelected = activeAccount.address === acc.address;
                    return (
                      <button
                        key={acc.address}
                        onClick={() => {
                          connectDemoAccount(acc);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'bg-zinc-850 border-cyan-500/50'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={acc.avatar} alt={acc.name} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <div className="text-xs font-bold text-zinc-100">{acc.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {acc.balances.ethereum} ETH • {acc.balances.polygon} POL • {acc.balances.solana} SOL
                            </div>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-zinc-400">Select</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Web3 Keyring</span>
          </div>
          <button
            onClick={() => {
              disconnectWallet();
              onClose();
            }}
            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" />
            Disconnect
          </button>
        </div>

      </div>
    </div>
  );
};
