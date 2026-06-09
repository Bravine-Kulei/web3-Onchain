import React from 'react';
import { Wallet, Copy, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function WalletChip() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied', { duration: 2000 });
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors border border-blue-200 active:scale-95"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </div>
      <span className="font-mono text-slate-700 font-medium">{truncate(address!)}</span>
      <button onClick={handleCopy} className="p-1 hover:bg-slate-300 rounded text-slate-500 hover:text-slate-700 transition-colors" title="Copy address">
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => disconnect()} className="p-1 hover:bg-slate-300 rounded text-slate-500 hover:text-red-600 transition-colors" title="Disconnect">
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}