export type InstitutionDetails = {
  name: string
  role: number
  active: boolean
  joinedAt: number
}

export function parseInstitutionTuple(value: unknown): InstitutionDetails {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error('Invalid institution data returned by contract')
  }

  const [name, role, active, joinedAt] = value
  if (
    typeof name !== 'string' ||
    (typeof role !== 'number' && typeof role !== 'bigint') ||
    typeof active !== 'boolean' ||
    typeof joinedAt !== 'bigint'
  ) {
    throw new Error('Invalid institution data returned by contract')
  }

  const normalizedRole = Number(role)
  if (!Number.isSafeInteger(normalizedRole) || normalizedRole < 0 || normalizedRole > 3) {
    throw new Error('Invalid institution data returned by contract')
  }

  const joinedAtMs = Number(joinedAt) * 1000
  if (!Number.isSafeInteger(joinedAtMs)) {
    throw new Error('Invalid institution data returned by contract')
  }

  return { name, role: normalizedRole, active, joinedAt: joinedAtMs }
}
