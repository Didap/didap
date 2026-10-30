// Schema del database, applicato a ogni avvio (idempotente).
// Prodotti, asset e sessioni di /admin; poi preventivi, clienti, radar bandi
// e OAuth del connettore MCP.
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
  -- Persone del pannello, inviti e reset, sessioni legate alla persona
  create table if not exists admin_users (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null unique,
    password_hash text,
    pages text[] not null default '{}',
    active boolean not null default true,
    created_at timestamptz not null default now(),
    last_login_at timestamptz
  );
  create table if not exists admin_user_tokens (
    hash text primary key,
    user_id uuid not null references admin_users(id) on delete cascade,
    kind text not null check (kind in ('invite', 'reset')),
    expires_at timestamptz not null
  );
  alter table admin_sessions add column if not exists user_id uuid references admin_users(id) on delete cascade;
  delete from admin_sessions where user_id is null;
  create index if not exists admin_sessions_expires on admin_sessions (expires_at);

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
  -- last_ingest_at e last_digest_on servivano al giro automatico, tolto:
  -- restano perché il codice di prima, se si torna indietro, le legge
  create table if not exists radar_state (
    id int primary key check (id = 1),
    last_ingest_at timestamptz,
    last_ingest_error text,
    last_digest_on date,
    last_digest_at timestamptz,
    lease_until timestamptz
  );
  insert into radar_state (id) values (1) on conflict do nothing;
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
  -- Bandi segnati come interessanti per noi (il cuore nel pannello)
  alter table radar_grants add column if not exists liked_at timestamptz;
  -- Sviluppo IT, IA o servizi digitali secondo il modello (null: non detto)
  alter table radar_grants add column if not exists digital boolean;
  -- Giudizio del modello col profilo salvato (judged_profile: quale)
  alter table radar_grants add column if not exists verdict text;
  alter table radar_grants add column if not exists verdict_reason text not null default '';
  alter table radar_grants add column if not exists judged_profile text;
  -- Piattaforma e documenti da presentare
  alter table radar_grants add column if not exists application jsonb;
  -- Cartella di Google Drive, sostituita da quella del bando
  alter table radar_grants drop column if exists drive_folder_id;
  alter table radar_grants drop column if exists drive_ready_at;
  alter table radar_grants drop column if exists drive_claimed_at;
  alter table radar_grants drop column if exists drive_note;
  -- Cartella del bando: creata (mai azzerata, protegge il bando da
  -- "Svuota" e dalla rilettura), riempimento in corso, finito, com'è andata
  alter table radar_grants add column if not exists folder_at timestamptz;
  alter table radar_grants add column if not exists folder_claimed_at timestamptz;
  -- Gettone del turno di riempimento: solo chi lo ha scrive lo stato
  alter table radar_grants add column if not exists folder_claim uuid;
  alter table radar_grants add column if not exists folder_filled_at timestamptz;
  alter table radar_grants add column if not exists folder_note text not null default '';
  -- Ultimo riempimento finito con un errore (si azzera al nuovo tentativo)
  alter table radar_grants add column if not exists folder_failed_at timestamptz;
  -- Cartella del bando: sottocartelle e file (parent_id e folder_id null: la
  -- cartella principale; uploaded_by_name null: messo dal radar). I byte stanno
  -- nel file store, qui solo la chiave.
  create table if not exists grant_folders (
    id uuid primary key default gen_random_uuid(),
    grant_id uuid not null references radar_grants(id) on delete cascade,
    parent_id uuid references grant_folders(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now()
  );
  create table if not exists grant_files (
    id uuid primary key default gen_random_uuid(),
    grant_id uuid not null references radar_grants(id) on delete cascade,
    folder_id uuid references grant_folders(id) on delete cascade,
    name text not null,
    mime text not null,
    bytes int not null,
    store_key text not null unique,
    uploaded_by uuid references admin_users(id) on delete set null,
    created_at timestamptz not null default now()
  );
  -- Nome di chi l'ha caricato, fissato al caricamento: resta anche se la
  -- persona viene eliminata (null: messo dal radar)
  alter table grant_files add column if not exists uploaded_by_name text;
  -- "Dal bando" del riempimento: si ritrova per id anche se rinominata
  alter table radar_grants add column if not exists folder_source_id uuid references grant_folders(id) on delete set null;
  create index if not exists grant_folders_parent on grant_folders (parent_id);
  create index if not exists grant_files_folder on grant_files (folder_id);
  -- Elenco e controllo dei nomi di una cartella: bando più cartella
  create index if not exists grant_folders_grant_parent on grant_folders (grant_id, parent_id);
  create index if not exists grant_files_grant_folder on grant_files (grant_id, folder_id);
  -- Bozza della candidatura, una per bando: la versione sale a ogni
  -- salvataggio; saved_by è il nome, resta anche se la persona viene eliminata
  create table if not exists grant_drafts (
    grant_id uuid primary key references radar_grants(id) on delete cascade,
    content text not null,
    version int not null,
    saved_at timestamptz not null default now(),
    saved_by text not null,
    by_claude boolean not null default false
  );
  -- Registro degli import: moduli, tempi, conteggi e token
  create table if not exists radar_runs (
    id uuid primary key default gen_random_uuid(),
    trigger text not null,
    groups text[] not null default '{}',
    provinces text[] not null default '{}',
    status text not null default 'running' check (status in ('running', 'done', 'failed')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    model text not null default '',
    stats jsonb not null default '{}'::jsonb,
    usage jsonb not null default '{}'::jsonb,
    error text
  );
  -- Tabelle create quando i comuni si spuntavano uno a uno
  alter table radar_runs add column if not exists provinces text[] not null default '{}';
  -- Finanziamento o gara per servizi digitali, IA esplicita, scan che ha
  -- trovato il bando (i "nuovi"); impronta del prompt con cui è stato letto
  -- il testo (READER_KEY)
  alter table radar_grants add column if not exists kind text not null default 'grant'
    check (kind in ('grant', 'tender'));
  alter table radar_grants add column if not exists ai boolean;
  alter table radar_grants add column if not exists run_id uuid references radar_runs (id) on delete set null;
  alter table radar_documents add column if not exists reader_key text;
  -- L'ultimo scan e il registro si leggono dal più recente
  create index if not exists radar_runs_started_at on radar_runs (started_at desc);
  -- Fonti che non rispondono: da quando, e in pausa fino a quando
  create table if not exists radar_sources (
    slug text primary key,
    unreachable_since timestamptz not null,
    paused_until timestamptz
  );

  -- Connettore MCP: client OAuth registrati da Claude, codici d'autorizzazione,
  -- collegamenti persona e client, token. Di codici e token solo l'hash
  create table if not exists oauth_clients (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    redirect_uris text[] not null,
    created_at timestamptz not null default now()
  );
  -- Primo collegamento del client: la pulizia toglie solo i mai collegati
  alter table oauth_clients add column if not exists linked_at timestamptz;
  create table if not exists oauth_codes (
    hash text primary key,
    client_id uuid not null references oauth_clients(id) on delete cascade,
    user_id uuid not null references admin_users(id) on delete cascade,
    redirect_uri text not null,
    code_challenge text not null,
    expires_at timestamptz not null
  );
  create table if not exists oauth_links (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references admin_users(id) on delete cascade,
    client_id uuid not null references oauth_clients(id) on delete cascade,
    created_at timestamptz not null default now(),
    last_used_at timestamptz
  );
  create table if not exists oauth_tokens (
    hash text primary key,
    link_id uuid not null references oauth_links(id) on delete cascade,
    kind text not null check (kind in ('access', 'refresh')),
    expires_at timestamptz not null
  );
  -- Refresh token già scambiato: resta fino alla scadenza per riconoscerne il riuso
  alter table oauth_tokens add column if not exists used_at timestamptz;
  create index if not exists oauth_codes_user on oauth_codes (user_id);
  create index if not exists oauth_codes_client on oauth_codes (client_id);
  create index if not exists oauth_links_user on oauth_links (user_id);
  create index if not exists oauth_links_client on oauth_links (client_id);
  create index if not exists oauth_tokens_link on oauth_tokens (link_id);
  create index if not exists oauth_tokens_expires on oauth_tokens (expires_at);
`
