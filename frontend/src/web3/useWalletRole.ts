import { useReadContracts, useAccount, useChainId } from 'wagmi'
import { getInstitutionRegistry } from './contracts'

export type OnChainRole = 'Issuer' | 'Verifier' | 'Both' | 'Admin' | 'None'

export function useWalletRole() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const registry = getInstitutionRegistry(chainId)

  const { data, isLoading } = useReadContracts({
    contracts: registry && address ? [
      { ...registry, functionName: 'isIssuer', args: [address] },
      { ...registry, functionName: 'isVerifier', args: [address] },
      { ...registry, functionName: 'institutions', args: [address] },
      { ...registry, functionName: 'admin', args: [] },
    ] : [],
    query: {
      enabled: !!address && isConnected && !!registry,
      staleTime: 1000 * 60 * 5,
    },
  })

  const isIssuer = (data?.[0]?.result as boolean) ?? false
  const isVerifier = (data?.[1]?.result as boolean) ?? false
  const institution = data?.[2]?.result as readonly [string, number, boolean, bigint] | undefined
  const adminAddress = data?.[3]?.result as string | undefined

  const isAdmin = !!address && !!adminAddress &&
    address.toLowerCase() === adminAddress.toLowerCase()

  let role: OnChainRole = 'None'
  if (isAdmin) role = 'Admin'
  else if (isIssuer && isVerifier) role = 'Both'
  else if (isIssuer) role = 'Issuer'
  else if (isVerifier) role = 'Verifier'

  return {
    role,
    isIssuer,
    isVerifier,
    isAdmin,
    isRegistered: institution?.[2] ?? false,
    institutionName: (institution?.[0] as string) ?? '',
    isLoading,
    hasRegistry: !!registry,
  }
}
