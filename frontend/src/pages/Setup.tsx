import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ExternalLink,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  runLiveEnvChecks,
  type EnvCheckResult,
} from '../lib/envCheck'

const STATUS_STYLES: Record<EnvCheckResult['status'], string> = {
  ok: 'bg-green-50 border-green-200 text-green-800',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  pending: 'bg-slate-50 border-slate-200 text-slate-600',
  optional: 'bg-slate-50 border-slate-200 text-slate-500',
}

const STATUS_ICON: Record<EnvCheckResult['status'], React.ReactNode> = {
  ok: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />,
  warn: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  error: <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />,
  pending: <RefreshCw className="w-5 h-5 text-slate-400 animate-spin shrink-0" />,
  optional: <Circle className="w-5 h-5 text-slate-300 shrink-0" />,
}

const SETUP_STEPS = [
  {
    title: '1. Create Supabase project',
    body: 'Copy Project URL + anon key into root `.env` as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    link: 'https://app.supabase.com',
    linkLabel: 'Supabase Dashboard',
  },
  {
    title: '2. Run database schema',
    body: 'SQL Editor → paste and run `supabase/schema.sql`. For production SIWE, also run `supabase/schema-harden.sql` after deploying functions.',
    link: 'https://app.supabase.com/project/_/sql',
    linkLabel: 'SQL Editor',
  },
  {
    title: '3. Deploy Edge Functions (production)',
    body: 'Set SIWE_SESSION_SECRET and SIWE_DOMAIN=localhost:5173, then `pnpm run deploy:functions`. The live check validates both secrets without exposing them.',
    link: '/supabase/functions/README.md',
    linkLabel: 'Functions README',
  },
  {
    title: '4. Local blockchain',
    body: 'Terminal 1: `pnpm run node`. Terminal 2: `pnpm run deploy:local`. Import Hardhat Account #1 into MetaMask as the issuer.',
  },
  {
    title: '5. Hash-only storage + optional Amoy',
    body: 'Browser IPFS uploads are disabled; a future upload endpoint must keep credentials server-side. For Polygon Amoy: PRIVATE_KEY in .env, `pnpm run deploy:amoy`, VITE_CHAIN=amoy.',
    link: 'https://faucet.polygon.technology',
    linkLabel: 'Amoy Faucet',
  },
]

export function Setup() {
  const [checks, setChecks] = useState<EnvCheckResult[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const results = await runLiveEnvChecks()
    setChecks(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const copyEnvTemplate = () => {
    const template = `# TransCrypt — copy to repo root .env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Local dev without Edge Functions:
# VITE_AUTH_BYPASS=true

# Optional public IPFS gateway reads (uploads require a future server endpoint):
# VITE_PINATA_GATEWAY=your-gateway.mypinata.cloud

# Testnet (after deploy:amoy):
# VITE_CHAIN=amoy
# PRIVATE_KEY=your_deployer_key
`
    navigator.clipboard.writeText(template)
    toast.success('Copied .env template')
  }

  const errors = checks.filter((c) => c.status === 'error').length
  const ready = checks.length > 0 && errors === 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-blue-900 hover:opacity-80">
          <ShieldCheck className="w-7 h-7 text-blue-700" />
          <span className="text-xl font-bold">TransCrypt Setup</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={copyEnvTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Copy className="w-4 h-4" />
            Copy .env template
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Re-check
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div
          className={`rounded-xl border p-6 ${
            ready ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
          }`}
        >
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {ready ? 'Environment ready' : 'Configure your environment'}
          </h1>
          <p className="text-slate-600 text-sm">
            {ready
              ? 'All required services are reachable. Open the app and connect your wallet.'
              : 'Configure root `.env` and hosted Supabase. This page re-checks live connectivity and SIWE domain health.'}
          </p>
          {ready && (
            <Link
              to="/student/dashboard"
              className="inline-flex mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Open app →
            </Link>
          )}
        </div>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Live status
          </h2>
          <div className="space-y-2">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${STATUS_STYLES[check.status]}`}
              >
                {STATUS_ICON[check.status]}
                <div>
                  <div className="font-semibold text-sm">{check.label}</div>
                  <div className="text-sm opacity-90 mt-0.5">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Setup checklist
          </h2>
          <div className="space-y-4">
            {SETUP_STEPS.map((step) => (
              <div key={step.title} className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{step.body}</p>
                {step.link && (
                  step.link.startsWith('http') ? (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:underline"
                    >
                      {step.linkLabel ?? 'Open'}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400 font-mono">{step.link}</p>
                  )
                )}
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-400 text-center pb-8">
          CLI check: <code className="bg-slate-100 px-1 rounded">pnpm run check:env</code> from repo root
        </p>
      </main>
    </div>
  )
}
