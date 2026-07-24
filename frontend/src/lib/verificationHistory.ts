import type { VerificationRecord } from './db'

type VerificationIdentifierSource = Pick<
  VerificationRecord,
  'request_id' | 'doc_hash' | 'attempt_id' | 'transcript_input'
>

export interface VerificationIdentifier {
  label: 'Request' | 'Document hash' | 'Attempt ID'
  value: string
}

export function selectVerificationIdentifier(
  record: Partial<VerificationIdentifierSource>,
): VerificationIdentifier | null {
  if (record.request_id) return { label: 'Request', value: record.request_id }
  if (record.doc_hash) return { label: 'Document hash', value: record.doc_hash }
  if (record.attempt_id) return { label: 'Attempt ID', value: record.attempt_id }
  return null
}
