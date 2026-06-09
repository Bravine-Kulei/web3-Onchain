import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  CheckCircle2,
  QrCode,
  ExternalLink } from
'lucide-react';
import { REQUESTS, STUDENTS, UNIVERSITIES } from '../../data/mockData';
import { StatusBadge } from '../../components/common/StatusBadge';
import { toast } from 'sonner';
export function StudentDashboard() {
  const navigate = useNavigate();
  const student = STUDENTS[0]; // Mock logged-in student
  const myRequests = REQUESTS.filter((r) => r.student.id === student.id);
  const activeRequests = myRequests.filter(
    (r) => !['Verified', 'Revoked'].includes(r.status)
  );
  const completedRequests = myRequests.filter((r) => r.status === 'Verified');
  const handleShareQR = () => {
    toast.success('QR Code ready to share', {
      description: 'A verifiable link has been copied to your clipboard.'
    });
  };
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {student.name}
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
          <div className="text-3xl font-bold text-slate-900">1</div>
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
              {myRequests.map((req) =>
              <tr
                key={req.id}
                onClick={() => navigate(`/student/request/${req.id}`)}
                className="hover:bg-slate-50 transition-colors cursor-pointer group">
                
                  <td className="px-6 py-4 font-medium text-blue-600 group-hover:text-blue-800">
                    {req.id}
                  </td>
                  <td className="px-6 py-4 text-slate-900">
                    {req.destUni.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{req.program}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {new Date(req.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.status} />
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
                <StatusBadge status="Verified" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                BSc Computer Science
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {UNIVERSITIES[0].name}
              </p>
              <div className="text-xs text-slate-400">Issued: Oct 26, 2023</div>
            </div>
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4" />
                Share QR
              </button>
              <button className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                View Record
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>);

}