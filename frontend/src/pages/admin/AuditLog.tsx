import React, { useState, useEffect, useCallback } from 'react'
import { Search, Download, Loader2, RefreshCw } from 'lucide-react'
import { OnChainReference } from '../../components/common/OnChainReference'
import { toast } from 'sonner'
import { usePublicClient, useWatchContractEvent } from 'wagmi'
import { parseAbiItem, formatUnits } from 'viem'
import TranscriptRegistryABI from '../../contracts/TranscriptRegistry.json'
import InstitutionRegistryABI from '../../contracts/InstitutionRegistry.json'
import addresses from '../../contracts/addresses.json'

interface AuditEvent {
  id: string
  timestamp: string
  type: 'Issued' | 'Revoked' | 'Institution Added'
  actor: string
  target: string
  txHash: `0x${string}`
  blockNumber: bigint
}

const TRANSCRIPT_ADDR = addresses.transcriptRegistry as `0x${string}`
const REGISTRY_ADDR = addresses.institutionRegistry as `0x${string}`

const ISSUED_EVENT = parseAbiItem(
  'event TranscriptIssued(bytes32 indexed documentHash, address indexed issuer, string studentId, string program, uint256 timestamp)'
)
const REVOKED_EVENT = parseAbiItem(
  'event TranscriptRevoked(bytes32 indexed documentHash, address indexed revokedBy)'
)
const INSTITUTION_EVENT = parseAbiItem(
  'event InstitutionAdded(address indexed addr, string name, uint8 role)'
)

const TYPE_STYLES: Record<string, string> = {
  Issued: 'bg-blue-50 text-blue-700 border-blue-200',
  Revoked: 'bg-red-50 text-red-700 border-red-200',
  'Institution Added': 'bg-green-50 text-green-700 border-green-200',
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const publicClient = usePublicClient()

  const fetchEvents = useCallback(async () => {
    if (!publicClient) { setLoading(false); return }
    setLoading(true)
    try {
      const [issuedLogs, revokedLogs, institutionLogs] = await Promise.all([
        publicClient.getLogs({
          address: TRANSCRIPT_ADDR,
          event: ISSUED_EVENT,
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: TRANSCRIPT_ADDR,
          event: REVOKED_EVENT,
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: REGISTRY_ADDR,
          event: INSTITUTION_EVENT,
          fromBlock: 0n,
        }),
      ])

      const parsed: AuditEvent[] = []

      for (const log of issuedLogs) {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber }).catch(() => null)
        parsed.push({
          id: `issued-${log.transactionHash}-${log.logIndex}`,
          timestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString(),
          type: 'Issued',
          actor: (log.args as any).issuer ?? '',
          target: `${(log.args as any).studentId} — ${(log.args as any).program}`,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })
      }

      for (const log of revokedLogs) {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber }).catch(() => null)
        parsed.push({
          id: `revoked-${log.transactionHash}-${log.logIndex}`,
          timestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString(),
          type: 'Revoked',
          actor: (log.args as any).revokedBy ?? '',
          target: ((log.args as any).documentHash as string)?.slice(0, 18) + '...',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })
      }

      for (const log of institutionLogs) {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber }).catch(() => null)
        parsed.push({
          id: `inst-${log.transactionHash}-${log.logIndex}`,
          timestamp: block ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString(),
          type: 'Institution Added',
          actor: 'Admin',
          target: (log.args as any).name ?? (log.args as any).addr,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })
      }

      parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setEvents(parsed)
    } catch (err) {
      console.error('[AuditLog] Failed to fetch events:', err)
      toast.error('Could not load on-chain events', { description: 'Is the node running?' })
    } finally {
      setLoading(false)
    }
  }, [publicClient])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Watch for new events in real-time
  useWatchContractEvent({
    address: TRANSCRIPT_ADDR,
    abi: TranscriptRegistryABI.abi,
    eventName: 'TranscriptIssued',
    onLogs: () => fetchEvents(),
    batch: true,
  })
  useWatchContractEvent({
    address: TRANSCRIPT_ADDR,
    abi: TranscriptRegistryABI.abi,
    eventName: 'TranscriptRevoked',
    onLogs: () => fetchEvents(),
    batch: true,
  })

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Type', 'Actor', 'Target', 'Tx Hash', 'Block'].join(','),
      ...filtered.map(e =>
        [e.timestamp, e.type, e.actor, e.target, e.txHash, e.blockNumber.toString()].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcrypt-audit-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  const filtered = events.filter(evt => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      evt.actor.toLowerCase().includes(q) ||
      evt.target.toLowerCase().includes(q) ||
      evt.txHash.toLowerCase().includes(q)
    const matchesType = typeFilter ? evt.type === typeFilter : true
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network Audit Log</h1>
          <p className="text-slate-600 mt-1">
            Live on-chain events from the consortium ledger.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search address, hash, or subject..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-72"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Event Types</option>
              <option value="Issued">Issued</option>
              <option value="Revoked">Revoked</option>
              <option value="Institution Added">Institution Added</option>
            </select>
          </div>
          {!loading && (
            <span className="text-xs text-slate-400">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Event Type</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="px-6 py-4 font-medium">Target / Subject</th>
                <th className="px-6 py-4 font-medium">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-400 text-sm">Reading from chain...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(evt => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${TYPE_STYLES[evt.type] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {evt.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-700">
                        {evt.actor.startsWith('0x') ? `${evt.actor.slice(0, 8)}...${evt.actor.slice(-6)}` : evt.actor}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{evt.target}</td>
                    <td className="px-6 py-4">
                      <OnChainReference txHash={evt.txHash} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="text-slate-400 font-medium">No on-chain events found</p>
                    <p className="text-slate-400 text-xs mt-1">Issue or revoke a transcript to see events here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
