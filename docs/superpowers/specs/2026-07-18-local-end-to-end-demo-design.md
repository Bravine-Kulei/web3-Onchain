# TransCrypt Local End-to-End Demo Design

## Objective

Prepare TransCrypt as a reliable, submission-ready local prototype that demonstrates the complete academic transcript lifecycle. The frontend and Hardhat blockchain will run locally, while a hosted Supabase project will provide persistent database, SIWE authentication, and Edge Function services.

The finished prototype must demonstrate transcript request creation, institutional review, on-chain issuance, student status tracking, independent verification, tamper detection, and revocation without manual database edits.

## Scope

### Included

- Local React/Vite frontend.
- Local Hardhat blockchain with deterministic demo accounts.
- Hosted Supabase database and Edge Functions.
- Wallet connection and SIWE authentication.
- Student, registrar, verifier, and administrator workflows required for the demo.
- Smart-contract deployment, seeded institutions, and synchronized frontend artifacts.
- SHA-256 document hashing and on-chain verification.
- Negative and failure-path handling.
- Deterministic demo setup, health checks, documentation, and a presenter script.
- Optional Pinata/IPFS integration only after the core hash-only workflow is reliable.

### Excluded

- Mainnet deployment.
- Production custody, key management, billing, or institutional identity federation.
- Fully offline Supabase via Docker.
- Large-scale performance, disaster recovery, and formal smart-contract auditing.
- Features that do not support the submission demo or its core trust claims.

## System Boundary

The local browser application communicates with three external boundaries:

1. MetaMask for wallet identity, message signing, and blockchain transactions.
2. A local Hardhat JSON-RPC node for consortium and transcript smart contracts.
3. Hosted Supabase for workflow state, SIWE sessions, Edge Functions, and verification history.

Private transcript contents remain off-chain. The blockchain stores only the SHA-256 document fingerprint and the minimum metadata required to establish issuer, issue time, recipient, and revocation state.

## Roles and Responsibilities

### Student

- Connects a wallet and establishes a SIWE session.
- Creates a transfer request bound to that wallet.
- Views the request lifecycle and final on-chain reference.

### Registrar

- Uses a wallet authorized as an issuer in `InstitutionRegistry`.
- Reviews requests associated with the registrar's institution.
- Rejects a request or hashes the official document and issues it through `TranscriptRegistry`.
- Revokes transcripts originally issued by the same wallet.

### Verifier

- Verifies by request ID, document hash, or locally uploaded file.
- Receives one explicit result: verified, tampered, revoked, or not found.
- Creates a verification-history record without exposing document contents.

### Administrator

- Uses the Hardhat deployer wallet.
- Reads consortium state and manages institution membership where supported by the current prototype.
- Reviews network and audit information used during the demonstration.

## Core End-to-End Flow

1. The developer runs an environment check that validates required Supabase values and reports whether the local chain and contract deployment are available.
2. A deterministic Hardhat node starts on chain ID `31337`.
3. Deployment creates `InstitutionRegistry` and `TranscriptRegistry`, seeds demo institutions, and synchronizes addresses and ABIs into the frontend.
4. The student connects MetaMask, switches to the expected chain, completes SIWE authentication, and submits a transfer request.
5. A Supabase Edge Function validates the session and inserts the request for the connected wallet.
6. The registrar connects the seeded issuer wallet, completes SIWE authentication, and opens the pending request.
7. The registrar selects the official document. The browser calculates its SHA-256 hash locally.
8. The registrar confirms `issueTranscript` in MetaMask. The contract validates issuer authorization and anchors the hash.
9. After transaction confirmation, the secured API updates the Supabase request with its anchored status, document hash, transaction hash, block/network context, and optional IPFS identifier.
10. The student sees the persisted lifecycle update and on-chain reference.
11. The verifier resolves the request or hashes an uploaded document, reads `verifyTranscript`, and displays the result.
12. The verifier records the attempt in Supabase.
13. The registrar revokes the transcript. A subsequent verification displays revoked while retaining the immutable issuance history.

## Data Ownership and Consistency

### Blockchain is authoritative for

- Institution authorization.
- Transcript existence.
- Original issuer.
- Issue timestamp.
- Active or revoked state.

### Supabase is authoritative for

- Transfer-request workflow and user-facing metadata.
- SIWE nonce/session state.
- Transaction references linked to requests.
- Verification-history records.

### Reconciliation rule

