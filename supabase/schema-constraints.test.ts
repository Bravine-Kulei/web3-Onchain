const schema = await Deno.readTextFile(new URL('./schema.sql', import.meta.url))
const hardened = await Deno.readTextFile(new URL('./schema-harden.sql', import.meta.url))

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message)
}

Deno.test('verification attempt IDs are required UUIDs with a real unique constraint', () => {
  assert(schema.includes('attempt_id        uuid not null default gen_random_uuid()'), 'create-table UUID constraint missing')
  assert(schema.includes('update verifications set attempt_id = gen_random_uuid() where attempt_id is null'), 'legacy backfill missing')
  assert(schema.includes('add constraint verifications_attempt_id_key unique (attempt_id)'), 'unique constraint missing')
  assert(!schema.includes('where attempt_id is not null'), 'partial uniqueness remains')
})

Deno.test('hardened verification history is not anonymously readable', () => {
  assert(hardened.includes('drop policy if exists "Anyone can read verifications"'), 'open read policy remains')
  assert(hardened.includes('revoke select on verifications from anon, authenticated'), 'read grants not revoked')
})
