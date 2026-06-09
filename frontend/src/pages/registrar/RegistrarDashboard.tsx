import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, Search, Filter } from 'lucide-react';
import { REQUESTS } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
export function RegistrarDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const pendingRequests = REQUESTS.filter(
    (r) => r.status === 'Pending' || r.status === 'Under Review'
  );
  const filteredRequests = REQUESTS.filter((req) => {
    const matchesSearch =
    req.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? req.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Registrar Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          Manage outgoing transcript transfer requests.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">
              {pendingRequests.length}
            </div>
            <div className="text-sm font-medium text-slate-500">
              Pending Approvals
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">142</div>
            <div className="text-sm font-medium text-slate-500">
              Issued This Month
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">8,405</div>
            <div className="text-sm font-medium text-slate-500">
              Total Issued
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Incoming Requests Queue
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" />
              
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Verified">Verified</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Request ID</th>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Program</th>
                <th className="px-6 py-4 font-medium">Destination</th>
                <th className="px-6 py-4 font-medium">Date</th>
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
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {req.student.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {req.student.studentId}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{req.program}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {req.destUni.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(req.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'Pending' ||
                  req.status === 'Under Review' ?
                  <Link
                    to={`/registrar/review/${req.id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-medium transition-colors">
                    
                          Review
                        </Link> :

                  <span className="text-slate-400">Processed</span>
                  }
                    </td>
                  </tr>
              ) :

              <tr>
                  <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-slate-500">
                  
                    No requests found matching your filters.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}