import { canTransition, isSameState } from './request-status.ts'

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
  }
}

Deno.test('allows the complete demo request lifecycle', () => {
  const lifecycle = ['Pending', 'Under Review', 'Approved', 'Anchored', 'Available', 'Verified', 'Revoked']

  for (let index = 0; index < lifecycle.length - 1; index += 1) {
    assertEquals(canTransition(lifecycle[index], lifecycle[index + 1]), true)
  }

  // The registrar UI combines review, approval, and chain issuance into one action.
  assertEquals(canTransition('Pending', 'Anchored'), true)
})

Deno.test('allows rejection branches and identifies same-state requests', () => {
  for (const status of ['Pending', 'Under Review', 'Approved']) {
    assertEquals(canTransition(status, 'Rejected'), true)
  }
  assertEquals(canTransition('Anchored', 'Revoked'), true)
  assertEquals(canTransition('Available', 'Revoked'), true)
  assertEquals(canTransition('Verified', 'Revoked'), true)
  assertEquals(canTransition('Approved', 'Approved'), true)
  assertEquals(isSameState('Approved', 'Approved'), true)
  assertEquals(isSameState('Approved', 'Anchored'), false)
})

Deno.test('rejects backwards transitions and transitions out of terminal states', () => {
  assertEquals(canTransition('Under Review', 'Pending'), false)
  assertEquals(canTransition('Approved', 'Under Review'), false)
  assertEquals(canTransition('Available', 'Anchored'), false)
  assertEquals(canTransition('Verified', 'Available'), false)

  for (const terminal of ['Rejected', 'Revoked', 'Tampered']) {
    assertEquals(canTransition(terminal, 'Pending'), false)
    assertEquals(canTransition(terminal, terminal), true)
  }
})

Deno.test('rejects unknown statuses', () => {
  assertEquals(canTransition('Pending', 'Bogus'), false)
  assertEquals(canTransition('Bogus', 'Pending'), false)
})
