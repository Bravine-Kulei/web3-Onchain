import { useState, useEffect } from 'react'
import { Activity, Server, Clock, Shield, Loader2, RefreshCw } from 'lucide-react'
import { usePublicClient, useChainId } from 'wagmi'
import { ChainGuard } from '../../components/common/ChainGuard'
import { getInstitutionRegistry, getChainDeployment } from '../../web3/contracts'
import { expectedChainId, expectedChainName } from '../../web3/config'
import { parseReadError } from '../../web3/errors'
import { toast } from 'sonner'

interface NodeInfo {
  address: string
  name: string
  role: number
  active: boolean
  joinedAt: number
}

const ROLE_LABELS: Record<number, string> = { 0: 'None', 1: 'Issuer', 2: 'Verifier', 3: 'Both' }

export function NetworkNodes() {
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(true)

  const chainId = useChainId()
  const publicClient = usePublicClient()
  const registry = getInstitutionRegistry(chainId)
  const deployment = getChainDeployment(chainId)

  const fetchNetwork = async () => {
    if (!publicClient || !registry) { setLoading(false); return }
    setLoading(true)
    try {
      const [block, addrs] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.readContract({ ...registry, functionName: 'getAll' }) as Promise<string[]>,
      ])
      setBlockNumber(block)

      const details = await Promise.all(
        addrs.map(addr =>
          publicClient.readContract({
            ...registry,
            functionName: 'institutions',
            args: [addr],
          }).then((data: readonly [string, number, boolean, bigint]) => ({
            address: addr,
            name: data[0],
            role: Number(data[1]),
            active: data[2],
            joinedAt: Number(data[3]) * 1000,
          }))
        )
      )
      setNodes(details)
    } catch (err) {
      const parsed = parseReadError(err)
      toast.error('Failed to read network status', { description: parsed.description })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNetwork() }, [publicClient, chainId])

  const networkHealthy = chainId === expectedChainId && !!deployment

  return (
    <ChainGuard>
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network & Nodes</h1>
          <p className="text-slate-600 mt-1">
            Live consortium network status from the connected chain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchNetwork}
            disabled={loading}
            className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
            networkHealthy ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Shield className="w-4 h-4" />
            {networkHealthy ? expectedChainName : `Chain ${chainId}`}
          </div>
        </div>
      </div>

      {/* Network summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-2">Latest Block</div>
          <div className="text-3xl font-bold text-slate-900 font-mono">
            {loading ? '…' : blockNumber?.toString() ?? '—'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-2">Registered Nodes</div>
          <div className="text-3xl font-bold text-slate-900">{nodes.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-2">Active Nodes</div>
          <div className="text-3xl font-bold text-green-700">{nodes.filter(n => n.active).length}</div>
        </div>
      </div>

      {deployment && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm font-mono text-slate-600 space-y-1">
          <div>TranscriptRegistry: {deployment.transcriptRegistry}</div>
          <div>InstitutionRegistry: {deployment.institutionRegistry}</div>
          <div>Deployed: {new Date(deployment.deployedAt).toLocaleString()}</div>
        </div>
      )}

      {/* Institution nodes */}
      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : nodes.length > 0 ? (
          nodes.map(node => (
            <div key={node.address} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    node.active ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-400 border border-slate-200'
                  }`}>
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{node.name}</h3>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className={`w-2 h-2 rounded-full ${node.active ? 'bg-green-500' : 'bg-slate-400'}`} />
                      <span className={node.active ? 'text-green-700 font-medium' : 'text-slate-500'}>
                        {node.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{ROLE_LABELS[node.role] ?? 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-500" /> Chain Block
                  </div>
                  <div className="font-mono text-sm text-slate-900">{blockNumber?.toString() ?? '—'}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" /> Joined
                  </div>
                  <div className="text-sm text-slate-900">
                    {node.joinedAt ? new Date(node.joinedAt).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 mb-1">Wallet</div>
                  <div className="font-mono text-xs text-slate-700 break-all">{node.address}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-16 text-slate-500">
            No institutions registered on this chain yet.
          </div>
        )}
      </div>
    </div>
    </ChainGuard>
  )
}
