import { createError } from 'h3'
import type postgres from 'postgres'
import type { AdminPage, AdminUser } from '#shared/users'
import { isAllowedRedirect, OAUTH_SCOPE, verifyPkce } from './oauth-rules'
import { hashToken, newToken } from './passwords'
import { inTx } from './pg'

// Server di autorizzazione del connettore MCP su Postgres: client registrati
// da Claude, codici, collegamenti alla persona e token. Di codici e token nel
// database solo l'hash, come i link d'invito.
//
// Ordine dei lock, lo stesso di updateUser e deleteUser: prima la persona,
// poi collegamenti, codici e token. Chi toglie Bandi aspetta lo scambio in
// corso (e poi ne chiude il collegamento), o lo scambio trova tutto già chiuso.

type Sql = postgres.Sql

export type OAuthErrorCode = 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'invalid_redirect_uri' | 'invalid_client_metadata'

// Errore OAuth (RFC 6749, RFC 7591): gli endpoint lo rendono `{ error: code }`
export class OAuthFailure extends Error {
  code: OAuthErrorCode
  constructor(code: OAuthErrorCode) {
    super(code)
    this.name = 'OAuthFailure'
    this.code = code
  }
}

export type OAuthClient = { id: string, name: string, redirectUris: string[] }
export type TokenSet = { accessToken: string, refreshToken: string, expiresIn: number, scope: string }
export type ClaudeLink = { id: string, clientName: string, createdAt: string, lastUsedAt: string | null }

const CODE_SECS = 60
const ACCESS_SECS = 60 * 60
const REFRESH_SECS = 60 * 60 * 24 * 30
// Un refresh già usato che torna entro pochi secondi è Claude che rinnova due
// volte insieme: invalid_grant, ma il collegamento resta
const REFRESH_REUSE_GRACE_SECS = 10
const MAX_REDIRECTS = 5
const NAME_MAX = 100
// Client registrati e mai collegati: via dopo una settimana. Uno che ha avuto
// un collegamento resta anche scollegato: Claude lo riusa per ricollegarsi
const CLIENT_UNUSED_DAYS = 7

// Pulizia dei client (esclusivo) contro scambio del codice (condiviso): un
// client non sparisce mentre gli si crea il collegamento
const CLIENTS_LOCK = 7_301_002

// Id dal client: se non è un uuid non arriva a Postgres (darebbe errore)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const invalidGrant = () => new OAuthFailure('invalid_grant')

const canUseBandi = (u: postgres.Row) => u.active && (u.pages as AdminPage[]).includes('bandi')

function rowToClient(r: postgres.Row): OAuthClient {
  return { id: r.id, name: r.name, redirectUris: r.redirect_uris }
}

// Client (registrazione dinamica, RFC 7591)

export async function registerClient(sql: Sql, input: { name: string, redirectUris: string[] }): Promise<OAuthClient> {
  const uris = [...new Set(input.redirectUris)]
  if (!uris.length || uris.length > MAX_REDIRECTS || !uris.every(isAllowedRedirect)) {
    throw new OAuthFailure('invalid_redirect_uri')
  }
  // Per caratteri e non per unità UTF-16: un'emoji non resta a metà
  const name = [...input.name.trim()].slice(0, NAME_MAX).join('') || 'Claude'
  return await inTx(sql, async (t) => {
    await t`select pg_advisory_xact_lock(${CLIENTS_LOCK})`
    // linked_at basta; il controllo sui collegamenti vivi è una cintura in
    // più (client collegati prima della colonna, o linked_at perso)
    await t`
      delete from oauth_clients c
      where c.linked_at is null and c.created_at < now() - make_interval(days => ${CLIENT_UNUSED_DAYS})
        and not exists (select 1 from oauth_links l where l.client_id = c.id)
    `
    const [row] = await t`
      insert into oauth_clients (name, redirect_uris) values (${name}, ${uris})
      returning id, name, redirect_uris
    `
    return rowToClient(row!)
  })
}

