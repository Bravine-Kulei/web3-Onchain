import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useChainId } from 'wagmi';

// Block explorers per chain. Local Hardhat (31337) has none.
const EXPLORERS: Record<number, string> = {
  80002: 'https://amoy.polygonscan.com/tx/',
};

interface OnChainReferenceProps {
  txHash: string;
  blockNumber?: number;
  className?: string;
}
export function OnChainReference({
  txHash,
  blockNumber,
  className = ''
}: OnChainReferenceProps) {
  const chainId = useChainId();
  const explorerBase = EXPLORERS[chainId];
  const truncateHash = (hash: string) => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(txHash);
    toast.success('Copied to clipboard', {
      description: truncateHash(txHash),
      duration: 2000
    });
  };
  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
        <span className="font-mono text-slate-700">{truncateHash(txHash)}</span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy full hash">
          
          <Copy className="w-4 h-4" />
        </button>
      </div>
      {blockNumber &&
      <span className="text-slate-500">
          Block {blockNumber.toLocaleString()}
        </span>
      }
      {explorerBase ? (
        <a
          href={`${explorerBase}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors ml-auto sm:ml-0">
          <span>View on explorer</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <span className="text-xs text-slate-400 ml-auto sm:ml-0">Local chain</span>
      )}
    </div>);

}