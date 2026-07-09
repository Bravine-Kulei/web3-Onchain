import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Building, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LifecycleStepper, LifecycleStage } from '../../components/common/LifecycleStepper';
import { OnChainReference } from '../../components/common/OnChainReference';
import { getRequestById, type TransferRequest } from '../../lib/db';

export function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getRequestById(id)
      .then(setRequest)
      .finally(() => setLoading(false));
  }, [id]);

  const getStage = (status: string): LifecycleStage => {
    if (status === 'Pending' || status === 'Rejected') return 'Requested';
    if (status === 'Revoked' || status === 'Tampered') return 'Anchored';
    return status as LifecycleStage;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-semibold text-slate-900">Request not found</h1>
        <Link to="/student/dashboard" className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-medium">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const currentStage = getStage(request.status);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Link
          to="/student/dashboard"
          className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{request.request_id}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-slate-500 mt-1">
            Requested on {new Date(request.submitted_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {request.status === 'Rejected' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-rose-900">Request Declined</h3>
            <p className="text-rose-800 text-sm mt-1">
              The registrar at {request.source_institution} declined this transfer request.
              You may submit a new request if you believe this was in error.
            </p>
          </div>
        </div>
      )}

      {request.status === 'Verified' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Transfer Complete</h3>
            <p className="text-green-800 text-sm mt-1">
              Your transcript has been successfully verified by{' '}
              {request.dest_institution}. No further action is required.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-8">
          Transfer Progress
        </h2>
        <LifecycleStepper currentStage={currentStage} history={request.history} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Request Details
          </h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-500 mb-1">
                Program / Record
              </div>
              <div className="font-medium text-slate-900">
                {request.program}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  Sending Institution
                </div>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  {request.source_institution}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  Receiving Institution
                </div>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  {request.dest_institution}
                </div>
              </div>
            </div>
          </div>
        </div>

        {request.tx_hash && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              On-Chain Record
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  Document Fingerprint (Hash)
                </div>
                <div className="font-mono text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 break-all">
                  {request.document_hash}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  Transaction Reference
                </div>
                <OnChainReference
                  txHash={request.tx_hash}
                  blockNumber={request.block_number} />
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Anchored Date</div>
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {request.issue_date
                    ? new Date(request.issue_date).toLocaleString()
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Activity Log</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[...request.history].reverse().map((event, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5"></div>
                  {index !== request.history.length - 1 && (
                    <div className="w-px h-full bg-slate-200 my-1"></div>
                  )}
                </div>
                <div className="pb-6">
                  <div className="font-medium text-slate-900">
                    {event.stage}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>);
}