export async function getOAuthClient(sql: Sql, id: string): Promise<OAuthClient | null> {
  if (!UUID.test(id)) return null
  const [row] = await sql`select id, name, redirect_uris from oauth_clients where id = ${id}`
  return row ? rowToClient(row) : null
}

// Codici d'autorizzazione: 60 secondi, una volta sola. Client, persona e
// redirect li ha già controllati /oauth/authorize

export async function issueCode(
  sql: Sql,
  input: { clientId: string, userId: string, redirectUri: string, codeChallenge: string },
): Promise<string> {
  const { token, hash } = newToken()
  await sql`delete from oauth_codes where expires_at < now()`
  await sql`
    insert into oauth_codes (hash, client_id, user_id, redirect_uri, code_challenge, expires_at)
    values (${hash}, ${input.clientId}, ${input.userId}, ${input.redirectUri}, ${input.codeChallenge},
      now() + make_interval(secs => ${CODE_SECS}))
  `
  return token
}

// Token: pulizia fuori dalla transazione e prima, così il collegamento in uso
// (che ha ancora il suo refresh token vivo) non è mai tra quelli da togliere.
// Via i token scaduti, poi i collegamenti rimasti senza token
async function sweep(sql: Sql) {
  await sql`delete from oauth_tokens where expires_at < now()`
  await sql`delete from oauth_links l where not exists (select 1 from oauth_tokens k where k.link_id = l.id)`
}

async function issuePair(t: Sql, linkId: string): Promise<TokenSet> {
  const access = newToken()
  const refresh = newToken()
  await t`
    insert into oauth_tokens (hash, link_id, kind, expires_at) values
      (${access.hash}, ${linkId}, 'access', now() + make_interval(secs => ${ACCESS_SECS})),
      (${refresh.hash}, ${linkId}, 'refresh', now() + make_interval(secs => ${REFRESH_SECS}))
  `
  return { accessToken: access.token, refreshToken: refresh.token, expiresIn: ACCESS_SECS, scope: OAUTH_SCOPE }
}

// Le transazioni sotto finiscono con null quando la richiesta non vale: il
// codice o il token consumato resta consumato (commit), poi invalid_grant

export async function exchangeCode(
  sql: Sql,
  input: { code: string, clientId: string, redirectUri: string, codeVerifier: string },
): Promise<TokenSet> {
  const hash = hashToken(input.code)
  await sweep(sql)
  const tokens = await inTx(sql, async (t) => {
    await t`select pg_advisory_xact_lock_shared(${CLIENTS_LOCK})`
    const [peek] = await t`select user_id from oauth_codes where hash = ${hash}`
    if (!peek) return null
    const [user] = await t`select active, pages from admin_users where id = ${peek.user_id} for share`
    // Il delete consuma il codice: due scambi insieme non lo usano due volte,
    // e un tentativo sbagliato lo brucia
    const [code] = await t`
      delete from oauth_codes where hash = ${hash}
      returning client_id, user_id, redirect_uri, code_challenge, expires_at > now() as live
    `
    if (!code || !user) return null
    const ok = code.live
      && code.client_id === input.clientId
      && code.redirect_uri === input.redirectUri
      && verifyPkce(input.codeVerifier, code.code_challenge)
      && canUseBandi(user)
    if (!ok) return null
    const [link] = await t`
      insert into oauth_links (user_id, client_id) values (${code.user_id}, ${code.client_id})
      returning id
    `
    await t`update oauth_clients set linked_at = coalesce(linked_at, now()) where id = ${code.client_id}`
    return await issuePair(t, link!.id)
  })
  if (!tokens) throw invalidGrant()
  return tokens
}

