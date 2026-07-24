# TransCrypt 7–10 minute presenter checklist

Use a demo-only student fixture and keep the request ID visible. Every MetaMask prompt is intentional; narrate what is signed versus what is sent on-chain.

## 0:00–1:00 — Setup health

- [ ] Open `/setup`; expected status: all required Supabase, Edge Function, and Hardhat checks are green.
- [ ] If a required check is red, recover by stopping the walkthrough, restoring that service, and rerunning `pnpm demo:check`.
- [ ] Confirm MetaMask status: network is **Hardhat Local**, RPC `127.0.0.1:8545`, chain `31337`.

## 1:00–2:15 — Student creates a request

- [ ] Switch wallet to Hardhat Account #5 (student) and connect it.
- [ ] Approve the SIWE signature; explain that this authenticates the wallet and is not a transaction.
- [ ] Create a transfer request using the prepared demo details and record its `REQ-…` ID.
- [ ] Confirm expected status: the new request appears as **Submitted** (or the first pending lifecycle state shown by the UI).
- [ ] If submission fails, recover by checking the exact `SIWE_DOMAIN=localhost:5173`, reconnecting, signing in again, and retrying the off-chain submission once.

## 2:15–4:15 — Registrar reviews and anchors

- [ ] Switch wallet to Hardhat Account #1 (Kabarak University issuer) and select the Registrar view.
- [ ] Approve the registrar SIWE signature after the account switch.
- [ ] Open the student's request, review the known fixture, and choose **Approve & Issue**.
- [ ] Approve the MetaMask transaction signature; explain that this signature anchors the document fingerprint on-chain.
- [ ] Confirm expected status: the transaction confirms and the request becomes **Anchored**, with a transaction reference.
- [ ] If expected status is **chain-confirmed / sync-pending**, recover without another chain transaction: restore Supabase connectivity, sign in with the same issuer, and use retry/reconcile until the existing transaction syncs to **Anchored**.

## 4:15–5:00 — Student sees the result

- [ ] Switch wallet back to Hardhat Account #5 and select the Student view.
- [ ] Approve a fresh SIWE signature if the app requests one after the wallet switch.
- [ ] Open the recorded request and confirm expected status: **Anchored**, contract reference, and issue transaction are visible.

## 5:00–6:15 — Verifier proves authenticity and tampering

- [ ] Switch wallet to Hardhat Account #2 (Laikipia verifier) and select the Verifier view.
- [ ] Approve the verifier SIWE signature so verification history can be recorded and read.
- [ ] Verify the recorded request with the original fixture; confirm expected status: **Verified**.
- [ ] Run verification again with the deliberately modified fixture; confirm expected status: **Tampered**.
- [ ] If history does not update, recover by restoring the `record-verification` and `get-verifications` functions, signing in again, and repeating only the verification audit write.

## 6:15–7:45 — Registrar revokes

- [ ] Switch wallet to Hardhat Account #1 and return to the Registrar issued log.
- [ ] Approve a fresh registrar SIWE signature if requested.
- [ ] Choose **Revoke** for the anchored transcript and approve the MetaMask transaction signature.
- [ ] Confirm expected status: the issued log marks the transcript **Revoked**.
- [ ] If the chain confirms but the UI is stale, recover by preserving the transaction hash, refreshing chain data, and reconciling rather than sending a second revoke.

## 7:45–9:00 — Verifier closes the story

- [ ] Switch wallet to Hardhat Account #2 and return to the Verifier view.
- [ ] Approve a fresh verifier SIWE signature if requested.
- [ ] Verify the same request again; confirm expected status: **Revoked**.
- [ ] Open Verification History; confirm expected status: Verified, Tampered, and Revoked checks are present with timestamps.
- [ ] If a final service fails, recover by stating the preserved on-chain result, opening `/setup`, and using the documented safe reset flow after the presentation—never delete Supabase audit history live.
