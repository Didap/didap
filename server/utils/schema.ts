// Schema del database, applicato a ogni avvio (idempotente).
// Prodotti, asset e sessioni di /admin; poi preventivi, clienti e radar bandi.
export const DB_SCHEMA = `
  create table if not exists product_overrides (
    slug text not null,
    locale text not null,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (slug, locale)
  );
  create table if not exists assets (
    id uuid primary key default gen_random_uuid(),
    mime text not null,
    filename text,
    bytes bytea not null,
    created_at timestamptz not null default now()
  );
  create table if not exists admin_sessions (
    id text primary key,
    expires_at timestamptz not null
  );

  create table if not exists settings (
    id int primary key check (id = 1),
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  create table if not exists clients (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    vat_number text not null default '',
    tax_code text not null default '',
    address text not null default '',
    sdi_pec text not null default '',
    contact_name text not null default '',
    email text not null default '',
    phone text not null default '',
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create table if not exists quotes (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references clients (id) on delete restrict,
    title text not null default '',
    status text not null default 'draft'
      check (status in ('draft', 'confirmed', 'signed', 'rejected')),
    year int,
    seq int,
    token text unique,
    draft jsonb not null,
    issued_draft jsonb,
    current_rev int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (year, seq)
  );
  -- Invio al cliente e firma: l'ultimo invio e il PDF firmato (facoltativo)
  alter table quotes add column if not exists sent_at timestamptz;
  alter table quotes add column if not exists sent_to text;
  alter table quotes add column if not exists sent_rev int;
  alter table quotes add column if not exists signed_at timestamptz;
  alter table quotes add column if not exists signed_rev int;
  alter table quotes add column if not exists signed_pdf bytea;
  alter table quotes add column if not exists signed_pdf_name text;
  -- Stati vecchi (inviato, accettato) -> confermato, firmato
  do $$ begin
    if exists (
      select 1 from pg_constraint
      where conname = 'quotes_status_check' and pg_get_constraintdef(oid) like '%sent%'
    ) then
      alter table quotes drop constraint quotes_status_check;
      update quotes set status = 'confirmed' where status = 'sent';
      update quotes set status = 'signed' where status = 'accepted';
      alter table quotes add constraint quotes_status_check
        check (status in ('draft', 'confirmed', 'signed', 'rejected'));
    end if;
  end $$;
  create table if not exists quote_counters (
    year int primary key,
    last_seq int not null
  );
  create table if not exists quote_revisions (
    quote_id uuid not null references quotes (id) on delete restrict,
    rev int not null,
    snapshot jsonb not null,
    pdf bytea not null,
    issued_at timestamptz not null,
    primary key (quote_id, rev)
  );

  create table if not exists radar_settings (
    id int primary key check (id = 1),
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  create table if not exists radar_state (
    id int primary key check (id = 1),
    last_ingest_at timestamptz,
    last_ingest_error text,
    last_digest_on date,
    last_digest_at timestamptz,
    lease_until timestamptz
  );
  insert into radar_state (id) values (1) on conflict do nothing;
  -- Bandi segnati come interessanti per noi (il cuore nel pannello)
  alter table radar_grants add column if not exists liked_at timestamptz;
  create table if not exists radar_documents (
    id uuid primary key default gen_random_uuid(),
    source text not null,
    external_id text not null,
    url text not null,
    content text not null,
    content_hash text not null,
    status text not null default 'pending'
      check (status in ('pending', 'read', 'skipped', 'failed')),
    attempts int not null default 0,
    error text,
    fetched_at timestamptz not null default now(),
    read_at timestamptz,
    closed_at timestamptz,
    unique (source, external_id)
  );
  create table if not exists radar_grants (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null unique references radar_documents (id) on delete cascade,
    title text not null,
    issuer text not null default '',
    summary text not null default '',
    opens_at timestamptz,
    deadline timestamptz,
    max_amount bigint,
    funding text not null default '',
    requirements jsonb not null default '[]'::jsonb,
    notified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
`
