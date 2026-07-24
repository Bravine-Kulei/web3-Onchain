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
  seededInstitutions?: { wallet: string; name: string; role: string }[]
  seededTranscripts?: { requestId: string; documentHash: string; status: string }[]
}

export type AddressesFile = Record<string, ChainAddresses>

export interface AddressWriteOptions {
  now?: () => number
  warn?: (message: string) => void
  renameSync?: (from: string, to: string) => void
}

export interface AddressWriteResult {
  corruptBackupPath?: string
}

export function loadAddresses(): AddressesFile {
  if (fs.existsSync(PATHS.addresses)) {
    return JSON.parse(fs.readFileSync(PATHS.addresses, 'utf8'))
  }
  return {}
}

export function writeAddressesFile(
  addressesPath: string,
  chainId: number,
  deployment: ChainAddresses,
  options: AddressWriteOptions = {},
): AddressWriteResult {
  const now = options.now ?? Date.now
  const warn = options.warn ?? console.warn
  const renameSync = options.renameSync ?? fs.renameSync
  const originalExists = fs.existsSync(addressesPath)
  const original = originalExists ? fs.readFileSync(addressesPath, 'utf8') : undefined
  let all: AddressesFile = {}
  let corruptBackupPath: string | undefined

  if (original !== undefined) {
    try {
      all = JSON.parse(original)
    } catch {
      const base = `${addressesPath}.corrupt-${now()}`
      corruptBackupPath = `${base}.bak`
      let suffix = 1
      while (fs.existsSync(corruptBackupPath)) {
        corruptBackupPath = `${base}-${suffix}.bak`
        suffix += 1
      }
      fs.writeFileSync(corruptBackupPath, original, 'utf8')
      warn(`[sync] Malformed addresses JSON backed up exactly to ${corruptBackupPath}; rebuilding active deployment`)
    }
  }

  all[String(chainId)] = deployment
  fs.mkdirSync(path.dirname(addressesPath), { recursive: true })
  const operationId = `${process.pid}-${now()}`
  const temporary = `${addressesPath}.${operationId}.tmp`
  const previous = `${addressesPath}.${operationId}.previous.bak`
  fs.writeFileSync(temporary, `${JSON.stringify(all, null, 2)}\n`, 'utf8')
  try {
    if (originalExists) renameSync(addressesPath, previous)
    renameSync(temporary, addressesPath)
  } catch (error) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
    if (fs.existsSync(previous)) {
      try {
        renameSync(previous, addressesPath)
      } catch (restoreError) {
        throw new Error(
          `[sync] Atomic address replacement failed and rollback failed. Recover the original from ${previous}. ` +
          `Replace error: ${String(error)}. Restore error: ${String(restoreError)}`,
        )
      }
      throw new Error(`[sync] Atomic address replacement failed; original restored. ${String(error)}`)
    }
    throw new Error(`[sync] Atomic address replacement failed; original target was not moved. ${String(error)}`)
  }
  if (fs.existsSync(previous)) fs.unlinkSync(previous)
  return { corruptBackupPath }
}

export function writeAddresses(chainId: number, deployment: ChainAddresses): void {
  writeAddressesFile(PATHS.addresses, chainId, deployment)
  console.log(`[sync] Addresses written → ${PATHS.addresses} (chain ${chainId})`)
}
