import { useState, useEffect } from 'react'
import { Search, ShieldAlert, Loader2 } from 'lucide-react'
import { StatusBadge } from '../../components/common/StatusBadge'
import { OnChainReference } from '../../components/common/OnChainReference'
import { toast } from 'sonner'
import { keccak256, toBytes } from 'viem'
import { useRevokeTranscript } from '../../web3/useTranscript'
import { getRequests, updateRequestStatus, type TransferRequest } from '../../lib/db'

export function IssuedLog() {
  const [requests, setRequests] = useState<TransferRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null)

  const { revoke, isPending, isSuccess, txHash, error } = useRevokeTranscript()

  useEffect(() => {
    getRequests({ status: ['Anchored', 'Available', 'Verified', 'Revoked'] })
      .then(setRequests)
      .finally(() => setLoading(false))
  }, [])

  // After successful revoke — update status in DB and refresh UI
  useEffect(() => {
    if (isSuccess && selectedRequest) {
      updateRequestStatus(selectedRequest.request_id, 'Revoked', { tx_hash: txHash })
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
    }
  }, [isSuccess])

  useEffect(() => {
    if (error) {
      toast.error('Revocation failed', { description: (error as Error).message })
    }
  }, [error])

  const handleRevokeClick = (req: TransferRequest) => {
    setSelectedRequest(req)
    setShowRevokeModal(true)
  }

  const confirmRevoke = () => {
    if (!selectedRequest) return
    // Reconstruct the same hash used during issuance
    const docHash = selectedRequest.document_hash as `0x${string}` ||
      keccak256(toBytes(`${selectedRequest.request_id}:${selectedRequest.student_id}:${selectedRequest.program}`))
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
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issued Transcripts Log</h1>
        <p className="text-slate-600 mt-1">
          Permanent record of all transcripts anchored by your institution.
        </p>
      </div>

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
                          className="text-red-600 hover:text-red-800 font-medium text-xs uppercase tracking-wider"
                        >
                          Revoke
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

      {/* Revoke Modal */}
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
                disabled={isPending}
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
  )
}
