import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building, GraduationCap, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { UNIVERSITIES, PROGRAMS } from '../../data/mockData'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { createRequest, generateRequestId } from '../../lib/db'
import { SecureWriteError } from '../../lib/secureApi'
import { useSiweAuth } from '../../lib/siweAuth'
import { isSupabaseConfigured } from '../../lib/supabase'

export function NewTransfer() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { isAuthenticated, signIn, requiresAuth } = useSiweAuth()
  const [step, setStep] = useState(1)
  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [source, setSource] = useState('')
  const [program, setProgram] = useState('')
  const [destination, setDestination] = useState('')
  const [consent, setConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sourceUni = UNIVERSITIES.find(u => u.name === source)
  const destUni = UNIVERSITIES.find(u => u.name === destination)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !address) {
      toast.error('Connect your wallet first', {
        description: 'Your wallet address is recorded with the request to prove ownership.',
      })
      return
    }

    if (requiresAuth && !isAuthenticated) {
      toast.error('Sign in required', {
        description: 'Click "Sign in" in the top bar to verify your wallet with SIWE.',
      })
      const ok = await signIn()
      if (!ok) return
    }

    setIsSubmitting(true)

    const requestId = generateRequestId()
    const now = new Date().toISOString()

    const req = {
      request_id: requestId,
      student_wallet: address,
      student_name: studentName.trim(),
      student_id: studentId.trim(),
      program,
      source_institution: source,
      source_institution_address: sourceUni?.address,
      dest_institution: destination,
      dest_institution_address: destUni?.address,
      status: 'Pending' as const,
      submitted_at: now,
      history: [{ stage: 'Requested', timestamp: now }],
    }

    try {
      const saved = await createRequest(req)

      if (!saved && isSupabaseConfigured) {
        toast.error('Failed to submit request', {
          description: 'The request could not be saved. Please try again.',
        })
        setIsSubmitting(false)
        return
      }

      const finalId = saved?.request_id ?? requestId
      toast.success('Transfer request submitted', {
        description: `Request ${finalId} is now pending review.`,
      })
      navigate(`/student/request/${finalId}`)
    } catch (err) {
      if (err instanceof SecureWriteError) {
        toast.error(err.message, {
          description: err.code === 'UNAUTHORIZED' ? 'Use "Sign in" in the top bar.' : undefined,
        })
      } else {
        toast.error('Failed to submit request')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Request Transcript Transfer</h1>
        <p className="text-slate-600 mt-1">Initiate a secure transfer of your academic record.</p>
        {!isConnected && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Connect your wallet before submitting — your address is bound to this request.
          </p>
        )}
        {isConnected && requiresAuth && !isAuthenticated && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Sign in via the top bar to verify your wallet before submitting.
          </p>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-500"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        />
        {[1, 2, 3].map(num => (
          <div key={num} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium border-2 bg-white transition-all
              ${step > num ? 'border-blue-600 bg-blue-600 text-white' : step === num ? 'border-blue-600 text-blue-600 ring-4 ring-blue-100' : 'border-slate-300 text-slate-400'}`}>
              {step > num ? <CheckCircle2 className="w-5 h-5" /> : num}
            </div>
            <span className={`text-sm mt-2 font-medium ${step >= num ? 'text-slate-900' : 'text-slate-400'}`}>
              {num === 1 ? 'Source' : num === 2 ? 'Destination' : 'Review'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-semibold text-slate-900">Select Source Record</h2>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="e.g. Wanjiku Kamau"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Student ID</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. CS/2019/001"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Issuing Institution</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select value={source} onChange={e => setSource(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="">Select institution...</option>
                    {UNIVERSITIES.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Program / Record</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select value={program} onChange={e => setProgram(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                    <option value="">Select program...</option>
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-6 flex justify-end">
              <button onClick={() => setStep(2)} disabled={!studentName.trim() || !studentId.trim() || !source || !program}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-semibold text-slate-900">Select Destination</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Receiving Institution</label>
              <div className="grid gap-3">
                {UNIVERSITIES.filter(u => u.name !== source).map(u => (
                  <label key={u.id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${destination === u.name ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="destination" value={u.name} checked={destination === u.name}
                      onChange={e => setDestination(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                    <div className="ml-3">
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="text-sm text-slate-500">{u.type} University</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={() => setStep(3)} disabled={!destination}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-semibold text-slate-900">Review & Submit</h2>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2 pb-3 mb-1 border-b border-slate-200">
                <div className="text-sm text-slate-500 mb-1">Student</div>
                <div className="font-medium text-slate-900">{studentName}</div>
                <div className="text-sm text-slate-600 mt-1 font-mono">{studentId}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">From</div>
                <div className="font-medium text-slate-900">{source}</div>
                <div className="text-sm text-slate-600 mt-1">{program}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">To</div>
                <div className="font-medium text-slate-900">{destination}</div>
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
              <span className="text-sm text-slate-700 leading-relaxed">
                I authorize the secure transfer of my academic record from {source} to {destination}. I understand this action will create a permanent, tamper-evident record on the consortium ledger.
              </span>
            </label>

            <div className="pt-6 flex justify-between">
              <button type="button" onClick={() => setStep(2)}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="submit" disabled={!consent || isSubmitting || !isConnected}
                className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
