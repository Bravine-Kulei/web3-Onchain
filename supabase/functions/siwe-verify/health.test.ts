import { assertEquals } from 'jsr:@std/assert@1'
import { getSiweHealth } from './health.ts'

Deno.test('health requires a secret and exact expected domain match', () => {
  assertEquals(getSiweHealth(undefined, 'localhost:5173', 'localhost:5173'), {
    ok: false,
    domainMatch: true,
  })
  assertEquals(getSiweHealth('configured', 'localhost:5173', 'wrong.example'), {
    ok: false,
    domainMatch: false,
  })
  assertEquals(getSiweHealth('configured', 'localhost:5173', 'localhost:5173'), {
    ok: true,
    domainMatch: true,
  })
})
