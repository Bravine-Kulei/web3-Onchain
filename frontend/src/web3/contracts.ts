import InstitutionRegistryABI from '../contracts/InstitutionRegistry.json'
import TranscriptRegistryABI from '../contracts/TranscriptRegistry.json'
import addressesFile from '../contracts/addresses.json'
import { expectedChainId } from './config'

export interface ChainDeployment {
  institutionRegistry: `0x${string}`
  transcriptRegistry: `0x${string}`
  network: string
  deployedAt: string
  seededTranscripts?: { requestId: string; documentHash: string; status: string }[]
}

type AddressesFile = Record<string, ChainDeployment>

const addresses = addressesFile as AddressesFile

function normalizeDeployment(raw: ChainDeployment): ChainDeployment {
  return {
    ...raw,
    institutionRegistry: raw.institutionRegistry as `0x${string}`,
    transcriptRegistry: raw.transcriptRegistry as `0x${string}`,
  }
}

/** Resolve deployment for a chain, falling back to expected default chain. */
export function getChainDeployment(chainId?: number): ChainDeployment | null {
  const id = String(chainId ?? expectedChainId)
  const deployment = addresses[id]
  return deployment ? normalizeDeployment(deployment) : null
}

export function getInstitutionRegistry(chainId?: number) {
  const deployment = getChainDeployment(chainId)
  if (!deployment) return null
  return {
    address: deployment.institutionRegistry,
    abi: InstitutionRegistryABI.abi,
  }
}

export function getTranscriptRegistry(chainId?: number) {
  const deployment = getChainDeployment(chainId)
  if (!deployment) return null
  return {
    address: deployment.transcriptRegistry,
    abi: TranscriptRegistryABI.abi,
  }
}

export function getSupportedChainIds(): number[] {
  return Object.keys(addresses).map(Number)
}
