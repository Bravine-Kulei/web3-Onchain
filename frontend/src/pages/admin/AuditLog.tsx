import React, { useState } from 'react';
import { Search, Filter, Download, ActivitySquare } from 'lucide-react';
import { AUDIT_EVENTS } from '../../data/mockData';
import { OnChainReference } from '../../components/common/OnChainReference';
import { toast } from 'sonner';
export function AuditLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const filteredEvents = AUDIT_EVENTS.filter((evt) => {
    const matchesSearch =
    evt.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evt.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
    evt.txHash &&
    evt.txHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter ? evt.type === typeFilter : true;
    return matchesSearch && matchesType;
  });
  const handleExport = () => {
    toast.success('Exporting Audit Log...', {
      description: 'Your secure CSV download will begin shortly.'
    });
  };
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Network Audit Log
          </h1>
          <p className="text-slate-600 mt-1">
            Immutable record of all consortium network events.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95">
          
          <Download className="w-4 h-4" />
          Export Log
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, hashes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
              
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              
              <option value="">All Event Types</option>
              <option value="Issued">Issued</option>
              <option value="Verified">Verified</option>
              <option value="Verification Failed">Verification Failed</option>
              <option value="Revoked">Revoked</option>
              <option value="Institution Added">Institution Added</option>
              <option value="Role Granted">Role Granted</option>
              <option value="Node Joined">Node Joined</option>
              <option value="Consensus Round">Consensus Round</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Event Type</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="px-6 py-4 font-medium">Target / Subject</th>
                <th className="px-6 py-4 font-medium">Transaction Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length > 0 ?
              filteredEvents.map((evt) =>
              <tr
                key={evt.id}
                className="hover:bg-slate-50 transition-colors">
                
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border
                        ${evt.type === 'Issued' ? 'bg-blue-50 text-blue-700 border-blue-200' : evt.type === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' : evt.type === 'Revoked' || evt.type === 'Verification Failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'}
                      `}>
                    
                        {evt.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {evt.actor}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{evt.target}</td>
                    <td className="px-6 py-4">
                      <OnChainReference txHash={evt.txHash} />
                    </td>
                  </tr>
              ) :

              <tr>
                  <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-slate-500">
                  
                    No events found matching your filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}