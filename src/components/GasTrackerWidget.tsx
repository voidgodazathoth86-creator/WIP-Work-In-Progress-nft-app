import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  ShieldAlert, 
  Layers, 
  ArrowRight,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { formatCrypto, formatUsd } from '../services/gasService';
import { SUPPORTED_CHAINS } from '../data/chains';
import { BlockchainNetwork } from '../types';

export const GasTrackerWidget: React.FC = () => {
  const { 
    activeChain, 
    currentChainConfig, 
    allChains, 
    switchChain, 
    gasData, 
    selectedGasSpeed, 
    setSelectedGasSpeed,
    gasHistory 
  } = useWeb3();

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="gas-hub-view">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Mempool Tracker
              </span>
              <span className="text-xs text-zinc-400 font-mono">Auto-polling 4s</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight">
              Real-Time Gas & Network Analytics
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl mt-1">
              Accurate base fees, EIP-1559 priority tips, and estimated transaction costs across 7 major blockchain networks.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400">Current {currentChainConfig.name} Base</div>
              <div className="text-xl font-black text-zinc-100 font-mono flex items-baseline gap-1.5">
                {gasData.currentGwei}
                <span className="text-xs text-zinc-400 font-normal">{activeChain === 'solana' ? 'CU' : 'Gwei'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speed Tier Cards */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
          <span>Active Speed Tier (Applied during Minting & Trading)</span>
          <span className="text-xs font-normal text-zinc-500 lowercase">click to select default tier</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Object.values(gasData.tiers).map((tier) => {
            const isSelected = selectedGasSpeed === tier.speed;
            return (
              <button
                key={tier.speed}
                onClick={() => setSelectedGasSpeed(tier.speed)}
                id={`gas-tier-select-${tier.speed}`}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isSelected
                    ? 'bg-zinc-850 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    tier.speed === 'instant' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    tier.speed === 'fast' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                    tier.speed === 'standard' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>
                    {tier.label}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="text-2xl font-black text-zinc-100 font-mono">
                    {tier.totalGwei} <span className="text-xs font-normal text-zinc-400">{activeChain === 'solana' ? 'CU' : 'Gwei'}</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    ~{formatUsd(tier.estCostUsd)} <span className="text-zinc-500 font-normal">est. mint</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {tier.estTime}
                  </span>
                  <span className="font-mono">{tier.priorityFee > 0 ? `+${tier.priorityFee} tip` : 'base'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Cost Breakdown & Gas Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Action Cost Calculator */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Smart Contract Action Costs
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">Estimated on {currentChainConfig.name}</p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-200">Mint Single NFT</div>
                <div className="text-[10px] text-zinc-500 font-mono">145k Gas Units</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-zinc-100 font-mono">
                  {formatCrypto(gasData.actionsEstimate.mintSingle.crypto, currentChainConfig.symbol)}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatUsd(gasData.actionsEstimate.mintSingle.usd)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-200">Deploy Collection (Factory)</div>
                <div className="text-[10px] text-zinc-500 font-mono">680k Gas Units</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-zinc-100 font-mono">
                  {formatCrypto(gasData.actionsEstimate.mintCollection.crypto, currentChainConfig.symbol)}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatUsd(gasData.actionsEstimate.mintCollection.usd)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-200">Marketplace Buy / Escrow</div>
                <div className="text-[10px] text-zinc-500 font-mono">185k Gas Units</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-zinc-100 font-mono">
                  {formatCrypto(gasData.actionsEstimate.buyNft.crypto, currentChainConfig.symbol)}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatUsd(gasData.actionsEstimate.buyNft.usd)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-200">Direct NFT Transfer</div>
                <div className="text-[10px] text-zinc-500 font-mono">65k Gas Units</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-zinc-100 font-mono">
                  {formatCrypto(gasData.actionsEstimate.transferNft.crypto, currentChainConfig.symbol)}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatUsd(gasData.actionsEstimate.transferNft.usd)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Mempool Trend Graph */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Live Gas Price History (Recent Polls)
              </h4>
              <span className="text-xs font-mono text-zinc-400">
                Current: <strong className="text-zinc-200">{gasData.currentGwei} {activeChain === 'solana' ? 'CU' : 'Gwei'}</strong>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Simulated real-time EIP-1559 mempool congestion ticker</p>
          </div>

          {/* Simple Visual Bar Chart */}
          <div className="h-44 flex items-end gap-2 pt-6 px-2 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            {gasHistory.map((item, index) => {
              const maxVal = Math.max(...gasHistory.map(g => g.gwei), 25);
              const heightPercent = Math.min(100, Math.max(15, (item.gwei / maxVal) * 100));
              const isLast = index === gasHistory.length - 1;

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="text-[9px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.gwei}
                  </div>
                  <div 
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isLast 
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 ring-2 ring-emerald-400/40' 
                        : 'bg-zinc-700 hover:bg-zinc-600'
                    }`}
                  />
                  <div className="text-[9px] text-zinc-500 font-mono truncate w-full text-center">
                    {item.time.slice(0, 5)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              Tip: Minting during off-peak hours can save up to 40% on L1 gas.
            </span>
            <span className="text-emerald-400 font-mono text-[11px]">Network Health: 99.98%</span>
          </div>
        </div>

      </div>

      {/* Cross-Chain Mint Cost Comparison Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Cross-Chain NFT Mint Cost Comparison
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Compare average minting costs and finality times across all supported blockchain ecosystems.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Network</th>
                <th className="pb-3 font-semibold">Native Token</th>
                <th className="pb-3 font-semibold">Avg Block Time</th>
                <th className="pb-3 font-semibold">Est. Mint Gas (USD)</th>
                <th className="pb-3 font-semibold">Standard</th>
                <th className="pb-3 font-semibold text-right">Switch Network</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-200">
              {allChains.map((chain) => {
                const isCurrent = chain.id === activeChain;
                let estMintUsd = 0;
                if (chain.id === 'ethereum') estMintUsd = 4.25;
                else if (chain.id === 'polygon') estMintUsd = 0.015;
                else if (chain.id === 'arbitrum') estMintUsd = 0.08;
                else if (chain.id === 'base') estMintUsd = 0.04;
                else if (chain.id === 'solana') estMintUsd = 0.002;
                else if (chain.id === 'avalanche') estMintUsd = 0.12;
                else if (chain.id === 'bsc') estMintUsd = 0.22;

                return (
                  <tr key={chain.id} className={`hover:bg-zinc-800/40 transition-colors ${isCurrent ? 'bg-zinc-800/20' : ''}`}>
                    <td className="py-3 font-bold flex items-center gap-2">
                      <span className="text-lg">{chain.icon}</span>
                      <span>{chain.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono">{chain.symbol} (${chain.usdPrice})</td>
                    <td className="py-3 text-zinc-400">{chain.avgBlockTime}</td>
                    <td className="py-3 font-bold font-mono text-emerald-400">
                      {formatUsd(estMintUsd)}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
                        {chain.standard}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {isCurrent ? (
                        <span className="text-zinc-500 text-[11px]">Connected</span>
                      ) : (
                        <button
                          onClick={() => switchChain(chain.id as BlockchainNetwork)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors"
                        >
                          Switch
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
