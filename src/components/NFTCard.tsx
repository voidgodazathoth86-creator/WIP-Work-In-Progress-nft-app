import React from 'react';
import { NFT } from '../types';
import { useWeb3 } from '../context/Web3Context';
import { SUPPORTED_CHAINS } from '../data/chains';
import { formatCrypto, formatUsd } from '../services/gasService';
import { Heart, Sparkles, ShoppingCart, Percent, Eye, ShieldCheck } from 'lucide-react';

interface NFTCardProps {
  nft: NFT;
  onSelect: (nft: NFT) => void;
  onQuickBuy?: (nft: NFT, e: React.MouseEvent) => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onSelect, onQuickBuy }) => {
  const { activeAccount, toggleLikeNFT } = useWeb3();
  const chainConfig = SUPPORTED_CHAINS[nft.chainId] || SUPPORTED_CHAINS.ethereum;
  const isOwner = nft.ownerAddress.toLowerCase() === activeAccount.address.toLowerCase();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLikeNFT(nft.id);
  };

  return (
    <div
      onClick={() => onSelect(nft)}
      id={`nft-card-${nft.id}`}
      className="group bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-cyan-500/5"
    >
      {/* Media Image Container */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
        <img
          src={nft.image}
          alt={nft.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Chain Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-[11px] font-bold text-zinc-200 shadow-md">
          <span>{chainConfig.icon}</span>
          <span className="font-mono">{chainConfig.shortName}</span>
        </div>

        {/* Royalty Pill */}
        {nft.royaltyPercentage > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-950/80 backdrop-blur-md border border-purple-500/30 text-[10px] font-bold text-purple-300 shadow-md">
            <Percent className="w-2.5 h-2.5" />
            <span>{nft.royaltyPercentage}% Royalty</span>
          </div>
        )}

        {/* Like Button & Views */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-950/80 backdrop-blur-md border border-zinc-800 hover:border-rose-500/40 text-[10px] font-semibold text-zinc-300 hover:text-rose-400 transition-colors"
          >
            <Heart className={`w-3 h-3 ${nft.likesCount ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{nft.likesCount || 0}</span>
          </button>
        </div>

        {/* Unlockable Content Badge */}
        {nft.hasUnlockableContent && (
          <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 rounded bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-[9px] font-bold text-amber-300 font-mono">
            UNLOCKABLE
          </div>
        )}
      </div>

      {/* Card Info Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Collection Name & Token Standard */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium mb-1">
            <span className="truncate max-w-[140px] text-cyan-400 font-semibold flex items-center gap-1">
              {nft.collectionName || 'Single Edition'}
              <ShieldCheck className="w-3 h-3 text-cyan-400 inline" />
            </span>
            <span className="font-mono text-[10px] text-zinc-500">{nft.tokenId}</span>
          </div>

          {/* NFT Title */}
          <h4 className="text-sm font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
            {nft.name}
          </h4>
        </div>

        {/* Pricing / Listing Status & Action Button */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-end justify-between">
          <div>
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              {nft.isListed ? 'Price' : 'Status'}
            </div>
            {nft.isListed && nft.price ? (
              <div>
                <div className="text-sm font-black text-zinc-100 font-mono">
                  {nft.price} {chainConfig.symbol}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatUsd(nft.price * chainConfig.usdPrice)}
                </div>
              </div>
            ) : (
              <div className="text-xs font-semibold text-zinc-400 mt-1">
                {isOwner ? 'In Your Wallet' : 'Not Listed'}
              </div>
            )}
          </div>

          {/* Quick Action Button */}
          {nft.isListed && !isOwner && onQuickBuy ? (
            <button
              onClick={(e) => onQuickBuy(nft, e)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Buy
            </button>
          ) : isOwner ? (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-bold">
              Manage
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-400 text-[11px] font-medium flex items-center gap-1">
              <Eye className="w-3 h-3" />
              View
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
