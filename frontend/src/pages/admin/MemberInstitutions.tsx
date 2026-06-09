import React, { useState, useEffect } from 'react'
import { Building2, Plus, Search, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { isAddress } from 'viem'
import InstitutionRegistryABI from '../../contracts/InstitutionRegistry.json'
import addresses from '../../contracts/addresses.json'
import { useWalletRole } from '../../web3/useWalletRole'

const REGISTRY = {
  address: addresses.institutionRegistry as `0x${string}`,
  abi: InstitutionRegistryABI.abi,
}

const ROLE_LABELS: Record<number, string> = { 0: 'None', 1: 'Issuer', 2: 'Verifier', 3: 'Both' }

interface Institution {
  address: string
  name: string
  role: number
  active: boolean
  joinedAt: number
}

export function MemberInstitutions() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Add form state
  const [newAddr, setNewAddr] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState(3) // Both

  const publicClient = usePublicClient()
  const { isAdmin } = useWalletRole()
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const fetchInstitutions = async () => {
    if (!publicClient) { setLoading(false); return }
    try {
      const addrs = await publicClient.readContract({
        ...REGISTRY,
        functionName: 'getAll',
      }) as string[]

      const details = await Promise.all(
        addrs.map(addr =>
          publicClient.readContract({
            ...REGISTRY,
            functionName: 'institutions',
            args: [addr],
          }).then((data: any) => ({
            address: addr,
            name: data[0] as string,
            role: Number(data[1]),
            active: data[2] as boolean,
            joinedAt: Number(data[3]) * 1000,
          }))
        )
      )
      setInstitutions(details.filter(i => i.active))
    } catch (err) {
      console.error('[MemberInstitutions]', err)
      toast.error('Failed to load institutions from chain')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInstitutions() }, [publicClient])

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Institution added`, { description: newName })
      setShowAddModal(false)
      setNewAddr(''); setNewName(''); setNewRole(3)
      fetchInstitutions()
    }
  }, [isSuccess])

  useEffect(() => {
    if (writeError) toast.error('Transaction failed', { description: (writeError as Error).message })
  }, [writeError])

  const handleAdd = () => {
    if (!isAddress(newAddr)) { toast.error('Invalid wallet address'); return }
    if (!newName.trim()) { toast.error('Institution name required'); return }
    writeContract({
      ...REGISTRY,
      functionName: 'addInstitution',
      args: [newAddr, newName, newRole],
    })
  }

  const filtered = institutions.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Member Institutions</h1>
          <p className="text-slate-600 mt-1">Consortium members registered on-chain.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Institution
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search institutions or addresses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Institution</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Wallet Address</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(inst => (
                  <tr key={inst.address} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-slate-900">{inst.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                        {ROLE_LABELS[inst.role] ?? 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {inst.address.slice(0, 10)}...{inst.address.slice(-8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {inst.active ? (
                          <><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-green-700 text-sm">Active</span></>
                        ) : (
                          <><div className="w-2 h-2 rounded-full bg-slate-400" /><span className="text-slate-500 text-sm">Inactive</span></>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {inst.joinedAt ? new Date(inst.joinedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 font-medium">No institutions registered yet</p>
                    {isAdmin && <p className="text-slate-400 text-xs mt-1">Add the first institution using the button above.</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Institution Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add Institution</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Institution Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Strathmore University"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Wallet Address</label>
                <input
                  type="text"
                  value={newAddr}
                  onChange={e => setNewAddr(e.target.value)}
                  placeholder="0x..."
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 ${
                    newAddr && !isAddress(newAddr) ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
                {newAddr && !isAddress(newAddr) && (
                  <p className="text-xs text-red-600 mt-1">Invalid Ethereum address</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value={1}>Issuer — can anchor transcripts</option>
                  <option value={2}>Verifier — can verify transcripts</option>
                  <option value={3}>Both — issuer and verifier</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={isPending || !newName || !isAddress(newAddr)}
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : 'Add Institution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
