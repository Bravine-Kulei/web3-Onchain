-- TransCrypt Supabase Schema
-- Run this in the Supabase SQL Editor at https://app.supabase.com

-- ─── Requests Table ────────────────────────────────────────────────────────────
create table if not exists requests (
  id                          uuid default gen_random_uuid() primary key,
  request_id                  text unique not null,           -- "REQ-XXXX"
  student_wallet              text,                           -- 0x... (optional)
  student_name                text not null,
  student_id                  text not null,
  program                     text not null,
  source_institution          text not null,
  source_institution_address  text,
  dest_institution            text not null,
  dest_institution_address    text,
  status                      text not null default 'Pending'
    check (status in (
      'Pending', 'Under Review', 'Approved', 'Anchored',
      'Available', 'Verified', 'Revoked', 'Rejected', 'Tampered'
    )),
  submitted_at                timestamptz not null default now(),
  tx_hash                     text,
  block_number                bigint,
  document_hash               text,                           -- bytes32 hex
  ipfs_cid                    text,                           -- Pinata IPFS CID
  issue_date                  timestamptz,
  history                     jsonb not null default '[]'::jsonb,
  updated_at                  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists requests_updated_at on requests;
create trigger requests_updated_at
  before update on requests
  for each row execute function update_updated_at();

-- ─── Helper: append history entry + update status ──────────────────────────────
drop function if exists append_request_history(text, text, jsonb, text, bigint, text, text, timestamptz);
drop function if exists append_request_history(text, text, text, jsonb, text, bigint, text, text, timestamptz);

create function append_request_history(
  p_request_id    text,
  p_status        text,
  p_expected_status text,
  p_history_entry jsonb,
  p_tx_hash       text default null,
  p_block_number  bigint default null,
  p_document_hash text default null,
  p_ipfs_cid      text default null,
  p_issue_date    timestamptz default null
) returns setof requests as $$
begin
  return query update requests
  set
    status        = p_status,
    history       = history || jsonb_build_array(p_history_entry),
    tx_hash       = coalesce(p_tx_hash, tx_hash),
    block_number  = coalesce(p_block_number, block_number),
    document_hash = coalesce(p_document_hash, document_hash),
    ipfs_cid      = coalesce(p_ipfs_cid, ipfs_cid),
    issue_date    = coalesce(p_issue_date, issue_date)
  where request_id = p_request_id
    and status = p_expected_status
  returning *;
end;
$$ language plpgsql;

-- ─── Integrity: on-chain anchor fields are write-once ──────────────────────────
-- The off-chain DB is only a convenience layer; the chain is the source of truth.
-- To stop the off-chain record from being silently rewritten, we make the fields
-- that mirror on-chain state immutable once set, and forbid changing the id.
create or replace function protect_request_integrity()
returns trigger as $$
begin
  if new.request_id <> old.request_id then
    raise exception 'request_id is immutable';
  end if;
  if old.document_hash is not null and new.document_hash is distinct from old.document_hash then
    raise exception 'document_hash is write-once and cannot be changed';
  end if;
  if old.tx_hash is not null and new.tx_hash is distinct from old.tx_hash then
    raise exception 'tx_hash is write-once and cannot be changed';
  end if;
  if old.issue_date is not null and new.issue_date is distinct from old.issue_date then
    raise exception 'issue_date is write-once and cannot be changed';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists requests_protect_integrity on requests;
create trigger requests_protect_integrity
  before update on requests
  for each row execute function protect_request_integrity();

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- Demo policies: open read/write for prototyping.
-- Production: replace with Supabase Auth + Edge Functions that verify wallet signatures (SIWE).
alter table requests enable row level security;

-- Allow all reads (consortium is semi-public)
create policy "Anyone can read requests"
  on requests for select using (true);

-- Students submit requests, but a new request must start in the Pending state
-- (nobody can inject a pre-"Anchored"/"Verified" row from the client).
create policy "Anyone can insert pending requests"
  on requests for insert with check (status = 'Pending');

-- Registrars update status. Column-level integrity is enforced by the
-- protect_request_integrity() trigger above. NOTE: for production, replace this
-- open policy with SIWE-based auth so only the issuing institution's wallet can
-- advance a request, and route writes through a trusted service role / Edge Function.
create policy "Anyone can update requests"
  on requests for update using (true);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_requests_status     on requests (status);
create index if not exists idx_requests_student    on requests (student_wallet);
create index if not exists idx_requests_source     on requests (source_institution);
create index if not exists idx_requests_dest       on requests (dest_institution);
create index if not exists idx_requests_submitted  on requests (submitted_at desc);
create index if not exists idx_requests_doc_hash   on requests (document_hash);

-- ─── Verifications Table ───────────────────────────────────────────────────────
create table if not exists verifications (
  id                uuid default gen_random_uuid() primary key,
  attempt_id        uuid not null default gen_random_uuid(),
  request_id        text,                            -- "REQ-XXXX" if resolved
  transcript_input  text,                            -- raw ID / hash / file name entered
  verifier_wallet   text,                            -- 0x... of the verifying party
  student_name      text,
  source_institution text,
  result            text not null
    check (result in ('VERIFIED', 'TAMPERED', 'REVOKED', 'NOT_FOUND', 'CHAIN_ERROR')),
  doc_hash          text,
  tx_hash           text,
  created_at        timestamptz not null default now()
);

alter table verifications enable row level security;

create policy "Anyone can read verifications"
  on verifications for select using (true);

create policy "Anyone can insert verifications"
  on verifications for insert with check (true);

create index if not exists idx_verifications_created on verifications (created_at desc);
create index if not exists idx_verifications_result  on verifications (result);
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

-- ─── SIWE nonces (one-time, used by Edge Functions) ───────────────────────────
create table if not exists siwe_nonces (
  address     text not null,
  nonce       text not null primary key,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_siwe_nonces_address on siwe_nonces (address);

alter table siwe_nonces enable row level security;
-- No client access — only service role via Edge Functions
create policy "No direct client access to siwe_nonces"
  on siwe_nonces for all using (false);

-- ─── Production hardening (optional) ───────────────────────────────────────────
-- For SIWE + Edge Functions, run schema-harden.sql after deploying functions.
-- Keep the open write policies above for local dev with VITE_AUTH_BYPASS=true.
