# TransCrypt — Blockchain Academic Transcript Platform

Secure, blockchain-anchored transcript transfer system for the Kenyan University Consortium.

## Structure

```
web3-Onchain/
├── contracts/     Hardhat + Solidity smart contracts
└── frontend/      Vite + React + TypeScript UI (wagmi + viem)
```

## Quick Start

### 1. Run Local Blockchain + Deploy Contracts

```powershell
cd contracts
copy .env.example .env
npx hardhat node                           # starts local chain on :8545
# In a new terminal (PowerShell):
$env:SEED="true"; npx hardhat run scripts/deploy.ts --network localhost
```

This deploys both contracts and writes addresses to `frontend/src/contracts/addresses.json`.

### 2. Add MetaMask Local Network

- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Import one of the hardhat test accounts (private key printed by `npx hardhat node`)

### 3. Run the Frontend

```bash
cd frontend
pnpm dev      # or: node node_modules/vite/bin/vite.js
```

Open http://localhost:5173

## Contracts

| Contract | Purpose |
|---|---|
| `InstitutionRegistry` | Whitelist consortium members + roles (Issuer/Verifier/Both) |
| `TranscriptRegistry` | Anchor document SHA-256 hashes on-chain; issue + revoke |

## How It Works

1. **Registrar approves** a transfer request → `TranscriptRegistry.issueTranscript()` is called with the document hash
2. **Verifier uploads** a document → browser computes SHA-256 → queries `verifyTranscript()` on-chain
3. Hash match = **Verified** | No record = **Not Found** | Revoked flag = **Revoked** | Hash mismatch = **Tampered**

## Deploy to Testnet (Polygon Amoy)

```bash
cd contracts
# Add to .env:
# PRIVATE_KEY=your_key
# AMOY_RPC_URL=https://rpc-amoy.polygon.technology
npx hardhat run scripts/deploy.ts --network amoy
```

Get free MATIC: https://faucet.polygon.technology
