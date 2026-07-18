# TransCrypt Local End-to-End Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a repeatable local TransCrypt demo in which a student request is authenticated and persisted, issued by an authorized registrar on a local Hardhat chain, verified, tamper-checked, and revoked without manual database edits.

**Architecture:** Keep Vite and Hardhat local and use hosted Supabase for persistent workflow state and SIWE Edge Functions. Stabilize the workspace first, then test small domain helpers, then connect the existing pages through an explicit chain-write/database-reconciliation state machine. Treat the blockchain as authoritative for credential validity and Supabase as authoritative for request workflow.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, wagmi/viem, Solidity 0.8.24, Hardhat, Supabase Postgres/Edge Functions, SIWE, pnpm.

---

## File Map

- Create `pnpm-workspace.yaml`: declare the root workspace consistently for pnpm.
- Modify `package.json`: make root scripts use pnpm recursively and add full verification commands.
- Modify `frontend/package.json`: add Vitest and explicit test/type-check scripts.
- Create `frontend/src/test/setup.ts`: frontend test environment setup.
- Modify `frontend/vite.config.ts`: add Vitest configuration.
- Create `frontend/src/lib/envCheck.test.ts`: environment-check behavior.
- Modify `frontend/src/lib/envCheck.ts`: expose pure, injectable environment checks.
- Create `frontend/src/lib/requestSync.ts`: chain/database reconciliation state machine.
- Create `frontend/src/lib/requestSync.test.ts`: partial-success and retry tests.
- Modify `frontend/src/lib/db.ts`: typed status update result and filtered realtime subscriptions.
- Create `frontend/src/lib/db.test.ts`: request ID and subscription behavior.
- Modify `frontend/src/lib/secureApi.ts`: preserve structured API error codes and update results.
- Create `frontend/src/lib/secureApi.test.ts`: authentication and error-classification tests.
- Modify `frontend/src/pages/registrar/RequestReview.tsx`: use reconciliation state after issuance.
- Modify `frontend/src/pages/registrar/IssuedLog.tsx`: use reconciliation state after revocation.
- Create `frontend/src/lib/verification.ts`: pure result classification.
- Create `frontend/src/lib/verification.test.ts`: verified/tampered/revoked/not-found classification.
- Modify `frontend/src/pages/verifier/VerifierDashboard.tsx`: delegate result classification.
- Modify `contracts/contracts/TranscriptRegistry.sol`: reject an invalid zero document hash.
- Modify `supabase/functions/update-request/index.ts`: validate allowed transitions and return the updated row.
- Create `supabase/functions/_shared/request-status.ts`: shared transition rules.
- Create `supabase/functions/_shared/request-status.test.ts`: Deno transition tests.
- Modify `scripts/check-env.mjs`: deterministic CLI health-check exit behavior.
- Create `scripts/demo-reset.mjs`: validate and print the reset/deploy sequence without storing secrets.
- Modify `README.md`: canonical install, Supabase, wallet, run, reset, and troubleshooting instructions.
- Create `docs/demo-script.md`: timed presenter flow and acceptance checklist.

## Task 1: Standardize Workspace Tooling and Verification Gates

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Declare one pnpm workspace**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - shared
  - contracts
  - frontend
```

- [ ] **Step 2: Add frontend test dependencies and scripts**

Add these scripts to `frontend/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

Add these development dependencies:

```json
"@testing-library/jest-dom": "^6.6.3",
"@testing-library/react": "^16.1.0",
"jsdom": "^25.0.1",
"vitest": "^2.1.8"
```

- [ ] **Step 3: Configure the frontend test environment**

Change the config import to `import { defineConfig } from 'vitest/config'`, preserve the existing Vite plugins, and append this test block to the existing `defineConfig` object in `frontend/vite.config.ts`:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  clearMocks: true,
},
```

Create `frontend/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add root verification scripts**

Replace root script delegation with pnpm filters and add a verification gate:

