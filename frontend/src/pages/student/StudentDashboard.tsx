import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Loader2, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { StatusBadge } from '../../components/common/StatusBadge';
import { getRequests, type TransferRequest } from '../../lib/db';

export function StudentDashboard() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRequests(address ? { studentWallet: address } : undefined)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [address]);

  const activeRequests = useMemo(
    () => requests.filter(r => !['Verified', 'Revoked'].includes(r.status)),
    [requests]
  );
  const completedRequests = useMemo(
    () => requests.filter(r => r.status === 'Verified'),
    [requests]
  );
  const credentials = useMemo(
    () => requests.filter(r => ['Anchored', 'Available', 'Verified'].includes(r.status)),
    [requests]
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Records
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your academic records and transfer requests.
          </p>
        </div>
        <button
          onClick={() => navigate('/student/new-transfer')}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Request New Transfer
        </button>
      </div>

      {!isConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-sm">
          <Wallet className="w-5 h-5 shrink-0" />
          Connect your wallet to see only your own requests. Showing all requests in the meantime.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-2">
            Active Requests
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {activeRequests.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-2">
            Completed Transfers
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {completedRequests.length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500 mb-2">
            My Credentials
          </div>
          <div className="text-3xl font-bold text-slate-900">{credentials.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            My Transfer Requests
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Request ID</th>
                <th className="px-6 py-4 font-medium">Destination</th>
                <th className="px-6 py-4 font-medium">Program</th>
                <th className="px-6 py-4 font-medium">Submitted</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <tr
                    key={req.request_id}
                    onClick={() => navigate(`/student/request/${req.request_id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-medium text-blue-600 group-hover:text-blue-800">
                      {req.request_id}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      {req.dest_institution}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.program}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(req.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No transfer requests yet. Start by requesting a new transfer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          My Credentials
        </h2>
        {credentials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((cred) => (
              <div
                key={cred.request_id}
                onClick={() => navigate(`/student/request/${cred.request_id}`)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <StatusBadge status={cred.status} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {cred.program}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {cred.source_institution}
                  </p>
                  <div className="text-xs text-slate-400">
                    {cred.issue_date
                      ? `Issued: ${new Date(cred.issue_date).toLocaleDateString()}`
                      : 'Pending anchor'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No anchored credentials yet. Approved transfers will appear here once anchored on-chain.
          </div>
        )}
      </div>
    </div>);
}
