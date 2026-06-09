import React, { useState } from 'react';
import { Search, Filter, ShieldAlert } from 'lucide-react';
import { REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OnChainReference } from '../../components/common/OnChainReference';
import { toast } from 'sonner';
export function IssuedLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const issuedRequests = REQUESTS.filter((r) =>
  ['Anchored', 'Available', 'Verified', 'Revoked'].includes(r.status)
  );
  const filteredRequests = issuedRequests.filter((req) => {
    const matchesSearch =
    req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.txHash &&
    req.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? req.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });
  const handleRevokeClick = (id: string) => {
    setSelectedId(id);
    setShowRevokeModal(true);
  };
  const confirmRevoke = () => {
    setShowRevokeModal(false);
    toast.success(`Transcript ${selectedId} revoked successfully.`, {
      description: 'Revocation event broadcasted to the ledger.'
    });
  };
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Issued Transcripts Log
        </h1>
        <p className="text-slate-600 mt-1">
          A permanent record of all transcripts issued and anchored by your
          institution.
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
              
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              
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
              {filteredRequests.length > 0 ?
              filteredRequests.map((req) =>
              <tr
                key={req.id}
                className="hover:bg-slate-50 transition-colors">
                
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {req.id}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {req.student.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {req.destUni.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {req.issueDate ?
                  new Date(req.issueDate).toLocaleDateString() :
                  '-'}
                    </td>
                    <td className="px-6 py-4">
                      {req.txHash && <OnChainReference txHash={req.txHash} />}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status !== 'Revoked' &&
                  <button
                    onClick={() => handleRevokeClick(req.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-xs uppercase tracking-wider">
                    
                          Revoke
                        </button>
                  }
                    </td>
                  </tr>
              ) :

              <tr>
                  <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-slate-500">
                  
                    No issued transcripts found matching your filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal &&
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h2 className="text-xl font-bold text-slate-900">
                Revoke Transcript
              </h2>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to revoke transcript{' '}
              <span className="font-semibold text-slate-900">{selectedId}</span>
              ? This action will broadcast a revocation event to the ledger.
              Future verifications will show this document as invalid.
            </p>
            <div className="flex gap-3 justify-end">
              <button
              onClick={() => setShowRevokeModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
              
                Cancel
              </button>
              <button
              onClick={confirmRevoke}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
              
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}