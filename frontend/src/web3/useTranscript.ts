import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem'
import TranscriptRegistryABI from '../contracts/TranscriptRegistry.json'
import addresses from '../contracts/addresses.json'

const CONTRACT = {
  address: addresses.transcriptRegistry as `0x${string}`,
  abi: TranscriptRegistryABI.abi,
}

// Hash a file using SHA-256 via Web Crypto API → returns hex bytes32
export async function hashFile(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return ('0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

// Hash a string (for transcript ID lookups in demo)
export function hashString(str: string): `0x${string}` {
  return keccak256(toBytes(str))
}

export function useVerifyTranscript(documentHash: `0x${string}` | undefined) {
  return useReadContract({
    ...CONTRACT,
    functionName: 'verifyTranscript',
    args: documentHash ? [documentHash] : undefined,
    query: { enabled: !!documentHash },
  })
}

export function useIssueTranscript() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const issue = (
    documentHash: `0x${string}`,
    recipient: `0x${string}`,
    studentId: string,
    program: string
  ) => {
    writeContract({
      ...CONTRACT,
      functionName: 'issueTranscript',
      args: [documentHash, recipient, studentId, program],
    })
  }

  return { issue, isPending: isPending || isConfirming, isSuccess, txHash: hash, error }
}

export function useRevokeTranscript() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const revoke = (documentHash: `0x${string}`) => {
    writeContract({
      ...CONTRACT,
      functionName: 'revokeTranscript',
      args: [documentHash],
    })
  }

  return { revoke, isPending: isPending || isConfirming, isSuccess, txHash: hash, error }
}