// Rinnovo con rotazione: il refresh token usato resta segnato (used_at) fino
// alla scadenza, la coppia nuova va sullo stesso collegamento. Se un refresh
// già usato torna indietro dopo REFRESH_REUSE_GRACE_SECS, qualcuno ne ha una
// copia: si chiude tutto il collegamento, token nuovi compresi (RFC 9700, 4.14.2)
export async function refreshTokens(sql: Sql, input: { refreshToken: string, clientId: string }): Promise<TokenSet> {
  const hash = hashToken(input.refreshToken)
  await sweep(sql)
  const tokens = await inTx(sql, async (t) => {
    const [peek] = await t`
      select l.id as link_id, l.user_id from oauth_tokens k
      join oauth_links l on l.id = k.link_id
      where k.hash = ${hash} and k.kind = 'refresh'
    `
    if (!peek) return null
    const [user] = await t`select active, pages from admin_users where id = ${peek.user_id} for share`
    // Key share: Scollega aspetta il rinnovo in corso, l'ultimo uso no
    const [link] = await t`select client_id from oauth_links where id = ${peek.link_id} for key share`
    // used_at is null: due rinnovi insieme non lo usano due volte, e il
    // secondo lo trova già usato da un attimo
    const [tok] = await t`
      update oauth_tokens set used_at = now()
      where hash = ${hash} and kind = 'refresh' and used_at is null
      returning expires_at > now() as live
    `
    if (!tok) {
      await t`
        delete from oauth_links where id = ${peek.link_id}
          and not exists (
            select 1 from oauth_tokens where hash = ${hash}
              and used_at > now() - make_interval(secs => ${REFRESH_REUSE_GRACE_SECS})
          )
      `
      return null
    }
    if (!user || !link) return null
    if (!tok.live || link.client_id !== input.clientId || !canUseBandi(user)) return null
    return await issuePair(t, peek.link_id)
  })
  if (!tokens) throw invalidGrant()
  return tokens
}

// Ogni richiesta a /mcp: token d'accesso vivo, persona attiva con Bandi
export async function verifyAccessToken(
  sql: Sql,
  token: string,
): Promise<{ user: AdminUser, linkId: string, clientId: string } | null> {
  const [row] = await sql`
    select u.id, u.name, u.email, u.pages, l.id as link_id, l.client_id
    from oauth_tokens k
    join oauth_links l on l.id = k.link_id
    join admin_users u on u.id = l.user_id
    where k.hash = ${hashToken(token)} and k.kind = 'access' and k.expires_at > now()
      and u.active and 'bandi' = any(u.pages)
  `
  if (!row) return null
  // Ultimo uso per la pagina Account: al massimo una scrittura al minuto
  await sql`
    update oauth_links set last_used_at = now()
    where id = ${row.link_id} and (last_used_at is null or last_used_at < now() - interval '1 minute')
  `
  return {
    user: { id: row.id, name: row.name, email: row.email, pages: row.pages as AdminPage[] },
    linkId: row.link_id,
    clientId: row.client_id,
  }
}

// Collegamenti della persona (pagina Account)

export async function listLinks(sql: Sql, userId: string): Promise<ClaudeLink[]> {
  // Solo quelli con un token ancora vivo: gli scaduti aspettano la pulizia
  const rows = await sql`
    select l.id, c.name as client_name, l.created_at, l.last_used_at
    from oauth_links l
    join oauth_clients c on c.id = l.client_id
    where l.user_id = ${userId}
      and exists (select 1 from oauth_tokens k where k.link_id = l.id and k.expires_at > now() and k.used_at is null)
    order by l.created_at desc, l.id
  `
  return rows.map(r => ({
    id: r.id,
    clientName: r.client_name,
    createdAt: new Date(r.created_at).toISOString(),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
  }))
}

// Scollega: i token vanno per cascata
export async function revokeLink(sql: Sql, userId: string, linkId: string): Promise<void> {
  const notFound = () => createError({ statusCode: 404, statusMessage: 'Collegamento non trovato' })
  if (!UUID.test(linkId)) throw notFound()
  const [row] = await sql`delete from oauth_links where id = ${linkId} and user_id = ${userId} returning id`
  if (!row) throw notFound()
}
