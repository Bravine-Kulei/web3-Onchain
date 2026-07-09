export const CHAIN_IDS = {
  hardhat: 31337,
  amoy: 80002,
} as const

export type SupportedChain = keyof typeof CHAIN_IDS

export const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.hardhat]: 'Hardhat Local',
  [CHAIN_IDS.amoy]: 'Polygon Amoy',
}

export const HARDHAT_RPC = 'http://127.0.0.1:8545'

export function resolveExpectedChainId(chainEnv?: string): number {
  return chainEnv?.toLowerCase() === 'amoy' ? CHAIN_IDS.amoy : CHAIN_IDS.hardhat
}
