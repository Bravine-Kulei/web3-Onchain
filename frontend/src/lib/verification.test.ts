import { describe, expect, it } from 'vitest'
import {
  classifyVerification,
  InvalidVerificationHashError,
  normalizeVerificationHash,
  authoritativeAcademicFields,
} from './verification'

const HASH_A = `0x${'a'.repeat(64)}`
const HASH_B = `0x${'b'.repeat(64)}`

describe('classifyVerification', () => {
  it('returns NOT_FOUND when the chain record does not exist', () => {
    expect(classifyVerification({ exists: false, revoked: true, expectedHash: HASH_A, suppliedHash: HASH_B })).toBe('NOT_FOUND')
  })

  it('returns REVOKED before considering a hash mismatch', () => {
    expect(classifyVerification({ exists: true, revoked: true, expectedHash: HASH_A, suppliedHash: HASH_B })).toBe('REVOKED')
  })

  it('returns TAMPERED only when both hashes exist and differ', () => {
    expect(classifyVerification({ exists: true, revoked: false, expectedHash: HASH_A, suppliedHash: HASH_B })).toBe('TAMPERED')
    expect(classifyVerification({ exists: true, revoked: false, expectedHash: HASH_A })).toBe('VERIFIED')
  })

  it('matches hashes case-insensitively', () => {
    expect(classifyVerification({ exists: true, revoked: false, expectedHash: HASH_A, suppliedHash: HASH_A.toUpperCase() })).toBe('VERIFIED')
  })

  it('returns VERIFIED for an existing, active record with no comparison hash', () => {
    expect(classifyVerification({ exists: true, revoked: false, expectedHash: HASH_A })).toBe('VERIFIED')
  })

  it.each(['', '0x1234', `0x${'g'.repeat(64)}`, 'a'.repeat(64)])('rejects malformed hash %j', (malformed: string) => {
    expect(() => normalizeVerificationHash(malformed)).toThrow(InvalidVerificationHashError)
    expect(() => classifyVerification({ exists: true, revoked: false, expectedHash: malformed, suppliedHash: HASH_A })).toThrow(InvalidVerificationHashError)
  })

  it('preserves chain-authority precedence even when optional hashes are malformed', () => {
    expect(classifyVerification({ exists: false, revoked: true, expectedHash: 'bad', suppliedHash: 'also-bad' })).toBe('NOT_FOUND')
    expect(classifyVerification({ exists: true, revoked: true, expectedHash: 'bad', suppliedHash: 'also-bad' })).toBe('REVOKED')
  })
})

describe('authoritativeAcademicFields', () => {
  it('keeps chain academic values independent of off-chain metadata', () => {
    expect(authoritativeAcademicFields({ studentId: 'CHAIN-ID', program: 'Chain Program' })).toEqual({
      studentId: 'CHAIN-ID',
      program: 'Chain Program',
    })
  })
})
