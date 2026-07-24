import { describe, expect, it } from 'vitest'

import { buildStaticEnvChecks } from './envCheck'

describe('buildStaticEnvChecks', () => {
  it('reports missing Supabase and SIWE while keeping Pinata optional for a local chain', () => {
    expect(
      buildStaticEnvChecks({
        supabaseConfigured: false,
        authBypass: false,
        chain: undefined,
      }),
    ).toEqual([
      {
        id: 'supabase',
        label: 'Supabase',
        status: 'error',
        detail: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in root .env',
      },
      {
        id: 'siwe',
        label: 'SIWE auth',
        status: 'error',
        detail: 'Requires Supabase + deployed Edge Functions',
      },
      {
        id: 'storage',
        label: 'Document storage',
        status: 'optional',
        detail: 'Hash-only mode — browser uploads are disabled; future IPFS uploads must be server-side',
      },
      {
        id: 'chain',
        label: 'Blockchain',
        status: 'warn',
        detail: 'Hardhat local (31337) — run pnpm run node + pnpm run deploy:local',
      },
    ])
  })

  it('warns that auth bypass is development-only even when Supabase is missing', () => {
    const checks = buildStaticEnvChecks({
      supabaseConfigured: false,
      authBypass: true,
      chain: 'amoy',
    })

    expect(checks.find((check) => check.id === 'siwe')).toEqual({
      id: 'siwe',
      label: 'SIWE auth',
      status: 'warn',
      detail: 'VITE_AUTH_BYPASS=true — direct DB writes (dev only, run schema.sql without harden)',
    })
    expect(checks.find((check) => check.id === 'storage')?.status).toBe('optional')
    expect(checks.find((check) => check.id === 'chain')?.status).toBe('ok')
  })

  it('always reports explicit hash-only storage mode', () => {
    const storage = buildStaticEnvChecks({
      supabaseConfigured: true,
      authBypass: false,
      chain: 'local',
    }).find((check) => check.id === 'storage')

    expect(storage?.status).toBe('optional')
    expect(storage?.detail).toContain('Hash-only mode')
  })
})
