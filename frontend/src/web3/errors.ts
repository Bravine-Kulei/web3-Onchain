import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

const REVERT_MESSAGES: Record<string, string> = {
  NotAdmin: 'Only the consortium admin can perform this action',
  NotAnAuthorizedIssuer: 'Your wallet is not an authorized issuer',
  HashAlreadyAnchored: 'This document hash is already anchored on-chain',
  TranscriptNotFound: 'Transcript not found on-chain',
  OnlyIssuerCanRevoke: 'Only the original issuer can revoke this transcript',
  AlreadyRevoked: 'This transcript is already revoked',
  AlreadyRegistered: 'This institution is already registered',
  NotRegistered: 'Institution is not registered or already inactive',
  ZeroAddress: 'Invalid zero address',
  StringTooLong: 'One or more text fields exceed the allowed length',
}

function isUserRejected(error: unknown): boolean {
  if (error instanceof UserRejectedRequestError) return true
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('4001')
}

function isRpcError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('network') ||
    msg.includes('HTTP request failed') ||
    msg.includes('No chain connection')
  )
}

function isWrongChainError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('chain') && (msg.includes('match') || msg.includes('mismatch') || msg.includes('unsupported'))
}

function extractRevertName(error: unknown): string | null {
  if (error instanceof BaseError) {
    const revert = error.walk(err => err instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      return revert.data?.errorName ?? revert.reason ?? null
    }
  }
  const msg = error instanceof Error ? error.message : String(error)
  for (const name of Object.keys(REVERT_MESSAGES)) {
    if (msg.includes(name)) return name
  }
  return null
}

export interface ParsedContractError {
  title: string
  description?: string
  isUserRejected: boolean
  isRpcError: boolean
  isWrongChain: boolean
}

export function parseContractError(error: unknown): ParsedContractError {
  if (isUserRejected(error)) {
    return {
      title: 'Transaction cancelled',
      description: 'You declined the wallet request.',
      isUserRejected: true,
      isRpcError: false,
      isWrongChain: false,
    }
  }

  if (isWrongChainError(error)) {
    return {
      title: 'Wrong network',
      description: 'Switch to the configured TransCrypt network in your wallet.',
      isUserRejected: false,
      isRpcError: false,
      isWrongChain: true,
    }
  }

  if (isRpcError(error)) {
    return {
      title: 'Cannot reach blockchain',
      description: 'Is the local Hardhat node running, or are you on the correct network?',
      isUserRejected: false,
      isRpcError: true,
      isWrongChain: false,
    }
  }

  const revertName = extractRevertName(error)
  if (revertName && REVERT_MESSAGES[revertName]) {
    return {
      title: REVERT_MESSAGES[revertName],
      isUserRejected: false,
      isRpcError: false,
      isWrongChain: false,
    }
  }

  const fallback = error instanceof Error ? error.message : 'Something went wrong'
  return {
    title: 'Transaction failed',
    description: fallback.length > 120 ? `${fallback.slice(0, 120)}…` : fallback,
    isUserRejected: false,
    isRpcError: false,
    isWrongChain: false,
  }
}

export function parseReadError(error: unknown): ParsedContractError {
  const parsed = parseContractError(error)
  if (parsed.isRpcError) {
    return {
      ...parsed,
      title: 'Chain query failed',
      description: parsed.description ?? 'Cannot reach the blockchain.',
    }
  }
  return parsed
}
