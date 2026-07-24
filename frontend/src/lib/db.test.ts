import { beforeEach, describe, expect, it, vi } from 'vitest'

const { channel, on, removeChannel, secureUpdateRequestStatus, maybeSingle, query } = vi.hoisted(() => {
  const channel = { id: 'requests' }
  const maybeSingle = vi.fn()
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.ilike = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.maybeSingle = maybeSingle
  return {
    channel,
    on: vi.fn(),
    removeChannel: vi.fn(),
    secureUpdateRequestStatus: vi.fn(),
    maybeSingle,
    query,
  }
})

const subscribe = vi.fn(() => channel)
on.mockReturnValue({ on, subscribe })

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: vi.fn(() => ({ on })),
    removeChannel,
    from: vi.fn(() => query),
  },
}))
vi.mock('./secureApi', () => ({
  SecureWriteError: class SecureWriteError extends Error {},
  secureCreateRequest: vi.fn(),
  secureUpdateRequestStatus,
  secureRecordVerification: vi.fn(),
}))

import { generateRequestId, getRequestByHash, getRequestById, subscribeToRequests, updateRequestStatus } from './db'

describe('request lookup errors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null only when no request row exists', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(getRequestById('missing')).resolves.toBeNull()
  })

  it('propagates operational errors for ID and hash lookups', async () => {
    const error = new Error('database unavailable')
    maybeSingle.mockResolvedValue({ data: null, error })
    await expect(getRequestById('REQ-1')).rejects.toBe(error)
    await expect(getRequestByHash(`0x${'a'.repeat(64)}`)).rejects.toBe(error)
  })
})

describe('generateRequestId', () => {
  it('normalizes mocked time and randomness to seven uppercase alphanumeric characters', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    expect(generateRequestId()).toMatch(/^REQ-[A-Z0-9]{7}$/)
  })
})

describe('request updates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the secure update result', async () => {
    const result = { requestId: 'REQ-ABC1234', status: 'Approved' as const, syncedAt: '2026-07-19T00:00:00.000Z' }
    secureUpdateRequestStatus.mockResolvedValue(result)

    await expect(updateRequestStatus(result.requestId, result.status)).resolves.toEqual(result)
  })

  it('applies one realtime filter and checks the second institution in the payload', () => {
    const onUpdate = vi.fn()
    const cleanup = subscribeToRequests(onUpdate, {
      sourceInstitution: 'Source U',
      destInstitution: 'Destination U',
    })
    const [, insertConfig, insertHandler] = on.mock.calls[0]
    const [, updateConfig, updateHandler] = on.mock.calls[1]

    expect(insertConfig).toMatchObject({ event: 'INSERT', filter: 'source_institution=eq.Source U' })
    expect(updateConfig).toMatchObject({ event: 'UPDATE', filter: 'source_institution=eq.Source U' })
    insertHandler({ new: { source_institution: 'Source U', dest_institution: 'Other U' } })
    updateHandler({ new: { source_institution: 'Source U', dest_institution: 'Destination U' } })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ dest_institution: 'Destination U' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)

    cleanup()
    expect(removeChannel).toHaveBeenCalledWith(channel)
  })

  it('uses a destination realtime filter when it is the only institution boundary', () => {
    subscribeToRequests(vi.fn(), { destInstitution: 'Destination U' })

    expect(on.mock.calls[0][1]).toMatchObject({
      event: 'INSERT',
      filter: 'dest_institution=eq.Destination U',
    })
  })
})
