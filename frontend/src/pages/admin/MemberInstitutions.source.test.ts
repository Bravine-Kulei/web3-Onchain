import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { frontendSourcePath } from '../../test/sourcePath'

const source = readFileSync(frontendSourcePath('pages/admin/MemberInstitutions.tsx'), 'utf8')

describe('MemberInstitutions receipt handling', () => {
  it('ignores a stale success receipt after its action has already been handled', () => {
    expect(source).toContain('if (!isSuccess || !lastAction.current) return')
    expect(source).toContain('const completedAction = lastAction.current')
    expect(source).toContain('const completedInstitutionName = addedInstitutionName.current')
    expect(source).toContain("if (completedAction === 'deactivate')")
  })
})
