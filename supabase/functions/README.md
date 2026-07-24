# Deploying SIWE auth + Edge Functions

TransCrypt secures off-chain writes with **Sign-In With Ethereum (SIWE)** and Supabase Edge Functions. Direct client inserts/updates to `requests` and `verifications` are blocked by RLS once the hardened schema is applied.

## 1. Link the project and set secrets

Install and authenticate the Supabase CLI, link the hosted project, and set secrets before deployment:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase secrets set SIWE_SESSION_SECRET=your_long_random_secret
supabase secrets set SIWE_DOMAIN=localhost:5173
```

Never commit the generated secret.

## 2. Deploy functions and push migrations

From the repository root, run `pnpm deploy:backend`. It executes `supabase functions deploy && supabase db push`. Functions are safe to deploy before their tables because they are not called during setup. If function deployment fails, `&&` prevents any migration from running. If the database push fails, leave the functions idle, correct the database issue, and rerun the command; recorded migrations are skipped. The ordered migrations reproduce [`schema.sql`](../schema.sql) and then [`schema-harden.sql`](../schema-harden.sql). They create:

- `requests`, `verifications`, `siwe_nonces` tables
- `verifications.attempt_id` as a required UUID with the unique constraint from `schema.sql` (audit retries reuse the same UUID and are idempotent)
- A legacy-safe backfill and unique constraint for `attempt_id`
- After hosted migration, run `supabase/verification-audit.acceptance.sql` with a migration/service-role connection; it verifies duplicate-attempt cardinality and anonymous read denial inside a rollback-only transaction.
- Integrity triggers (write-once `document_hash`, `tx_hash`)
- Hardened RLS that blocks direct client writes

If CLI database access is unavailable, use the hosted SQL Editor fallback: apply the complete `schema.sql`, deploy the functions, then apply the complete `schema-harden.sql`.

For production, set `SIWE_DOMAIN` to your app hostname (e.g. `transcrypt.example.com`) — no protocol, no port unless needed.

## 3. Deploy functions individually (optional)

From the repo root:

```bash
# Deploy authentication first, then request writers, then verification logging.
supabase functions deploy siwe-nonce
supabase functions deploy siwe-verify
supabase functions deploy create-request
supabase functions deploy update-request
supabase functions deploy get-verifications
supabase functions deploy record-verification
```

Or deploy all at once:

```bash
pnpm run deploy:functions
# or: supabase functions deploy
```



## 4. Configure frontend

In root `.env`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Do **not** set `VITE_AUTH_BYPASS` in production.

## 5. User flow

1. Connect MetaMask
2. Click **Sign in** in the top bar → sign SIWE message
3. Session lasts 24 hours (stored in `localStorage`)
4. Writes are authorized:
  - **Students**: `create-request` — wallet must match `student_wallet`
  - **Issuers**: `update-request` — wallet must match `source_institution_address`
  - **Verifiers**: `record-verification` — any signed-in wallet



## Local dev without Edge Functions

If you have not deployed Edge Functions yet, add to `.env`:

```
VITE_AUTH_BYPASS=true
```

This falls back to legacy direct Supabase writes (requires open RLS from `schema.sql` only — do not run `schema-harden.sql`).

## Functions reference


| Function              | Method | Auth    | Purpose                                      |
| --------------------- | ------ | ------- | -------------------------------------------- |
| `siwe-nonce`          | POST   | None    | Issue one-time nonce for address             |
| `siwe-verify`         | POST   | None    | Verify SIWE signature → session token        |
| `create-request`      | POST   | Session | Student submits transfer request             |
| `update-request`      | POST   | Session | Issuer updates status (reject/anchor/revoke) |
| `record-verification` | POST   | Session | Log verification attempt                     |


Session token is sent in the `x-session-token` header.

`siwe-verify` also supports a safe setup probe: POST `{ "health": true, "expectedDomain": "localhost:5173" }`. It returns only `{ "ok": boolean, "domainMatch": boolean }`, checking that `SIWE_SESSION_SECRET` exists and `SIWE_DOMAIN` exactly matches. It never returns either configured secret value.

## Request status transitions

`update-request` reads the current request before updating it and only accepts the following forward transitions. Repeating the current status is a no-op: it returns the current row without appending history. Non-idempotent updates use an expected-status condition in the database RPC, so a concurrent status change returns HTTP `409` instead of being overwritten.

| Current status | Allowed next status |
| -------------- | ------------------- |
| `Pending` | `Under Review`, `Anchored`, `Rejected` |
| `Under Review` | `Approved`, `Rejected`, `Anchored` |
| `Approved` | `Anchored`, `Rejected` |
| `Anchored` | `Available`, `Verified`, `Revoked` |
| `Available` | `Verified`, `Revoked` |
| `Verified` | `Revoked` |
| `Rejected`, `Revoked`, `Tampered` | Terminal (same status only) |

Invalid or backwards transitions return HTTP `409`. Unknown statuses, unknown request fields, and invalid metadata return HTTP `400`. Only the wallet matching the request's `source_institution_address` may update a request. A successful status change appends exactly one history entry and returns the exact updated database row, including `request_id`, `status`, and `updated_at`.

The direct `Pending` to `Anchored` transition supports the registrar UI's combined **Approve & Issue** action. It is accepted only from the authenticated issuing institution wallet and still requires the complete anchor metadata below.

Anchor metadata is accepted only when moving to `Anchored`. The current registrar flow requires `tx_hash`, `document_hash`, and `issue_date`; both hashes must be 0x-prefixed 32-byte hex values and the date must be a canonical ISO timestamp. `block_number` is optional but must be a nonnegative safe integer. `ipfs_cid` is optional and, when supplied, must contain 1–256 characters. The registrar omits `ipfs_cid` when no IPFS upload occurred.
