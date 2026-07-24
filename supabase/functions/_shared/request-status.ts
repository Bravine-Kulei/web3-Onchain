export const REQUEST_STATUSES = [
  'Pending',
  'Under Review',
  'Approved',
  'Anchored',
  'Available',
  'Verified',
  'Revoked',
  'Rejected',
  'Tampered',
] as const

export type RequestStatus = typeof REQUEST_STATUSES[number]

const transitions: Record<RequestStatus, ReadonlySet<RequestStatus>> = {
  'Pending': new Set(['Under Review', 'Anchored', 'Rejected']),
  'Under Review': new Set(['Approved', 'Rejected', 'Anchored']),
  'Approved': new Set(['Anchored', 'Rejected']),
  'Anchored': new Set(['Available', 'Verified', 'Revoked']),
  'Available': new Set(['Verified', 'Revoked']),
  'Verified': new Set(['Revoked']),
  'Rejected': new Set(),
  'Revoked': new Set(),
  'Tampered': new Set(),
}

const knownStatuses = new Set<string>(REQUEST_STATUSES)

export function canTransition(from: string, to: string): boolean {
  if (!knownStatuses.has(from) || !knownStatuses.has(to)) return false
  if (from === to) return true
  return transitions[from as RequestStatus].has(to as RequestStatus)
}

export function isSameState(from: string, to: string): boolean {
  return knownStatuses.has(from) && from === to
}
