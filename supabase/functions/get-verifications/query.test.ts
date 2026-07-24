import { SAFE_VERIFICATION_COLUMNS, verificationHistoryQuery } from './query.ts'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

Deno.test('history query normalizes and filters the verified wallet', () => {
  const query = verificationHistoryQuery(`  0x${'AB'.repeat(20)}  `)
  assert(query.verifierWallet === `0x${'ab'.repeat(20)}`, 'wallet not normalized')
  assert(query.columns === SAFE_VERIFICATION_COLUMNS, 'safe projection changed')
  assert(!query.columns.includes('student_name'), 'student PII selected')
  assert(!query.columns.includes('transcript_input'), 'raw input selected')
})

Deno.test('history query rejects a missing or malformed verified wallet', () => {
  for (const wallet of ['', '0x1234']) {
    let rejected = false
    try { verificationHistoryQuery(wallet) } catch { rejected = true }
    assert(rejected, `wallet ${wallet} accepted`)
  }
})
