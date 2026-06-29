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
  status                      text not null default 'Pending',
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
create or replace function append_request_history(
  p_request_id    text,
  p_status        text,
  p_history_entry jsonb,
  p_tx_hash       text default null,
  p_block_number  bigint default null,
  p_document_hash text default null,
  p_ipfs_cid      text default null,
  p_issue_date    timestamptz default null
) returns void as $$
begin
  update requests
  set
    status        = p_status,
    history       = history || jsonb_build_array(p_history_entry),
    tx_hash       = coalesce(p_tx_hash, tx_hash),
    block_number  = coalesce(p_block_number, block_number),
    document_hash = coalesce(p_document_hash, document_hash),
    ipfs_cid      = coalesce(p_ipfs_cid, ipfs_cid),
    issue_date    = coalesce(p_issue_date, issue_date)
  where request_id = p_request_id;
end;
$$ language plpgsql;

-- ─── Row Level Security ────────────────────────────────────────────────────────
alter table requests enable row level security;

-- Allow all reads (consortium is semi-public)
create policy "Anyone can read requests"
  on requests for select using (true);

-- Allow inserts (students submit requests)
create policy "Anyone can insert requests"
  on requests for insert with check (true);

-- Allow updates (registrars update status)
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
  request_id        text,                            -- "REQ-XXXX" if resolved
  transcript_input  text,                            -- raw ID / hash / file name entered
  verifier_wallet   text,                            -- 0x... of the verifying party
  student_name      text,
  source_institution text,
  result            text not null,                   -- VERIFIED | TAMPERED | REVOKED | NOT_FOUND
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
