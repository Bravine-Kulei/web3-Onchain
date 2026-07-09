import * as fs from 'fs'
import * as path from 'path'

const REPO_ROOT = path.resolve(__dirname, '..')

export const CONTRACT_NAMES = ['InstitutionRegistry', 'TranscriptRegistry'] as const

export const PATHS = {
  artifact: (name: string) =>
    path.join(REPO_ROOT, 'contracts/artifacts/contracts', `${name}.sol`, `${name}.json`),
  frontendAbi: (name: string) =>
    path.join(REPO_ROOT, 'frontend/src/contracts', `${name}.json`),
  addresses: path.join(REPO_ROOT, 'frontend/src/contracts/addresses.json'),
}

export function copyAbi(name: string): boolean {
  const artifact = PATHS.artifact(name)
  const dest = PATHS.frontendAbi(name)

  if (!fs.existsSync(artifact)) {
    console.warn(`[sync] Artifact not found for ${name} — run \`npm run compile\` first`)
    return false
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(artifact, dest)
  console.log(`[sync] ABI synced → ${dest}`)
  return true
}

export function syncAllAbis(): void {
  let ok = true
  for (const name of CONTRACT_NAMES) {
    if (!copyAbi(name)) ok = false
  }
  if (!ok) {
    throw new Error('ABI sync failed — compile contracts first')
  }
}

export interface ChainAddresses {
  institutionRegistry: string
  transcriptRegistry: string
  network: string
  deployedAt: string
  seededTranscripts?: { requestId: string; documentHash: string; status: string }[]
}

export type AddressesFile = Record<string, ChainAddresses>

export function loadAddresses(): AddressesFile {
  if (fs.existsSync(PATHS.addresses)) {
    return JSON.parse(fs.readFileSync(PATHS.addresses, 'utf8'))
  }
  return {}
}

export function writeAddresses(chainId: number, deployment: ChainAddresses): void {
  const all = loadAddresses()
  all[String(chainId)] = deployment
  fs.mkdirSync(path.dirname(PATHS.addresses), { recursive: true })
  fs.writeFileSync(PATHS.addresses, JSON.stringify(all, null, 2))
  console.log(`[sync] Addresses written → ${PATHS.addresses} (chain ${chainId})`)
}
