# TransCrypt — Blockchain Academic Transcript Platform

Secure, blockchain-anchored transcript transfer and verification system for a consortium of Kenyan universities.

The actual transcript document stays private/off-chain. Only a SHA-256 fingerprint of the document is anchored on-chain, so any receiving institution can instantly prove a transcript is authentic, unaltered, and not revoked.

## Structure

```
web3-Onchain/
├── contracts/     Hardhat + Solidity smart contracts
├── frontend/      Vite + React + TypeScript UI (wagmi + viem + Supabase)
└── supabase/      Database schema (requests + verifications)
```
   
## Architecture

```
Student → submit request ──────────────► Supabase (requests)
Registrar → review + Approve & Issue ──► TranscriptRegistry.issueTranscript()  (hash anchored on-chain)
                                       └► Supabase (status: Anchored, document_hash, tx_hash)
Verifier → verify by ID or file ───────► reads document_hash from Supabase → verifyTranscript() on-chain
                                       └► Supabase (verifications log)
Student → request detail ──────────────► live status + on-chain reference
```

| Contract | Purpose |
|---|---|
| `InstitutionRegistry` | Admin-managed whitelist of consortium members + roles (Issuer / Verifier / Both) |
| `TranscriptRegistry` | Anchor document SHA-256 hashes on-chain; issue, revoke, verify |

## Prerequisites

- Node.js 18+
- [MetaMask](https://metamask.io) browser extension
- A Supabase project (free tier is fine)

## Setup

### 1. Apply the database schema

In the [Supabase SQL Editor](https://app.supabase.com), run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the `requests`, `verifications`, and `siwe_nonces` tables.

Then set the frontend env vars in `.env` at the repo root (or `frontend/.env`):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 1b. Deploy SIWE Edge Functions (production / secured writes)

Off-chain writes are secured via **Sign-In With Ethereum**. Deploy the Edge Functions and set secrets — see [`supabase/functions/README.md`](supabase/functions/README.md).

Quick version:

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase secrets set SIWE_SESSION_SECRET=your_long_random_secret
supabase secrets set SIWE_DOMAIN=localhost:5173
supabase functions deploy
```

For **local dev without Edge Functions**, add `VITE_AUTH_BYPASS=true` to `.env` (falls back to direct DB writes).

Pinata/IPFS is optional — see `frontend/.env.example`. If unset, the app anchors the hash only and verification still works fully.

### 2. Run the local blockchain + deploy

```powershell
cd contracts
npm install
npx hardhat node                 # starts a local chain on http://127.0.0.1:8545 (chainId 31337)
```

In a second terminal:

```powershell
cd contracts
$env:SEED="true"; npx hardhat run scripts/deploy.ts --network localhost
```

This deploys both contracts, seeds 4 institutions, pre-anchors two demo transcripts (one revoked), **syncs the contract ABIs into the frontend**, and writes `frontend/src/contracts/addresses.json`. Note the `Seeded transcript ... hash=0x...` lines printed — those hashes can be pasted into the Verifier.

### 3. Configure MetaMask for the demo

- Add a network: Name `Hardhat Local`, RPC `http://127.0.0.1:8545`, Chain ID `31337`, Currency `ETH`.
- Import **Hardhat Account #1** (printed by `npx hardhat node`) — this is **Kabarak University**, an authorized issuer. You act as the Registrar with this account.
- Optionally import Account #0 (the deployer/Admin) to manage institutions, and any other account to act as a Student/Verifier.

### 4. Run the frontend

```powershell
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:5173, connect your wallet, and click **Sign in** (SIWE) before submitting or updating requests.

## End-to-end demo script

Use the **View As** dropdown (top bar) to switch role views. **Sign in** with SIWE after connecting your wallet. Blockchain writes require the correct wallet (issuing/revoking needs an authorized issuer like Account #1).

1. **Student → Request New Transfer.** Connect wallet → **Sign in** → enter name + student ID, pick source (e.g. Kabarak), program, and destination (e.g. Laikipia). Submit. A `REQ-XXXX` row is created in Supabase (bound to your wallet).
2. **Registrar (View As Registrar, wallet = Account #1).** **Sign in** with the issuer wallet. The new request appears in the queue. Open **Review**, optionally attach a document to hash, then **Approve & Issue**. Confirm the MetaMask transaction — the hash is anchored on-chain and the request becomes **Anchored**.
3. **Verifier (View As Verifier).**
   - **Verified**: enter the `REQ-XXXX` ID → resolves the anchored hash and confirms on-chain.
   - **Tampered**: enter the `REQ-XXXX` ID and attach a *different* file → SHA-256 mismatch → **Tampered**.
   - **Not Found**: enter a random ID.
   - **Pre-seeded**: paste a `hash=0x...` from the deploy output (REQ-1001 = Verified, REQ-1002 = Revoked).
   - Every check is logged under **Verification History** (exportable to CSV).
4. **Registrar → Issued Log → Revoke** a transcript (MetaMask confirm). Re-verify it in the Verifier → **Revoked**.
5. **Student → Request Detail.** Watch the lifecycle stepper and on-chain reference update as the request progresses.
6. **Admin → Member Institutions.** Reads the consortium registry live from chain; with the Admin wallet you can add new institutions.

## Deploy to testnet (Polygon Amoy)

```powershell
cd contracts
# Add to contracts/.env:  PRIVATE_KEY=...  AMOY_RPC_URL=https://rpc-amoy.polygon.technology
npx hardhat run scripts/deploy.ts --network amoy
```

Set `VITE_CHAIN=amoy` in `frontend/.env`. On Amoy, on-chain references link to PolygonScan. Get free test MATIC at https://faucet.polygon.technology.

## Notes

- **SIWE auth** secures off-chain writes: students can only create requests for their own wallet; issuers can only update requests for their institution address. See `supabase/functions/README.md`.
- Admin **Network Nodes** is illustrative mock UI; **Audit Log** and **Member Institutions** read live on-chain data.
- Route guards enforce on-chain roles for Registrar/Admin views; the **View As** switcher selects which dashboard to navigate.
