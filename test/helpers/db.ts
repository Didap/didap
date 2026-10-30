import postgres from 'postgres'
import { DB_SCHEMA } from '../../server/utils/schema'

// Database di test: creato se manca, schema applicato, svuotato prima di
// ogni test. Per sicurezza il nome deve finire con _test.

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

export async function openTestDb() {
  const url = new URL(TEST_DATABASE_URL)
  const name = decodeURIComponent(url.pathname.slice(1))
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(`TEST_DATABASE_URL deve puntare a un database *_test (ora: ${name})`)
  }
  const admin = new URL(TEST_DATABASE_URL)
  admin.pathname = '/postgres'
  const root = postgres(admin.toString(), { max: 1, onnotice: () => {} })
  try {
    const rows = await root`select 1 from pg_database where datname = ${name}`
    if (!rows.length) await root.unsafe(`create database "${name}"`)
  }
  finally {
    await root.end()
  }
  const sql = postgres(TEST_DATABASE_URL, { max: 5, onnotice: () => {} })
  await sql.unsafe(DB_SCHEMA)
  return sql
}

export async function resetTestDb(sql: postgres.Sql) {
  await sql`truncate quote_revisions, quote_counters, quotes, clients, settings`
  await sql`truncate grant_drafts, grant_files, grant_folders, radar_grants, radar_documents, radar_state, radar_settings, radar_runs, radar_sources`
  // oauth_clients non dipende da admin_users: il cascade non lo svuota
  await sql`truncate oauth_tokens, oauth_links, oauth_codes, oauth_clients`
  await sql`truncate admin_sessions, admin_user_tokens, admin_users cascade`
  await sql`insert into radar_state (id) values (1)`
}
