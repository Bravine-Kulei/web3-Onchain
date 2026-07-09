import { createHash } from 'crypto'
import { metadataHashInput } from './metadata'

export { metadataHashInput }

/** SHA-256 of UTF-8 string → 0x-prefixed bytes32 hex (Node / Hardhat). */
export function sha256HexFromUtf8(value: string): `0x${string}` {
  return (`0x${createHash('sha256').update(value).digest('hex')}`) as `0x${string}`
}

export function sha256HexFromMetadata(
  requestId: string,
  studentId: string,
  program: string,
): `0x${string}` {
  return sha256HexFromUtf8(metadataHashInput(requestId, studentId, program))
}
