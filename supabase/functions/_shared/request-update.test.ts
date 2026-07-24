import { updatedRowFromRpc, validateAnchorRequirements, validateUpdatePayload } from './request-update.ts'

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
}

const hash = `0x${'a'.repeat(64)}`

Deno.test('accepts the metadata emitted by RequestReview for anchoring', () => {
  assertEquals(validateUpdatePayload({
    request_id: 'REQ-ABC1234',
    status: 'Anchored',
    tx_hash: hash,
    document_hash: hash,
    issue_date: '2026-07-19T01:00:00.000Z',
  }), null)
})

Deno.test('allows metadata-free same-state Anchored requests but requires metadata for a new anchor', () => {
  const body = { request_id: 'REQ-ABC1234', status: 'Anchored' }
  assertEquals(validateUpdatePayload(body), null)
  assertEquals(validateAnchorRequirements(body), 'Anchored transitions require tx_hash, document_hash, and issue_date')
})

Deno.test('validates optional anchor metadata when supplied', () => {
  assertEquals(validateUpdatePayload({
    request_id: 'REQ-ABC1234', status: 'Anchored', tx_hash: hash,
    document_hash: hash, issue_date: '2026-07-19T01:00:00.000Z',
    block_number: 0, ipfs_cid: 'bafy-valid-cid',
  }), null)
  assertEquals(validateUpdatePayload({
    request_id: 'REQ-ABC1234', status: 'Anchored', tx_hash: '0x1234',
    document_hash: hash, issue_date: '2026-07-19T01:00:00.000Z',
  }), 'tx_hash must be a 0x-prefixed 32-byte hex value')
  assertEquals(validateUpdatePayload({
    request_id: 'REQ-ABC1234', status: 'Anchored', tx_hash: hash,
    document_hash: hash, issue_date: '2026-07-19T01:00:00.000Z', block_number: -1,
  }), 'block_number must be a nonnegative safe integer')
  assertEquals(validateUpdatePayload({
    request_id: 'REQ-ABC1234', status: 'Anchored', tx_hash: hash,
    document_hash: hash, issue_date: 'invalid',
  }), 'issue_date must be a valid ISO timestamp')
  assertEquals(validateUpdatePayload({
    request_id: 'REQ-ABC1234', status: 'Anchored', tx_hash: hash,
    document_hash: hash, issue_date: '2026-07-19T01:00:00.000Z', ipfs_cid: '',
  }), 'ipfs_cid must be a nonempty string of at most 256 characters')
})

Deno.test('rejects anchor metadata for non-Anchored statuses', () => {
  assertEquals(validateUpdatePayload({ request_id: 'REQ-ABC1234', status: 'Approved', tx_hash: hash }),
    'anchor metadata is only allowed when status is Anchored')
})

Deno.test('rejects unknown update fields', () => {
  assertEquals(validateUpdatePayload({ request_id: 'REQ-ABC1234', status: 'Rejected', student_name: 'Changed' }),
    'Unknown update field "student_name"')
})

Deno.test('maps an atomic RPC conflict to no updated row and preserves a returned row', () => {
  assertEquals(updatedRowFromRpc([]), null)
  const row = { request_id: 'REQ-ABC1234', status: 'Approved', updated_at: '2026-07-19T01:00:00.000Z' }
  assertEquals(updatedRowFromRpc([row]), row)
})
