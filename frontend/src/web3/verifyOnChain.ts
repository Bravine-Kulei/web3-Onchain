import { parseAbiItem, type PublicClient } from 'viem'
import { getTranscriptRegistry } from './contracts'

export interface OnChainVerifyResult {
  exists: boolean
  revoked: boolean
  issuer: `0x${string}`
  studentId: string
  program: string
  issuedAt: number
  txHash?: `0x${string}`
}

export async function verifyOnChain(
  publicClient: PublicClient,
  chainId: number,
  docHash: `0x${string}`,
): Promise<OnChainVerifyResult> {
  const contract = getTranscriptRegistry(chainId)
  if (!contract) {
    throw new Error('No chain connection')
  }

  const data = await publicClient.readContract({
    ...contract,
    functionName: 'verifyTranscript',
    args: [docHash],
  }) as [boolean, boolean, string, string, string, bigint]

  const [exists, revoked, issuer, studentId, program, issuedAt] = data

  let txHash: `0x${string}` | undefined
  try {
    const logs = await publicClient.getLogs({
      address: contract.address,
      event: parseAbiItem(
        'event TranscriptIssued(bytes32 indexed documentHash, address indexed issuer, string studentId, string program, uint256 timestamp)'
      ),
      args: { documentHash: docHash },
      fromBlock: 0n,
    })
    txHash = logs[0]?.transactionHash ?? undefined
  } catch {
    // optional — don't block verification on log lookup failure
  }

  return {
    exists,
    revoked,
    issuer: issuer as `0x${string}`,
    studentId,
    program,
    issuedAt: Number(issuedAt) * 1000,
    txHash,
  }
}
