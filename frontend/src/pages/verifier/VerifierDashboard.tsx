import React, { useState } from 'react'
import {
  UploadCloud, Search, CheckCircle2, XCircle,
  AlertTriangle, FileText, ShieldCheck, ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { OnChainReference } from '../../components/common/OnChainReference'
import { toast } from 'sonner'
import { usePublicClient } from 'wagmi'
import { keccak256, toBytes, parseAbiItem } from 'viem'
import { hashFile } from '../../web3/useTranscript'
import TranscriptRegistryABI from '../../contracts/TranscriptRegistry.json'
import addresses from '../../contracts/addresses.json'

type VerifyResult = 'VERIFIED' | 'TAMPERED' | 'REVOKED' | 'NOT_FOUND' | null

interface VerifyRecord {
  studentId: string
  program: string
  issuerAddress: string
  issuedAt?: number
  txHash?: `0x${string}`
  fileName?: string
  docHash: `0x${string}`
}

const CONTRACT_ADDR = addresses.transcriptRegistry as `0x${string}`
const CONTRACT = { address: CONTRACT_ADDR, abi: TranscriptRegistryABI.abi }

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
}

export function VerifierDashboard() {
  const [activeTab, setActiveTab] = useState<'upload' | 'id'>('id')
  const [verifyId, setVerifyId] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStep, setVerifyStep] = useState(0)
  const [result, setResult] = useState<VerifyResult>(null)
  const [record, setRecord] = useState<VerifyRecord | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const publicClient = usePublicClient()

  const handleVerifyId = (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyId.trim()) return
    const hash = keccak256(toBytes(verifyId.trim()))
    queryChain(hash)
  }

  const handleVerifyFile = async () => {
    if (!uploadedFile) return
    setIsVerifying(true)
    setVerifyStep(1)
    try {
      const hash = await hashFile(uploadedFile)
      queryChain(hash, uploadedFile.name)
    } catch {
      toast.error('Failed to hash file')
      setIsVerifying(false)
      setVerifyStep(0)
    }
  }

  const queryChain = async (docHash: `0x${string}`, fileName?: string) => {
    setIsVerifying(true)
    setResult(null)
    setRecord(null)
    setVerifyStep(2)

    try {
      if (!publicClient) throw new Error('No chain connection')
      setVerifyStep(3)

      const data = await publicClient.readContract({
        ...CONTRACT,
        functionName: 'verifyTranscript',
        args: [docHash],
      }) as [boolean, boolean, string, string, string, bigint]

      const [exists, revoked, issuer, studentId, program, issuedAt] = data

      // Fetch the originating tx hash from event logs
      let txHash: `0x${string}` | undefined
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDR,
          event: parseAbiItem(
            'event TranscriptIssued(bytes32 indexed documentHash, address indexed issuer, string studentId, string program, uint256 timestamp)'
          ),
          args: { documentHash: docHash },
          fromBlock: 0n,
        })
        txHash = logs[0]?.transactionHash ?? undefined
      } catch {
        // getLogs optional — don't block on failure
      }

      setIsVerifying(false)
      setVerifyStep(0)

      if (!exists) { setResult('NOT_FOUND'); return }

      const rec: VerifyRecord = {
        studentId, program, issuerAddress: issuer,
        issuedAt: Number(issuedAt) * 1000,
        txHash, fileName, docHash,
      }

      if (revoked) {
        setResult('REVOKED')
        setRecord(rec)
        return
      }
      setResult('VERIFIED')
      setRecord(rec)

    } catch (err) {
      setIsVerifying(false)
      setVerifyStep(0)
      toast.error('Chain query failed', { description: 'Is the local node running?' })
      setResult('NOT_FOUND')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedFile(e.target.files[0])
      setResult(null)
      setRecord(null)
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
              onClick={() => { setActiveTab(tab); setResult(null); setRecord(null) }}
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
              <p className="text-xs text-slate-400 mt-3">
                Enter the exact string used when issuing (e.g. <span className="font-mono bg-slate-100 px-1 rounded">REQ-8821</span>) or a raw 0x hash.
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
                    <button onClick={() => setUploadedFile(null)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
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
                <div>
                  <div className="text-sm text-slate-500 mb-1">Student ID</div>
                  <div className="font-semibold text-slate-900 font-mono">{record?.studentId}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Program</div>
                  <div className="font-medium text-slate-900">{record?.program}</div>
                </div>
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
    </div>
  )
}
