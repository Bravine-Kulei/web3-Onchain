import { updateRequestStatus as defaultUpdate, type RequestStatus } from './db'

type AnchorUpdate = { tx_hash: string; document_hash: string; issue_date: string; block_number?: number; ipfs_cid?: string }
export type RequestSyncContext = { chainId: number; account: string }
type SyncPhase = 'database' | 'cleanup'
type PendingBase = { version: 1; createdAt: string; requestId: string; chainTxHash: string; chainId: number; account: string; syncPhase: SyncPhase }
export type PendingRequestSync = PendingBase & ({ status: 'Anchored'; update: AnchorUpdate } | { status: 'Revoked'; update?: never })
export type RequestSyncInput = Omit<PendingBase, 'version' | 'createdAt' | 'chainId' | 'account' | 'syncPhase'>
  & ({ status: 'Anchored'; update: AnchorUpdate } | { status: 'Revoked'; update?: never })
type Update = (id: string, status: RequestStatus, extra?: AnchorUpdate) => Promise<unknown>
type Deps = { updateRequestStatus?: Update; storage?: Storage | null }
export type RequestSyncResult =
  | { state: 'synced'; pending: PendingRequestSync }
  | { state: 'synced-storage-cleanup-pending'; pending: PendingRequestSync; storageError: unknown }
  | { state: 'pending'; pending: PendingRequestSync; error: unknown }
  | { state: 'storage-failed'; pending: PendingRequestSync; error: unknown; storageError: unknown }
export type LoadPendingRequestSyncResult = { state: 'empty' } | { state: 'loaded'; pending: PendingRequestSync } | { state: 'storage-error'; error: unknown }

const PREFIX = 'transcrypt:request-sync:v2'
const HASH = /^0x[0-9a-fA-F]{64}$/
const ACCOUNT = /^0x[0-9a-fA-F]{40}$/
const CID = /^[A-Za-z0-9]+$/
const normalize = (value: string) => value.toLowerCase()

function validContext(context: RequestSyncContext): boolean {
  return Number.isSafeInteger(context.chainId) && context.chainId > 0 && ACCOUNT.test(context.account)
}

export function pendingRequestSyncKey(requestId: string, status: PendingRequestSync['status'], context: RequestSyncContext): string {
  if (!validContext(context)) throw new Error('Invalid request sync context')
  return `${PREFIX}:${context.chainId}:${normalize(context.account)}:${status}:${encodeURIComponent(requestId)}`
}

function session(): Storage | null { try { return typeof window === 'undefined' ? null : window.sessionStorage } catch { return null } }
function deps(value: Deps) { return { update: value.updateRequestStatus ?? defaultUpdate, storage: value.storage === undefined ? session() : value.storage } }
function validIso(value: string): boolean { return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value)) }

function validPending(value: unknown, requestId: string, status: PendingRequestSync['status'], context: RequestSyncContext): value is PendingRequestSync {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<PendingRequestSync>
  if (p.version !== 1 || typeof p.createdAt !== 'string' || !validIso(p.createdAt) || p.requestId !== requestId || p.status !== status
    || p.chainId !== context.chainId || typeof p.account !== 'string' || normalize(p.account) !== normalize(context.account)
    || typeof p.chainTxHash !== 'string' || !HASH.test(p.chainTxHash) || (p.syncPhase !== 'database' && p.syncPhase !== 'cleanup')) return false
  if (status === 'Revoked') return p.update === undefined
  const u = p.update
  return !!u && HASH.test(u.tx_hash) && u.tx_hash === p.chainTxHash && HASH.test(u.document_hash) && validIso(u.issue_date)
    && (u.block_number === undefined || (Number.isSafeInteger(u.block_number) && u.block_number >= 0))
    && (u.ipfs_cid === undefined || (u.ipfs_cid.length >= 20 && u.ipfs_cid.length <= 128 && CID.test(u.ipfs_cid)))
}

export function loadPendingRequestSync(requestId: string, status: PendingRequestSync['status'], context: RequestSyncContext,
  storage: Storage | null = session()): LoadPendingRequestSyncResult {
  try {
    if (!storage || !validContext(context)) throw new Error('sessionStorage or sync context unavailable')
    const raw = storage.getItem(pendingRequestSyncKey(requestId, status, context))
    if (!raw) return { state: 'empty' }
    const parsed: unknown = JSON.parse(raw)
    if (!validPending(parsed, requestId, status, context)) throw new Error('Stored request sync metadata does not match this wallet/network/request')
    return { state: 'loaded', pending: parsed }
  } catch (error) { return { state: 'storage-error', error } }
}

async function cleanup(pending: PendingRequestSync, storage: Storage | null): Promise<RequestSyncResult> {
  const cleanupPending = { ...pending, syncPhase: 'cleanup' as const }
  try {
    if (!storage) throw new Error('sessionStorage unavailable')
    if (pending.syncPhase !== 'cleanup') {
      storage.setItem(pendingRequestSyncKey(pending.requestId, pending.status, pending), JSON.stringify(cleanupPending))
    }
    storage.removeItem(pendingRequestSyncKey(pending.requestId, pending.status, pending))
    return { state: 'synced', pending: cleanupPending }
  } catch (storageError) { return { state: 'synced-storage-cleanup-pending', pending: cleanupPending, storageError } }
}

async function persist(pending: PendingRequestSync, expected: RequestSyncContext, options: Deps): Promise<RequestSyncResult> {
  const { update, storage } = deps(options)
  if (!validPending(pending, pending.requestId, pending.status, expected)) {
    return { state: 'storage-failed', pending, error: new Error('Pending sync context or metadata mismatch'), storageError: new Error('Unsafe pending payload') }
  }
  if (pending.syncPhase === 'cleanup') return cleanup(pending, storage)
  try {
    await update(pending.requestId, pending.status, pending.update)
    return cleanup(pending, storage)
  } catch (error) {
    try {
      if (!storage) throw new Error('sessionStorage unavailable')
      storage.setItem(pendingRequestSyncKey(pending.requestId, pending.status, expected), JSON.stringify(pending))
      return { state: 'pending', pending, error }
    } catch (storageError) { return { state: 'storage-failed', pending, error, storageError } }
  }
}

export function createRequestSync(input: RequestSyncInput, context: RequestSyncContext, options: Deps = {}): Promise<RequestSyncResult> {
  const pending = { version: 1, createdAt: new Date().toISOString(), ...input, chainId: context.chainId,
    account: normalize(context.account), syncPhase: 'database' } as PendingRequestSync
  return persist(pending, context, options)
}

export function retryPendingRequestSync(pending: PendingRequestSync, expected: RequestSyncContext, options: Deps = {}): Promise<RequestSyncResult> {
  return persist(pending, expected, options)
}
