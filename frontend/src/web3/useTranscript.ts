import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { metadataHashInput } from '@transcrypt/shared/metadata'
import { getTranscriptRegistry } from './contracts'

export { metadataHashInput }

async function sha256(data: ArrayBuffer | Uint8Array): Promise<`0x${string}`> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return ('0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`
}

export async function hashFile(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer()
  return sha256(buffer)
}

export async function hashString(str: string): Promise<`0x${string}`> {
  return sha256(new TextEncoder().encode(str))
}

export function useVerifyTranscript(documentHash: `0x${string}` | undefined) {
  const chainId = useChainId()
  const contract = getTranscriptRegistry(chainId)

  return useReadContract({
    address: contract?.address,
    abi: contract?.abi,
    functionName: 'verifyTranscript',
    args: documentHash ? [documentHash] : undefined,
    query: { enabled: !!documentHash && !!contract },
  })
}

export function useIssueTranscript() {
  const chainId = useChainId()
  const contract = getTranscriptRegistry(chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const issue = (
    documentHash: `0x${string}`,
    recipient: `0x${string}`,
    studentId: string,
    program: string
  ) => {
    if (!contract) return
    writeContract({
      ...contract,
      functionName: 'issueTranscript',
      args: [documentHash, recipient, studentId, program],
    })
  }

  return { issue, isPending: isPending || isConfirming, isSuccess, txHash: hash, error, hasContract: !!contract }
}

export function useRevokeTranscript() {
  const chainId = useChainId()
  const contract = getTranscriptRegistry(chainId)
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const revoke = (documentHash: `0x${string}`) => {
    if (!contract) return
    writeContract({
      ...contract,
      functionName: 'revokeTranscript',
      args: [documentHash],
    })
  }

  return { revoke, isPending: isPending || isConfirming, isSuccess, txHash: hash, error, hasContract: !!contract }
}
