export const VALID_RESULTS = new Set(['VERIFIED', 'TAMPERED', 'REVOKED', 'NOT_FOUND', 'CHAIN_ERROR'])

export interface VerificationInput {
  attempt_id?: string
  request_id?: string
  transcript_input?: string
  student_name?: string
  source_institution?: string
  result: string
  doc_hash?: string
  tx_hash?: string
}

export function validateVerificationInput(body: VerificationInput): string | null {
  if (!body.result || !VALID_RESULTS.has(body.result)) return 'Valid result required'
  if (!body.attempt_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.attempt_id)) {
    return 'Valid attempt_id required'
  }
  return null
}

export function verificationUpsert(body: VerificationInput, wallet: string) {
  return {
    row: {
      attempt_id: body.attempt_id!,
      request_id: body.request_id ?? null,
      verifier_wallet: wallet,
      result: body.result,
      doc_hash: body.doc_hash ?? null,
      tx_hash: body.tx_hash ?? null,
    },
    options: { onConflict: 'attempt_id', ignoreDuplicates: true } as const,
  }
}
