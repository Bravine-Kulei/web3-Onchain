export type AuditPersistenceState = 'pending' | 'logged' | 'error'

export class VerificationRunCoordinator<TPayload> {
  private activeToken = 0
  private completedToken = 0
  private payloads = new Map<number, TPayload>()

  constructor(
    private readonly persist: (payload: TPayload) => Promise<void>,
    private readonly onAuditState: (state: AuditPersistenceState) => void,
  ) {}

  begin() {
    const token = ++this.activeToken
    return { token, attemptId: crypto.randomUUID() }
  }

  cancel() {
    this.activeToken += 1
  }

  isActive(token: number) {
    return token === this.activeToken
  }

  claimCompletion(token: number) {
    if (!this.isActive(token) || this.completedToken === token) return false
    this.completedToken = token
    return true
  }

  persistAudit(token: number, payload: TPayload) {
    this.payloads.set(token, payload)
    void this.runPersistence(token, payload)
  }

  retryAudit(token: number) {
    const payload = this.payloads.get(token)
    if (!payload || !this.isActive(token)) return false
    void this.runPersistence(token, payload)
    return true
  }

  private async runPersistence(token: number, payload: TPayload) {
    if (!this.isActive(token)) return
    this.onAuditState('pending')
    try {
      await this.persist(payload)
      if (!this.isActive(token)) return
      this.onAuditState('logged')
    } catch {
      if (!this.isActive(token)) return
      this.onAuditState('error')
    }
  }
}
