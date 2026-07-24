import { REQUEST_STATUSES } from './request-status.ts'

const ALLOWED_FIELDS = new Set([
  'request_id', 'status', 'tx_hash', 'block_number', 'document_hash', 'ipfs_cid', 'issue_date',
])
const ANCHOR_FIELDS = ['tx_hash', 'block_number', 'document_hash', 'ipfs_cid', 'issue_date'] as const
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/
const statuses = new Set<string>(REQUEST_STATUSES)

export type RequestUpdatePayload = {
  request_id: string
  status: string
  tx_hash?: string
  block_number?: number
  document_hash?: string
  ipfs_cid?: string
  issue_date?: string
}

export function validateUpdatePayload(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Request body must be an object'
  const body = value as Record<string, unknown>
  const unknownField = Object.keys(body).find((field) => !ALLOWED_FIELDS.has(field))
  if (unknownField) return `Unknown update field "${unknownField}"`
  if (typeof body.request_id !== 'string' || !body.request_id.trim()) return 'request_id and status required'
  if (typeof body.status !== 'string' || !statuses.has(body.status)) return `Unknown request status "${String(body.status)}"`

  const hasAnchorMetadata = ANCHOR_FIELDS.some((field) => body[field] !== undefined)
  if (body.status !== 'Anchored' && hasAnchorMetadata) return 'anchor metadata is only allowed when status is Anchored'
  if (body.status !== 'Anchored') return null

  if (body.tx_hash !== undefined && (typeof body.tx_hash !== 'string' || !HASH_PATTERN.test(body.tx_hash))) {
    return 'tx_hash must be a 0x-prefixed 32-byte hex value'
  }
  if (body.document_hash !== undefined &&
    (typeof body.document_hash !== 'string' || !HASH_PATTERN.test(body.document_hash))) {
    return 'document_hash must be a 0x-prefixed 32-byte hex value'
  }
  if (body.block_number !== undefined &&
    (typeof body.block_number !== 'number' || !Number.isSafeInteger(body.block_number) || body.block_number < 0)) {
    return 'block_number must be a nonnegative safe integer'
  }
  if (body.issue_date !== undefined && (typeof body.issue_date !== 'string' || Number.isNaN(Date.parse(body.issue_date)) ||
    new Date(body.issue_date).toISOString() !== body.issue_date)) {
    return 'issue_date must be a valid ISO timestamp'
  }
  if (body.ipfs_cid !== undefined &&
    (typeof body.ipfs_cid !== 'string' || body.ipfs_cid.trim().length === 0 || body.ipfs_cid.length > 256)) {
    return 'ipfs_cid must be a nonempty string of at most 256 characters'
  }
  return null
}

export function updatedRowFromRpc(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null
}

export function validateAnchorRequirements(body: RequestUpdatePayload): string | null {
  if (body.status === 'Anchored' && (!body.tx_hash || !body.document_hash || !body.issue_date)) {
    return 'Anchored transitions require tx_hash, document_hash, and issue_date'
  }
  return null
}
