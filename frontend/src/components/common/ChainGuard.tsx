import { AlertTriangle } from 'lucide-react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { expectedChainId, expectedChainName } from '../../web3/config'
import { getChainDeployment } from '../../web3/contracts'

interface ChainGuardProps {
  children: React.ReactNode
}

export function ChainGuard({ children }: ChainGuardProps) {
  const chainId = useChainId()
  const { isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const deployment = getChainDeployment(chainId)

  const wrongChain = isConnected && chainId !== expectedChainId
  const missingDeployment = isConnected && chainId === expectedChainId && !deployment

  if (!wrongChain && !missingDeployment) {
    return <>{children}</>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-900">
              {wrongChain ? 'Wrong network' : 'Contracts not deployed on this chain'}
            </p>
            <p className="text-sm text-amber-800 mt-0.5">
              {wrongChain
                ? `Switch to ${expectedChainName} (chain ${expectedChainId}) to use on-chain features.`
                : `No deployment found for chain ${chainId}. Run the deploy script for this network.`}
            </p>
          </div>
        </div>
        {wrongChain && (
          <button
            type="button"
            onClick={() => switchChain({ chainId: expectedChainId })}
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-60 shrink-0"
          >
            {isPending ? 'Switching…' : `Switch to ${expectedChainName}`}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
