import { describe, expect, it } from 'vitest'
import { selectVerificationIdentifier } from './verificationHistory'

describe('selectVerificationIdentifier', () => {
  it('prefers request id, then document hash, then attempt id', () => {
    expect(selectVerificationIdentifier({ request_id: 'REQ-1', doc_hash: '0xabc', attempt_id: 'attempt-1' })).toEqual({
      label: 'Request',
      value: 'REQ-1',
    })
    expect(selectVerificationIdentifier({ doc_hash: '0xabc', attempt_id: 'attempt-1' })).toEqual({
      label: 'Document hash',
      value: '0xabc',
    })
    expect(selectVerificationIdentifier({ attempt_id: 'attempt-1' })).toEqual({
      label: 'Attempt ID',
      value: 'attempt-1',
    })
  })

  it('does not fall back to the privacy-deprecated transcript input', () => {
    expect(selectVerificationIdentifier({ transcript_input: 'private-file.pdf' })).toBeNull()
  })
})
