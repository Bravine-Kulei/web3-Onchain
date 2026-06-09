import { useReadContracts, useAccount } from 'wagmi'
import InstitutionRegistryABI from '../contracts/InstitutionRegistry.json'
import addresses from '../contracts/addresses.json'

const REGISTRY = {
  address: addresses.institutionRegistry as `0x${string}`,
  abi: InstitutionRegistryABI.abi,
}

export type OnChainRole = 'Issuer' | 'Verifier' | 'Both' | 'Admin' | 'None'

export function useWalletRole() {
  const { address, isConnected } = useAccount()

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...REGISTRY, functionName: 'isIssuer', args: [address!] },
      { ...REGISTRY, functionName: 'isVerifier', args: [address!] },
      { ...REGISTRY, functionName: 'institutions', args: [address!] },
      { ...REGISTRY, functionName: 'admin', args: [] },
    ],
    query: {
      enabled: !!address && isConnected,
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
  }
}
