# TransCrypt — Blockchain Academic Transcript Platform

TransCrypt keeps transcript documents private and off-chain while anchoring their SHA-256 fingerprints in a local Hardhat chain. A hosted Supabase project stores workflow state; SIWE-authenticated Edge Functions protect all browser writes.

## Canonical local demo setup

Use Node.js 18 or newer (Node 22 LTS is recommended) and pnpm 11.0.9, which is pinned by `packageManager`. Corepack can provide the pinned pnpm version. pnpm may ask before running native dependency install scripts; review and approve only the repository policy entries with `pnpm approve-builds`. The allowlist in `pnpm-workspace.yaml` is intentionally limited to `esbuild`, `keccak`, and `secp256k1`.

1. Install all workspaces from the repository root:

   ```powershell
   corepack enable
   pnpm install
   ```

2. Create a hosted Supabase project and keep its project reference, URL, and anon key available. Do not use the local Supabase stack for this demo.

3. Link the Supabase CLI and configure SIWE. Generate a long random secret locally; never commit it. Secrets must be set before deploying the backend.

   ```powershell
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set SIWE_SESSION_SECRET=YOUR_RANDOM_SECRET SIWE_DOMAIN=localhost:5173
   ```

4. Deploy all Edge Functions (including `siwe-nonce`, `siwe-verify`, `create-request`, `get-verifications`, `record-verification`, and `update-request`), then push the ordered database migrations:

   ```powershell
   pnpm deploy:backend
   ```

   `deploy:backend` runs `supabase functions deploy && supabase db push`. Deploying functions first is safe because nothing calls them during setup; the tables and hardened permissions exist before the app is used. The `&&` stops immediately if function deployment fails, so migrations are not applied without the functions. If `db push` fails afterward, leave the deployed functions idle, fix the database error, and rerun the command; Supabase migration history skips migrations already applied. The migrations reproduce `supabase/schema.sql` followed by `supabase/schema-harden.sql`, including legacy `attempt_id` sanitization, backfill, and the unique constraint. If CLI database access is unavailable, use the hosted SQL Editor fallback: apply the complete `supabase/schema.sql`, deploy the functions, then apply the complete `supabase/schema-harden.sql`.

5. `supabase/verification-audit.acceptance.sql` is a rollback-only acceptance check. Run it manually with a migration/service-role connection only when validating audit behavior; it rolls its own changes back and is not a migration.

6. Copy `.env.example` to the ignored root `.env` and replace only the public placeholders:

   ```powershell
   Copy-Item .env.example .env
   ```

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

   Leave `VITE_CHAIN` unset for Hardhat chain 31337. The prototype is hash-only: browser IPFS uploads are disabled. Do not enable `VITE_AUTH_BYPASS` on the canonical path.

7. Start the deterministic local chain in terminal 1:

   ```powershell
   pnpm node
   ```

8. Deploy and seed contracts in terminal 2:

   ```powershell
   pnpm deploy:local
   ```

9. Start the browser app in terminal 3:

    ```powershell
    pnpm dev:frontend
    ```

10. Open [http://localhost:5173/setup](http://localhost:5173/setup) and resolve every required failure before presenting. Run `pnpm demo:check` as the command-line gate; it checks the environment first and then runs the complete repository verification suite.

## Deterministic wallets and MetaMask

Every fresh Hardhat node prints the same development accounts and private keys. Import them into a demo-only MetaMask profile; never use these keys on a public network.

| Hardhat account | Demo role |
|---|---|
| #0 | contract deployer and consortium admin |
| #1 | Kabarak University issuer/verifier (registrar) |
| #2 | Laikipia University issuer/verifier |
| #3 | Mount Kenya University issuer/verifier |
| #4 | Egerton University issuer/verifier |
| #5 or later | student / unprivileged verifier |

Add MetaMask network `Hardhat Local` with RPC URL `http://127.0.0.1:8545`, chain ID `31337`, and currency symbol `ETH`. Disable MetaMask activity sharing for the demo profile if desired. When changing roles, switch the actual MetaMask account, reconnect if prompted, and sign a fresh SIWE message; the UI's **View As** selector does not grant an on-chain role.

## Reset and recovery

`pnpm demo:reset` is deliberately a safe coordinator. It runs the environment check and prints the manual restart/deploy/setup sequence. It never kills a process, deletes chain data, changes Supabase, or removes requests.

To reset deterministic chain state, stop the Hardhat terminal yourself, start `pnpm node` again, run `pnpm deploy:local`, refresh MetaMask's account activity/nonce if it retained stale local-chain history, then revisit `/setup`. Hosted Supabase rows persist across chain restarts, so create a new request for a clean run; do not delete production-like audit records.

If SIWE signing succeeds but authentication is rejected, verify the browser is exactly `http://localhost:5173` and the hosted secret is exactly `SIWE_DOMAIN=localhost:5173` (no scheme, path, or trailing slash), redeploy the functions after changing secrets, disconnect the wallet, reconnect, and sign again.

If issuance shows **chain-confirmed / sync-pending**, do not submit another blockchain transaction. Keep the same issuer wallet and local chain selected, restore Supabase/Edge Function connectivity, sign in again if the session expired, then use the request's retry/reconcile action. The existing transaction hash is the source for recovery; the database update should converge to **Anchored** without issuing twice.

## Demo and verification

The presenter runbook is in [`docs/demo-script.md`](docs/demo-script.md). `pnpm demo:check` runs `check:env` before `verify`, so environment failures are visible before the slower contract and frontend gates. The full gate includes contract tests, frontend tests, type checking, linting, compilation, and the production build.

The seeded deployment prints request IDs and document hashes for a known verified transcript and a revoked transcript. Contract artifacts and addresses are synchronized into the frontend during deployment.

## Security boundaries

- Documents remain off-chain; only hashes and public transcript metadata reach the contract.
- Any future IPFS upload must use an authenticated server-side endpoint; never expose an upload JWT through a `VITE_` variable.
- SIWE protects request creation, request updates, and verification audit reads/writes through Edge Functions.
- The CLI deployment deploys functions before applying schema and hardening migrations; the functions remain idle until the configured app calls them.
- `.env`, wallet private keys, Supabase tokens, and real transcript fixtures must remain uncommitted.
- Polygon Amoy is supported separately via `VITE_CHAIN=amoy`, but it is not part of this canonical hosted-Supabase/local-Hardhat demo.
