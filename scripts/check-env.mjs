#!/usr/bin/env node
/**
 * Validates TransCrypt environment variables and remote connectivity.
 * Usage: pnpm run check:env
 * Loads root `.env` if present.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

export function getChainCheckPlan(chain) {
  return { target: chain === 'amoy' ? 'amoy' : 'local', blocking: true }
}

export function getSupabaseCheckPlan(authBypass) {
  return {
    restBlocking: true,
    schemaBlocking: true,
    siweRequired: !authBypass,
    siweBlocking: !authBypass,
  }
}

export function getExitCode(results) {
  return results.some((check) => !check.ok && check.blocking) ? 1 : 0
}

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

const checks = []

function record(name, ok, detail, blocking = false) {
  checks.push({ name, ok, detail, blocking })
  const icon = ok ? '✓' : '✗'
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function checkSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || url.includes('YOUR_PROJECT')) {
    record('Supabase URL', false, 'Set VITE_SUPABASE_URL in .env', true)
    return
  }
  if (!key || key.includes('your_anon')) {
    record('Supabase anon key', false, 'Set VITE_SUPABASE_ANON_KEY in .env', true)
    return
  }

  record('Supabase URL', true, 'set')
  record('Supabase anon key', true, 'set')
  const bypass = process.env.VITE_AUTH_BYPASS === 'true'
  const plan = getSupabaseCheckPlan(bypass)

  try {
    const res = await fetch(`${url}/rest/v1/requests?select=request_id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (res.status === 404 || res.status === 406) {
      record('Supabase schema', false, 'Run supabase/schema.sql in SQL Editor', plan.schemaBlocking)
    } else if (!res.ok) {
      record('Supabase REST', false, `HTTP ${res.status}`, plan.restBlocking)
    } else {
      record('Supabase REST', true, 'requests table reachable', plan.restBlocking)
    }
  } catch {
    record('Supabase REST', false, 'request failed', plan.restBlocking)
  }

  if (!plan.siweRequired) {
    record('SIWE / Edge Functions', true, 'WARNING: bypass enabled; nonproduction only')
    return
  }

  try {
    const res = await fetch(`${url}/functions/v1/siwe-nonce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ address: '0x0000000000000000000000000000000000000001' }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.nonce) {
      record('Edge Function siwe-nonce', true, 'deployed', plan.siweBlocking)
    } else if (res.status === 404) {
      record('Edge Function siwe-nonce', false, 'Deploy with: pnpm run deploy:functions', plan.siweBlocking)
    } else if (body.error?.includes('SIWE_SESSION_SECRET')) {
      record('Edge Function siwe-nonce', false, 'Set SIWE_SESSION_SECRET in Supabase secrets', plan.siweBlocking)
    } else {
      record('Edge Function siwe-nonce', false, body.error ?? `HTTP ${res.status}`, plan.siweBlocking)
    }
  } catch {
    record('Edge Function siwe-nonce', false, 'request failed', plan.siweBlocking)
  }

  try {
    const res = await fetch(`${url}/functions/v1/siwe-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ health: true, expectedDomain: 'localhost:5173' }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.ok === true && body.domainMatch === true) {
      record('Edge Function siwe-verify health', true, 'secret set; domain localhost:5173 matches', plan.siweBlocking)
    } else if (body.domainMatch === false) {
      record('Edge Function siwe-verify health', false, 'SIWE_DOMAIN must be localhost:5173', plan.siweBlocking)
    } else {
      record('Edge Function siwe-verify health', false, 'Deploy function and set SIWE_SESSION_SECRET', plan.siweBlocking)
    }
  } catch {
    record('Edge Function siwe-verify health', false, 'request failed', plan.siweBlocking)
  }
}

async function checkAmoy() {
  const pk = process.env.PRIVATE_KEY
  const rpc = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'

  if (!pk || pk.includes('your_wallet')) {
    record('Amoy deploy key', true, 'optional — PRIVATE_KEY not set (frontend only)')
  } else {
    record('Amoy PRIVATE_KEY', true, 'set')
  }

  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
    })
    const data = await res.json()
    const chainId = parseInt(data.result ?? '0x0', 16)
    record(
      'Amoy RPC',
      chainId === 80002,
      chainId === 80002 ? 'chain 80002 reachable' : `wrong chainId ${chainId}`,
      true,
    )
  } catch {
    record('Amoy RPC', false, 'request failed', true)
  }
}

async function checkLocalChain() {
  try {
    const res = await fetch('http://127.0.0.1:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
      signal: AbortSignal.timeout(2000),
    })
    const data = await res.json()
    const chainId = parseInt(data.result ?? '0x0', 16)
    record('Hardhat node', chainId === 31337, chainId === 31337 ? 'running on :8545' : `chainId ${chainId}`, true)
  } catch {
    record('Hardhat node', false, 'not running — start with: pnpm run node', true)
  }
}

async function main() {
  loadEnvFile(resolve(root, '.env'))
  loadEnvFile(resolve(root, 'contracts/.env'))

  console.log('\nTransCrypt environment check\n')

  await checkSupabase()

  const chainPlan = getChainCheckPlan(process.env.VITE_CHAIN)
  record(
    'Frontend chain',
    true,
    chainPlan.target === 'amoy'
      ? 'VITE_CHAIN=amoy'
      : 'local Hardhat (set VITE_CHAIN=amoy for testnet)',
  )
  if (chainPlan.target === 'amoy') {
    await checkAmoy()
  } else {
    await checkLocalChain()
  }

  const failed = checks.filter((check) => !check.ok)
  console.log(`\n${failed.length === 0 ? 'All checks passed.' : `${failed.length} check(s) need attention.`}\n`)
  process.exitCode = getExitCode(checks)
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) await main()