A Supabase status must never make a transcript appear valid when the blockchain says it is missing or revoked. Verification always reads the blockchain as the final authority. If a blockchain transaction succeeds but the following Supabase update fails, the UI must report a partial-success state, retain the transaction hash, and provide a retry/reconciliation path rather than inviting a duplicate issuance.

## Security Requirements

- Private keys never enter the application or repository.
- Wallet addresses are normalized before comparison or persistence.
- Production-style demo writes use SIWE-secured Edge Functions; `VITE_AUTH_BYPASS` is permitted only as an explicitly labeled troubleshooting mode.
- Students can create requests only for their authenticated wallet.
- Registrar updates require an authenticated, active issuer and appropriate institutional relationship.
- On-chain issuance and revocation rely on contract enforcement, not frontend role selection.
- Uploaded documents are hashed in the browser and are not persisted unless the user explicitly enables the optional IPFS workflow.
- Supabase hardened policies block direct anonymous mutation after Edge Functions are deployed.
- Secrets and real credentials remain in ignored environment files.

## Failure Handling

The frontend must provide actionable handling for:

- Missing configuration.
- Supabase or Edge Function unavailability.
- Wallet missing, disconnected, or on the wrong network.
- SIWE signature rejection or expiration.
- Unauthorized or deactivated issuer.
- User-rejected and reverted blockchain transactions.
- Duplicate transcript hashes.
- Transaction confirmation timeout.
- Successful chain write followed by failed database synchronization.
- Missing, modified, or revoked transcript verification.

Errors shown to users must distinguish retryable infrastructure failures from authorization, validation, and permanent contract failures.

## Delivery Strategy

### Phase 1: Baseline stabilization

- Establish one documented package-manager workflow.
- Resolve current build and lint failures that affect confidence in the baseline.
- Validate environment parsing and setup checks.
- Confirm Supabase schema and Edge Function deployment order.
- Verify deterministic Hardhat deployment and artifact synchronization.

### Phase 2: Primary vertical slice

- Complete Student -> Registrar -> Blockchain -> Student -> Verifier.
- Use one known document and deterministic wallets.
- Do not add optional IPFS behavior until this slice passes repeatedly.

### Phase 3: Trust and failure paths

- Validate authorization, wrong-network behavior, duplicate issuance, tampering, revocation, rejected wallet operations, and partial synchronization failures.

### Phase 4: Supporting workflows

- Complete rejection, history, administration, audit, and network-status screens required by the demonstration.
- Add Pinata/IPFS only if it does not compromise the core flow.

### Phase 5: Submission hardening

- Provide setup automation, deterministic seed output, health checks, clean UI states, a fresh-machine checklist, README instructions, and a timed presenter script.

## Testing Strategy

### Smart contracts

- Preserve existing contract tests.
- Add coverage for any newly discovered authorization, validation, or lifecycle gap before changing contract behavior.

### Frontend and integration boundaries

- Unit-test hashing, environment validation, status mapping, and contract-error translation.
- Test secured API behavior with controlled Supabase responses.
- Test wallet/network guards and transaction state transitions.

### End-to-end demo acceptance

Run the complete flow using seeded Hardhat wallets and a known fixture document:

1. Create a request.
2. Approve and anchor it.
3. Confirm student status.
4. Verify the original document.
5. Verify a modified document and receive tampered.
6. Revoke the original transcript.
7. Verify it again and receive revoked.
8. Confirm verification history and on-chain references.

The final acceptance run must begin from documented setup steps and must not require direct Supabase table edits.

## Definition of Done

- A fresh developer can install dependencies using the documented package manager and commands.
- The environment checker identifies missing configuration before startup.
- Contracts compile and all contract tests pass.
- The frontend builds and passes the agreed lint/test gates.
- Contract deployment consistently synchronizes valid ABIs and chain addresses.
- The primary end-to-end flow succeeds at least twice from a clean local-chain restart.
- Tampered, not-found, unauthorized, rejected-transaction, and revoked paths produce correct, understandable results.
- No secret, private key, or transcript document is committed.
- The README contains setup, wallet, Supabase, startup, troubleshooting, and reset instructions.
- A presenter can complete the scripted demo without source edits or manual database intervention.

## Implementation Constraints

- Preserve unrelated work already present in the dirty worktree.
- Prefer focused fixes over broad refactoring.
- Treat blockchain state as authoritative during verification.
- Keep optional infrastructure outside the critical demo path.
- Verify each phase before beginning the next one.
