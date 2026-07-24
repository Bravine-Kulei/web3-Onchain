import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { frontendSourcePath } from '../../test/sourcePath'

const readSource = (relativePath: string) => readFileSync(frontendSourcePath(relativePath), 'utf8')

describe('IssuedLog revoke persistence', () => {
  it('updates only status after an on-chain revoke and preserves issuance metadata', () => {
    const source = readSource('pages/registrar/IssuedLog.tsx')

    expect(source).toContain("status: 'Revoked'")
    expect(source).toContain('createRequestSync({')
    expect(source).not.toMatch(/status: ['"]Revoked['"],[\s\S]{0,120}update:/)
  })

  it('guards the handler and confirmation button during reconciliation', () => {
    const source = readSource('pages/registrar/IssuedLog.tsx')

    expect(source).toContain('if (isReconciling || chainSuccessUnreconciled) return')
    expect(source).toMatch(/disabled=\{isPending \|\| isReconciling \|\| \(isSuccess/)
  })

  it('keeps an issuance snapshot across route changes and gates stale UI completion', () => {
    const source = readSource('pages/registrar/RequestReview.tsx')
    const routeResetStart = source.indexOf('useEffect(() => {')
    const routeResetEnd = source.indexOf('// Hash exactly the current source')

    expect(routeResetStart).toBeGreaterThanOrEqual(0)
    expect(routeResetEnd).toBeGreaterThan(routeResetStart)
    const routeReset = source.slice(routeResetStart, routeResetEnd)

    expect(routeReset).not.toContain('issueSnapshot.current = null')
    expect(source).toContain('uiGeneration: originalRequestGeneration')
    expect(source).toContain('fetchGeneration.current === snapshot.uiGeneration')
    expect(source).toContain('createRequestSync({ requestId: snapshot.requestId')
  })

  it('invalidates issuance hashes and generation-guards issued-list context loads', () => {
    const review = readSource('pages/registrar/RequestReview.tsx')
    const issued = readSource('pages/registrar/IssuedLog.tsx')

    expect(review).toContain('const hashGeneration = useRef(0)')
    expect(review).toContain("setDocHash('0x')")
    expect(review).toContain('generation !== hashGeneration.current')
    expect(review).toContain('isValidDocumentHash')
    expect(issued).toContain('const requestLoadGeneration = useRef(0)')
    expect(issued).toContain('generation !== requestLoadGeneration.current')
  })

  it('locks async issue preparation and revalidates live context before broadcast', () => {
    const review = readSource('pages/registrar/RequestReview.tsx')

    expect(review).toContain('const [isPreparingIssue, setIsPreparingIssue] = useState(false)')
    expect(review).toContain('latestSyncContext.current')
    expect(review).toContain('originalHashGeneration !== hashGeneration.current')
    expect(review).toContain('Issue preparation changed')
    expect(review).toContain('if (!handedOffToChain) setIsPreparingIssue(false)')
  })
})
