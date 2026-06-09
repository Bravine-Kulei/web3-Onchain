import React, { useState } from 'react';
import { Building2, Plus, Search, MoreVertical } from 'lucide-react';
import { UNIVERSITIES } from '../../data/mockData';
import { toast } from 'sonner';
export function MemberInstitutions() {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredUniversities = UNIVERSITIES.filter(
    (uni) =>
    uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    uni.address.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const handleAddInstitution = () => {
    toast.info('Add Institution modal would open here.');
  };
  const handleMoreOptions = () => {
    toast.info('Options menu opened.');
  };
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Member Institutions
          </h1>
          <p className="text-slate-600 mt-1">
            Manage consortium members and their roles.
          </p>
        </div>
        <button
          onClick={handleAddInstitution}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 active:scale-95">
          
          <Plus className="w-5 h-5" />
          Add Institution
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search institutions or addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
            
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Institution</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">DID / Wallet Address</th>
                <th className="px-6 py-4 font-medium">Node Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUniversities.length > 0 ?
              filteredUniversities.map((uni) =>
              <tr
                key={uni.id}
                className="hover:bg-slate-50 transition-colors">
                
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {uni.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{uni.type}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                        {uni.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {uni.address.slice(0, 10)}...{uni.address.slice(-8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                      className={`w-2 h-2 rounded-full ${uni.status === 'Online' ? 'bg-green-500' : 'bg-amber-500'}`}>
                    </div>
                        <span className="text-slate-600">{uni.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(uni.joined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                    onClick={handleMoreOptions}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                    
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
              ) :

              <tr>
                  <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-slate-500">
                  
                    No institutions found matching your search.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}