```json
"compile": "pnpm --filter contracts compile",
"test:contracts": "pnpm --filter contracts test",
"test:frontend": "pnpm --filter transcrypt-frontend test",
"typecheck": "pnpm --filter transcrypt-frontend typecheck",
"lint": "pnpm --filter transcrypt-frontend lint",
"build": "pnpm compile && pnpm --filter transcrypt-frontend build",
"verify": "pnpm compile && pnpm test:contracts && pnpm test:frontend && pnpm typecheck && pnpm lint && pnpm --filter transcrypt-frontend build"
```

Keep the existing node, deployment, environment, and Supabase scripts, converting only their workspace delegation to `pnpm --filter`.

- [ ] **Step 5: Ignore generated local output**

Ensure `.gitignore` contains:

```gitignore
node_modules/
dist/
.env
frontend/.env
contracts/.env
```

- [ ] **Step 6: Install and run the empty test gate**

Run:

```powershell
pnpm.cmd install
pnpm.cmd --filter transcrypt-frontend test
```

Expected: installation succeeds. Run the Vitest command after adding Task 2's first test file so the gate has a deterministic PASS condition.

- [ ] **Step 7: Commit the tooling baseline**

```powershell
git add pnpm-workspace.yaml package.json frontend/package.json frontend/vite.config.ts frontend/src/test/setup.ts .gitignore pnpm-lock.yaml
git commit -m "build: standardize workspace verification tooling"
```

## Task 2: Make Environment Checks Deterministic and Testable

**Files:**
- Modify: `frontend/src/lib/envCheck.ts`
- Create: `frontend/src/lib/envCheck.test.ts`
- Modify: `scripts/check-env.mjs`

- [ ] **Step 1: Write failing static-check tests**

Create `frontend/src/lib/envCheck.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildStaticEnvChecks } from './envCheck'

describe('buildStaticEnvChecks', () => {
  it('requires Supabase and SIWE for the secured demo', () => {
    const checks = buildStaticEnvChecks({
      supabaseConfigured: false,
      authBypass: false,
      pinataConfigured: false,
      chain: 'local',
    })
    expect(checks.find(check => check.id === 'supabase')?.status).toBe('error')
    expect(checks.find(check => check.id === 'siwe')?.status).toBe('error')
    expect(checks.find(check => check.id === 'pinata')?.status).toBe('optional')
  })

  it('labels auth bypass as a warning', () => {
    const checks = buildStaticEnvChecks({
      supabaseConfigured: true,
      authBypass: true,
      pinataConfigured: false,
      chain: 'local',
    })
    expect(checks.find(check => check.id === 'siwe')?.status).toBe('warn')
  })
})
```

- [ ] **Step 2: Run the tests and confirm the missing export failure**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/envCheck.test.ts
```

Expected: FAIL because `buildStaticEnvChecks` does not exist.

- [ ] **Step 3: Extract an injectable check builder**

Add to `frontend/src/lib/envCheck.ts` and make `getStaticEnvChecks()` call it:

```ts
export interface StaticEnvInput {
  supabaseConfigured: boolean
  authBypass: boolean
  pinataConfigured: boolean
  chain: 'local' | 'amoy'
}

