# Demo acceptance evidence

Status: **BLOCKED** (prepared 2026-07-20)

This checklist covers the canonical hosted-Supabase + local-Hardhat demo. It contains no secret values. `PASS` means the item was verified in this worktree during this acceptance pass; prior/user-reported results are recorded as context but are not promoted to `PASS` without a fresh accessible run.

## Configuration and services

| Status | Gate | Evidence / next command |
| --- | --- | --- |
| BLOCKED | Runtime environment | Root `.env`, `frontend/.env`, `contracts/.env`, and `supabase/.env` (and their `.env.local` variants) are absent. Copy `.env.example` to root `.env`, then set the hosted `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; leave `VITE_CHAIN` unset for local Hardhat and do not enable `VITE_AUTH_BYPASS`. |
| BLOCKED | Hosted Supabase schema | Cannot probe without the hosted URL and anon key. Apply `supabase/schema.sql` in the hosted project's SQL Editor. |
| BLOCKED | Supabase Edge Functions | Supabase CLI is not installed/on `PATH`, and the project is not configured locally. Install/authenticate/link the CLI, set `SIWE_SESSION_SECRET` and `SIWE_DOMAIN=localhost:5173` in hosted Supabase, deploy all functions with `pnpm run deploy:functions`, then apply `supabase/schema-harden.sql`. Never paste secrets into this document or Git. |
| BLOCKED | Environment gate | `pnpm run check:env` could not start because pnpm received `EPERM` reading the user-level pnpm config. After configuration and dependency access are repaired, run `pnpm demo:check`. |
| PENDING | Local Hardhat node | No server was started because prerequisites are absent. Start `pnpm run node`; in another terminal run `pnpm run deploy:local`. Required RPC is `http://127.0.0.1:8545`, chain ID `31337`. |
| PENDING | Setup page | After services are ready, open `http://localhost:5173/setup` and require all mandatory checks to be green. |

## Automated verification

| Status | Gate | Evidence |
| --- | --- | --- |
| PASS | Node-native script tests | `node --test scripts/*.test.mjs`: 16 tests, 16 passed, 0 failed (2026-07-20). |
| PENDING | Contract tests | The user reported 26 passing earlier. A fresh direct Hardhat run was blocked by `EPERM` while reading the pnpm virtual store, so this pass does not independently certify it. Re-run `pnpm run test:contracts`. |
| BLOCKED | Frontend tests | Vitest failed before collection with `EPERM` reading its pnpm virtual-store module. Re-run `pnpm run test:frontend` after filesystem/package-manager access is repaired. |
| BLOCKED | Typecheck | `frontend/node_modules/.bin/tsc.CMD --noEmit` ran but failed. Most errors are missing/unreadable installed modules (`wagmi`, `viem`, Supabase, Vitest); it also reported project diagnostics including `VerificationHistory.tsx` status typing, unused `VerifierDashboard.tsx` input, and `useTranscript.ts` `BufferSource` typing. Reinstall/repair dependencies, then run `pnpm run typecheck` and address remaining diagnostics. |
| BLOCKED | Lint | ESLint failed before linting with `EPERM` reading `brace-expansion` in the pnpm virtual store. Re-run `pnpm run lint` after access is repaired. |
| BLOCKED | Production build | Vite failed before compilation because Rollup's `parseAst` module was unavailable through the pnpm virtual store. Reinstall/repair dependencies, then run `pnpm run build`. |
| PENDING | Artifact sync | The user reported `pnpm sync` succeeded earlier. Re-run it as part of the final fresh gate if independent evidence is required. |

## Secret and repository hygiene

| Status | Gate | Evidence |
| --- | --- | --- |
| PASS | Runtime env files untracked | `git ls-files '*.env' '*.env.*'` lists only four `.env.example` templates; runtime `.env` files are absent and ignored. |
| PASS | Token/secret assignment scan | A path-only scan outside `.git`, dependencies, and lockfiles found no populated `PRIVATE_KEY`, service-role, JWT, session-secret, or anon-key assignment shapes. No values were printed. |
| PASS | Private-key-shaped scan reviewed | Path-only 64-hex matches occur only in generated contract artifacts/address metadata (`frontend/src/contracts/*.json`); no runtime env or documentation file was flagged. |
| PASS | No transcript fixture/log added | Status/diff inspection found no transcript, `.log`, or `.txt` evidence file. Existing user changes remain unstaged. |

## Interactive MetaMask acceptance

These items require a human-controlled browser wallet and remain `PENDING`:

- Create or use a demo-only MetaMask profile. Add **Hardhat Local** with RPC `http://127.0.0.1:8545`, chain ID `31337`, currency `ETH`.
- Import only the deterministic accounts printed by the currently running local Hardhat node; never use those keys on a public network or commit them.
- Follow `docs/demo-script.md`, switching the actual MetaMask account for each role. Approve a fresh SIWE signature after account changes and separately approve on-chain issuance/revocation transactions.
- Verify request creation, registrar anchoring, student visibility, verifier audit recording, revocation, and revoked-result verification. Record request/transaction identifiers only if they contain no private transcript content.
- Run `pnpm demo:check` immediately before the walkthrough. Acceptance requires exit code 0 plus every required `/setup` check green.

## Exact unblock sequence

1. Repair pnpm/dependency filesystem access (current failures are under the worktree's `node_modules/.pnpm` and the user pnpm config), then perform a clean dependency install without deleting user source changes.
2. Create root `.env` from `.env.example` with the hosted Supabase URL and anon key; keep it ignored. Leave the canonical demo on local Hardhat and SIWE enabled.
3. Install/authenticate/link Supabase CLI; apply `schema.sql`, set the two hosted SIWE secrets, deploy functions, verify health, then apply `schema-harden.sql`.
4. Start Hardhat, deploy/seed locally, start the frontend, configure MetaMask, and check `/setup`.
5. Run `pnpm demo:check`; only change the automated gates above to `PASS` from its fresh successful output.
6. Execute the full human wallet walkthrough in `docs/demo-script.md` and record outcomes without secrets or transcript contents.
