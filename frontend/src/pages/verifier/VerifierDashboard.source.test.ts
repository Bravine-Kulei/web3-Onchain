import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { frontendSourcePath } from '../../test/sourcePath'

const source = readFileSync(frontendSourcePath('pages/verifier/VerifierDashboard.tsx'), 'utf8')

describe('VerifierDashboard verification boundaries', () => {
  it('routes every not-found result through the shared classifier', () => {
    expect(source).not.toContain("finishVerification(run, 'NOT_FOUND'")
    expect(source).toContain('classifyNotFound(run')
    expect(source).toContain("classifyVerification({ exists: false, revoked: false")
  })

  it('guards every external await before continuing active work', () => {
    expect(source).toMatch(/await getRequestById\(input\)\s*\n\s*if \(!isActiveRun\(run\)\) return/)
    expect(source).toMatch(/await hashFile\([^)]*\)\s*\n\s*if \(!isActiveRun\(run\)\) return/)
    expect(source).toMatch(/await getRequestByHash\(hash\)\s*\n\s*if \(!isActiveRun\(run\)\) return/)
    expect(source).toMatch(/await verifyOnChain\([\s\S]*?\)\s*\n\s*if \(!isActiveRun\(run\)\) return/)
  })

  it('keeps chain errors inside the chain-read boundary', () => {
    expect(source).toContain('const readChain = async')
    expect(source).toContain("finishVerification(run, 'CHAIN_ERROR'")
    expect(source).toContain('const classification = classifyVerification({')
  })

  it('deduplicates logging and never lets stale work restore loading', () => {
    expect(source).toContain('claimCompletion(run)')
    expect(source).toContain('if (!isActiveRun(run)) return')
    expect(source).toMatch(/clearVerification[\s\S]*setIsVerifying\(false\)/)
    expect(source).toContain('new VerificationRunCoordinator(recordVerification')
    expect(source).toContain('attempt_id: activeAttemptId.current')
    expect(source).toContain('Retry Audit Log')
    expect(source).toContain('persistAudit(run, payload)')
  })
})
