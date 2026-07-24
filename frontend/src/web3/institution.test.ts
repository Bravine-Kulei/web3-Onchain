import { describe, expect, it } from 'vitest'

import { parseInstitutionTuple } from './institution'

describe('parseInstitutionTuple', () => {
  it.each([3, 3n])('normalizes a decoded institution tuple with role %s', role => {
    expect(parseInstitutionTuple(['Example University', role, true, 1_700_000_000n])).toEqual({
      name: 'Example University',
      role: 3,
      active: true,
      joinedAt: 1_700_000_000_000,
    })
  })

  it.each([
    null,
    ['Example University', 3, true],
    ['Example University', '3', true, 1n],
    ['Example University', -1, true, 1n],
    ['Example University', 4n, true, 1n],
    ['Example University', 3, true, Number.MAX_SAFE_INTEGER],
  ])('rejects malformed contract data: %j', value => {
    expect(() => parseInstitutionTuple(value)).toThrow('Invalid institution data returned by contract')
  })
})
