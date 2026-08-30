import React, { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { NFTCard } from './NFTCard';
import { NFT, BlockchainNetwork } from '../types';
import { 
  LayoutDashboard, 
  Sparkles, 
  Coins, 
  Layers, 
  Percent, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2, 
  History, 
  FolderPlus,
  PlusCircle,
  ArrowLeftRight
} from 'lucide-react';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatCrypto, formatUsd } from '../services/gasService';

interface DashboardProps {
  onSelectNFT: (nft: NFT) => void;
  onOpenMintStudio: () => void;
  onOpenBridge?: (nft?: NFT) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectNFT, onOpenMintStudio, onOpenBridge }) => {
  const { 
    activeAccount, 
    nfts, 
    collections, 
    royaltyLogs, 
    transactions, 
    totalPortfolioValueUsd, 
    totalRoyaltyEarnedUsd 
  } = useWeb3();

  const [activeTab, setActiveTab] = useState<'collected' | 'minted' | 'collections' | 'royalties' | 'activity'>('collected');

  // Filtered lists
  const collectedNFTs = nfts.filter(n => n.ownerAddress.toLowerCase() === activeAccount.address.toLowerCase());
  const createdNFTs = nfts.filter(n => n.creatorAddress.toLowerCase() === activeAccount.address.toLowerCase());
  const myCollections = collections.filter(c => c.creatorAddress.toLowerCase() === activeAccount.address.toLowerCase() || true);

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="portfolio-dashboard-view">
      
      {/* Portfolio Top Analytics Bar */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src={activeAccount.avatar} 
              alt={activeAccount.name} 
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-cyan-500/40 shadow-xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-100">{activeAccount.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                  {activeAccount.providerName}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span>{activeAccount.address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onOpenBridge && (
              <button
                onClick={() => onOpenBridge()}
                id="dashboard-quick-bridge-btn"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Teleport Asset
              </button>
            )}
            <button
              onClick={onOpenMintStudio}
              id="dashboard-quick-mint-btn"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Mint New NFT
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-800/80">
          
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Est. Portfolio Value
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-100 font-mono mt-1">
              {formatUsd(totalPortfolioValueUsd)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Across all 7 networks</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-purple-400" />
              Lifetime Royalties Earned
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono mt-1">
              {formatUsd(totalRoyaltyEarnedUsd)}
            </div>
            <div className="text-[10px] text-purple-300 mt-0.5">Automated on-chain payout</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Owned Inventory
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-100 font-mono mt-1">
              {collectedNFTs.length} NFTs
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">In your wallet</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Minted by You
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-100 font-mono mt-1">
              {createdNFTs.length} Creations
            </div>
            <div className="text-[10px] text-amber-300 mt-0.5">Original masterworks</div>
          </div>

        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('collected')}
          id="tab-collected-nfts"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'collected'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Collected ({collectedNFTs.length})
        </button>

        <button
          onClick={() => setActiveTab('minted')}
          id="tab-minted-nfts"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'minted'
              ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Minted Creations ({createdNFTs.length})
        </button>

        <button
          onClick={() => setActiveTab('royalties')}
          id="tab-royalty-ledger"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'royalties'
              ? 'bg-zinc-800 text-purple-400 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Percent className="w-3.5 h-3.5 text-purple-400" />
          Royalty Earnings Ledger ({royaltyLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          id="tab-my-collections"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'collections'
              ? 'bg-zinc-800 text-indigo-400 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
          Collections ({myCollections.length})
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          id="tab-transaction-history"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'activity'
              ? 'bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="w-3.5 h-3.5 text-emerald-400" />
          Transaction Ledger ({transactions.length})
        </button>
      </div>

      {/* Tab Contents */}
      
      {/* 1. Collected NFTs */}
      {activeTab === 'collected' && (
        <div>
          {collectedNFTs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {collectedNFTs.map(nft => (
                <NFTCard key={nft.id} nft={nft} onSelect={onSelectNFT} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <Layers className="w-8 h-8 text-zinc-500 mx-auto" />
              <div className="text-sm font-bold text-zinc-200">No Collected NFTs Yet</div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Explore the marketplace to purchase your first digital asset or mint a new one in the studio!
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. Created NFTs */}
      {activeTab === 'minted' && (
        <div>
          {createdNFTs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {createdNFTs.map(nft => (
                <NFTCard key={nft.id} nft={nft} onSelect={onSelectNFT} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
              <div className="text-sm font-bold text-zinc-200">No Minted Creations Yet</div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Launch the mint studio to design and deploy your first NFT or generative piece.
              </p>
              <button
                onClick={onOpenMintStudio}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors"
              >
                Start Minting
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Royalty Earnings Audit Ledger */}
      {activeTab === 'royalties' && (
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-400" />
              Automated Creator Royalty Payout Ledger
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every secondary market sale triggers an atomic smart contract payout directly to the creator's wallet address.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">NFT Asset</th>
                  <th className="pb-3 font-semibold">Network</th>
                  <th className="pb-3 font-semibold">Sale Price</th>
                  <th className="pb-3 font-semibold">Royalty %</th>
                  <th className="pb-3 font-semibold">Royalty Paid</th>
                  <th className="pb-3 font-semibold">Tx Hash</th>
                  <th className="pb-3 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-200">
                {royaltyLogs.map(log => {
                  const chain = SUPPORTED_CHAINS[log.chainId] || SUPPORTED_CHAINS.ethereum;
                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 flex items-center gap-2.5">
                        <img src={log.nftImage} alt={log.nftName} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <div className="font-bold text-zinc-100 truncate max-w-[180px]">{log.nftName}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{log.collectionName}</div>
                        </div>
                      </td>
                      <td className="py-3 font-mono">
                        <span className="flex items-center gap-1">
                          <span>{chain.icon}</span>
                          <span>{chain.shortName}</span>
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-zinc-100">
                        {log.salePriceCrypto} {chain.symbol}
                      </td>
                      <td className="py-3 font-mono text-purple-400 font-bold">
                        {log.royaltyPercent}%
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        +{log.royaltyAmountCrypto} {chain.symbol} ({formatUsd(log.royaltyAmountUsd)})
                      </td>
                      <td className="py-3 font-mono text-cyan-400 text-[11px] truncate max-w-[120px]">
                        {log.txHash.slice(0, 10)}...
                      </td>
                      <td className="py-3 text-right text-zinc-500 text-[11px] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Collections */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCollections.map(col => {
            const chain = SUPPORTED_CHAINS[col.chainId] || SUPPORTED_CHAINS.ethereum;
            return (
              <div key={col.id} className="rounded-2xl overflow-hidden bg-zinc-900/60 border border-zinc-800 shadow-lg flex flex-col justify-between">
                <div className="h-28 w-full relative overflow-hidden bg-zinc-950">
                  <img src={col.bannerImage} alt={col.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-zinc-950/80 backdrop-blur-md text-xs font-bold text-zinc-200">
                    {chain.icon} {chain.name}
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <img src={col.avatarImage} alt={col.name} className="w-10 h-10 rounded-xl object-cover -mt-8 ring-2 ring-zinc-950 shadow-md" />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1">
                        {col.name}
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      </h4>
                      <div className="text-[10px] text-zinc-500 font-mono">{col.symbol} • {col.standard}</div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2">{col.description}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center text-xs">
                    <div className="p-1.5 rounded-lg bg-zinc-950">
                      <div className="text-[9px] text-zinc-500 uppercase">Royalty</div>
                      <div className="font-bold text-purple-400 font-mono">{col.royaltyPercentage}%</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950">
                      <div className="text-[9px] text-zinc-500 uppercase">Supply</div>
                      <div className="font-bold text-zinc-200 font-mono">{col.currentSupply}/{col.maxSupply}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-950">
                      <div className="text-[9px] text-zinc-500 uppercase">Floor</div>
                      <div className="font-bold text-emerald-400 font-mono">{col.floorPrice} {chain.symbol}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Transaction History */}
      {activeTab === 'activity' && (
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            On-Chain Transaction Ledger
          </h3>

          <div className="space-y-2">
            {transactions.map(tx => {
              const chain = SUPPORTED_CHAINS[tx.chainId] || SUPPORTED_CHAINS.ethereum;
              return (
                <div key={tx.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-300">
                      {tx.type === 'mint' ? '⚡' : tx.type === 'buy' ? '🛒' : tx.type === 'royalty_received' ? '💎' : tx.type === 'list' ? '🏷️' : '💧'}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-100 uppercase tracking-wider text-[11px]">
                        {tx.type.replace('_', ' ')}: {tx.nftName || tx.collectionName || 'Transaction'}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>Block #{tx.blockNumber}</span>
                        <span>•</span>
                        <span>{chain.name}</span>
                        <span>•</span>
                        <span className="text-cyan-400 truncate max-w-[120px]">Tx: {tx.txHash.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    {tx.amountCrypto ? (
                      <div className="font-mono font-bold text-zinc-100">
                        {tx.amountCrypto} {chain.symbol}
                      </div>
                    ) : null}
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Gas: {tx.gasUsedCrypto?.toFixed(6) || 0} {chain.symbol}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
