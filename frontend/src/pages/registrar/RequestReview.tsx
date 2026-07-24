import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, ShieldCheck, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnChainReference } from '../../components/common/OnChainReference';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { ChainGuard } from '../../components/common/ChainGuard';
import { parseContractError } from '../../web3/errors';
import { useWalletRole } from '../../web3/useWalletRole';
import { useIssueTranscript, hashFile, hashString, metadataHashInput } from '../../web3/useTranscript';
import { updateRequestStatus, getRequestById, type TransferRequest } from '../../lib/db';
import { SecureWriteError } from '../../lib/secureApi';
import { useSiweAuth } from '../../lib/siweAuth';
import { createRequestSync, loadPendingRequestSync, retryPendingRequestSync, type PendingRequestSync, type RequestSyncContext } from '../../lib/requestSync';

export function RequestReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isConnected, address, chainId } = useAccount();
  const { isIssuer, hasRegistry } = useWalletRole();
  const { isAuthenticated, signIn, requiresAuth } = useSiweAuth();

  const [request, setRequest] = useState<TransferRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [issueStep, setIssueStep] = useState(0);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [docHash, setDocHash] = useState<`0x${string}`>('0x');
  const [isHashing, setIsHashing] = useState(true);
  const [hashError, setHashError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pendingSync, setPendingSync] = useState<PendingRequestSync | null>(null);
  const [syncStorageFailed, setSyncStorageFailed] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [storageLoadError, setStorageLoadError] = useState(false);
  const [syncCleanupPending, setSyncCleanupPending] = useState(false);
  const [isPreparingIssue, setIsPreparingIssue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reconciledTransactions = useRef(new Set<string>());
  const issuedRequestId = useRef<string | null>(null);
  const fetchGeneration = useRef(0);
  const hashGeneration = useRef(0);
  const issueSnapshot = useRef<null | { requestId: string; docHash: `0x${string}`; issueDate: string; context: RequestSyncContext; uiGeneration: number }>(null);
  const syncContext = useMemo<RequestSyncContext | null>(
    () => address && chainId ? { chainId, account: address.toLowerCase() } : null,
    [address, chainId],
  );
  const latestSyncContext = useRef<RequestSyncContext | null>(syncContext);
  const latestRequestId = useRef<string | null>(request?.request_id ?? null);
  const latestDocHash = useRef<`0x${string}`>(docHash);
  latestSyncContext.current = syncContext;
  latestRequestId.current = request?.request_id ?? null;
  latestDocHash.current = docHash;

  const { issue, isPending, isSuccess, txHash, error, hasContract } = useIssueTranscript();

  useEffect(() => {
    if (!id) return;
    const generation = ++fetchGeneration.current;
    setLoading(true);
    setRequest(null);
    setUploadedFile(null);
    setDocHash('0x');
    hashGeneration.current += 1;
    setIsHashing(true);
    setHashError('');
    setIssueStep(0);
    setPendingSync(null);
    setStorageLoadError(false);
    setSyncStorageFailed(false);
    setSyncCleanupPending(false);
    setShowSuccess(false);
    getRequestById(id)
      .then(value => {
        if (generation !== fetchGeneration.current) return;
        setRequest(value);
        if (value) {
          if (!syncContext) { setStorageLoadError(true); return; }
          const loaded = loadPendingRequestSync(value.request_id, 'Anchored', syncContext);
          if (loaded.state === 'loaded') setPendingSync(loaded.pending);
          if (loaded.state === 'storage-error') setStorageLoadError(true);
        }
      })
      .catch(() => { if (generation === fetchGeneration.current) setStorageLoadError(true); })
      .finally(() => { if (generation === fetchGeneration.current) setLoading(false); });
    return () => { fetchGeneration.current += 1; };
  }, [id, syncContext]);

  // Hash exactly the current source. A prior metadata/file hash is invalid immediately on source change.
  useEffect(() => {
    if (!request) return;
    const generation = ++hashGeneration.current;
    setDocHash('0x');
    setIsHashing(true);
    setHashError('');
    const operation = uploadedFile
      ? hashFile(uploadedFile)
      : hashString(metadataHashInput(request.request_id, request.student_id, request.program));
    operation
      .then(value => {
        if (generation !== hashGeneration.current) return;
        setDocHash(value);
        setIsHashing(false);
      })
      .catch(() => {
        if (generation !== hashGeneration.current) return;
        const message = uploadedFile ? 'Failed to hash uploaded file' : 'Failed to compute document hash';
        setHashError(message);
        setIsHashing(false);
        toast.error(message);
      });
    return () => { hashGeneration.current += 1; };
  }, [request, uploadedFile]);

  useEffect(() => {
    const snapshot = issueSnapshot.current;
    if (!isSuccess || !snapshot || !txHash || reconciledTransactions.current.has(txHash)) return;
    reconciledTransactions.current.add(txHash);
    setIsReconciling(true);
    const update = {
      tx_hash: txHash,
      document_hash: snapshot.docHash,
      issue_date: snapshot.issueDate,
    };
    void createRequestSync({ requestId: snapshot.requestId, status: 'Anchored', chainTxHash: txHash, update }, snapshot.context)
      .then(result => {
        const mayUpdateCurrentUi = fetchGeneration.current === snapshot.uiGeneration;
        if (issueSnapshot.current === snapshot) issueSnapshot.current = null;
        if (issuedRequestId.current === snapshot.requestId) issuedRequestId.current = null;
        setIsReconciling(false);
        setIsPreparingIssue(false);
        if (!mayUpdateCurrentUi) return;
        setIssueStep(0);
        if (result.state === 'synced') {
          setPendingSync(null);
          setSyncCleanupPending(false);
          setRequest(current => current ? { ...current, status: 'Anchored', ...update } : current);
          setShowSuccess(true);
          return;
        }
        setPendingSync(result.pending);
        setSyncCleanupPending(result.state === 'synced-storage-cleanup-pending');
        setSyncStorageFailed(result.state === 'storage-failed' || result.state === 'synced-storage-cleanup-pending');
        if (result.state === 'synced-storage-cleanup-pending') {
          setRequest(current => current ? { ...current, status: 'Anchored', ...update } : current);
        }
        toast.error('Anchored on-chain; database sync is pending', {
          description: 'Retry below. No second blockchain transaction will be sent.',
        });
      });
  }, [isSuccess, txHash]);

  const retryDatabaseSync = async () => {
    if (!pendingSync) return;
    if (!syncContext) { setStorageLoadError(true); return; }
    setIsRetryingSync(true);
    const result = await retryPendingRequestSync(pendingSync, syncContext);
    setIsRetryingSync(false);
    if (result.state === 'synced') {
      setPendingSync(null);
      setSyncStorageFailed(false);
      setSyncCleanupPending(false);
      setRequest(current => current ? {
        ...current,
        status: 'Anchored',
        ...(pendingSync.status === 'Anchored' ? pendingSync.update : {}),
      } : current);
      setShowSuccess(true);
      toast.success('Database status synchronized');
    } else {
      setPendingSync(result.pending);
      setSyncCleanupPending(result.state === 'synced-storage-cleanup-pending');
      setSyncStorageFailed(result.state === 'storage-failed' || result.state === 'synced-storage-cleanup-pending');
      toast.error('Database sync is still pending');
    }
  };

  useEffect(() => {
    if (error) {
      setIsPreparingIssue(false);
      const snapshot = issueSnapshot.current;
      if (snapshot) {
        issueSnapshot.current = null;
        if (issuedRequestId.current === snapshot.requestId) issuedRequestId.current = null;
      }
      const parsed = parseContractError(error);
      if (!snapshot || fetchGeneration.current === snapshot.uiGeneration) {
        toast.error(parsed.title, { description: parsed.description });
        setIssueStep(0);
      }
    }
  }, [error]);

  const alreadyProcessed =
    !!request && !['Pending', 'Under Review'].includes(request.status);
  const chainSuccessUnreconciled = !!request && isSuccess
    && issuedRequestId.current === request.request_id
    && !!txHash && !reconciledTransactions.current.has(txHash);
  const hasUnsettledBroadcast = issueSnapshot.current !== null;
  const isValidDocumentHash = /^0x[0-9a-fA-F]{64}$/.test(docHash);
  const canIssue =
    isConnected && isIssuer && hasContract && hasRegistry && !alreadyProcessed
      && !!syncContext && !pendingSync && !storageLoadError && !chainSuccessUnreconciled
      && !hasUnsettledBroadcast && !isReconciling && !isPreparingIssue && !isHashing && isValidDocumentHash;

  const ensureSignedIn = async (): Promise<boolean> => {
    if (!requiresAuth || isAuthenticated) return true;
    toast.error('Sign in required', {
      description: 'Issuers must verify their wallet via SIWE before updating requests.',
    });
    return signIn();
  };

  const handleApprove = async () => {
    if (!request) return;
    if (chainSuccessUnreconciled || hasUnsettledBroadcast || isReconciling || pendingSync || storageLoadError
      || !syncContext || isHashing || !isValidDocumentHash || isPreparingIssue) return;
    const originalRequestGeneration = fetchGeneration.current;
    const originalRequestId = request.request_id;
    const originalHashGeneration = hashGeneration.current;
    const originalHash = docHash;
    const originalContext = syncContext;
    let handedOffToChain = false;
    setIsPreparingIssue(true);
    try {
    if (!(await ensureSignedIn())) return;
    if (!isConnected) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!isIssuer) {
      toast.error('Not an authorized issuer', {
        description: 'Connect an issuer wallet (e.g. Kabarak University / Account #1) to anchor transcripts.',
      });
      return;
    }
    if (!hasContract || !hasRegistry) {
      toast.error('Contracts not available on this network');
      return;
    }
    const hasValidRecipient =
      !!request.dest_institution_address && isAddress(request.dest_institution_address);
    if (!hasValidRecipient) {
      toast.error('Missing destination wallet', {
        description:
          'This request has no valid destination institution address, so it cannot be anchored to a recipient.',
      });
      return;
    }
    setIssueStep(1);
    const latestContext = latestSyncContext.current;
    const preparationChanged = originalRequestGeneration !== fetchGeneration.current
      || originalRequestId !== latestRequestId.current
      || originalHashGeneration !== hashGeneration.current
      || latestDocHash.current !== originalHash
      || !/^0x[0-9a-fA-F]{64}$/.test(latestDocHash.current)
      || !latestContext
      || latestContext.chainId !== originalContext.chainId
      || latestContext.account !== originalContext.account;
    if (preparationChanged) {
      setIssueStep(0);
      toast.error('Issue preparation changed', {
        description: 'The request, document, wallet, or network changed. Review the current details and try again.',
      });
      return;
    }

    setIssueStep(3);
    const recipient = request.dest_institution_address as `0x${string}`;
    issuedRequestId.current = originalRequestId;
    issueSnapshot.current = { requestId: originalRequestId, docHash: originalHash,
      issueDate: new Date().toISOString(), context: originalContext, uiGeneration: originalRequestGeneration };
    issue(originalHash, recipient, request.student_id, request.program);
    handedOffToChain = true;
    } finally {
      if (!handedOffToChain) setIsPreparingIssue(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (isPreparingIssue) return;
    if (!(await ensureSignedIn())) return;
    setIsRejecting(true);
    try {
      await updateRequestStatus(request.request_id, 'Rejected');
      toast.error('Request Rejected', {
        description: `Transfer request ${request.request_id} has been declined.`,
      });
      navigate('/registrar/dashboard');
    } catch (err) {
      const msg = err instanceof SecureWriteError ? err.message : 'Failed to reject request';
      toast.error(msg);
      setIsRejecting(false);
    }
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
    <ChainGuard>
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
            disabled={isRejecting || isPreparingIssue || isPending || isHashing || chainSuccessUnreconciled || hasUnsettledBroadcast || isReconciling || showSuccess || alreadyProcessed || !!pendingSync || storageLoadError}
            className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 active:scale-95 disabled:opacity-60">
            {isRejecting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                Reject
              </>
            )}
          </button>
          <button
            onClick={handleApprove}
            disabled={isPreparingIssue || isPending || isHashing || !isValidDocumentHash || chainSuccessUnreconciled || hasUnsettledBroadcast || isReconciling || isRejecting || showSuccess || !canIssue}
            title={
              alreadyProcessed
                ? `This request is already ${request.status}`
                : !canIssue
                ? 'Connect an authorized issuer wallet on the correct network'
                : undefined
            }
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-80 active:scale-95 min-w-[180px] justify-center">
            {isPreparingIssue ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {issueStep === 2 ? 'Uploading...' : 'Preparing issue...'}
              </>
            ) : isHashing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Hashing document...
              </>
            ) : isPending ? (
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

      {alreadyProcessed && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          This request has already been processed (<span className="font-medium text-slate-900">{request.status}</span>). No further action can be taken.
        </div>
      )}

      {pendingSync && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <div className="font-semibold">
            {syncCleanupPending
              ? 'Database sync succeeded, but saved retry metadata could not be cleared.'
              : 'On-chain issuance succeeded, but the database update is pending.'}
          </div>
          <div className="mt-1">Transaction: <span className="font-mono break-all">{pendingSync.chainTxHash}</span></div>
          <p className="mt-1">
            {syncCleanupPending
              ? 'The chain and database are authoritative. Retry only clears local session metadata.'
              : 'Retry only synchronizes Supabase; it will not issue another blockchain transaction.'}
            {syncStorageFailed && ' This browser could not save the retry data, so keep this page open.'}
          </p>
          <button onClick={retryDatabaseSync} disabled={isRetryingSync}
            className="mt-3 rounded-lg bg-amber-900 px-4 py-2 font-medium text-white disabled:opacity-60">
            {isRetryingSync ? 'Retrying...' : syncCleanupPending ? 'Clear saved retry metadata' : 'Retry database sync'}
          </button>
        </div>
      )}

      {storageLoadError && !pendingSync && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-950">
          <div className="font-semibold">Pending database sync state could not be read from this browser.</div>
          <p className="mt-1">Issuance is disabled to prevent a duplicate blockchain transaction. Restore session storage access, then reload this page.</p>
        </div>
      )}

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

          {/* Document attachment is hashed locally and never uploaded by the browser. */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Transcript Document
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              disabled={isPreparingIssue || issueStep > 0 || isPending || hasUnsettledBroadcast}
              className="hidden"
              accept=".pdf,.json"
              onChange={e => { if (!isPreparingIssue && issueStep === 0 && !isPending && !hasUnsettledBroadcast) setUploadedFile(e.target.files?.[0] ?? null); }}
            />
            {uploadedFile ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-slate-700 truncate">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">{uploadedFile.name}</span>
                </span>
                <button onClick={() => setUploadedFile(null)} disabled={isPreparingIssue || issueStep > 0 || isPending || hasUnsettledBroadcast} className="text-slate-400 hover:text-red-600 shrink-0 disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isPreparingIssue || issueStep > 0 || isPending || hasUnsettledBroadcast}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                <UploadCloud className="w-4 h-4 text-slate-400" />
                Attach document to hash (optional)
              </button>
            )}
            <p className="text-xs mt-2 text-slate-500">Hash-only mode: the browser does not upload this document. A future IPFS flow must use an authenticated server-side endpoint.</p>
            <p className={`text-xs mt-3 break-all ${hashError ? 'text-red-600' : 'text-slate-400'}`}>
              {hashError || (isHashing ? 'Computing current document hash...' : <>Hash to anchor: <span className="font-mono">{docHash.slice(0, 18)}...</span></>)}
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
    </div>
    </ChainGuard>
  );
}
