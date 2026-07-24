-- Run with a migration/service-role connection after schema.sql and schema-harden.sql.
-- The transaction always rolls back; it leaves no acceptance-test records behind.
begin;

do $$
declare
  test_attempt constant uuid := '123e4567-e89b-42d3-a456-426614174999';
  row_count integer;
begin
  insert into verifications (attempt_id, verifier_wallet, result)
  values (test_attempt, '0x0000000000000000000000000000000000000000', 'VERIFIED')
  on conflict (attempt_id) do nothing;
  insert into verifications (attempt_id, verifier_wallet, result)
  values (test_attempt, '0x0000000000000000000000000000000000000000', 'VERIFIED')
  on conflict (attempt_id) do nothing;

  select count(*) into row_count from verifications where attempt_id = test_attempt;
  if row_count <> 1 then raise exception 'idempotency failed: expected one row, got %', row_count; end if;
  if has_table_privilege('anon', 'public.verifications', 'select') then
    raise exception 'privacy failed: anon retains SELECT on verifications';
  end if;
end $$;

rollback;
