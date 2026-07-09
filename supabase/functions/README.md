# Deploying SIWE auth + Edge Functions

TransCrypt secures off-chain writes with **Sign-In With Ethereum (SIWE)** and Supabase Edge Functions. Direct client inserts/updates to `requests` and `verifications` are blocked by RLS once the hardened schema is applied.

## 1. Apply database schema

In the [Supabase SQL Editor](https://app.supabase.com), run the full contents of [`schema.sql`](../schema.sql). This creates:

- `requests`, `verifications`, `siwe_nonces` tables
- Integrity triggers (write-once `document_hash`, `tx_hash`)
- Read-only RLS for clients (writes go through Edge Functions + service role)

## 2. Set Edge Function secrets

```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Generate a strong secret (32+ random chars)
supabase secrets set SIWE_SESSION_SECRET=your_long_random_secret
supabase secrets set SIWE_DOMAIN=localhost:5173   # or your production domain
```

For production, set `SIWE_DOMAIN` to your app hostname (e.g. `transcrypt.example.com`) — no protocol, no port unless needed.

## 3. Deploy functions

From the repo root:

```bash
supabase functions deploy siwe-nonce
supabase functions deploy siwe-verify
supabase functions deploy create-request
supabase functions deploy update-request
supabase functions deploy record-verification
```

Or deploy all at once:

```bash
supabase functions deploy
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

This falls back to legacy direct Supabase writes (requires the older open RLS policies). Use only for local prototyping.

## Functions reference

| Function | Method | Auth | Purpose |
|---|---|---|---|
| `siwe-nonce` | POST | None | Issue one-time nonce for address |
| `siwe-verify` | POST | None | Verify SIWE signature → session token |
| `create-request` | POST | Session | Student submits transfer request |
| `update-request` | POST | Session | Issuer updates status (reject/anchor/revoke) |
| `record-verification` | POST | Session | Log verification attempt |

Session token is sent in the `x-session-token` header.
