import assert from 'node:assert/strict'
import test from 'node:test'

import { getChainCheckPlan, getExitCode, getSupabaseCheckPlan } from './check-env.mjs'

test('local configuration selects a blocking Hardhat check', () => {
  assert.deepEqual(getChainCheckPlan(undefined), { target: 'local', blocking: true })
  assert.deepEqual(getChainCheckPlan('local'), { target: 'local', blocking: true })
})

test('Amoy configuration selects a blocking Amoy RPC check', () => {
  assert.deepEqual(getChainCheckPlan('amoy'), { target: 'amoy', blocking: true })
})

test('exit code ignores optional failures and rejects selected-chain failures', () => {
  assert.equal(getExitCode([{ ok: false, blocking: false }]), 0)
  assert.equal(getExitCode([{ ok: false, blocking: true }]), 1)
})

test('hosted Supabase REST and schema failures are blocking', () => {
  const plan = getSupabaseCheckPlan(false)
  assert.equal(plan.restBlocking, true)
  assert.equal(plan.schemaBlocking, true)
  assert.equal(getExitCode([{ ok: false, blocking: plan.restBlocking }]), 1)
  assert.equal(getExitCode([{ ok: false, blocking: plan.schemaBlocking }]), 1)
})

test('SIWE Edge Function and secret failures are blocking on the canonical path', () => {
  const plan = getSupabaseCheckPlan(false)
  assert.equal(plan.siweRequired, true)
  assert.equal(plan.siweBlocking, true)
  assert.equal(getExitCode([{ ok: false, blocking: plan.siweBlocking }]), 1)
})

test('auth bypass explicitly exempts SIWE but keeps hosted Supabase required', () => {
  assert.deepEqual(getSupabaseCheckPlan(true), {
    restBlocking: true,
    schemaBlocking: true,
    siweRequired: false,
    siweBlocking: false,
  })
})

test('successful required hosted checks produce a zero exit code', () => {
  const plan = getSupabaseCheckPlan(false)
  assert.equal(getExitCode([
    { ok: true, blocking: plan.restBlocking },
    { ok: true, blocking: plan.schemaBlocking },
    { ok: true, blocking: plan.siweBlocking },
  ]), 0)
})
