import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DB_SCHEMA } from '../server/utils/schema'
import { hashPassword, hashToken } from '../server/utils/passwords'
import { exchangeCode, getOAuthClient, issueCode, listLinks, refreshTokens, registerClient, revokeLink, verifyAccessToken } from '../server/utils/oauth'
import { changeOwnPassword, createSession, createUser, deleteUser, sessionUser, updateUser } from '../server/utils/users'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

const PW = 'una-password-lunga'
const CLAUDE = 'https://claude.ai/api/mcp/auth_callback'
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

describe.skipIf(!TEST_DATABASE_URL)('OAuth del connettore su Postgres', () => {
  let sql: postgres.Sql
  beforeAll(async () => {
    sql = await openTestDb()
  })
  afterAll(async () => {
    await sql?.end()
  })
  beforeEach(async () => {
    await resetTestDb(sql)
  })

  async function setPassword(id: string, password: string) {
    await sql`update admin_users set password_hash = ${await hashPassword(password)} where id = ${id}`
  }

  // Un gestore (così assertManagerLeft passa), una persona con Bandi, un'altra
  // senza collegamenti e il client di Claude
  async function setup() {
    const admin = await createUser(sql, { name: 'Capo', email: 'capo@didap.it', pages: ['collaboratori'] })
    await setPassword(admin.id, PW)
    const u = await createUser(sql, { name: 'Mario', email: 'mario@didap.it', pages: ['bandi'] })
    await setPassword(u.id, PW)
    const other = await createUser(sql, { name: 'Luigi', email: 'luigi@didap.it', pages: ['bandi'] })
    await setPassword(other.id, PW)
    const c = await registerClient(sql, { name: 'Claude', redirectUris: [CLAUDE] })
    return { admin, u, other, c }
  }

  async function connect(clientId: string, userId: string) {
    const code = await issueCode(sql, { clientId, userId, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    return await exchangeCode(sql, { code, clientId, redirectUri: CLAUDE, codeVerifier: VERIFIER })
  }

  it('lo schema si applica due volte senza errori', async () => {
    await sql.unsafe(DB_SCHEMA)
    await sql.unsafe(DB_SCHEMA)
  })

  it('registrazione: solo redirect di Claude', async () => {
    await expect(registerClient(sql, { name: 'X', redirectUris: ['https://evil.com/cb'] })).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
    await expect(registerClient(sql, { name: 'X', redirectUris: [CLAUDE, 'https://evil.com/cb'] })).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
    await expect(registerClient(sql, { name: 'X', redirectUris: [] })).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
    const six = Array.from({ length: 6 }, (_, i) => `http://localhost:${3000 + i}/callback`)
    await expect(registerClient(sql, { name: 'X', redirectUris: six })).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
    const c = await registerClient(sql, { name: '', redirectUris: [CLAUDE] })
    expect(c.name).toBe('Claude')
    expect(await getOAuthClient(sql, c.id)).toEqual(c)
    const long = await registerClient(sql, { name: 'a'.repeat(150), redirectUris: [CLAUDE, 'http://127.0.0.1:5000/callback'] })
    expect(long.name).toBe('a'.repeat(100))
    expect(long.redirectUris).toEqual([CLAUDE, 'http://127.0.0.1:5000/callback'])
    expect(await getOAuthClient(sql, crypto.randomUUID())).toBeNull()
    expect(await getOAuthClient(sql, 'non-un-uuid')).toBeNull()
  })

  it('registrazione: via i client senza collegamenti più vecchi di 7 giorni', async () => {
    const { u, c } = await setup()
    await connect(c.id, u.id)
    const unused = await registerClient(sql, { name: 'Vecchio', redirectUris: [CLAUDE] })
    const fresh = await registerClient(sql, { name: 'Nuovo', redirectUris: [CLAUDE] })
    await sql`update oauth_clients set created_at = now() - interval '8 days' where id in ${sql([c.id, unused.id])}`
    await registerClient(sql, { name: 'Altro', redirectUris: [CLAUDE] })
    expect(await getOAuthClient(sql, c.id)).not.toBeNull()
    expect(await getOAuthClient(sql, unused.id)).toBeNull()
    expect(await getOAuthClient(sql, fresh.id)).not.toBeNull()
  })

  it('la pulizia tiene i client che hanno avuto un collegamento', async () => {
    const { u, c } = await setup()
    await connect(c.id, u.id)
    const [link] = await listLinks(sql, u.id)
    await revokeLink(sql, u.id, link!.id)
    const mai = await registerClient(sql, { name: 'Mai collegato', redirectUris: [CLAUDE] })
    await sql`update oauth_clients set created_at = now() - interval '8 days' where id in ${sql([c.id, mai.id])}`
    await registerClient(sql, { name: 'altro', redirectUris: [CLAUDE] })
    expect(await getOAuthClient(sql, c.id)).not.toBeNull()
    expect(await getOAuthClient(sql, mai.id)).toBeNull()
  })

  it('il primo collegamento resta la data di linked_at', async () => {
    const { u, other, c } = await setup()
    const linkedAt = async () => (await sql`select linked_at from oauth_clients where id = ${c.id}`)[0]!.linked_at as Date | null
    expect(await linkedAt()).toBeNull()
    await connect(c.id, u.id)
    const first = await linkedAt()
    expect(first).toBeInstanceOf(Date)
    await sql`update oauth_clients set linked_at = linked_at - interval '1 day' where id = ${c.id}`
    const moved = await linkedAt()
    await connect(c.id, other.id)
    expect(await linkedAt()).toEqual(moved)
  })

  it('codice → token, monouso e con PKCE', async () => {
    const { u, c } = await setup()
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: 'x'.repeat(43) })).rejects.toMatchObject({ code: 'invalid_grant' })
    // il tentativo sbagliato ha consumato il codice
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    const code2 = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    const t = await exchangeCode(sql, { code: code2, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })
    expect(t).toMatchObject({ expiresIn: 3600, scope: 'bandi' })
    expect((await verifyAccessToken(sql, t.accessToken))?.user.id).toBe(u.id)
    expect(await verifyAccessToken(sql, t.refreshToken)).toBeNull()
    // usato bene una volta, non vale una seconda
    await expect(exchangeCode(sql, { code: code2, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
  })

  it('codice scaduto dopo 60 secondi', async () => {
    const { u, c } = await setup()
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    const [row] = await sql`select extract(epoch from expires_at - now())::int as secs from oauth_codes`
    expect(row!.secs).toBeGreaterThan(55)
    expect(row!.secs).toBeLessThanOrEqual(60)
    await sql`update oauth_codes set expires_at = now() - interval '1 second'`
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await listLinks(sql, u.id)).toEqual([])
  })

  it('codice con client o redirect diversi, o persona senza Bandi: invalid_grant e codice consumato', async () => {
    const { admin, u, c } = await setup()
    const c2 = await registerClient(sql, { name: 'Altro', redirectUris: [CLAUDE, 'https://claude.com/api/mcp/auth_callback'] })
    const tries = [
      { clientId: c2.id, redirectUri: CLAUDE },
      { clientId: 'non-un-uuid', redirectUri: CLAUDE },
      { clientId: c.id, redirectUri: 'https://claude.com/api/mcp/auth_callback' },
    ]
    for (const bad of tries) {
      const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
      await expect(exchangeCode(sql, { code, ...bad, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
      await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    }
    await expect(exchangeCode(sql, { code: 'inventato', clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    // Codice emesso, poi Bandi tolto: il codice non c'è più
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['clienti'], active: true })
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: true })
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    // Persona che non ha Bandi già al momento del codice
    const noBandi = await createUser(sql, { name: 'Anna', email: 'anna@didap.it', pages: ['clienti'] })
    const code3 = await issueCode(sql, { clientId: c.id, userId: noBandi.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    await expect(exchangeCode(sql, { code: code3, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await sql`select 1 from oauth_codes`).toHaveLength(0)
    expect(await sql`select 1 from oauth_links`).toHaveLength(0)
  })

  it('loopback: la porta del redirect può cambiare, l\'host no', async () => {
    const { u } = await setup()
    const c = await registerClient(sql, { name: 'Claude Code', redirectUris: ['http://localhost:3000/callback'] })
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: 'http://localhost:4567/callback', codeChallenge: CHALLENGE })
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: 'http://localhost:4567/callback', codeVerifier: VERIFIER })).resolves.toMatchObject({ scope: 'bandi' })
    // Il redirect dello scambio deve essere quello del codice, esatto
    const code2 = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: 'http://localhost:4567/callback', codeChallenge: CHALLENGE })
    await expect(exchangeCode(sql, { code: code2, clientId: c.id, redirectUri: 'http://localhost:4568/callback', codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
  })

  it('due scambi insieme dello stesso codice: ne passa uno solo', async () => {
    const { u, c } = await setup()
    for (let i = 0; i < 5; i++) {
      const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
      const input = { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER }
      const results = await Promise.allSettled([exchangeCode(sql, input), exchangeCode(sql, input)])
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
      const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult
      expect(failed.reason).toMatchObject({ code: 'invalid_grant' })
    }
    expect(await listLinks(sql, u.id)).toHaveLength(5)
  })

  it('rinnovo con rotazione: il vecchio refresh non vale più', async () => {
    const { u, c } = await setup()
    const t = await connect(c.id, u.id)
    const t2 = await refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })
    expect(t2).toMatchObject({ expiresIn: 3600, scope: 'bandi' })
    expect(t2.accessToken).not.toBe(t.accessToken)
    expect(t2.refreshToken).not.toBe(t.refreshToken)
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await verifyAccessToken(sql, t2.accessToken)).not.toBeNull()
    // Lo stesso collegamento: il token d'accesso vecchio vale fino alla scadenza
    expect(await listLinks(sql, u.id)).toHaveLength(1)
    expect((await verifyAccessToken(sql, t.accessToken))?.linkId).toBe((await verifyAccessToken(sql, t2.accessToken))?.linkId)
    await expect(refreshTokens(sql, { refreshToken: t2.refreshToken, clientId: crypto.randomUUID() })).rejects.toMatchObject({ code: 'invalid_grant' })
    // Un token d'accesso non vale come refresh
    await expect(refreshTokens(sql, { refreshToken: t2.accessToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    await expect(refreshTokens(sql, { refreshToken: 'inventato', clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
  })

  it('refresh token: 30 giorni, scaduto non vale', async () => {
    const { u, c } = await setup()
    const t = await connect(c.id, u.id)
    const rows = await sql`select kind, extract(epoch from expires_at - now())::int as secs from oauth_tokens order by kind`
    expect(rows.map(r => r.kind)).toEqual(['access', 'refresh'])
    expect(rows[0]!.secs).toBeGreaterThan(3600 - 10)
    expect(rows[0]!.secs).toBeLessThanOrEqual(3600)
    expect(rows[1]!.secs).toBeGreaterThan(30 * 24 * 3600 - 10)
    expect(rows[1]!.secs).toBeLessThanOrEqual(30 * 24 * 3600)
    await sql`update oauth_tokens set expires_at = now() - interval '1 second' where kind = 'refresh'`
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
  })

  it('due rinnovi insieme dello stesso refresh: ne passa uno solo', async () => {
    const { u, c } = await setup()
    let t = await connect(c.id, u.id)
    for (let i = 0; i < 5; i++) {
      const input = { refreshToken: t.refreshToken, clientId: c.id }
      const results = await Promise.allSettled([refreshTokens(sql, input), refreshTokens(sql, input)])
      const ok = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<typeof t>[]
      expect(ok).toHaveLength(1)
      const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult
      expect(failed.reason).toMatchObject({ code: 'invalid_grant' })
      t = ok[0]!.value
    }
    expect(await sql`select 1 from oauth_tokens where kind = 'refresh'`).toHaveLength(1)
  })

  it('rinnovo mentre Bandi viene tolto: nessun errore strano, collegamenti chiusi', async () => {
    const { admin, u, c } = await setup()
    for (let i = 0; i < 5; i++) {
      await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: true })
      const t = await connect(c.id, u.id)
      const [refresh, update] = await Promise.allSettled([
        refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id }),
        updateUser(sql, admin.id, u.id, { name: u.name, pages: ['clienti'], active: true }),
      ])
      expect(update.status).toBe('fulfilled')
      if (refresh.status === 'rejected') expect(refresh.reason).toMatchObject({ code: 'invalid_grant' })
      expect(await listLinks(sql, u.id)).toEqual([])
      expect(await sql`select 1 from oauth_tokens`).toHaveLength(0)
    }
  })

  it('Bandi tolto: collegamenti chiusi, ridarlo non li riapre', async () => {
    const { admin, u, c } = await setup()
    const t = await connect(c.id, u.id)
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['clienti'], active: true })
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: true })
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await listLinks(sql, u.id)).toEqual([])
  })

  it('Bandi tenuto: cambiare altre pagine non chiude i collegamenti', async () => {
    const { admin, u, c } = await setup()
    const t = await connect(c.id, u.id)
    await updateUser(sql, admin.id, u.id, { name: 'Mario Rossi', pages: ['clienti', 'bandi'], active: true })
    expect((await verifyAccessToken(sql, t.accessToken))?.user).toEqual({ id: u.id, name: 'Mario Rossi', email: u.email, pages: ['clienti', 'bandi'] })
  })

  it('pagine cambiate a mano senza Bandi: il token d\'accesso non vale e il rinnovo dà invalid_grant', async () => {
    const { u, c } = await setup()
    const t = await connect(c.id, u.id)
    await sql`update admin_users set pages = '{clienti}' where id = ${u.id}`
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
  })

  it('disattivazione, cambio password ed eliminazione chiudono i collegamenti', async () => {
    const { admin, u, c } = await setup()

    // Disattivata
    let t = await connect(c.id, u.id)
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: false })
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: true })
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    expect(await listLinks(sql, u.id)).toEqual([])

    // Cambio password: resta la sessione, non Claude
    t = await connect(c.id, u.id)
    const sid = await createSession(sql, u.id)
    const user = (await sessionUser(sql, sid))!
    await changeOwnPassword(sql, user, sid, PW, 'nuova-password-lunga')
    expect(await sessionUser(sql, sid)).not.toBeNull()
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await listLinks(sql, u.id)).toEqual([])

    // Eliminata: via per cascata, anche i codici non ancora usati
    t = await connect(c.id, u.id)
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    await deleteUser(sql, admin.id, u.id)
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
    expect(await sql`select 1 from oauth_links`).toHaveLength(0)
    expect(await sql`select 1 from oauth_tokens`).toHaveLength(0)
  })

  it('disattivazione: via anche i codici non ancora usati', async () => {
    const { admin, u, c } = await setup()
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: false })
    await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: true })
    await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
  })

  it('elenco dei collegamenti: nome del client, date, dal più recente', async () => {
    const { u, other, c } = await setup()
    const c2 = await registerClient(sql, { name: 'Claude Code', redirectUris: [CLAUDE] })
    const t = await connect(c.id, u.id)
    await sql`update oauth_links set created_at = now() - interval '1 day'`
    await connect(c2.id, u.id)
    await connect(c.id, other.id)
    const links = await listLinks(sql, u.id)
    expect(links.map(l => l.clientName)).toEqual(['Claude Code', 'Claude'])
    expect(links.every(l => l.lastUsedAt === null)).toBe(true)
    expect(new Date(links[1]!.createdAt).toISOString()).toBe(links[1]!.createdAt)
    const seen = await verifyAccessToken(sql, t.accessToken)
    expect(seen).toMatchObject({ linkId: links[1]!.id, clientId: c.id })
    expect((await listLinks(sql, u.id))[1]!.lastUsedAt).not.toBeNull()
  })

  it('scollega solo i propri', async () => {
    const { u, other, c } = await setup()
    const t = await connect(c.id, u.id)
    const [link] = await listLinks(sql, u.id)
    await expect(revokeLink(sql, other.id, link!.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(revokeLink(sql, u.id, 'non-un-uuid')).rejects.toMatchObject({ statusCode: 404 })
    expect(await verifyAccessToken(sql, t.accessToken)).not.toBeNull()
    await revokeLink(sql, u.id, link!.id)
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
    await expect(revokeLink(sql, u.id, link!.id)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('nel database solo gli hash di codici e token', async () => {
    const { u, c } = await setup()
    const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    expect((await sql`select hash from oauth_codes`).map(r => r.hash)).toEqual([hashToken(code)])
    const t = await exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })
    const hashes = (await sql`select hash from oauth_tokens`).map(r => r.hash).sort()
    expect(hashes).toEqual([hashToken(t.accessToken), hashToken(t.refreshToken)].sort())
  })

  it('token scaduti: il token d\'accesso non vale e si cancellano alla prossima emissione', async () => {
    const { u, c } = await setup()
    const t = await connect(c.id, u.id)
    await sql`update oauth_tokens set expires_at = now() - interval '1 second' where kind = 'access'`
    expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
    // Collegamento rimasto senza nessun token: chiuso anche lui
    const dead = await connect(c.id, u.id)
    await sql`update oauth_tokens set expires_at = now() - interval '1 second' where hash = ${hashToken(dead.accessToken)} or hash = ${hashToken(dead.refreshToken)}`
    await refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })
    expect(await sql`select 1 from oauth_tokens where expires_at <= now()`).toHaveLength(0)
    expect(await listLinks(sql, u.id)).toHaveLength(1)
    // Anche i codici scaduti
    await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    await sql`update oauth_codes set expires_at = now() - interval '1 second'`
    await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
    expect(await sql`select 1 from oauth_codes`).toHaveLength(1)
  })
})
