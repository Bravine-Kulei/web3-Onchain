import { validateVerificationInput, verificationUpsert } from './audit.ts'

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

Deno.test('validates UUID-like attempt IDs', () => {
  assert(validateVerificationInput({ result: 'VERIFIED', attempt_id: 'bad' }) === 'Valid attempt_id required', 'malformed ID accepted')
  assert(validateVerificationInput({ result: 'VERIFIED', attempt_id: '123e4567-e89b-42d3-a456-426614174000' }) === null, 'valid ID rejected')
})

Deno.test('retries use the same idempotent upsert key and payload', () => {
  const input = { result: 'VERIFIED', attempt_id: '123e4567-e89b-42d3-a456-426614174000', doc_hash: '0xabc' }
  const first = verificationUpsert(input, '0xwallet')
  const retry = verificationUpsert(input, '0xwallet')
  assert(JSON.stringify(first) === JSON.stringify(retry), 'retry payload changed')
  assert(first.options.onConflict === 'attempt_id', 'wrong conflict key')
  assert(first.options.ignoreDuplicates, 'duplicate retry is not ignored')
})

Deno.test('audit rows omit transcript input and student/institution PII', () => {
  const input = {
    result: 'VERIFIED',
    attempt_id: '123e4567-e89b-42d3-a456-426614174000',
    transcript_input: 'private-file.pdf',
    student_name: 'Private Student',
    source_institution: 'Private University',
  }
  const { row } = verificationUpsert(input, '0xwallet')
  assert(!('transcript_input' in row), 'raw input persisted')
  assert(!('student_name' in row), 'student name persisted')
  assert(!('source_institution' in row), 'institution persisted')
})
