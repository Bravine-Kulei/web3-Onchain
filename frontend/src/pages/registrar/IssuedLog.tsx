import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, ShieldAlert, Loader2 } from 'lucide-react'
import { StatusBadge } from '../../components/common/StatusBadge'
import { OnChainReference } from '../../components/common/OnChainReference'
import { ChainGuard } from '../../components/common/ChainGuard'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useRevokeTranscript, hashString, metadataHashInput } from '../../web3/useTranscript'
import { parseContractError } from '../../web3/errors'
import { useWalletRole } from '../../web3/useWalletRole'
import { getRequests, type TransferRequest } from '../../lib/db'
import { useSiweAuth } from '../../lib/siweAuth'
import { createRequestSync, loadPendingRequestSync, retryPendingRequestSync, type PendingRequestSync, type RequestSyncContext } from '../../lib/requestSync'

export function IssuedLog() {
  const [requests, setRequests] = useState<TransferRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null)
  const [pendingSyncs, setPendingSyncs] = useState<Record<string, PendingRequestSync>>({})
  const [retryingRequestId, setRetryingRequestId] = useState<string | null>(null)
  const [isReconciling, setIsReconciling] = useState(false)
  const [storageLoadErrors, setStorageLoadErrors] = useState<Record<string, true>>({})
  const [cleanupPending, setCleanupPending] = useState<Record<string, true>>({})
  const reconciledTransactions = useRef(new Set<string>())
  const revokeSnapshot = useRef<null | { requestId: string; context: RequestSyncContext }>(null)
  const requestLoadGeneration = useRef(0)

  const { isConnected, address, chainId } = useAccount()
  const { isIssuer, hasRegistry } = useWalletRole()
  const { isAuthenticated, signIn, requiresAuth } = useSiweAuth()
  const { revoke, isPending, isSuccess, txHash, error, hasContract } = useRevokeTranscript()
  const canRevoke = isConnected && isIssuer && hasContract && hasRegistry
  const syncContext = useMemo<RequestSyncContext | null>(
    () => address && chainId ? { chainId, account: address.toLowerCase() } : null,
    [address, chainId],
  )

  useEffect(() => {
    const generation = ++requestLoadGeneration.current
    let cancelled = false
    setLoading(true)
    setRequests([])
    setPendingSyncs({})
    setStorageLoadErrors({})
    setCleanupPending({})
    getRequests({ status: ['Anchored', 'Available', 'Verified', 'Revoked'] })
      .then(items => {
        if (cancelled || generation !== requestLoadGeneration.current) return
        setRequests(items)
        const restored: Record<string, PendingRequestSync> = {}
        const readErrors: Record<string, true> = {}
        for (const item of items) {
          if (!syncContext) { readErrors[item.request_id] = true; continue }
          const loaded = loadPendingRequestSync(item.request_id, 'Revoked', syncContext)
          if (loaded.state === 'loaded') restored[item.request_id] = loaded.pending
          if (loaded.state === 'storage-error') readErrors[item.request_id] = true
        }
        setPendingSyncs(restored)
        setStorageLoadErrors(readErrors)
      })
      .finally(() => {
        if (!cancelled && generation === requestLoadGeneration.current) setLoading(false)
      })
    return () => {
      cancelled = true
      requestLoadGeneration.current += 1
    }
  }, [syncContext])

  useEffect(() => {
    const snapshot = revokeSnapshot.current
    if (isSuccess && selectedRequest && snapshot && snapshot.requestId === selectedRequest.request_id && txHash && !reconciledTransactions.current.has(txHash)) {
      reconciledTransactions.current.add(txHash)
      setIsReconciling(true)
      createRequestSync({
        requestId: snapshot.requestId,
        status: 'Revoked',
        chainTxHash: txHash,
      }, snapshot.context).then(result => {
        setIsReconciling(false)
        if (result.state === 'synced') {
          setRequests(prev =>
            prev.map(r =>
              r.request_id === selectedRequest.request_id ? { ...r, status: 'Revoked' } : r
            )
          )
          toast.success(`Transcript ${selectedRequest.request_id} revoked`, {
            description: txHash ? `Tx: ${txHash.slice(0, 10)}...` : 'Revocation anchored on-chain.',
          })
          setShowRevokeModal(false)
          setSelectedRequest(null)
          return
        }
        setPendingSyncs(prev => ({ ...prev, [selectedRequest.request_id]: result.pending }))
        if (result.state === 'synced-storage-cleanup-pending') {
          setCleanupPending(prev => ({ ...prev, [selectedRequest.request_id]: true }))
          setRequests(prev => prev.map(r => r.request_id === selectedRequest.request_id ? { ...r, status: 'Revoked' } : r))
        }
        toast.error('Revoked on-chain; database sync is pending', {
          description: result.state === 'storage-failed'
            ? 'Keep this page open and retry; the browser could not save the retry data.'
            : 'Retry below. No second blockchain transaction will be sent.',
        })
        setShowRevokeModal(false)
        setSelectedRequest(null)
      })
    }
  }, [isSuccess, selectedRequest, txHash])

  const retryDatabaseSync = async (pending: PendingRequestSync) => {
    if (!syncContext) return
    setRetryingRequestId(pending.requestId)
    const result = await retryPendingRequestSync(pending, syncContext)
    setRetryingRequestId(null)
    if (result.state === 'synced') {
      setPendingSyncs(prev => {
        const next = { ...prev }
        delete next[pending.requestId]
        return next
      })
      setRequests(prev => prev.map(r => r.request_id === pending.requestId ? { ...r, status: 'Revoked' } : r))
      setCleanupPending(prev => {
        const next = { ...prev }
        delete next[pending.requestId]
        return next
      })
      toast.success(`Transcript ${pending.requestId} database status synchronized`)
    } else {
      setPendingSyncs(prev => ({ ...prev, [pending.requestId]: result.pending }))
      setCleanupPending(prev => {
        const next = { ...prev }
        if (result.state === 'synced-storage-cleanup-pending') next[pending.requestId] = true
        else delete next[pending.requestId]
        return next
      })
      toast.error('Database sync is still pending')
    }
  }

  useEffect(() => {
    if (error) {
      const parsed = parseContractError(error)
      toast.error(parsed.title, { description: parsed.description })
    }
  }, [error])

  const handleRevokeClick = (req: TransferRequest) => {
    const chainSuccessUnreconciled = isSuccess && !!txHash && !reconciledTransactions.current.has(txHash)
    if (isReconciling || chainSuccessUnreconciled) return
    if (pendingSyncs[req.request_id] || storageLoadErrors[req.request_id]) {
      toast.error('Database sync is pending', { description: 'Retry the existing revocation update instead of revoking again.' })
      return
    }
    if (!canRevoke) {
      toast.error('Not an authorized issuer', {
        description: 'Connect the issuing institution wallet to revoke transcripts.',
      })
      return
    }
    setSelectedRequest(req)
    setShowRevokeModal(true)
  }

  const confirmRevoke = async () => {
    if (!selectedRequest) return
    const chainSuccessUnreconciled = isSuccess && !!txHash && !reconciledTransactions.current.has(txHash)
    if (isReconciling || chainSuccessUnreconciled || pendingSyncs[selectedRequest.request_id] || storageLoadErrors[selectedRequest.request_id] || !syncContext) return
    if (!canRevoke) {
      toast.error('Not an authorized issuer')
      return
    }
    if (requiresAuth && !isAuthenticated) {
      toast.error('Sign in required', { description: 'Verify your issuer wallet via SIWE first.' })
      const ok = await signIn()
      if (!ok) return
    }

    let docHash = selectedRequest.document_hash as `0x${string}` | undefined
    if (!docHash) {
      docHash = await hashString(
        metadataHashInput(selectedRequest.request_id, selectedRequest.student_id, selectedRequest.program)
      )
    }
    revokeSnapshot.current = { requestId: selectedRequest.request_id, context: syncContext }
    revoke(docHash)
  }

  const filtered = requests.filter(req => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      req.request_id.toLowerCase().includes(q) ||
      (req.tx_hash ?? '').toLowerCase().includes(q) ||
      req.student_name.toLowerCase().includes(q)
    const matchesStatus = statusFilter ? req.status === statusFilter : true
    return matchesSearch && matchesStatus
  })

  return (
    <ChainGuard>
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issued Transcripts Log</h1>
        <p className="text-slate-600 mt-1">
          Permanent record of all transcripts anchored by your institution.
        </p>
        {!canRevoke && isConnected && (
          <p className="text-sm text-amber-700 mt-2">
            Connect an authorized issuer wallet to revoke transcripts on-chain.
          </p>
        )}
      </div>

      {Object.values(pendingSyncs).map(pending => (
        <div key={pending.requestId} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <div className="font-semibold">
            {cleanupPending[pending.requestId]
              ? `Database sync succeeded for ${pending.requestId}, but saved retry metadata could not be cleared.`
              : `Revocation confirmed on-chain; database sync pending for ${pending.requestId}.`}
          </div>
          <div className="mt-1">Transaction: <span className="font-mono break-all">{pending.chainTxHash}</span></div>
          <p className="mt-1">{cleanupPending[pending.requestId]
            ? 'The chain and database are authoritative. Retry only clears local session metadata.'
            : 'Retry updates Supabase only and will not broadcast another revocation.'}</p>
          <button onClick={() => retryDatabaseSync(pending)} disabled={retryingRequestId === pending.requestId}
            className="mt-3 rounded-lg bg-amber-900 px-4 py-2 font-medium text-white disabled:opacity-60">
            {retryingRequestId === pending.requestId ? 'Retrying...' : cleanupPending[pending.requestId] ? 'Clear saved retry metadata' : 'Retry database sync'}
          </button>
        </div>
      ))}

      {Object.keys(storageLoadErrors).length > 0 && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-950">
          <div className="font-semibold">Some pending revocation sync state could not be read from this browser.</div>
          <p className="mt-1">Revocation is disabled for: {Object.keys(storageLoadErrors).join(', ')}. Restore session storage access, then reload.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, hash, or student..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Anchored">Anchored</option>
              <option value="Available">Available</option>
              <option value="Verified">Verified</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Transcript ID</th>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Destination</th>
                <th className="px-6 py-4 font-medium">Issue Date</th>
                <th className="px-6 py-4 font-medium">On-Chain Ref</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(req => (
                  <tr key={req.request_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{req.request_id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{req.student_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{req.student_id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.dest_institution}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {req.issue_date ? new Date(req.issue_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {req.tx_hash && <OnChainReference txHash={req.tx_hash as `0x${string}`} />}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status !== 'Revoked' && (
                        <button
                          onClick={() => handleRevokeClick(req)}
                          disabled={!canRevoke || isReconciling || (isSuccess && !!txHash && !reconciledTransactions.current.has(txHash)) || !!pendingSyncs[req.request_id] || !!storageLoadErrors[req.request_id]}
                          className="text-red-600 hover:text-red-800 font-medium text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {pendingSyncs[req.request_id] ? 'Sync pending' : storageLoadErrors[req.request_id] ? 'Storage unavailable' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No issued transcripts found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showRevokeModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">Revoke Transcript</h2>
            </div>
            <p className="text-slate-600 mb-2">
              You are about to revoke{' '}
              <span className="font-semibold text-slate-900">{selectedRequest.request_id}</span>{' '}
              for <span className="font-semibold">{selectedRequest.student_name}</span>.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              This broadcasts an irreversible revocation event to the consortium ledger. Future verifications will flag this credential as invalid.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRevokeModal(false)}
                disabled={isPending}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                disabled={isPending || isReconciling || (isSuccess && !!txHash && !reconciledTransactions.current.has(txHash)) || !canRevoke}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Broadcasting...</>
                ) : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ChainGuard>
  )
}
