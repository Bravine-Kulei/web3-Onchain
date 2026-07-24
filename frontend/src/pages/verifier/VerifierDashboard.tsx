import React, { useRef, useState } from 'react'
import {
  UploadCloud, Search, CheckCircle2, XCircle,
  AlertTriangle, FileText, ShieldCheck,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OnChainReference } from '../../components/common/OnChainReference'
import { toast } from 'sonner'
import { usePublicClient, useAccount, useChainId } from 'wagmi'
import { hashFile } from '../../web3/useTranscript'
import { verifyOnChain } from '../../web3/verifyOnChain'
import { parseReadError } from '../../web3/errors'
import { getTranscriptRegistry } from '../../web3/contracts'
import { getRequestById, getRequestByHash, recordVerification, type TransferRequest, type VerifyResultValue } from '../../lib/db'
import { authoritativeAcademicFields, classifyVerification, normalizeVerificationHash } from '../../lib/verification'
import { VerificationRunCoordinator } from '../../lib/verificationRun'

type VerifyResult = VerifyResultValue | null
type AuditPayload = Parameters<typeof recordVerification>[0]

interface VerifyRecord {
  studentId: string
  program: string
  issuerAddress: string
  issuedAt?: number
  txHash?: `0x${string}`
  fileName?: string
  docHash: `0x${string}`
  transcriptId?: string
  studentName?: string
  sourceInstitution?: string
}

function isHexHash(value: string): value is `0x${string}` {
  return /^0x[0-9a-f]{64}$/i.test(value)
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
}

