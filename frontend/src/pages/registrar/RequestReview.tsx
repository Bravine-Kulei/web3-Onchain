import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, ShieldCheck, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnChainReference } from '../../components/common/OnChainReference';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { keccak256, toBytes, isAddress, zeroAddress } from 'viem';
import { useIssueTranscript, hashFile } from '../../web3/useTranscript';
import { uploadToIPFS, isPinataConfigured } from '../../lib/pinata';
import { updateRequestStatus, getRequestById, type TransferRequest } from '../../lib/db';

export function RequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  const [request, setRequest] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [issueStep, setIssueStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [docHash, setDocHash] = useState<`0x${string}`>('0x');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [ipfsCid, setIpfsCid] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { issue, isPending, isSuccess, txHash, error } = useIssueTranscript();

  useEffect(() => {
    if (!id) return;
    getRequestById(id)
      .then(setRequest)
      .finally(() => setLoading(false));
  }, [id]);

  // Default hash from request metadata (used when no file uploaded)
  useEffect(() => {
    if (!request) return;
    const hash = keccak256(toBytes(`${request.request_id}:${request.student_id}:${request.program}`));
    setDocHash(hash);
  }, [request]);

  // When a file is selected, compute its real SHA-256 hash
  useEffect(() => {
    if (!uploadedFile) return;
    hashFile(uploadedFile).then(setDocHash);
  }, [uploadedFile]);

  useEffect(() => {
    if (isSuccess && request) {
      updateRequestStatus(request.request_id, 'Anchored', {
        tx_hash: txHash,
        document_hash: docHash,
        ipfs_cid: ipfsCid,
        issue_date: new Date().toISOString(),
      });
      setIssueStep(0);
      setShowSuccess(true);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      toast.error('Transaction failed', { description: (error as Error).message });
      setIssueStep(0);
    }
  }, [error]);

  const handleApprove = async () => {
    if (!request) return;
    if (!isConnected) {
      toast.error('Connect your wallet first');
      return;
    }
    setIssueStep(1);
    const finalHash = docHash;

    // If a file was uploaded and Pinata is configured, upload to IPFS first
    if (uploadedFile && isPinataConfigured) {
      try {
        setIssueStep(2);
        const { cid } = await uploadToIPFS(uploadedFile);
        setIpfsCid(cid);
        toast.success('Document uploaded to IPFS', { description: `CID: ${cid.slice(0, 16)}...` });
      } catch {
        toast.error('IPFS upload failed — anchoring hash only');
      }
    }

    setIssueStep(3);
    const recipient =
      request.dest_institution_address && isAddress(request.dest_institution_address)
        ? (request.dest_institution_address as `0x${string}`)
        : zeroAddress;
    issue(finalHash, recipient, request.student_id, request.program);
  };

  const handleReject = () => {
    if (!request) return;
    toast.error('Request Rejected', {
      description: `Transfer request ${request.request_id} has been declined.`,
    });
    navigate('/registrar/dashboard');
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
        <p className="text-slate-500 mt-2">This request may have been removed.</p>
        <Link to="/registrar/dashboard" className="inline-block mt-6 text-blue-600 hover:text-blue-800 font-medium">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/registrar/dashboard"
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Review Request {request.request_id}
            </h1>
            <p className="text-slate-500 mt-1">
              Submitted on {new Date(request.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95">
            <X className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending || showSuccess}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-80 active:scale-95 min-w-[180px] justify-center">
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {issueStep === 1 ? 'Hashing...' : issueStep === 2 ? 'Uploading...' : 'Confirming...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Approve & Issue
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Student Details
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">Full Name</div>
                <div className="font-medium text-slate-900">
                  {request.student_name}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Student ID</div>
                <div className="font-medium text-slate-900">
                  {request.student_id}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Program</div>
                <div className="font-medium text-slate-900">
                  {request.program}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Source Institution</div>
                <div className="font-medium text-slate-900">
                  {request.source_institution}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Transfer Details
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  Destination Institution
                </div>
                <div className="font-medium text-slate-900">
                  {request.dest_institution}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Consent</div>
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 p-2 rounded border border-green-100">
                  <Check className="w-4 h-4" />
                  Student consent verified
                </div>
              </div>
            </div>
          </div>

          {/* Document attach (optional, for real hashing + IPFS) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Transcript Document
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.json"
              onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}
            />
            {uploadedFile ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-slate-700 truncate">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">{uploadedFile.name}</span>
                </span>
                <button onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-red-600 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                <UploadCloud className="w-4 h-4 text-slate-400" />
                Attach document to hash (optional)
              </button>
            )}
            <p className="text-xs text-slate-400 mt-3 break-all">
              Hash to anchor: <span className="font-mono">{docHash.slice(0, 18)}...</span>
            </p>
          </div>
        </div>

        {/* Right Column: Document Preview */}
        <div className="lg:col-span-2">
          <div className="bg-slate-100 rounded-xl border border-slate-200 p-8 h-full min-h-[600px] flex flex-col items-center">
            <div className="w-full max-w-2xl bg-white shadow-md border border-slate-200 p-12 aspect-[1/1.4] relative">
              {/* Fake Transcript Content */}
              <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
                <h1 className="text-2xl font-serif font-bold text-slate-900 uppercase">
                  {request.source_institution}
                </h1>
                <p className="text-slate-600 font-serif mt-2">
                  OFFICIAL ACADEMIC TRANSCRIPT
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
                <div>
                  <p>
                    <span className="font-semibold">Name:</span>{' '}
                    {request.student_name}
                  </p>
                  <p>
                    <span className="font-semibold">Student ID:</span>{' '}
                    {request.student_id}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-semibold">Program:</span>{' '}
                    {request.program}
                  </p>
                  <p>
                    <span className="font-semibold">Date Issued:</span>{' '}
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2 font-semibold text-sm">
                  Year 1 - Semester 1
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-1 text-slate-600">CSC 111</td>
                      <td className="py-1">Intro to Programming</td>
                      <td className="py-1 text-right">A</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">MAT 111</td>
                      <td className="py-1">Calculus I</td>
                      <td className="py-1 text-right">B+</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-600">PHY 111</td>
                      <td className="py-1">Physics for CS</td>
                      <td className="py-1 text-right">A-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <ShieldCheck className="w-96 h-96" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-center relative overflow-hidden">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-5 backdrop-blur-md border border-white/20 shadow-inner">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Transcript Anchored
                </h2>
                <p className="text-blue-100 text-sm">
                  The document has been securely sealed and anchored on-chain.
                </p>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Document Fingerprint
                  </div>
                  <div className="font-mono text-xs text-slate-700 break-all">
                    {docHash}
                  </div>
                </div>
                {txHash && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      On-Chain Reference
                    </div>
                    <OnChainReference txHash={txHash} />
                  </div>
                )}
                <div className="pt-2 flex gap-4">
                  <button
                    onClick={() => navigate('/registrar/dashboard')}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors active:scale-95">
                    Back to Queue
                  </button>
                  <button
                    onClick={() => navigate('/registrar/issued')}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors active:scale-95 shadow-sm">
                    View Issued Log
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>);
}
