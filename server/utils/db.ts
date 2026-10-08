import postgres from 'postgres'

// Postgres condiviso (Coolify, progetto shared-infra), database "didap".
// DATABASE_URL letta a runtime: senza, il sito funziona coi soli contenuti
// markdown e /admin risponde che il database non è configurato.

type Sql = postgres.Sql

let sql: Sql | null = null
let ready: Promise<Sql> | null = null

export const databaseUrl = () => process.env.DATABASE_URL ?? ''

export const hasDatabase = () => databaseUrl() !== ''

const SCHEMA = `
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
`

// Il database logico può non esistere ancora sull'istanza condivisa:
// lo crea collegandosi al db di servizio "postgres".
async function ensureDatabase(url: string) {
  const target = new URL(url)
  const name = decodeURIComponent(target.pathname.slice(1))
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error(`Nome database non valido: ${name}`)
  }
  const admin = new URL(url)
  admin.pathname = '/postgres'
  const client = postgres(admin.toString(), { max: 1, connect_timeout: 5 })
  try {
    const rows = await client`select 1 from pg_database where datname = ${name}`
    if (rows.length === 0) await client.unsafe(`create database "${name}"`)
  }
  finally {
    await client.end()
  }
}

const OPTIONS = { max: 5, idle_timeout: 30, connect_timeout: 5 }

async function connect(): Promise<Sql> {
  const url = databaseUrl()
  if (!url) throw createError({ statusCode: 503, statusMessage: 'Database non configurato' })

  let client = postgres(url, OPTIONS)
  try {
    await client`select 1`
  }
  catch (err) {
    await client.end({ timeout: 1 })
    if ((err as { code?: string }).code !== '3D000') throw err
    await ensureDatabase(url)
    client = postgres(url, OPTIONS)
  }
  await client.unsafe(SCHEMA)
  return client
}

export async function useDb(): Promise<Sql> {
  if (sql) return sql
  ready ??= connect().then(
    (c) => {
      sql = c
      return c
    },
    (err) => {
      ready = null
      throw err
    },
  )
  return ready
}
