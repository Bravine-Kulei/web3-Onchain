import { supabaseAnonKey, supabaseUrl, isSupabaseConfigured } from './supabase'

export type EnvCheckResult = {
  id: string
  label: string
  status: 'ok' | 'warn' | 'error' | 'pending' | 'optional'
  detail: string
}

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true'
const CHAIN_ENV = import.meta.env.VITE_CHAIN as string | undefined

export type StaticEnvInput = {
  supabaseConfigured: boolean
  authBypass: boolean
  chain?: string
}

export function buildStaticEnvChecks(input: StaticEnvInput): EnvCheckResult[] {
  const results: EnvCheckResult[] = []

  if (!input.supabaseConfigured) {
    results.push({
      id: 'supabase',
      label: 'Supabase',
      status: 'error',
      detail: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in root .env',
    })
  } else {
    results.push({
      id: 'supabase',
      label: 'Supabase',
      status: 'pending',
      detail: 'Configured — checking connection…',
    })
  }

  if (input.authBypass) {
    results.push({
      id: 'siwe',
      label: 'SIWE auth',
      status: 'warn',
      detail: 'VITE_AUTH_BYPASS=true — direct DB writes (dev only, run schema.sql without harden)',
    })
  } else if (!input.supabaseConfigured) {
    results.push({
      id: 'siwe',
      label: 'SIWE auth',
      status: 'error',
      detail: 'Requires Supabase + deployed Edge Functions',
    })
  } else {
    results.push({
      id: 'siwe',
      label: 'SIWE / Edge Functions',
      status: 'pending',
      detail: 'Checking siwe-nonce function…',
    })
  }

  results.push({
    id: 'storage',
    label: 'Document storage',
    status: 'optional',
    detail: 'Hash-only mode — browser uploads are disabled; future IPFS uploads must be server-side',
  })

  results.push({
    id: 'chain',
    label: 'Blockchain',
    status: input.chain === 'amoy' ? 'ok' : 'warn',
    detail:
      input.chain === 'amoy'
        ? 'Polygon Amoy (80002) — set MetaMask to Amoy testnet'
        : 'Hardhat local (31337) — run pnpm run node + pnpm run deploy:local',
  })

  return results
}

export function getStaticEnvChecks(): EnvCheckResult[] {
  return buildStaticEnvChecks({
    supabaseConfigured: isSupabaseConfigured,
    authBypass: AUTH_BYPASS,
    chain: CHAIN_ENV,
  })
}

function requireCheck(results: EnvCheckResult[], id: string): EnvCheckResult {
  const result = results.find((check) => check.id === id)
  if (!result) throw new Error(`Missing environment check: ${id}`)
  return result
}

export async function runLiveEnvChecks(): Promise<EnvCheckResult[]> {
  const results = getStaticEnvChecks()

  if (isSupabaseConfigured) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/requests?select=request_id&limit=1`, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      })
      const supabase = requireCheck(results, 'supabase')
      if (res.ok) {
        supabase.status = 'ok'
        supabase.detail = 'Connected — requests table ready'
      } else if (res.status === 404) {
        supabase.status = 'error'
        supabase.detail = 'Project reachable but schema missing — run supabase/schema.sql'
      } else {
        supabase.status = 'error'
        supabase.detail = `REST error HTTP ${res.status}`
      }
    } catch {
      const supabase = requireCheck(results, 'supabase')
      supabase.status = 'error'
      supabase.detail = 'Could not reach Supabase — check URL and network'
    }
  }

  if (isSupabaseConfigured && !AUTH_BYPASS) {
    const siwe = requireCheck(results, 'siwe')
    const headers = {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    }
    const [nonceOutcome, healthOutcome] = await Promise.allSettled([
      fetch(`${supabaseUrl}/functions/v1/siwe-nonce`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ address: '0x0000000000000000000000000000000000000001' }),
      }).then(async (res) => ({ res, body: (await res.json().catch(() => ({}))) as { nonce?: string; error?: string } })),
      fetch(`${supabaseUrl}/functions/v1/siwe-verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ health: true, expectedDomain: window.location.host }),
      }).then(async (res) => ({ res, body: (await res.json().catch(() => ({}))) as { ok?: boolean; domainMatch?: boolean } })),
    ])
    if (nonceOutcome.status === 'rejected' || healthOutcome.status === 'rejected') {
      siwe.status = 'error'
      siwe.detail = 'Could not reach both SIWE Edge Functions'
    } else {
      const nonce = nonceOutcome.value
      const health = healthOutcome.value
      if (nonce.res.ok && nonce.body.nonce && health.res.ok && health.body.ok && health.body.domainMatch) {
        siwe.status = 'ok'
        siwe.detail = 'SIWE nonce, secret, and domain are ready'
      } else if (!nonce.res.ok || !nonce.body.nonce) {
        siwe.status = 'error'
        siwe.detail = nonce.res.status === 404
          ? 'Functions not deployed — run: pnpm run deploy:functions'
          : nonce.body.error ?? `siwe-nonce error (${nonce.res.status})`
      } else {
        siwe.status = 'error'
        siwe.detail = health.body.domainMatch === false
          ? `SIWE_DOMAIN must match ${window.location.host}`
          : 'siwe-verify health failed — deploy functions and set SIWE_SESSION_SECRET'
      }
    }
  }

  const chain = requireCheck(results, 'chain')
  const rpc =
    CHAIN_ENV === 'amoy' ? 'https://rpc-amoy.polygon.technology' : 'http://127.0.0.1:8545'
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      signal: AbortSignal.timeout(3000),
    })
    const data = (await res.json()) as { result?: string }
    const chainId = parseInt(data.result ?? '0x0', 16)
    const expected = CHAIN_ENV === 'amoy' ? 80002 : 31337
    if (chainId === expected) {
      chain.status = 'ok'
      chain.detail =
        CHAIN_ENV === 'amoy'
          ? 'Polygon Amoy RPC reachable'
          : 'Hardhat node running — contracts ready'
    } else {
      chain.status = 'error'
      chain.detail = `RPC returned chainId ${chainId}, expected ${expected}`
    }
  } catch {
    chain.status = 'error'
    chain.detail =
      CHAIN_ENV === 'amoy'
        ? 'Amoy RPC unreachable — check network'
        : 'Hardhat not running — pnpm run node then pnpm run deploy:local'
  }

  return results
}

export function hasBlockingIssues(checks: EnvCheckResult[]): boolean {
  return checks.some((c) => c.status === 'error')
}
