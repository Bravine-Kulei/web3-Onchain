import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Search, UploadCloud, FileText, CheckCircle2,
  XCircle, AlertTriangle, ArrowLeft, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePublicClient, useChainId } from 'wagmi'
import { hashFile } from '../web3/useTranscript'
import { verifyOnChain } from '../web3/verifyOnChain'
import { getTranscriptRegistry, getChainDeployment } from '../web3/contracts'
import { expectedChainId, expectedChainName } from '../web3/config'
import { OnChainReference } from '../components/common/OnChainReference'
import { parseReadError } from '../web3/errors'
import { toast } from 'sonner'

type VerifyResult = 'VERIFIED' | 'REVOKED' | 'NOT_FOUND' | 'CHAIN_ERROR' | null

interface VerifyRecord {
  studentId: string
  program: string
  issuerAddress: string
  issuedAt?: number
  txHash?: `0x${string}`
  fileName?: string
  docHash: `0x${string}`
}

function isHexHash(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value)
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
}

export function PublicVerify() {
  const [hashInput, setHashInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerifyResult>(null)
  const [record, setRecord] = useState<VerifyRecord | null>(null)

  const publicClient = usePublicClient()
  const chainId = useChainId()
  const deployment = getChainDeployment(chainId)
  const seeded = deployment?.seededTranscripts ?? []

  const queryChain = async (docHash: `0x${string}`, fileName?: string) => {
    setIsVerifying(true)
    setResult(null)
    setRecord(null)

    try {
      if (!publicClient || !getTranscriptRegistry(chainId)) {
        throw new Error('No chain connection')
      }

      const { exists, revoked, issuer, studentId, program, issuedAt, txHash } =
        await verifyOnChain(publicClient, chainId, docHash)

      if (!exists) {
        setResult('NOT_FOUND')
        return
      }

      const rec: VerifyRecord = {
        studentId, program, issuerAddress: issuer,
        issuedAt, txHash, fileName, docHash,
      }

      setResult(revoked ? 'REVOKED' : 'VERIFIED')
      setRecord(rec)
    } catch (err) {
      const parsed = parseReadError(err)
      toast.error(parsed.title, { description: parsed.description })
      setResult('CHAIN_ERROR')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleVerifyHash = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = hashInput.trim()
    if (!isHexHash(input)) {
      toast.error('Enter a valid 64-character hex hash (0x...)')
      return
    }
    await queryChain(input)
  }

  const handleVerifyFile = async () => {
    if (!uploadedFile) return
    try {
      const hash = await hashFile(uploadedFile)
      await queryChain(hash, uploadedFile.name)
    } catch {
      toast.error('Failed to hash file')
    }
  }

  const wrongNetwork = chainId !== expectedChainId

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-blue-900 hover:opacity-80">
          <ShieldCheck className="w-7 h-7 text-blue-700" />
          <span className="text-xl font-bold tracking-tight">TransCrypt</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Public Transcript Verification</h1>
          <p className="text-slate-600 mt-2">
            Permissionless on-chain check — no wallet or account required.
          </p>
        </div>

        {wrongNetwork && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Connect MetaMask to <strong>{expectedChainName}</strong> (chain {expectedChainId}) for accurate results.
            Currently on chain {chainId}.
          </div>
        )}

        {!deployment && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            No contracts deployed on this network. Run <code className="font-mono bg-red-100 px-1 rounded">npm run deploy:local</code> first.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 mb-4">Verify by document hash</h2>
            <form onSubmit={handleVerifyHash} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={hashInput}
                  onChange={e => { setHashInput(e.target.value); setResult(null) }}
                  placeholder="0x..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!hashInput.trim() || isVerifying}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-w-[120px]"
              >
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify'}
              </button>
            </form>
          </div>

          <div className="p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Or upload a document</h2>
            {!uploadedFile ? (
              <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-blue-50 hover:border-blue-400 transition-all cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.json" onChange={e => {
                  setUploadedFile(e.target.files?.[0] ?? null)
                  setResult(null)
                }} />
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600">File is hashed locally — never uploaded to a server</p>
              </label>
            ) : (
              <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <span className="flex items-center gap-2 text-sm text-slate-700 truncate">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  {uploadedFile.name}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setUploadedFile(null)} className="text-sm text-slate-500 hover:text-red-600">Remove</button>
                  <button
                    onClick={handleVerifyFile}
                    disabled={isVerifying}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Verify File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {seeded.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Demo hashes (from deploy seed)</p>
            <div className="flex flex-wrap gap-2">
              {seeded.map(s => (
                <button
                  key={s.requestId}
                  onClick={() => { setHashInput(s.documentHash); queryChain(s.documentHash as `0x${string}`) }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  {s.requestId} ({s.status})
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {result === 'VERIFIED' && record && (
            <motion.div key="verified" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
              className="bg-white border-2 border-green-500 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-green-50 px-6 py-4 flex items-center gap-3 border-b border-green-100">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
                <div>
                  <h3 className="font-bold text-green-900">Authentic and Unaltered</h3>
                  <p className="text-green-700 text-sm">Fingerprint matches on-chain record.</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Student ID</span><div className="font-mono font-medium">{record.studentId}</div></div>
                  <div><span className="text-slate-500">Program</span><div className="font-medium">{record.program}</div></div>
                  {record.issuedAt && (
                    <div><span className="text-slate-500">Issued</span><div>{new Date(record.issuedAt).toLocaleString()}</div></div>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border break-all">{record.docHash}</div>
                {record.txHash && <OnChainReference txHash={record.txHash} />}
              </div>
            </motion.div>
          )}

          {result === 'REVOKED' && record && (
            <motion.div key="revoked" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
              className="bg-white border-2 border-red-500 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-red-50 px-6 py-4 flex items-center gap-3 border-b border-red-100">
                <AlertTriangle className="w-7 h-7 text-red-600" />
                <div>
                  <h3 className="font-bold text-red-900">Credential Revoked</h3>
                  <p className="text-red-700 text-sm">Revoked by the issuing institution.</p>
                </div>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <div><span className="text-slate-500">Student ID</span><div className="font-mono">{record.studentId}</div></div>
                {record.txHash && <OnChainReference txHash={record.txHash} />}
              </div>
            </motion.div>
          )}

          {result === 'NOT_FOUND' && (
            <motion.div key="notfound" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
              className="bg-white border-2 border-slate-300 rounded-xl p-6 text-center">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700">Not Found on Chain</h3>
              <p className="text-slate-500 text-sm mt-1">No matching record in the consortium registry.</p>
            </motion.div>
          )}

          {result === 'CHAIN_ERROR' && (
            <motion.div key="chainerror" initial="hidden" animate="visible" exit="hidden" variants={cardVariants}
              className="bg-white border-2 border-amber-400 rounded-xl p-6 text-center">
              <XCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-amber-900">Chain Unavailable</h3>
              <p className="text-slate-600 text-sm mt-1">Start the local Hardhat node or switch to the correct network.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