export function VerifierDashboard() {
  const [activeTab, setActiveTab] = useState<'upload' | 'id'>('id')
  const [verifyId, setVerifyId] = useState('')
  const [idFile, setIdFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStep, setVerifyStep] = useState(0)
  const [result, setResult] = useState<VerifyResult>(null)
  const [record, setRecord] = useState<VerifyRecord | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [auditStatus, setAuditStatus] = useState<'idle' | 'pending' | 'logged' | 'error'>('idle')
  const [auditPayload, setAuditPayload] = useState<AuditPayload | null>(null)
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { address } = useAccount()
  const activeRunToken = useRef(0)
  const activeAttemptId = useRef('')
  const coordinator = useRef<VerificationRunCoordinator<AuditPayload> | null>(null)
  if (!coordinator.current) {
    coordinator.current = new VerificationRunCoordinator(recordVerification, state => {
      setAuditStatus(state)
      if (state === 'error') toast.error('Verification completed, but its audit log was not saved.')
    })
  }
  const runCoordinator = coordinator.current
  const isActiveRun = (run: number) => runCoordinator.isActive(run)

  const beginVerification = () => {
    const started = runCoordinator.begin()
    const run = started.token
    activeRunToken.current = run
    activeAttemptId.current = started.attemptId
    setIsVerifying(true)
    setResult(null)
    setRecord(null)
    setAuditStatus('idle')
    setAuditPayload(null)
    return run
  }

  const clearVerification = () => {
    runCoordinator.cancel()
    setIsVerifying(false)
    setVerifyStep(0)
    setResult(null)
    setRecord(null)
    setAuditStatus('idle')
    setAuditPayload(null)
  }

  const finishVerification = (
    run: number,
    resultValue: VerifyResultValue,
    rec: VerifyRecord | null,
    docHash?: `0x${string}`,
  ) => {
    if (!runCoordinator.claimCompletion(run)) return
    setIsVerifying(false)
    setVerifyStep(0)
    setResult(resultValue)
    setRecord(rec)
    const payload: AuditPayload = {
          attempt_id: activeAttemptId.current,
          request_id: rec?.transcriptId,
          verifier_wallet: address,
          result: resultValue,
          doc_hash: docHash ?? rec?.docHash,
          tx_hash: rec?.txHash,
        }
    setAuditPayload(payload)
    runCoordinator.persistAudit(run, payload)
  }

  const classifyNotFound = (run: number, expectedHash?: string) => {
    const classification = classifyVerification({ exists: false, revoked: false, expectedHash })
    finishVerification(run, classification, null)
  }

  const stopWithLocalError = (run: number, message: string) => {
    if (!isActiveRun(run)) return
    toast.error(message)
    setIsVerifying(false)
    setVerifyStep(0)
  }

  // Verify by transcript ID / hash. If a file is attached, also runs tamper detection
  // by comparing the file's SHA-256 against the hash stored for that record.
  const handleVerifyId = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = verifyId.trim()
    if (!input) return

    const run = beginVerification()

    if (/^0x/i.test(input) && !isHexHash(input)) {
      classifyNotFound(run, input)
      return
    }

    // Raw 0x document hash → query chain directly
    if (isHexHash(input)) {
      if (idFile) {
        setVerifyStep(1)
        let fileHash: `0x${string}`
        try {
          fileHash = await hashFile(idFile)
          if (!isActiveRun(run)) return
        } catch {
          stopWithLocalError(run, 'Could not read this document. Choose a valid PDF or JSON file and try again.')
          return
        }
        await queryChain(run, input, idFile.name, undefined, fileHash)
        if (!isActiveRun(run)) return
        return
      }
      await queryChain(run, input)
      if (!isActiveRun(run)) return
      return
    }

    // Transcript ID → resolve the anchored hash from the off-chain registry
    setVerifyStep(2)
    let req: TransferRequest | null
    try {
      req = await getRequestById(input)
      if (!isActiveRun(run)) return
    } catch {
      stopWithLocalError(run, 'Could not look up that transcript ID. Check your connection and try again.')
      return
    }
    if (!req || !req.document_hash) {
      classifyNotFound(run)
      return
    }
    let expected: `0x${string}`
    try {
      expected = normalizeVerificationHash(req.document_hash)
    } catch {
      classifyNotFound(run, req.document_hash)
      return
    }

    // Tamper detection: a supplied file must hash to the anchored value
    if (idFile) {
      setVerifyStep(1)
      let fileHash: `0x${string}`
      try {
        fileHash = await hashFile(idFile)
        if (!isActiveRun(run)) return
      } catch {
        stopWithLocalError(run, 'Could not read this document. Choose a valid PDF or JSON file and try again.')
        return
      }
      await queryChain(run, expected, idFile.name, req, fileHash)
      if (!isActiveRun(run)) return
      return
    }

    await queryChain(run, expected, undefined, req)
    if (!isActiveRun(run)) return
  }

  const handleVerifyFile = async () => {
    if (!uploadedFile) return
    const run = beginVerification()
    setVerifyStep(1)
    let hash: `0x${string}`
    try {
      hash = await hashFile(uploadedFile)
      if (!isActiveRun(run)) return
    } catch {
      stopWithLocalError(run, 'Could not read this document. Choose a valid PDF or JSON file and try again.')
      return
    }
    let req: TransferRequest | null = null
    try {
      req = await getRequestByHash(hash)
      if (!isActiveRun(run)) return
    } catch {
      if (!isActiveRun(run)) return
      toast.warning('Document details are unavailable; verifying its fingerprint on-chain instead.')
    }
    await queryChain(run, hash, uploadedFile.name, req ?? undefined)
    if (!isActiveRun(run)) return
  }

  const readChain = async (run: number, docHash: `0x${string}`) => {
    try {
      if (!publicClient) throw new Error('No chain connection')
      if (!getTranscriptRegistry(chainId)) throw new Error('No chain connection')
      if (!isActiveRun(run)) return null
      setVerifyStep(3)
      const chainRecord = await verifyOnChain(publicClient, chainId, docHash)
      if (!isActiveRun(run)) return null
      return chainRecord
    } catch (err) {
      if (!isActiveRun(run)) return null
      const parsed = parseReadError(err)
      toast.error(parsed.title, { description: parsed.description })
      finishVerification(run, 'CHAIN_ERROR', null)
      return null
    }
  }

  const queryChain = async (
    run: number,
    docHash: `0x${string}`,
    fileName?: string,
    req?: TransferRequest,
    suppliedHash?: string,
  ) => {
    if (!isActiveRun(run)) return
    let normalizedSuppliedHash: `0x${string}` | undefined
    try {
      normalizedSuppliedHash = suppliedHash === undefined
        ? undefined
        : normalizeVerificationHash(suppliedHash)
    } catch {
      stopWithLocalError(run, 'The computed document fingerprint is invalid. Please try the file again.')
      return
    }
    if (!isActiveRun(run)) return
    setIsVerifying(true)
    setVerifyStep(2)
    const chainRecord = await readChain(run, docHash)
    if (!isActiveRun(run) || !chainRecord) return

    try {
      const { exists, revoked, issuer, studentId, program, issuedAt, txHash } = chainRecord
      const academicFields = authoritativeAcademicFields({ studentId, program })
      const rec: VerifyRecord = {
        ...academicFields,
        issuerAddress: issuer,
        issuedAt,
        txHash, fileName, docHash: normalizedSuppliedHash ?? docHash,
        transcriptId: req?.request_id,
        studentName: req?.student_name,
        sourceInstitution: req?.source_institution,
      }
      const classification = classifyVerification({
        exists,
        revoked,
        expectedHash: docHash,
        suppliedHash: normalizedSuppliedHash,
      })
      finishVerification(run, classification, exists ? rec : null, normalizedSuppliedHash ?? docHash)
    } catch {
      stopWithLocalError(run, 'Verification could not be completed because the returned record was invalid.')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedFile(e.target.files[0])
      clearVerification()
    }
  }

  const stepLabel = verifyStep === 1 ? 'Hashing...' : verifyStep === 2 ? 'Querying chain...' : 'Verifying...'

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verify Transcript</h1>
        <p className="text-slate-600 mt-1">
          Verify the authenticity of any academic transcript against the consortium ledger.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['id', 'upload'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); clearVerification() }}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'id' ? 'Verify by ID / Hash' : 'Upload Document'}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'id' ? (
            <form onSubmit={handleVerifyId} className="max-w-2xl mx-auto">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transcript ID or Document Hash
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={verifyId}
                    onChange={e => setVerifyId(e.target.value)}
                    placeholder="e.g. REQ-8821 or 0x..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!verifyId.trim() || isVerifying}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 min-w-[140px] justify-center active:scale-95"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {stepLabel}
                    </>
                  ) : 'Verify Record'}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  {idFile ? 'Change document' : 'Attach document (optional)'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.json"
                    onChange={e => { setIdFile(e.target.files?.[0] ?? null); clearVerification() }}
                  />
                </label>
                {idFile && (
                  <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <FileText className="w-4 h-4 text-blue-500" />
                    {idFile.name}
                    <button type="button" onClick={() => { setIdFile(null); clearVerification() }} className="text-slate-400 hover:text-red-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Enter the exact ID used when issuing (e.g. <span className="font-mono bg-slate-100 px-1 rounded">REQ-8821</span>) or a raw 0x hash. Attach the document to also check it for tampering.
              </p>
            </form>
          ) : (
            <div className="max-w-2xl mx-auto">
              {!uploadedFile ? (
                <label className="block border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer group">
                  <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.json" />
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300">
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Drop document here</h3>
                  <p className="text-slate-500 text-sm mb-6">PDF or JSON credential — file is hashed locally, never uploaded</p>
                  <span className="inline-block px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm">Browse Files</span>
                </label>
              ) : (
                <div className="border border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">{uploadedFile.name}</h3>
                  <p className="text-slate-500 text-sm mb-6">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => { setUploadedFile(null); clearVerification() }} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                      Remove
                    </button>
                    <button
                      onClick={handleVerifyFile}
                      disabled={isVerifying}
                      className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 min-w-[140px] justify-center active:scale-95"
                    >
                      {isVerifying ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{stepLabel}</>
                      ) : 'Verify File'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Result Cards */}
      <AnimatePresence mode="wait">
        {result === 'VERIFIED' && (
          <motion.div key="verified" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
            className="bg-white border-2 border-green-500 rounded-xl overflow-hidden shadow-xl shadow-green-900/5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600" />
            <div className="bg-green-50/50 px-6 py-5 border-b border-green-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900">Authentic and Unaltered</h3>
                <p className="text-green-700 text-sm mt-0.5">Cryptographic fingerprint matches on-chain record.</p>
              </div>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {record?.fileName && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Verified File</div>
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />{record.fileName}
                    </div>
                  </div>
                )}
                {record?.transcriptId && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Transcript ID</div>
                    <div className="font-semibold text-slate-900">{record.transcriptId}</div>
                  </div>
                )}
                {record?.studentName && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Student</div>
                    <div className="font-medium text-slate-900">{record.studentName}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-slate-500 mb-1">Student ID</div>
                  <div className="font-semibold text-slate-900 font-mono">{record?.studentId}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Program</div>
                  <div className="font-medium text-slate-900">{record?.program}</div>
                </div>
                {record?.sourceInstitution && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Issuing Institution</div>
                    <div className="font-medium text-slate-900">{record.sourceInstitution}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-slate-500 mb-1">Issuing Institution</div>
                  <div className="font-mono text-xs text-slate-600 bg-slate-50 p-2 rounded border">
                    {record?.issuerAddress}
                  </div>
                </div>
                {record?.issuedAt && (
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Issued</div>
                    <div className="font-medium text-slate-900">{new Date(record.issuedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Document Fingerprint (SHA-256)
                  </div>
                  <div className="font-mono text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 break-all">
                    {record?.docHash}
                  </div>
                </div>
                {record?.txHash && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-sm font-medium text-slate-700 mb-2">On-chain Reference</div>
                    <OnChainReference txHash={record.txHash} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {result === 'TAMPERED' && (
          <motion.div key="tampered" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
            className="bg-white border-2 border-red-500 rounded-xl overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />
            <div className="bg-red-50/50 px-6 py-5 border-b border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center shrink-0">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">Document Tampered</h3>
                <p className="text-red-700 text-sm mt-0.5">Hash mismatch — document does not match on-chain record.</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                The cryptographic hash of this document does not match any anchored record. Either the document was altered after issuance, or it was never issued through TransCrypt.
              </p>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <div className="text-sm text-red-800 font-semibold mb-2">Computed Fingerprint (no match)</div>
                <div className="font-mono text-xs text-slate-700 break-all">{record?.docHash}</div>
              </div>
            </div>
          </motion.div>
        )}

        {result === 'REVOKED' && (
          <motion.div key="revoked" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
            className="bg-white border-2 border-red-500 rounded-xl overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600" />
            <div className="bg-red-50/50 px-6 py-5 border-b border-red-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">Credential Revoked</h3>
                <p className="text-red-700 text-sm mt-0.5">This transcript was explicitly revoked by the issuing institution.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Student ID</div>
                <div className="font-mono font-medium">{record?.studentId}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Issuing Institution</div>
                <div className="font-mono text-xs">{record?.issuerAddress}</div>
              </div>
              {record?.txHash && (
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">On-chain Reference</div>
                  <OnChainReference txHash={record.txHash} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {result === 'CHAIN_ERROR' && (
          <motion.div key="chainerror" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
            className="bg-white border-2 border-amber-400 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-6 py-5 border-b border-amber-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">Chain Unavailable</h3>
                <p className="text-amber-800 text-sm mt-0.5">Could not reach the blockchain. Check your network and node.</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600">
                Verification requires a live connection to the consortium ledger. Start the local Hardhat node or switch to the correct network, then try again.
              </p>
            </div>
          </motion.div>
        )}

        {result === 'NOT_FOUND' && (
          <motion.div key="notfound" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
            className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-700">Not Found on Chain</h3>
                <p className="text-slate-500 text-sm mt-0.5">No matching record exists in the consortium registry.</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600">
                This document hash has no corresponding record in the TransCrypt registry. It was either never issued through the platform, or the identifier entered is incorrect.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {result && auditStatus !== 'idle' && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span>
            Audit log: {auditStatus === 'pending' ? 'saving…' : auditStatus === 'logged' ? 'saved' : 'save failed'}
          </span>
          {auditStatus === 'error' && auditPayload && (
            <button
              type="button"
              className="font-medium text-blue-700 hover:text-blue-800"
              onClick={() => {
                setAuditStatus('pending')
                runCoordinator.retryAudit(activeRunToken.current)
              }}
            >
              Retry Audit Log
            </button>
          )}
        </div>
      )}
    </div>
  )
}
