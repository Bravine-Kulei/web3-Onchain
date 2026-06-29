import { useEffect, useState } from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OnChainReference } from '../../components/common/OnChainReference';
import { toast } from 'sonner';
import { getVerifications, type VerificationRecord, type VerifyResultValue } from '../../lib/db';

const RESULT_LABELS: Record<VerifyResultValue, 'Verified' | 'Tampered' | 'Revoked' | 'Not Found'> = {
  VERIFIED: 'Verified',
  TAMPERED: 'Tampered',
  REVOKED: 'Revoked',
  NOT_FOUND: 'Not Found',
};

export function VerificationHistory() {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  useEffect(() => {
    getVerifications()
      .then(setVerifications)
      .finally(() => setLoading(false));
  }, []);

  const filtered = verifications.filter(v => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (v.transcript_input ?? '').toLowerCase().includes(q) ||
      (v.request_id ?? '').toLowerCase().includes(q) ||
      (v.student_name ?? '').toLowerCase().includes(q);
    const matchesResult = resultFilter ? RESULT_LABELS[v.result] === resultFilter : true;
    return matchesSearch && matchesResult;
  });

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const header = ['Date', 'Transcript ID/Input', 'Student', 'Issuing Institution', 'Result', 'Doc Hash', 'Tx Hash'];
    const rows = filtered.map(v => [
      new Date(v.created_at).toISOString(),
      v.request_id || v.transcript_input || '',
      v.student_name || '',
      v.source_institution || '',
      RESULT_LABELS[v.result],
      v.doc_hash || '',
      v.tx_hash || '',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported CSV');
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Verification History
          </h1>
          <p className="text-slate-600 mt-1">
            Log of all incoming transcripts verified by your institution.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
            </div>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Results</option>
              <option value="Verified">Verified</option>
              <option value="Tampered">Tampered</option>
              <option value="Revoked">Revoked</option>
              <option value="Not Found">Not Found</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Date/Time</th>
                <th className="px-6 py-4 font-medium">Transcript ID / Input</th>
                <th className="px-6 py-4 font-medium">Issuing Institution</th>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Result</th>
                <th className="px-6 py-4 font-medium">On-Chain Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(v.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {v.request_id || v.transcript_input || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {v.source_institution || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {v.student_name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={RESULT_LABELS[v.result]} />
                    </td>
                    <td className="px-6 py-4">
                      {v.tx_hash ? (
                        <OnChainReference txHash={v.tx_hash} />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No verification records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
