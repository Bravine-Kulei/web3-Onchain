import { beforeEach, describe, expect, it, vi } from 'vitest'

const { edgeFetch, getSessionToken, rpc } = vi.hoisted(() => ({
  edgeFetch: vi.fn(),
  getSessionToken: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc },
}))
vi.mock('./siweAuth', () => ({ AUTH_BYPASS: false, edgeFetch }))
vi.mock('./siweSession', () => ({ getSessionToken }))

import { secureRecordVerification, secureUpdateRequestStatus } from './secureApi'

describe('secureUpdateRequestStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws UNAUTHORIZED without a session', async () => {
    getSessionToken.mockReturnValue(null)

    await expect(secureUpdateRequestStatus('REQ-ABC1234', 'Approved')).rejects.toMatchObject({
      name: 'SecureWriteError',
      code: 'UNAUTHORIZED',
    })
    expect(edgeFetch).not.toHaveBeenCalled()
  })

  it.each([
    [{ data: { request_id: 'REQ-ABC1234', status: 'Approved', updated_at: '2026-07-19T01:00:00.000Z' } }],
    [{ requestId: 'REQ-ABC1234', status: 'Approved', syncedAt: '2026-07-19T01:00:00.000Z' }],
  ])('normalizes an Edge Function update response', async response => {
    getSessionToken.mockReturnValue('session')
    edgeFetch.mockResolvedValue(response)

    await expect(secureUpdateRequestStatus('REQ-ABC1234', 'Approved')).resolves.toEqual({
      requestId: 'REQ-ABC1234',
      status: 'Approved',
      syncedAt: '2026-07-19T01:00:00.000Z',
    })
  })

  it.each([
    {},
    [],
    { ok: true },
    { error: 'update failed' },
    { data: {} },
    { data: { request_id: 'REQ-DIFFERENT', status: 'Approved', updated_at: '2026-07-19T01:00:00.000Z' } },
    { data: { request_id: 'REQ-ABC1234', status: 'Rejected', updated_at: '2026-07-19T01:00:00.000Z' } },
    { data: { request_id: 'REQ-ABC1234', status: 'Bogus', updated_at: '2026-07-19T01:00:00.000Z' } },
    { data: { request_id: 'REQ-ABC1234', status: 'Approved', updated_at: 'not-a-date' } },
  ])('rejects malformed successful Edge payloads', async response => {
    getSessionToken.mockReturnValue('session')
    edgeFetch.mockResolvedValue(response)

    await expect(secureUpdateRequestStatus('REQ-ABC1234', 'Approved')).rejects.toMatchObject({
      code: 'UNKNOWN',
    })
  })
})

describe('secureRecordVerification', () => {
  const record = { attempt_id: '123e4567-e89b-42d3-a456-426614174000', result: 'VERIFIED' as const }

  beforeEach(() => vi.clearAllMocks())

  it('throws without a session instead of silently losing the audit record', async () => {
    getSessionToken.mockReturnValue(null)
    await expect(secureRecordVerification(record)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('rethrows server failures and retries the identical attempt id', async () => {
    getSessionToken.mockReturnValue('session')
    edgeFetch.mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValueOnce({ ok: true, attempt_id: record.attempt_id })

    await expect(secureRecordVerification(record)).rejects.toMatchObject({ code: 'NETWORK' })
    await expect(secureRecordVerification(record)).resolves.toBeUndefined()
    expect(JSON.parse(edgeFetch.mock.calls[0][1].body).attempt_id).toBe(record.attempt_id)
    expect(JSON.parse(edgeFetch.mock.calls[1][1].body).attempt_id).toBe(record.attempt_id)
  })
})
