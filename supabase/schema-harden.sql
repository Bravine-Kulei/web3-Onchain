-- TransCrypt production hardening
-- Run AFTER deploying Edge Functions (see supabase/functions/README.md).
-- Blocks direct client writes; all writes go through Edge Functions + service role.

drop policy if exists "Anyone can insert pending requests" on requests;
drop policy if exists "Anyone can insert requests" on requests;
drop policy if exists "Anyone can update requests" on requests;
drop policy if exists "Anyone can insert verifications" on verifications;
drop policy if exists "Anyone can read verifications" on verifications;
revoke select on verifications from anon, authenticated;

alter table verifications add column if not exists attempt_id uuid default gen_random_uuid();
drop index if exists idx_verifications_attempt_id;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'verifications' and column_name = 'attempt_id' and data_type = 'text') then
    alter table verifications alter column attempt_id type uuid using (
      case
        when attempt_id is null then null
        when attempt_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then attempt_id::uuid
        else gen_random_uuid()
      end
    );
  end if;
end $$;
update verifications set attempt_id = gen_random_uuid() where attempt_id is null;
alter table verifications alter column attempt_id set default gen_random_uuid();
alter table verifications alter column attempt_id set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.verifications'::regclass and conname = 'verifications_attempt_id_key') then
    alter table verifications add constraint verifications_attempt_id_key unique (attempt_id);
  end if;
end $$;

-- Only Edge Functions using the service role may invoke the atomic status updater.
revoke execute on function append_request_history(text, text, text, jsonb, text, bigint, text, text, timestamptz) from public;
revoke execute on function append_request_history(text, text, text, jsonb, text, bigint, text, text, timestamptz) from anon;
revoke execute on function append_request_history(text, text, text, jsonb, text, bigint, text, text, timestamptz) from authenticated;
grant execute on function append_request_history(text, text, text, jsonb, text, bigint, text, text, timestamptz) to service_role;
