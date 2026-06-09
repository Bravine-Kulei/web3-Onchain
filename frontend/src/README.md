

# TransCrypt

TransCrypt is a frontend prototype for a secure, blockchain-anchored academic transcript transfer platform designed for a consortium of universities. 

It allows students to request official transcript transfers, registrars to approve and issue them (anchoring a cryptographic fingerprint on-chain), and receiving institutions to instantly verify the authenticity of the document without manual checks.

## Architecture & Flow

The system operates on a "Trust, but Verify" model using blockchain technology:

1. **Issue & Hash**: When a Registrar approves a transfer, the actual transcript document remains private and off-chain. The system generates a unique cryptographic hash (fingerprint) of the document.
2. **Anchor on Ledger**: This fingerprint, along with metadata (student ID, program, issuing institution), is anchored to the consortium's shared blockchain ledger via a transaction.
3. **Instant Verify**: When the receiving institution gets the document, they upload it to TransCrypt. The system computes the hash of the uploaded file and compares it against the immutable on-chain record. If they match, the document is authentic.

## Roles & Navigation

The prototype includes 4 distinct role-based dashboards. You can switch between them at any time using the **"View As" dropdown in the top navigation bar** (no real authentication required for this demo).

*   **Student**: Can request new transcript transfers to other consortium members, track the real-time status of their requests, and view their verified credentials.
*   **Registrar (Sending Institution)**: Manages the queue of incoming transfer requests. They review student details, preview the transcript, and perform the "Approve & Issue" action to seal the document on-chain. They also maintain a log of all issued transcripts and can revoke them if necessary.
*   **Verifier (Receiving Institution)**: The core trust center. Verifiers can instantly check the authenticity of an incoming transcript by entering its ID or uploading the document file. They also see a history of all verifications performed.
*   **Admin (Network Operator)**: Manages the consortium network. They can view member institutions, monitor the health and consensus status of the blockchain nodes, and review an immutable audit log of all network events.

## Demo Data & Verification

The prototype is populated with realistic mock data (Kenyan universities and student names). 

**To test the Verification flow (Verifier Dashboard):**
*   **Verified**: Try entering `TR-9921`, `TR-9655`, or `REQ-8821`.
*   **Tampered**: Try entering `TR-9844` or `DEMO-TAMPERED`.
*   **Revoked**: Try entering `TR-9712` or `DEMO-REVOKED`.
*   **Not Found**: Enter any random string of digits or text (e.g., `12345`).

You can also use the **Upload Document** tab to select any local file and simulate the hashing and verification process.

## Tech Stack

*   React (Frontend UI)
*   Tailwind CSS (Styling)
*   Framer Motion (Animations)
*   React Router (Navigation)
*   Lucide React (Icons)
*   Sonner (Toast notifications)

*Note: This is a frontend-only prototype. All blockchain interactions, cryptographic hashing, and data persistence are simulated in local state.*

