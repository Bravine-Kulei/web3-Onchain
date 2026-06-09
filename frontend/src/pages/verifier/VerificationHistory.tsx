import React, { useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { VERIFICATIONS } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OnChainReference } from '../../components/common/OnChainReference';
import { toast } from 'sonner';
export function VerificationHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const filteredVerifications = VERIFICATIONS.filter((v) => {
    const matchesSearch =
    v.transcriptId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesResult = resultFilter ? v.result === resultFilter : true;
    return matchesSearch && matchesResult;
  });
  const handleExport = () => {
    toast.success('Exporting CSV...', {
      description: 'Your download will begin shortly.'
    });
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
                <th className="px-6 py-4 font-medium">Transcript ID</th>
                <th className="px-6 py-4 font-medium">Issuing Institution</th>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Result</th>
                <th className="px-6 py-4 font-medium">On-Chain Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVerifications.length > 0 ?
              filteredVerifications.map((v) =>
              <tr
                key={v.id}
                className="hover:bg-slate-50 transition-colors">
                
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(v.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {v.transcriptId}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {v.issuer.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {v.student.name}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={v.result as any} />
                    </td>
                    <td className="px-6 py-4">
                      {v.txHash ?
                  <OnChainReference txHash={v.txHash} /> :

                  <span className="text-slate-400">-</span>
                  }
                    </td>
                  </tr>
              ) :

              <tr>
                  <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-slate-500">
                  
                    No verification records found matching your filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}