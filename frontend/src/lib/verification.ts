import type { VerifyResultValue } from './db'

export type VerificationClassification = Exclude<VerifyResultValue, 'CHAIN_ERROR'>

export class InvalidVerificationHashError extends Error {
  constructor(value: string) {
    super(`Invalid SHA-256 document hash: ${value}`)
    this.name = 'InvalidVerificationHashError'
  }
}

export function normalizeVerificationHash(value: string): `0x${string}` {
  const trimmed = value.trim()
  if (!/^0x[0-9a-f]{64}$/i.test(trimmed)) {
    throw new InvalidVerificationHashError(value)
  }
  return trimmed.toLowerCase() as `0x${string}`
}

export function classifyVerification(input: {
  exists: boolean
  revoked: boolean
  expectedHash?: string
  suppliedHash?: string
}): VerificationClassification {
  if (!input.exists) return 'NOT_FOUND'
  if (input.revoked) return 'REVOKED'
  if (input.expectedHash !== undefined && input.suppliedHash !== undefined) {
    return normalizeVerificationHash(input.expectedHash) === normalizeVerificationHash(input.suppliedHash)
      ? 'VERIFIED'
      : 'TAMPERED'
  }
  if (input.expectedHash !== undefined) normalizeVerificationHash(input.expectedHash)
  if (input.suppliedHash !== undefined) normalizeVerificationHash(input.suppliedHash)
  return 'VERIFIED'
}

export function authoritativeAcademicFields(chain: { studentId: string; program: string }) {
  return { studentId: chain.studentId, program: chain.program }
}