export function buildStaticEnvChecks(input: StaticEnvInput): EnvCheckResult[] {
  const checks: EnvCheckResult[] = []
  checks.push(input.supabaseConfigured
    ? { id: 'supabase', label: 'Supabase', status: 'pending', detail: 'Configured — checking connection…' }
    : { id: 'supabase', label: 'Supabase', status: 'error', detail: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' })
  checks.push(input.authBypass
    ? { id: 'siwe', label: 'SIWE auth', status: 'warn', detail: 'Authentication bypass is enabled' }
    : input.supabaseConfigured
      ? { id: 'siwe', label: 'SIWE / Edge Functions', status: 'pending', detail: 'Checking siwe-nonce…' }
      : { id: 'siwe', label: 'SIWE auth', status: 'error', detail: 'Requires Supabase and deployed Edge Functions' })
  checks.push(input.pinataConfigured
    ? { id: 'pinata', label: 'Pinata IPFS', status: 'ok', detail: 'Configured' }
    : { id: 'pinata', label: 'Pinata IPFS', status: 'optional', detail: 'Optional — hash-only mode is available' })
  checks.push({
    id: 'chain',
    label: 'Frontend chain',
    status: 'ok',
    detail: input.chain === 'amoy' ? 'Polygon Amoy' : 'Hardhat Local',
  })
  return checks
}
```

- [ ] **Step 4: Make the CLI report required versus optional checks**

Update `scripts/check-env.mjs` so only missing Supabase configuration and an unavailable local chain set `process.exitCode = 1`; Pinata and Amoy credentials remain optional for the local demo. Preserve secret redaction.

- [ ] **Step 5: Run tests and CLI checks**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/envCheck.test.ts
pnpm.cmd check:env
```

Expected: unit tests PASS. The CLI exits 1 with explicit missing items until `.env` and the Hardhat node are available.

- [ ] **Step 6: Commit environment checks**

```powershell
git add frontend/src/lib/envCheck.ts frontend/src/lib/envCheck.test.ts scripts/check-env.mjs
git commit -m "test: make demo environment checks deterministic"
```

## Task 3: Stabilize Database and Secure API Boundaries

**Files:**
- Modify: `frontend/src/lib/db.ts`
- Create: `frontend/src/lib/db.test.ts`
- Modify: `frontend/src/lib/secureApi.ts`
- Create: `frontend/src/lib/secureApi.test.ts`

- [ ] **Step 1: Write request ID and status-result tests**

Create `frontend/src/lib/db.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { generateRequestId } from './db'

describe('generateRequestId', () => {
  it('creates a normalized request identifier', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(generateRequestId()).toMatch(/^REQ-[A-Z0-9]{7}$/)
  })
})
```

Create `frontend/src/lib/secureApi.test.ts` with module mocks for `siweSession`, `siweAuth`, and `supabase`, then assert that `secureUpdateRequestStatus` throws `SecureWriteError` with code `UNAUTHORIZED` when no session token exists.

- [ ] **Step 2: Run the focused tests**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/db.test.ts src/lib/secureApi.test.ts
```

Expected: request ID test PASS; secured update test captures the existing unauthorized contract.

- [ ] **Step 3: Return explicit update outcomes**

Define in `frontend/src/lib/secureApi.ts`:

```ts
export interface RequestUpdateResult {
  requestId: string
  status: RequestStatus
  syncedAt: string
}
```

Change `secureUpdateRequestStatus` and `updateRequestStatus` to return `Promise<RequestUpdateResult>`. The Edge Function path must parse its returned row; the bypass path must return `{ requestId, status, syncedAt: new Date().toISOString() }` after a successful RPC.

- [ ] **Step 4: Fix realtime filtering and cleanup**

In `subscribeToRequests`, construct the Supabase realtime filter from the single supplied institution boundary and return a cleanup function that calls `void supabase.removeChannel(channel)`. If both source and destination filters are requested, filter the received row before invoking `onUpdate` because Supabase realtime accepts only one filter string per subscription.

- [ ] **Step 5: Verify tests, type-check, and lint**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/db.test.ts src/lib/secureApi.test.ts
pnpm.cmd --filter transcrypt-frontend typecheck
pnpm.cmd --filter transcrypt-frontend lint
```

Expected: tests and type-check PASS; the previous empty-function lint error in `db.ts` is gone.

- [ ] **Step 6: Commit the data boundary**

```powershell
git add frontend/src/lib/db.ts frontend/src/lib/db.test.ts frontend/src/lib/secureApi.ts frontend/src/lib/secureApi.test.ts
git commit -m "fix: stabilize secured request persistence"
```

## Task 4: Enforce Request Lifecycle Transitions in Supabase

**Files:**
- Create: `supabase/functions/_shared/request-status.ts`
- Create: `supabase/functions/_shared/request-status.test.ts`
- Modify: `supabase/functions/update-request/index.ts`
- Modify: `supabase/functions/README.md`

- [ ] **Step 1: Write failing transition tests**

Create `supabase/functions/_shared/request-status.test.ts`:

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { canTransition } from './request-status.ts'

Deno.test('allows the demo lifecycle', () => {
  assertEquals(canTransition('Pending', 'Under Review'), true)
  assertEquals(canTransition('Under Review', 'Anchored'), true)
  assertEquals(canTransition('Anchored', 'Revoked'), true)
})

Deno.test('blocks invalid backwards transitions', () => {
  assertEquals(canTransition('Anchored', 'Pending'), false)
  assertEquals(canTransition('Revoked', 'Anchored'), false)
})
```

- [ ] **Step 2: Run and confirm the missing module failure**

Run:

```powershell
deno test supabase/functions/_shared/request-status.test.ts
```

Expected: FAIL because `request-status.ts` does not exist.

- [ ] **Step 3: Implement the transition table**

Create `supabase/functions/_shared/request-status.ts`:

```ts
const transitions: Record<string, readonly string[]> = {
  Pending: ['Under Review', 'Rejected'],
  'Under Review': ['Approved', 'Rejected', 'Anchored'],
  Approved: ['Anchored', 'Rejected'],
  Anchored: ['Available', 'Verified', 'Revoked'],
  Available: ['Verified', 'Revoked'],
  Verified: ['Revoked'],
  Rejected: [],
  Revoked: [],
  Tampered: [],
}

export function canTransition(from: string, to: string): boolean {
  return from === to || (transitions[from]?.includes(to) ?? false)
}
```

- [ ] **Step 4: Enforce transitions in the update function**

In `update-request/index.ts`, fetch the current request before updating, reject invalid transitions with HTTP 409, keep the issuer/institution authorization check, append one history entry, and return:

```ts
return json({
  data: updated,
  syncedAt: new Date().toISOString(),
})
```

- [ ] **Step 5: Test and deploy the function**

Run:

```powershell
deno test supabase/functions/_shared/request-status.test.ts
supabase functions deploy update-request
```

Expected: Deno tests PASS; Supabase CLI reports a successful deployment to the linked project.

- [ ] **Step 6: Commit lifecycle enforcement**

```powershell
git add supabase/functions/_shared/request-status.ts supabase/functions/_shared/request-status.test.ts supabase/functions/update-request/index.ts supabase/functions/README.md
git commit -m "feat: enforce transcript request transitions"
```

## Task 5: Add Chain-to-Database Reconciliation

**Files:**
- Create: `frontend/src/lib/requestSync.ts`
- Create: `frontend/src/lib/requestSync.test.ts`
- Modify: `frontend/src/pages/registrar/RequestReview.tsx`
- Modify: `frontend/src/pages/registrar/IssuedLog.tsx`

- [ ] **Step 1: Write failing reconciliation tests**

Create `frontend/src/lib/requestSync.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { persistConfirmedTransaction } from './requestSync'

describe('persistConfirmedTransaction', () => {
  it('returns synced after the database update', async () => {
    const update = vi.fn().mockResolvedValue({ requestId: 'REQ-1', status: 'Anchored', syncedAt: 'now' })
    await expect(persistConfirmedTransaction({
      requestId: 'REQ-1', status: 'Anchored', txHash: '0xabc', update,
    })).resolves.toEqual({ state: 'synced', txHash: '0xabc' })
  })

  it('preserves the transaction hash when database sync fails', async () => {
    const update = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(persistConfirmedTransaction({
      requestId: 'REQ-1', status: 'Anchored', txHash: '0xabc', update,
    })).resolves.toEqual({ state: 'chain-confirmed-sync-pending', txHash: '0xabc' })
  })
})
```

- [ ] **Step 2: Run and confirm the missing module failure**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/requestSync.test.ts
```

Expected: FAIL because `requestSync.ts` does not exist.

- [ ] **Step 3: Implement the reconciliation helper**

Create `frontend/src/lib/requestSync.ts`:

```ts
import type { RequestStatus } from './db'

interface PersistInput {
  requestId: string
  status: RequestStatus
  txHash: string
  extra?: Record<string, unknown>
  update: (requestId: string, status: RequestStatus, extra?: Record<string, unknown>) => Promise<unknown>
}

export async function persistConfirmedTransaction(input: PersistInput) {
  try {
    await input.update(input.requestId, input.status, {
      tx_hash: input.txHash,
      ...input.extra,
    })
    return { state: 'synced' as const, txHash: input.txHash }
  } catch {
    const pending = {
      requestId: input.requestId,
      status: input.status,
      txHash: input.txHash,
      extra: input.extra,
    }
    sessionStorage.setItem(`transcrypt:sync:${input.requestId}`, JSON.stringify(pending))
    return { state: 'chain-confirmed-sync-pending' as const, txHash: input.txHash }
  }
}
```

The stored retry payload contains only serializable transaction metadata and never the injected update function.

- [ ] **Step 4: Integrate issuance and revocation pages**

After `waitForTransactionReceipt` succeeds, call `persistConfirmedTransaction`. Show success only for `synced`; for `chain-confirmed-sync-pending`, show a persistent warning containing the transaction hash and a retry button that calls `updateRequestStatus` without sending another blockchain transaction.

- [ ] **Step 5: Verify focused and full frontend checks**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/requestSync.test.ts
pnpm.cmd --filter transcrypt-frontend typecheck
pnpm.cmd --filter transcrypt-frontend build
```

Expected: all commands PASS.

- [ ] **Step 6: Commit reconciliation behavior**

```powershell
git add frontend/src/lib/requestSync.ts frontend/src/lib/requestSync.test.ts frontend/src/pages/registrar/RequestReview.tsx frontend/src/pages/registrar/IssuedLog.tsx
git commit -m "feat: reconcile confirmed chain writes"
```

## Task 6: Centralize Verification Result Classification

**Files:**
- Create: `frontend/src/lib/verification.ts`
- Create: `frontend/src/lib/verification.test.ts`
- Modify: `frontend/src/pages/verifier/VerifierDashboard.tsx`

- [ ] **Step 1: Write failing classification tests**

Create `frontend/src/lib/verification.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { classifyVerification } from './verification'

describe('classifyVerification', () => {
  it('prioritizes missing and revoked chain state', () => {
    expect(classifyVerification({ exists: false, revoked: false })).toBe('NOT_FOUND')
    expect(classifyVerification({ exists: true, revoked: true })).toBe('REVOKED')
  })

  it('detects a supplied file mismatch', () => {
    expect(classifyVerification({
      exists: true,
      revoked: false,
      expectedHash: '0x01',
      suppliedHash: '0x02',
    })).toBe('TAMPERED')
  })

  it('accepts an active matching record', () => {
    expect(classifyVerification({
      exists: true,
      revoked: false,
      expectedHash: '0x01',
      suppliedHash: '0x01',
    })).toBe('VERIFIED')
  })
})
```

- [ ] **Step 2: Run and confirm the missing export failure**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/verification.test.ts
```

Expected: FAIL because `classifyVerification` does not exist.

- [ ] **Step 3: Implement classification with chain authority**

Create `frontend/src/lib/verification.ts`:

```ts
import type { VerifyResultValue } from './db'

interface VerificationInput {
  exists: boolean
  revoked: boolean
  expectedHash?: string
  suppliedHash?: string
}

export function classifyVerification(input: VerificationInput): VerifyResultValue {
  if (!input.exists) return 'NOT_FOUND'
  if (input.revoked) return 'REVOKED'
  if (input.expectedHash && input.suppliedHash &&
      input.expectedHash.toLowerCase() !== input.suppliedHash.toLowerCase()) {
    return 'TAMPERED'
  }
  return 'VERIFIED'
}
```

- [ ] **Step 4: Replace duplicated page branches**

Use `classifyVerification` for request-ID, raw-hash, and file-upload flows. Keep `CHAIN_ERROR` reserved for RPC/read failures and call `recordVerification` exactly once after a terminal result is selected.

- [ ] **Step 5: Verify classification and page compilation**

Run:

```powershell
pnpm.cmd --filter transcrypt-frontend test -- src/lib/verification.test.ts
pnpm.cmd --filter transcrypt-frontend typecheck
pnpm.cmd --filter transcrypt-frontend build
```

Expected: all commands PASS.

- [ ] **Step 6: Commit verification behavior**

```powershell
git add frontend/src/lib/verification.ts frontend/src/lib/verification.test.ts frontend/src/pages/verifier/VerifierDashboard.tsx
git commit -m "refactor: centralize transcript verification results"
```

## Task 7: Validate Contract Authorization and Demo Deployment

**Files:**
- Modify: `contracts/test/TransCrypt.test.ts`
- Modify: `contracts/scripts/deploy.ts`
- Modify: `shared/sync-artifacts.ts`

- [ ] **Step 1: Add a failing zero-hash contract test**

Add to the `TranscriptRegistry` suite:

```ts
it('reverts when issuing a zero document hash', async function () {
  const { transcriptRegistry, issuer } = await loadFixture(deployFixture)
  await expect(transcriptRegistry.connect(issuer).issueTranscript(
    ethers.ZeroHash,
    ethers.ZeroAddress,
    'STU-1',
    'BSc',
  )).to.be.revertedWithCustomError(transcriptRegistry, 'InvalidDocumentHash')
})
```

- [ ] **Step 2: Run and confirm the missing custom-error failure**

Run:

```powershell
pnpm.cmd --filter contracts test
```

Expected: FAIL because zero hashes are currently accepted.

- [ ] **Step 3: Reject zero hashes in the contract**

Add to `TranscriptRegistry.sol`:

```solidity
error InvalidDocumentHash();
```

At the beginning of `issueTranscript` add:

```solidity
if (documentHash == bytes32(0)) revert InvalidDocumentHash();
```

- [ ] **Step 4: Make deployment output deterministic**

Ensure `deploy.ts` prints, in this order: chain ID, admin address, institution registry address, transcript registry address, seeded issuer wallet-to-institution mappings, and seeded transcript request IDs/hashes. Ensure `sync-artifacts.ts` writes only the active chain entry while preserving other configured chain entries.

- [ ] **Step 5: Run contract and synchronization verification**

Run:

```powershell
pnpm.cmd --filter contracts test
pnpm.cmd compile
pnpm.cmd sync
```

Expected: all contract tests PASS and frontend ABI/address JSON files parse successfully.

- [ ] **Step 6: Commit contract hardening**

```powershell
git add contracts/contracts/TranscriptRegistry.sol contracts/test/TransCrypt.test.ts contracts/scripts/deploy.ts shared/sync-artifacts.ts frontend/src/contracts
git commit -m "fix: harden transcript anchoring and demo deployment"
```

## Task 8: Build Repeatable Demo Setup and Documentation

**Files:**
- Create: `scripts/demo-reset.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Create: `docs/demo-script.md`

- [ ] **Step 1: Create a safe demo reset coordinator**

Create `scripts/demo-reset.mjs` that:

```js
import { spawnSync } from 'node:child_process'

const result = spawnSync('pnpm.cmd', ['check:env'], { stdio: 'inherit', shell: true })
if (result.status !== 0) {
  console.error('Environment is not ready. Fix the reported checks before resetting the demo.')
  process.exit(result.status ?? 1)
}

console.log('Environment ready.')
console.log('Restart the Hardhat node, then run: pnpm deploy:local')
console.log('Open /setup and confirm all required checks are green before presenting.')
```

Do not kill processes, delete chain data, or modify Supabase automatically.

- [ ] **Step 2: Add setup scripts**

Add to root `package.json`:

```json
"demo:check": "pnpm check:env && pnpm verify",
"demo:reset": "node scripts/demo-reset.mjs"
```

- [ ] **Step 3: Rewrite README setup as one canonical path**

Document these exact stages:

1. `pnpm.cmd install`
2. Create hosted Supabase project.
3. Apply `supabase/schema.sql`.
4. Link project and set `SIWE_SESSION_SECRET` and `SIWE_DOMAIN=localhost:5173`.
5. Deploy all Edge Functions.
6. Apply `supabase/schema-harden.sql`.
7. Create ignored root `.env` from `.env.example`.
8. Start `pnpm.cmd node`.
9. Run `pnpm.cmd deploy:local` in another terminal.
10. Start `pnpm.cmd dev:frontend`.
11. Open `/setup` and resolve required failures.

Include deterministic Hardhat wallet roles, MetaMask network values, reset behavior, common SIWE domain mismatch symptoms, and recovery from chain-confirmed/database-sync-pending state.

- [ ] **Step 4: Create the presenter script**

Create `docs/demo-script.md` with a 7–10 minute flow:

```markdown
1. Setup health — show green required services.
2. Student — connect, sign in, create request.
3. Registrar — switch wallet, sign in, review, anchor known fixture.
4. Student — show anchored status and transaction reference.
5. Verifier — verify original fixture.
6. Verifier — upload modified fixture and show tampered.
7. Registrar — revoke.
8. Verifier — show revoked and verification history.
```

Add a checkbox beside every wallet switch, signature, expected status, and recovery instruction.

- [ ] **Step 5: Run the repository verification gate**

Run:

```powershell
pnpm.cmd demo:check
```

Expected: contract compilation/tests, frontend tests/type-check/lint/build, and configured environment checks all PASS.

- [ ] **Step 6: Commit demo operations documentation**

```powershell
git add scripts/demo-reset.mjs package.json README.md docs/demo-script.md
git commit -m "docs: add repeatable local demo workflow"
```

## Task 9: Execute and Record the Full Acceptance Run

**Files:**
- Create: `docs/demo-acceptance.md`
- Modify only if a tested defect is found: the smallest relevant source and test file

- [ ] **Step 1: Start the clean demo stack**

Terminal 1:

```powershell
pnpm.cmd node
```

Terminal 2:

```powershell
pnpm.cmd deploy:local
```

Terminal 3:

```powershell
pnpm.cmd dev:frontend
```

Expected: Hardhat runs on `127.0.0.1:8545`, deployment prints deterministic roles and addresses, and Vite runs on `localhost:5173`.

- [ ] **Step 2: Execute the presenter flow twice**

Use a fixed PDF fixture outside Git. On each run record request ID, issuing wallet, document hash, issue transaction, revoke transaction, and final verification states. Restart the Hardhat node and redeploy between runs.

- [ ] **Step 3: Record acceptance evidence**

Create `docs/demo-acceptance.md` containing:

```markdown
# Local Demo Acceptance

- Environment check: PASS
- Contract tests: PASS, count recorded
- Frontend tests: PASS, count recorded
- Production build: PASS
- Run 1: request, anchor, verify, tamper, revoke PASS
- Run 2 after chain restart: request, anchor, verify, tamper, revoke PASS
- Manual database edits: none
- Secrets or transcript documents committed: none
```

Include timestamps and transaction hashes but no private keys, access tokens, or transcript contents.

- [ ] **Step 4: Run final verification and secret scan**

Run:

```powershell
pnpm.cmd verify
git grep -n -E "(PRIVATE_KEY=0x|SUPABASE_SERVICE_ROLE_KEY=|VITE_PINATA_JWT=eyJ)" -- ':!*.example'
git status --short
```

Expected: verification PASS; secret scan returns no matches; status contains only intentional files.

- [ ] **Step 5: Commit acceptance evidence**

```powershell
git add docs/demo-acceptance.md
git commit -m "test: record local end-to-end demo acceptance"
```

## Execution Order and Checkpoints

- Checkpoint A after Tasks 1–3: workspace, tests, environment, and persistence boundaries are stable.
- Checkpoint B after Tasks 4–6: lifecycle, reconciliation, and verifier behavior are deterministic.
- Checkpoint C after Tasks 7–8: contract deployment and demo operations are repeatable.
- Final checkpoint after Task 9: two clean end-to-end runs and repository-wide verification provide submission evidence.

Do not begin optional Pinata integration until Checkpoint B passes. Do not mark the prototype submission-ready until Task 9 completes with no manual database intervention.
