import { describe, expect, it, vi } from 'vitest'
import { VerificationRunCoordinator } from './verificationRun'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

describe('VerificationRunCoordinator', () => {
  it('cancels stale deferred work and finalizes a run only once', () => {
    const coordinator = new VerificationRunCoordinator(async () => undefined, vi.fn())
    const first = coordinator.begin()
    const second = coordinator.begin()
    expect(coordinator.isActive(first.token)).toBe(false)
    expect(coordinator.claimCompletion(first.token)).toBe(false)
    expect(coordinator.claimCompletion(second.token)).toBe(true)
    expect(coordinator.claimCompletion(second.token)).toBe(false)
  })

  it('makes one audit call then retries the exact payload and attempt ID after failure', async () => {
    const persist = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
    const states: string[] = []
    const coordinator = new VerificationRunCoordinator<{ attempt_id: string }>(persist, state => states.push(state))
    const run = coordinator.begin()
    const payload = { attempt_id: run.attemptId }
    coordinator.persistAudit(run.token, payload)
    await vi.waitFor(() => expect(states.at(-1)).toBe('error'))
    expect(persist).toHaveBeenCalledTimes(1)
    expect(coordinator.retryAudit(run.token)).toBe(true)
    await vi.waitFor(() => expect(states.at(-1)).toBe('logged'))
    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist.mock.calls[0][0]).toBe(payload)
    expect(persist.mock.calls[1][0]).toBe(payload)
  })

  it('ignores persistence completion after cancellation', async () => {
    const pending = deferred<void>()
    const states: string[] = []
    const coordinator = new VerificationRunCoordinator(() => pending.promise, state => states.push(state))
    const run = coordinator.begin()
    coordinator.persistAudit(run.token, { result: 'VERIFIED' })
    coordinator.cancel()
    pending.resolve()
    await pending.promise
    await Promise.resolve()
    expect(states).toEqual(['pending'])
  })
})
