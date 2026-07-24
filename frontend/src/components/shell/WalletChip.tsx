import React from 'react';
import { Wallet, Copy, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { parseContractError } from '../../web3/errors';
import { useSiweAuth } from '../../lib/siweAuth';
import { isSupabaseConfigured } from '../../lib/supabase';

export function WalletChip() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { isAuthenticated, isSigningIn, signIn, signOut, requiresAuth, authBypass } = useSiweAuth();

  React.useEffect(() => {
    if (connectError) {
      const parsed = parseContractError(connectError);
      toast.error(parsed.title, { description: parsed.description });
    }
  }, [connectError]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleConnect = () => {
    connect(
      { connector: connectors[0] },
      {
        onError: (err) => {
          const parsed = parseContractError(err);
          toast.error(parsed.title, { description: parsed.description });
        },
      }
    );
  };

  const handleSignIn = async () => {
    const ok = await signIn();
    if (ok) {
      toast.success('Signed in', { description: 'Wallet verified via SIWE. You can now submit and manage requests.' });
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied', { duration: 2000 });
    }
  };

  const handleDisconnect = () => {
    signOut();
    disconnect();
  };

  if (!isConnected || !address) {
    return (
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors border border-blue-200 active:scale-95"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    );
  }

  const showSignIn = requiresAuth && !isAuthenticated && !authBypass;

  return (
    <div className="flex items-center gap-2">
      {showSignIn && (
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-medium text-xs transition-colors border border-amber-200 disabled:opacity-60"
        >
          {isSigningIn ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          {isSigningIn ? 'Signing…' : 'Sign in'}
        </button>
      )}

      {isSupabaseConfigured && isAuthenticated && !authBypass && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">
          <ShieldCheck className="w-3 h-3" />
          Verified
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <span className="font-mono text-slate-700 font-medium">{truncate(address)}</span>
        <button onClick={handleCopy} className="p-1 hover:bg-slate-300 rounded text-slate-500 hover:text-slate-700 transition-colors" title="Copy address">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleDisconnect} className="p-1 hover:bg-slate-300 rounded text-slate-500 hover:text-red-600 transition-colors" title="Disconnect">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
