import { describe, expect, it, vi } from 'vitest'
import { createRequestSync, loadPendingRequestSync, pendingRequestSyncKey, retryPendingRequestSync, type RequestSyncContext } from './requestSync'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return { get length() { return values.size }, clear: () => values.clear(), getItem: k => values.get(k) ?? null,
    key: i => [...values.keys()][i] ?? null, removeItem: k => { values.delete(k) }, setItem: (k, v) => { values.set(k, v) } }
}

const hash = `0x${'a'.repeat(64)}`
const tx = `0x${'b'.repeat(64)}`
const account = `0x${'c'.repeat(40)}`
const context: RequestSyncContext = { chainId: 31337, account }
const issuance = { requestId: 'TR-100', status: 'Anchored' as const, chainTxHash: tx,
  update: { tx_hash: tx, document_hash: hash, issue_date: '2026-07-19T00:00:00.000Z' } }

describe('request status reconciliation', () => {
  it('syncs once and clears context-bound storage', async () => {
    const storage = memoryStorage(); const update = vi.fn().mockResolvedValue(undefined)
    const result = await createRequestSync(issuance, context, { updateRequestStatus: update, storage })
    expect(result.state).toBe('synced'); expect(update).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith('TR-100', 'Anchored', issuance.update); expect(storage.length).toBe(0)
  })

  it('preserves a serializable context-bound payload after DB failure', async () => {
    const storage = memoryStorage()
    const result = await createRequestSync(issuance, context, { updateRequestStatus: vi.fn().mockRejectedValue(new Error('offline')), storage })
    expect(result.state).toBe('pending')
    const raw = storage.getItem(pendingRequestSyncKey('TR-100', 'Anchored', context))
    expect(raw).not.toBeNull()
    if (raw === null) throw new Error('Expected pending sync data to be stored')
    expect(JSON.parse(raw)).toEqual(expect.objectContaining({ ...issuance, ...context, syncPhase: 'database' }))
    expect(JSON.parse(JSON.stringify(result.pending))).toEqual(result.pending)
  })

  it('failed DB retry retains pending state and storage', async () => {
    const storage = memoryStorage()
    const first = await createRequestSync(issuance, context, { updateRequestStatus: vi.fn().mockRejectedValue(new Error('409')), storage })
    const result = await retryPendingRequestSync(first.pending, context, { updateRequestStatus: vi.fn().mockRejectedValue(new Error('409')), storage })
    expect(result.state).toBe('pending')
    expect(storage.getItem(pendingRequestSyncKey('TR-100', 'Anchored', context))).not.toBeNull()
  })

  it('revocation sends no anchor metadata', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    await createRequestSync({ requestId: 'TR-200', status: 'Revoked', chainTxHash: tx }, context, { updateRequestStatus: update, storage: memoryStorage() })
    expect(update).toHaveBeenCalledWith('TR-200', 'Revoked', undefined)
  })

  it('loads only an exact request/status/chain/account match', async () => {
    const storage = memoryStorage()
    await createRequestSync(issuance, context, { updateRequestStatus: vi.fn().mockRejectedValue(new Error('offline')), storage })
    expect(loadPendingRequestSync('TR-100', 'Anchored', context, storage).state).toBe('loaded')
    expect(loadPendingRequestSync('TR-100', 'Anchored', { ...context, chainId: 1 }, storage).state).toBe('empty')
    expect(loadPendingRequestSync('TR-100', 'Anchored', { ...context, account: `0x${'d'.repeat(40)}` }, storage).state).toBe('empty')
  })

  it('rejects parsed payload fields that mismatch the expected key context', () => {
    const storage = memoryStorage(); const key = pendingRequestSyncKey('TR-100', 'Anchored', context)
    const pending = { version: 1, createdAt: new Date().toISOString(), ...issuance, ...context, account: `0x${'d'.repeat(40)}`, syncPhase: 'database' }
    storage.setItem(key, JSON.stringify(pending))
    expect(loadPendingRequestSync('TR-100', 'Anchored', context, storage).state).toBe('storage-error')
  })

  it('rejects invalid strict anchor metadata', () => {
    const storage = memoryStorage(); const key = pendingRequestSyncKey('TR-100', 'Anchored', context)
    storage.setItem(key, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), ...issuance, ...context,
      chainTxHash: '0xbad', update: { ...issuance.update, issue_date: 'not-a-date' }, syncPhase: 'database' }))
    expect(loadPendingRequestSync('TR-100', 'Anchored', context, storage).state).toBe('storage-error')
  })

  it('reports getItem and parse failures explicitly', () => {
    const denied = memoryStorage(); denied.getItem = () => { throw new DOMException('denied', 'SecurityError') }
    expect(loadPendingRequestSync('TR-100', 'Anchored', context, denied).state).toBe('storage-error')
    const malformed = memoryStorage(); malformed.setItem(pendingRequestSyncKey('TR-100', 'Anchored', context), '{bad')
    expect(loadPendingRequestSync('TR-100', 'Anchored', context, malformed).state).toBe('storage-error')
  })

  it('cleanup retry removes storage without a second DB call', async () => {
    const storage = memoryStorage(); const update = vi.fn().mockResolvedValue(undefined)
    const remove = storage.removeItem.bind(storage); storage.removeItem = vi.fn(() => { throw new DOMException('denied', 'SecurityError') })
    const first = await createRequestSync(issuance, context, { updateRequestStatus: update, storage })
    expect(first.state).toBe('synced-storage-cleanup-pending')
    storage.removeItem = remove; update.mockClear()
    const result = await retryPendingRequestSync(first.pending, context, { updateRequestStatus: update, storage })
    expect(result.state).toBe('synced'); expect(update).not.toHaveBeenCalled(); expect(storage.length).toBe(0)
  })
})
