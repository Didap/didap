# Connettore MCP per i bandi - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un server MCP remoto dentro l'app Nuxt, con login OAuth sugli account del pannello, che permette a Claude di trovare i bandi interessanti e consigliare come candidarsi.

**Architecture:** Un piccolo server di autorizzazione OAuth 2.1 fatto da noi (DCR, PKCE S256, token opachi salvati come hash) sopra `admin_users`; la pagina di consenso usa la sessione del pannello. `/mcp` verifica il token, rilegge la persona e passa la richiesta a `createMcpHandler` dell'SDK MCP v2, con strumenti che chiamano le funzioni del radar e della cartella già esistenti.

**Tech Stack:** Nuxt 4 / Nitro (h3), postgres.js, `@modelcontextprotocol/server` 2.3.1, vitest su Postgres (`TEST_DATABASE_URL`), `unpdf` per il testo dei PDF.

**Spec:** `docs/superpowers/specs/2026-10-27-connettore-mcp-design.md`

## Global Constraints

- Mai trattini lunghi (U+2014) o medi (U+2013) in codice, commenti, testi, commit. Commenti in italiano, densi come nel codice vicino.
- Gli indirizzi pubblici (issuer, `/mcp`, endpoint) si costruiscono da `NUXT_PUBLIC_SITE_URL` (senza `/` finale), mai dall'Host della richiesta.
- Nessun URL Cloudinary esce verso Claude: i byte passano da `FileStore.get`.
- Token, codici e refresh token: casuali (`newToken()` di `server/utils/passwords.ts`), nel database solo `hashToken()`.
- Durate: codice 60 s, token d'accesso 3600 s, refresh token 30 giorni, ruotato a ogni rinnovo.
- Scope unico `bandi`; i metadati elencano anche `offline_access`.
- Redirect accettati, e solo questi: `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`, `http://localhost:<porta>/callback`, `http://127.0.0.1:<porta>/callback` (porta qualsiasi, confronto senza porta per i loopback).
- Strumenti: Claude non elimina, non sposta, non rinomina, non carica file; non avvia import, non cancella bandi, non cambia impostazioni.
- Dipendenze nuove a versione esatta: `@modelcontextprotocol/server@2.3.1` (dependencies), `@modelcontextprotocol/client@2.3.1` (devDependencies). Lockfile con `npx npm@10 install`, non con npm 11.
- Lo zod del progetto è 3.25 e non dà JSON Schema allo standard che l'SDK chiede: gli `inputSchema` degli strumenti si scrivono come JSON Schema con `fromJsonSchema` dell'SDK, e gli argomenti si rivalidano con lo zod del progetto dentro lo strumento.
- Test, `npx nuxt typecheck` e `npx eslint .` senza errori alla fine di ogni task.

## Review Focus

1. Claude Code registra `http://localhost:3118/callback` e poi autorizza con `http://localhost:4022/callback`: deve passare. Un `http://localhost:3118/altro` o `http://evil.com/callback` no. (Task 1)
2. Claude ripete un rinnovo con lo stesso refresh token (rete instabile): la seconda volta `invalid_grant`, il token nuovo della prima resta valido. (Task 2)
3. A una persona tolgono Bandi tra due rinnovi: il rinnovo dà `invalid_grant` e `/mcp` dà `401`, anche se poi Bandi le viene ridato. (Task 2)
4. `leggi_file` su un PDF scansionato (nessun testo) o su un testo enorme: risposta chiara ("PDF senza testo leggibile", testo tagliato con avviso), nessun errore. (Task 4)
5. `/mcp` con un token scaduto o inventato: `401` con `WWW-Authenticate` che porta `resource_metadata` e `error="invalid_token"`, mai `403` o `500`. (Task 5)

---

### Task 1: Regole OAuth pure

**Files:**
- Create: `server/utils/oauth-rules.ts`
- Test: `test/oauth-rules.test.ts`

**Interfaces:**
- Produces:
  - `siteOrigin(): string` da `process.env.NUXT_PUBLIC_SITE_URL`, fallback `https://didap.it`, senza `/` finale
  - `mcpResourceUrl(): string` = `${siteOrigin()}/mcp`
  - `OAUTH_SCOPE = 'bandi'`
  - `isAllowedRedirect(uri: string): boolean`
  - `redirectMatches(registered: string[], requested: string): boolean` (esatto per gli https, porta ignorata per i loopback)
  - `verifyPkce(verifier: string, challenge: string): boolean` (S256, base64url di sha256, confronto a tempo costante; verifier 43..128 caratteri `[A-Za-z0-9-._~]`)
  - `protectedResourceMetadata(): object` con `resource: mcpResourceUrl()`, `authorization_servers: [siteOrigin()]`, `scopes_supported: ['bandi']`, `bearer_methods_supported: ['header']`, `resource_name: 'Didap - Bandi'`
  - `authorizationServerMetadata(): object` con `issuer: siteOrigin()`, `authorization_endpoint: <origin>/oauth/authorize`, `token_endpoint: <origin>/oauth/token`, `registration_endpoint: <origin>/oauth/register`, `response_types_supported: ['code']`, `grant_types_supported: ['authorization_code', 'refresh_token']`, `code_challenge_methods_supported: ['S256']`, `token_endpoint_auth_methods_supported: ['none']`, `scopes_supported: ['bandi', 'offline_access']`
  - `authorizeQuerySchema` (zod): `response_type` = `'code'`, `client_id` uuid, `redirect_uri`, `code_challenge` 43..128, `code_challenge_method` = `'S256'`, `state` facoltativo (max 500), `scope` facoltativo, `resource` facoltativo che se c'è deve essere uguale a `mcpResourceUrl()`

- [ ] **Step 1: Write the failing test**

```ts
describe('redirect di Claude', () => {
  it('accetta solo Claude', () => {
    expect(isAllowedRedirect('https://claude.ai/api/mcp/auth_callback')).toBe(true)
    expect(isAllowedRedirect('https://claude.com/api/mcp/auth_callback')).toBe(true)
    expect(isAllowedRedirect('http://localhost:3118/callback')).toBe(true)
    expect(isAllowedRedirect('http://127.0.0.1:50000/callback')).toBe(true)
    expect(isAllowedRedirect('http://localhost:3118/altro')).toBe(false)
    expect(isAllowedRedirect('https://claude.ai.evil.com/api/mcp/auth_callback')).toBe(false)
    expect(isAllowedRedirect('http://claude.ai/api/mcp/auth_callback')).toBe(false)
    expect(isAllowedRedirect('https://localhost/callback')).toBe(false)
    expect(isAllowedRedirect('http://localhost:3118/callback?x=1')).toBe(false)
    expect(isAllowedRedirect('non un url')).toBe(false)
  })
  it('loopback senza porta, https esatti', () => {
    expect(redirectMatches(['http://localhost:3118/callback'], 'http://localhost:4022/callback')).toBe(true)
    expect(redirectMatches(['http://localhost:3118/callback'], 'http://127.0.0.1:4022/callback')).toBe(false)
    expect(redirectMatches(['https://claude.ai/api/mcp/auth_callback'], 'https://claude.com/api/mcp/auth_callback')).toBe(false)
  })
})
describe('PKCE', () => {
  it('S256 dell\'esempio della RFC 7636', () => {
    expect(verifyPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(true)
    expect(verifyPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXx', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(false)
    expect(verifyPkce('corto', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(false)
  })
})
describe('metadati', () => {
  it('dal sito pubblico, non dalla richiesta', () => {
    vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://didap.it/')
    expect(protectedResourceMetadata()).toMatchObject({ resource: 'https://didap.it/mcp', authorization_servers: ['https://didap.it'] })
    expect(authorizationServerMetadata()).toMatchObject({ issuer: 'https://didap.it', token_endpoint: 'https://didap.it/oauth/token', code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'] })
  })
  it('resource diverso da /mcp è rifiutato', () => {
    vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://didap.it')
    const base = { response_type: 'code', client_id: crypto.randomUUID(), redirect_uri: 'https://claude.ai/api/mcp/auth_callback', code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', code_challenge_method: 'S256' }
    expect(authorizeQuerySchema.safeParse(base).success).toBe(true)
    expect(authorizeQuerySchema.safeParse({ ...base, resource: 'https://didap.it/mcp' }).success).toBe(true)
    expect(authorizeQuerySchema.safeParse({ ...base, resource: 'https://altro.it/mcp' }).success).toBe(false)
    expect(authorizeQuerySchema.safeParse({ ...base, code_challenge_method: 'plain' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/oauth-rules.test.ts`
Expected: FAIL, modulo `server/utils/oauth-rules` mancante.

- [ ] **Step 3: Implement `server/utils/oauth-rules.ts`** con le firme dell'Interfaces block. `isAllowedRedirect` usa `new URL()` in try/catch e controlla protocollo, hostname, porta, pathname, assenza di search e hash.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/oauth-rules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/oauth-rules.ts test/oauth-rules.test.ts
git commit -m "feat(mcp): OAuth rules for Claude redirects, PKCE and metadata"
```

---

### Task 2: Client, codici, collegamenti e token su Postgres

**Files:**
- Modify: `server/utils/schema.ts` (tabelle nuove in fondo a `DB_SCHEMA`)
- Modify: `test/helpers/db.ts` (`resetTestDb` svuota anche le tabelle oauth)
- Create: `server/utils/oauth.ts`
- Modify: `server/utils/users.ts` (`revokeAccess`, `updateUser`)
- Test: `test/oauth.test.ts`

**Interfaces:**
- Consumes: `isAllowedRedirect`, `redirectMatches`, `verifyPkce`, `OAUTH_SCOPE` (Task 1); `newToken`, `hashToken` (`passwords.ts`); `inTx` (`pg.ts`); `AdminUser` (`#shared/users`).
- Produces (tutto in `server/utils/oauth.ts`):
  - `class OAuthFailure extends Error { code: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'invalid_redirect_uri' | 'invalid_client_metadata' }`
  - `type OAuthClient = { id: string, name: string, redirectUris: string[] }`
  - `registerClient(sql, input: { name: string, redirectUris: string[] }): Promise<OAuthClient>`: lancia `OAuthFailure('invalid_redirect_uri')` se un redirect non passa `isAllowedRedirect` o la lista è vuota (max 5); `name` tagliato a 100 caratteri, vuoto diventa `'Claude'`. Cancella i client senza collegamenti più vecchi di 7 giorni.
  - `getClient(sql, id: string): Promise<OAuthClient | null>`
  - `issueCode(sql, input: { clientId: string, userId: string, redirectUri: string, codeChallenge: string }): Promise<string>`
  - `type TokenSet = { accessToken: string, refreshToken: string, expiresIn: number, scope: string }`
  - `exchangeCode(sql, input: { code: string, clientId: string, redirectUri: string, codeVerifier: string }): Promise<TokenSet>`: consuma il codice con un `delete ... returning` (monouso), controlla scadenza, client, redirect esatto, PKCE, persona attiva con Bandi; crea il collegamento e i due token. Ogni fallimento: `OAuthFailure('invalid_grant')`.
  - `refreshTokens(sql, input: { refreshToken: string, clientId: string }): Promise<TokenSet>`: consuma il refresh token con `delete ... returning`, ricontrolla client e persona (attiva, con Bandi), emette una coppia nuova sullo stesso collegamento. Fallimento: `invalid_grant`.
  - `verifyAccessToken(sql, token: string): Promise<{ user: AdminUser, linkId: string, clientId: string } | null>`: token d'accesso non scaduto, persona attiva con `'bandi' = any(pages)`; aggiorna `last_used_at` del collegamento.
  - `type ClaudeLink = { id: string, clientName: string, createdAt: string, lastUsedAt: string | null }`
  - `listLinks(sql, userId: string): Promise<ClaudeLink[]>` (dal più recente)
  - `revokeLink(sql, userId: string, linkId: string): Promise<void>`: 404 h3 se il collegamento non è della persona.
- Tabelle (nomi decisi qui, colonne a scelta del builder): `oauth_clients`, `oauth_codes` (hash pk, `user_id` e `client_id` con `on delete cascade`), `oauth_links` (`user_id` e `client_id` con `on delete cascade`), `oauth_tokens` (hash pk, `link_id` con `on delete cascade`, `kind` `'access' | 'refresh'`, `expires_at`). I token scaduti si cancellano a ogni emissione.
- In `users.ts`: `revokeAccess` cancella anche `oauth_links` e `oauth_codes` della persona; `updateUser` chiama la stessa cancellazione (solo la parte oauth) quando `'bandi'` non è in `input.pages`. L'eliminazione della persona li toglie per cascata.

- [ ] **Step 1: Write the failing test** (`describe.skipIf(!TEST_DATABASE_URL)` come `test/users.test.ts`; persona con `createUser` + password scritta a mano)

```ts
const CLAUDE = 'https://claude.ai/api/mcp/auth_callback'
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

it('registrazione: solo redirect di Claude', async () => {
  await expect(registerClient(sql, { name: 'X', redirectUris: ['https://evil.com/cb'] })).rejects.toMatchObject({ code: 'invalid_redirect_uri' })
  const c = await registerClient(sql, { name: '', redirectUris: [CLAUDE] })
  expect(c.name).toBe('Claude')
})
it('codice → token, monouso e con PKCE', async () => {
  const code = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
  await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: 'x'.repeat(43) })).rejects.toMatchObject({ code: 'invalid_grant' })
  // il tentativo sbagliato ha consumato il codice
  await expect(exchangeCode(sql, { code, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })).rejects.toMatchObject({ code: 'invalid_grant' })
  const code2 = await issueCode(sql, { clientId: c.id, userId: u.id, redirectUri: CLAUDE, codeChallenge: CHALLENGE })
  const t = await exchangeCode(sql, { code: code2, clientId: c.id, redirectUri: CLAUDE, codeVerifier: VERIFIER })
  expect(t).toMatchObject({ expiresIn: 3600, scope: 'bandi' })
  expect((await verifyAccessToken(sql, t.accessToken))?.user.id).toBe(u.id)
  expect(await verifyAccessToken(sql, t.refreshToken)).toBeNull()
})
it('codice scaduto dopo 60 secondi', async () => { /* expires_at spostato indietro con un update; exchange → invalid_grant */ })
it('rinnovo con rotazione: il vecchio refresh non vale più', async () => {
  const t2 = await refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })
  await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
  expect(await verifyAccessToken(sql, t2.accessToken)).not.toBeNull()
  await expect(refreshTokens(sql, { refreshToken: t2.refreshToken, clientId: crypto.randomUUID() })).rejects.toMatchObject({ code: 'invalid_grant' })
})
it('Bandi tolto: collegamenti chiusi, ridarlo non li riapre', async () => {
  await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['clienti'], active: true })
  expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
  await updateUser(sql, admin.id, u.id, { name: u.name, pages: ['bandi'], active: true })
  expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
  await expect(refreshTokens(sql, { refreshToken: t.refreshToken, clientId: c.id })).rejects.toMatchObject({ code: 'invalid_grant' })
  expect(await listLinks(sql, u.id)).toEqual([])
})
it('disattivazione, cambio password ed eliminazione chiudono i collegamenti', async () => { /* updateUser active:false, changeOwnPassword, deleteUser: verifyAccessToken → null ogni volta */ })
it('scollega solo i propri', async () => {
  const [link] = await listLinks(sql, u.id)
  await expect(revokeLink(sql, other.id, link!.id)).rejects.toMatchObject({ statusCode: 404 })
  await revokeLink(sql, u.id, link!.id)
  expect(await verifyAccessToken(sql, t.accessToken)).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/oauth.test.ts`
Expected: FAIL, modulo `server/utils/oauth` mancante.

- [ ] **Step 3: Add the tables to `DB_SCHEMA`**, the truncate in `resetTestDb`, the revoke in `users.ts`, and implement `server/utils/oauth.ts` with the signatures above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/oauth.test.ts test/users.test.ts`
Expected: PASS (anche "lo schema si applica due volte senza errori")

- [ ] **Step 5: Commit**

```bash
git add server/utils/schema.ts server/utils/oauth.ts server/utils/users.ts test/helpers/db.ts test/oauth.test.ts
git commit -m "feat(mcp): OAuth clients, codes, links and rotating tokens on Postgres"
```

---

### Task 3: Endpoint OAuth e pagina di consenso

**Files:**
- Create: `server/routes/.well-known/oauth-protected-resource.get.ts`
- Create: `server/routes/.well-known/oauth-protected-resource/mcp.get.ts` (stesso documento)
- Create: `server/routes/.well-known/oauth-authorization-server.get.ts`
- Create: `server/routes/oauth/register.post.ts`
- Create: `server/routes/oauth/token.post.ts`
- Create: `server/api/admin/oauth/check.post.ts`, `server/api/admin/oauth/approve.post.ts`
- Modify: `shared/admin-access.ts` (regola `/api/admin/oauth` → `{ kind: 'session' }`; `pageForPath('/oauth/authorize')` → `'session'`)
- Create: `app/pages/oauth/authorize.vue`
- Modify: `nuxt.config.ts` (`routeRules` per `/oauth/**` e `/.well-known/**`: `Cache-Control: no-store`; `/oauth/authorize` con `Referrer-Policy: no-referrer`)
- Test: `test/admin-access.test.ts` (nuove righe)

**Interfaces:**
- Consumes: Task 1 e Task 2; `requireUser`, `rateLimit`, `readSchemaBody` esistenti.
- Produces:
  - `POST /oauth/register` (JSON RFC 7591): da `redirect_uris`, `client_name`; risponde `201` con `client_id`, `client_id_issued_at`, `client_name`, `redirect_uris`, `grant_types: ['authorization_code', 'refresh_token']`, `response_types: ['code']`, `token_endpoint_auth_method: 'none'`. Errori `400` `{ error, error_description }`. Limite 20 ogni 10 minuti per IP.
  - `POST /oauth/token` (`application/x-www-form-urlencoded`): `grant_type=authorization_code` (`code`, `redirect_uri`, `client_id`, `code_verifier`) o `refresh_token` (`refresh_token`, `client_id`). Risposta `{ access_token, token_type: 'Bearer', expires_in, refresh_token, scope }`, `Cache-Control: no-store`. `OAuthFailure` → `400 { error, error_description }`; `grant_type` sconosciuto → `unsupported_grant_type`. Limite 60 ogni 10 minuti per IP.
  - `POST /api/admin/oauth/check` corpo = la query di authorize: valida con `authorizeQuerySchema`, client esistente, `redirectMatches`; risponde `{ clientName, redirectHost, user: { name, email }, hasBandi: boolean }`. Errori `400` con `statusMessage` in italiano ("Richiesta di collegamento non valida", "Indirizzo di ritorno non ammesso").
  - `POST /api/admin/oauth/approve` stesso corpo: ricontrolla tutto, rifiuta `403` senza Bandi, `issueCode`, risponde `{ redirect: '<redirect_uri>?code=...&state=...' }` (con `URL` e `searchParams`, `state` solo se c'era). Limite 30 ogni 10 minuti per IP.
  - Pagina `/oauth/authorize`: layout `admin`, `defineI18nRoute(false)`, scheda al centro come `app/pages/admin/password.vue`. Senza sessione mostra `AdminLogin` e poi si ricarica il controllo. Con sessione: "Claude vuole accedere ai bandi di Didap" con nome e email della persona, il dominio di ritorno (`redirectHost`) ben visibile, bottoni "Consenti" (chiama approve e fa `window.location.assign(redirect)`) e "Annulla" (porta al redirect con `error=access_denied` e `state`). Senza Bandi: messaggio "Il tuo account non ha accesso ai Bandi: chiedi a chi gestisce i collaboratori." e nessun Consenti. Errori di `check`: solo il messaggio, nessun redirect.

- [ ] **Step 1: Write the failing test** in `test/admin-access.test.ts`

```ts
expect(apiAccess('/api/admin/oauth/check', 'POST')).toEqual({ kind: 'session' })
expect(apiAccess('/api/admin/oauth/approve', 'POST')).toEqual({ kind: 'session' })
expect(pageForPath('/oauth/authorize')).toBe('session')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/admin-access.test.ts`
Expected: FAIL sulle righe nuove.

- [ ] **Step 3: Implement the routes, the access rule, the page and the route rules** come nell'Interfaces block. I due endpoint OAuth fuori da `/api/admin` non passano dal middleware del pannello: fanno da sé i limiti di tentativi.

- [ ] **Step 4: Run tests and check the endpoints by hand**

Run: `npx vitest run test/admin-access.test.ts` → PASS. Con `npx nuxt dev` acceso:
```bash
curl -s http://localhost:3000/.well-known/oauth-authorization-server
curl -s http://localhost:3000/.well-known/oauth-protected-resource/mcp
curl -s -X POST http://localhost:3000/oauth/register -H 'content-type: application/json' -d '{"client_name":"prova","redirect_uris":["http://localhost:3118/callback"]}'
curl -s -X POST http://localhost:3000/oauth/register -H 'content-type: application/json' -d '{"redirect_uris":["https://evil.com/cb"]}'
curl -s -X POST http://localhost:3000/oauth/token -d 'grant_type=refresh_token&refresh_token=nulla&client_id=00000000-0000-0000-0000-000000000000'
```
Expected: i due metadati con gli indirizzi di `NUXT_PUBLIC_SITE_URL`; `201` con `client_id`; `400 invalid_redirect_uri`; `400 {"error":"invalid_grant",...}`. Poi apri nel browser `/oauth/authorize?...` con il `client_id` appena registrato e un `code_challenge`: con un account con Bandi compare Consenti e, premuto, il browser va su `http://localhost:3118/callback?code=...&state=...`.

- [ ] **Step 5: Commit**

```bash
git add server/routes server/api/admin/oauth shared/admin-access.ts app/pages/oauth nuxt.config.ts test/admin-access.test.ts
git commit -m "feat(mcp): OAuth discovery, registration, token endpoint and consent page"
```

---

### Task 4: Funzioni dei bandi per Claude

**Files:**
- Create: `server/utils/mcp-bandi.ts`
- Modify: `server/utils/grant-files.ts` (nuova `grantFolderContents`)
- Modify: `server/utils/radar-fetch.ts` (esporta `pdfPages`)
- Test: `test/mcp-bandi.test.ts`

**Interfaces:**
- Consumes: `listGrants(sql, now, { withFolders: true })`, `readRadarSettings`, `readGrantDocument`, `setGrantLiked` (`radar.ts`); `evaluateRadarGrant`, `isInScope`, `ELIGIBILITY_LABELS`, `sourceLabel` (`#shared/radar`); `grantExport` (`radar-export.ts`); `folderTree`, `readFileEntry` (`grant-files.ts`); `startGrantFolder` (`grant-folder.ts`); `FileStore`.
- Produces:
  - `grantFolderContents(sql, grantId): Promise<{ folders: TreeRow[], files: (FileEntry & { folderId: string | null })[] }>` in `grant-files.ts`; 409 h3 "Crea prima la cartella del bando" se il bando non ha cartella.
  - in `mcp-bandi.ts`:
  - `type GrantSearch = { esito?: ('candidabile' | 'da_verificare' | 'escluso')[], soloInteressanti?: boolean, scadenzaEntroGiorni?: number, testo?: string, fuoriDallaRicerca?: boolean }` e lo zod `grantSearchSchema` (giorni 1..365, testo max 200)
  - `type GrantHit = { id, titolo, ente, fonte, esito, motivo, sintesi, importoMassimo: number | null, agevolazione, apertura: string | null, scadenza: string | null, interessante: boolean, cartella: boolean, chiuso: boolean, url }` (date `YYYY-MM-DD`; `esito` è l'etichetta di `ELIGIBILITY_LABELS`; `motivo` è `verdictReason`)
  - `searchGrants(sql, search: GrantSearch, now = new Date()): Promise<{ bandi: GrantHit[], altri: number }>`: di base `isInScope` con la ricerca salvata, esiti candidabile e da verificare; `fuoriDallaRicerca` salta `isInScope`; `testo` cerca senza maiuscole in titolo, ente e sintesi; `scadenzaEntroGiorni` tiene i bandi con scadenza entro N giorni da `now` (senza scadenza esclusi solo con questo filtro); i bandi con cartella restano anche chiusi. Al massimo 50, `altri` = quanti ne restano fuori.
  - `readGrantText(sql, id): Promise<string>` = `grantExport` di `readGrantDocument`
  - `type ToolContent = { type: 'text', text: string } | { type: 'image', data: string, mimeType: string }`
  - `readGrantFile(sql, store, grantId, fileId, extract = pdfPages): Promise<ToolContent[]>`: testo (`text/*`, `.md`, `.csv`, `.json`) come testo; PDF come pagine con `[[nome | pagina N]]`; PNG, JPEG, GIF, WebP come immagine base64; altri tipi un testo con nome, tipo e dimensione e l'invito ad aprirlo dal pannello. Testo oltre `MAX_TOOL_TEXT = 100_000` caratteri tagliato, con in coda "[Testo tagliato: il file è più lungo]". PDF senza testo: "PDF senza testo leggibile (forse una scansione): aprilo dal pannello."
  - `MAX_TOOL_TEXT` esportato (usato dai test).

- [ ] **Step 1: Write the failing test** (`describe.skipIf(!TEST_DATABASE_URL)`; i bandi si creano con `ingestSources` + `readPending` e un reader finto come `test/grant-folder.test.ts`, con fonti di gruppi diversi e un comune; lo store è `memoryStore()`; i file si mettono con `addFile`)

```ts
it('segue la ricerca salvata e salta gli esclusi', async () => {
  // ricerca salvata: solo regione; un bando governo, uno regione, uno regione escluso (verdict 'no')
  const r = await searchGrants(sql, {}, NOW)
  expect(r.bandi.map(b => b.titolo)).toEqual(['Voucher regione'])
  expect((await searchGrants(sql, { fuoriDallaRicerca: true }, NOW)).bandi).toHaveLength(2)
  expect((await searchGrants(sql, { esito: ['escluso'] }, NOW)).bandi.map(b => b.esito)).toEqual(['Escluso'])
})
it('filtri su testo, scadenza e interessanti', async () => { /* testo 'VOUCHER' trova senza maiuscole; scadenzaEntroGiorni 10 tiene solo quello in scadenza; soloInteressanti dopo setGrantLiked */ })
it('un bando con cartella resta anche chiuso', async () => { /* startGrantFolder, poi NOW oltre la scadenza: compare con chiuso: true */ })
it('al massimo 50, gli altri contati', async () => { /* 52 bandi: bandi.length 50, altri 2 */ })
it('legge i file per tipo', async () => {
  expect(await readGrantFile(sql, store, g, mdId)).toEqual([{ type: 'text', text: '# Nota' }])
  const pdf = await readGrantFile(sql, store, g, pdfId, async () => ['prima', ''])
  expect(pdf[0]).toMatchObject({ type: 'text', text: expect.stringContaining('[[avviso.pdf | pagina 1]]\nprima') })
  expect(await readGrantFile(sql, store, g, scanId, async () => ['', ''])).toEqual([{ type: 'text', text: expect.stringContaining('PDF senza testo leggibile') }])
  expect((await readGrantFile(sql, store, g, pngId))[0]).toMatchObject({ type: 'image', mimeType: 'image/png' })
  expect((await readGrantFile(sql, store, g, zipId))[0]).toMatchObject({ type: 'text', text: expect.stringContaining('pannello') })
  const big = (await readGrantFile(sql, store, g, bigTxtId))[0] as { text: string }
  expect(big.text.length).toBeLessThanOrEqual(MAX_TOOL_TEXT + 100)
  expect(big.text).toContain('[Testo tagliato')
})
it('file di un altro bando: 404', async () => { /* readGrantFile(sql, store, altroBando, mdId) rejects statusCode 404 */ })
it('cartella mancante: 409 chiaro', async () => { /* grantFolderContents su un bando senza cartella */ })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/mcp-bandi.test.ts`
Expected: FAIL, modulo mancante.

- [ ] **Step 3: Implement `grantFolderContents`, export `pdfPages`, and `server/utils/mcp-bandi.ts`**

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/mcp-bandi.test.ts test/grant-files.test.ts test/radar-fetch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/mcp-bandi.ts server/utils/grant-files.ts server/utils/radar-fetch.ts test/mcp-bandi.test.ts
git commit -m "feat(mcp): grant search, grant text and file reading for Claude"
```

---

### Task 5: Server MCP su /mcp

**Files:**
- Modify: `package.json`, `package-lock.json` (`npx npm@10 install --save-exact @modelcontextprotocol/server@2.3.1` e `npx npm@10 install --save-exact -D @modelcontextprotocol/client@2.3.1`)
- Create: `server/utils/mcp-text.ts` (istruzioni del server, descrizioni degli strumenti, testo del prompt)
- Create: `server/utils/mcp-server.ts`
- Create: `server/routes/mcp.ts`
- Test: `test/mcp-server.test.ts`

**Interfaces:**
- Consumes: Task 2 (`verifyAccessToken`), Task 1 (`protectedResourceMetadata` URL, `siteOrigin`), Task 4 (tutte le funzioni), `setGrantLiked`, `startGrantFolder`, `requireFileStore`, `readRadarSettings`.
- Produces:
  - `buildMcpServer(deps: { sql: Sql, store: () => FileStore, user: AdminUser }): McpServer` in `mcp-server.ts`, con `name: 'didap-bandi'`, `instructions` da `mcp-text.ts`. Strumenti (nomi esatti, `inputSchema` con `fromJsonSchema`, argomenti rivalidati con zod):
    - `cerca_bandi` (`esito`, `solo_interessanti`, `scadenza_entro_giorni`, `testo`, `fuori_dalla_ricerca`) → `searchGrants`; risultato `text` con il JSON e `structuredContent`; `readOnlyHint: true`
    - `leggi_bando` (`id`) → `readGrantText`; `readOnlyHint: true`
    - `profilo_azienda` () → profilo di `readRadarSettings` in JSON; `readOnlyHint: true`
    - `elenca_cartella` (`id`) → `grantFolderContents` in JSON (senza store key né URL); `readOnlyHint: true`
    - `leggi_file` (`id`, `file_id`) → `readGrantFile`; `readOnlyHint: true`
    - `segna_interessante` (`id`, `interessante: boolean`) → `setGrantLiked`; `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: true`
    - `crea_cartella_bando` (`id`) → `startGrantFolder(sql, store(), id)`; testo "Cartella creata: i file del bando arrivano tra poco." o "La cartella c'era già."; `readOnlyHint: false`, `destructiveHint: false`
    - un errore h3 (404, 409, 503) diventa un risultato `isError: true` con il suo `statusMessage`, mai un'eccezione verso l'SDK
  - Prompt `come_candidarsi` con argomento `bando` (id o titolo): messaggio utente che chiede a Claude i passi della spec ("Consigli per candidarsi"): leggere bando e PDF della cartella, dire se Didap può candidarsi e cosa verificare, passi in ordine con piattaforma, documenti (formato e firma), scadenze e chi fornisce cosa, consigli sui criteri di valutazione; risposta in chat, documenti preparati dalla persona.
  - `instructions`: italiano, risposte semplici; non inventare fatturato, dipendenti, ATECO, bilanci e dire quali mancano; citare la pagina del bando per i requisiti critici; se i dati estratti non tornano vale il testo del bando; chiedere conferma prima di `segna_interessante` e `crea_cartella_bando`.
  - `server/routes/mcp.ts`: tutti i metodi. Se c'è un header `Origin` diverso da `siteOrigin()` → `403`. Senza `Authorization: Bearer` → `401` con `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource", scope="bandi"`; con un token non valido lo stesso più `error="invalid_token"`. Con token valido: `createMcpHandler(() => buildMcpServer(...))` e `handler.fetch(toWebRequest(event), { authInfo: { token, clientId, scopes: ['bandi'], extra: { userId } } })`; la `Response` torna così com'è. Header `Cache-Control: no-store`.

- [ ] **Step 1: Write the failing test** (`describe.skipIf(!TEST_DATABASE_URL)`; `McpServer` collegato a un `Client` di `@modelcontextprotocol/client` con `InMemoryTransport.createLinkedPair()`)

```ts
it('elenca strumenti e prompt, nient\'altro', async () => {
  const tools = (await client.listTools()).tools.map(t => t.name).sort()
  expect(tools).toEqual(['cerca_bandi', 'crea_cartella_bando', 'elenca_cartella', 'leggi_bando', 'leggi_file', 'profilo_azienda', 'segna_interessante'])
  expect((await client.listPrompts()).prompts.map(p => p.name)).toEqual(['come_candidarsi'])
  const readOnly = (await client.listTools()).tools.filter(t => t.annotations?.readOnlyHint).map(t => t.name).sort()
  expect(readOnly).toEqual(['cerca_bandi', 'elenca_cartella', 'leggi_bando', 'leggi_file', 'profilo_azienda'])
})
it('cerca e segna', async () => {
  const r = await client.callTool({ name: 'cerca_bandi', arguments: { testo: 'voucher' } })
  expect(r.isError).toBeFalsy()
  await client.callTool({ name: 'segna_interessante', arguments: { id: g, interessante: true } })
  expect((await listGrants(sql, NOW, { id: g }))[0]!.liked).toBe(true)
})
it('errori come risultati', async () => {
  const r = await client.callTool({ name: 'leggi_bando', arguments: { id: crypto.randomUUID() } })
  expect(r).toMatchObject({ isError: true, content: [{ type: 'text', text: 'Bando non trovato' }] })
  const bad = await client.callTool({ name: 'cerca_bandi', arguments: { scadenza_entro_giorni: 9999 } })
  expect(bad.isError).toBe(true)
})
it('nessun URL Cloudinary nelle risposte', async () => { /* elenca_cartella: JSON senza 'cloudinary' né 'didap/bandi/' */ })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/mcp-server.test.ts`
Expected: FAIL, pacchetti o modulo mancanti.

- [ ] **Step 3: Install the two packages with npm 10, write `mcp-text.ts`, `mcp-server.ts` and `server/routes/mcp.ts`**

- [ ] **Step 4: Run tests and check /mcp by hand**

Run: `npx vitest run test/mcp-server.test.ts` → PASS. Con `npx nuxt dev`:
```bash
curl -si -X POST http://localhost:3000/mcp -H 'content-type: application/json' -d '{}' | grep -i -E '^(HTTP|www-authenticate)'
curl -si -X POST http://localhost:3000/mcp -H 'authorization: Bearer inventato' -H 'content-type: application/json' -d '{}' | grep -i -E '^(HTTP|www-authenticate)'
```
Expected: `401` con `resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"`; il secondo anche `error="invalid_token"`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json server/utils/mcp-text.ts server/utils/mcp-server.ts server/routes/mcp.ts test/mcp-server.test.ts
git commit -m "feat(mcp): /mcp server with grant tools and application prompt"
```

---

### Task 6: "Claude collegato" nella pagina Account

**Files:**
- Create: `server/api/admin/account/claude.get.ts`, `server/api/admin/account/claude/[id].delete.ts`
- Modify: `app/pages/admin/account.vue` (nuova `AdminSection` "Claude collegato" sotto "Cambia password")

**Interfaces:**
- Consumes: `listLinks`, `revokeLink` (Task 2), `requireUser`, `uuidParam`.
- Produces: `GET /api/admin/account/claude` → `ClaudeLink[]` della persona della sessione; `DELETE /api/admin/account/claude/:id` → `{ ok: true }`. Le regole d'accesso ci sono già (`/api/admin/account` è `session`).
- Pagina: elenco con nome del client, "collegato il" e "ultimo uso" (`formatDateTime` di `~/utils/format`), bottone "Scollega" con `AdminConfirm` ("Scollegare Claude? Dovrà rifare l'accesso.") e toast "Claude scollegato". Lista vuota: "Nessun Claude collegato. Per collegarlo aggiungi il connettore `<sito>/mcp` nelle impostazioni di Claude." con l'indirizzo da `useRequestURL().origin` lato pannello.

- [ ] **Step 1: Implement the two endpoints and the section**

- [ ] **Step 2: Verify in the browser**

Con un collegamento creato nel Task 7 o con `issueCode` + `exchangeCode` da uno script: la sezione mostra la riga; "Scollega" la toglie e `curl` su `/mcp` con quel token dà `401`.

- [ ] **Step 3: Typecheck, lint, tests**

Run: `npx nuxt typecheck && npx eslint . && npx vitest run`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add server/api/admin/account app/pages/admin/account.vue
git commit -m "feat(mcp): connected Claude list and disconnect on the Account page"
```

---

### Task 7: Prova completa con Claude Code

**Files:**
- Modify: nessuno, salvo correzioni trovate durante la prova

- [ ] **Step 1: Collega Claude Code al server locale**

Con `npx nuxt dev` acceso e un account di prova con Bandi:
```bash
claude mcp add --transport http didap-locale http://localhost:3000/mcp
```
Nella sessione di Claude Code: `/mcp` → autentica `didap-locale`. Expected: si apre `/oauth/authorize`, login, Consenti, Claude Code risulta collegato.

- [ ] **Step 2: Prova gli strumenti**

Chiedi: "dimmi i bandi interessanti", "leggi il bando <id>", "elenca la cartella del bando <id>", "leggi il file <nome>", "come mi candido a <titolo>" (prompt). Expected: risposte coerenti con il pannello, `segna_interessante` e `crea_cartella_bando` visibili subito nel pannello.

- [ ] **Step 3: Prova la revoca**

Togli Bandi alla persona dalla pagina Collaboratori. Expected: la chiamata successiva di Claude Code fallisce e chiede di autenticarsi di nuovo; il consenso mostra "non ha accesso ai Bandi". Ridai Bandi e ricollega.

- [ ] **Step 4: Pulisci**

`claude mcp remove didap-locale`. Typecheck, lint e test di nuovo senza errori.

- [ ] **Step 5: Commit delle correzioni, se ce ne sono**

```bash
git commit -am "fix(mcp): <cosa>"
```

Note per la PR (non per il codice): su Coolify il proxy deve passare `/.well-known/*`, `/oauth/*` e `/mcp`; `NUXT_PUBLIC_SITE_URL` deve essere il dominio pubblico in https; nessun blocco degli IP di Anthropic (`160.79.104.0/21`). La prova da claude.ai si fa dopo il deploy, aggiungendo il connettore personalizzato `https://<dominio>/mcp`.

---

## Seconda parte (2026-10-27): correzioni della revisione finale e bozza della candidatura

La spec è stata aggiornata (commit bdb57c6): bozza della candidatura modificabile, testo a parti, limite immagini, pulizia dei client. Valgono le Global Constraints sopra, più:

- Testo verso Claude a parti di al massimo `MAX_TOOL_TEXT = 60_000` caratteri, con "parte X di Y" in testa.
- Immagini verso Claude solo fino a `MAX_TOOL_IMAGE_BYTES = 3_500_000` byte.
- Bozza: Markdown, al massimo `MAX_DRAFT_CHARS = 200_000` caratteri, una per bando, versione numerica, salvataggio solo "a partire dalla versione N" o "prima bozza".

### Review Focus (seconda parte)

1. Claude salva la bozza mentre una persona la sta correggendo nel pannello: il salvataggio più vecchio dei due è rifiutato con `409`, nessun testo perso. (Task 10, 12)
2. Prima bozza su un bando senza cartella e senza Cloudinary: la bozza si salva, il bando ha `folder_at` e resta dopo `radarWipe`. (Task 10)
3. `leggi_bando` su un bando da 1,5 milioni di caratteri: la parte 1 ha i dati estratti in testa, l'ultima parte finisce il testo, una parte oltre l'ultima dà un errore chiaro. (Task 8)
4. Chi si scollega e ricollega Claude dopo più di 7 giorni dalla registrazione: il client c'è ancora. (Task 8)
5. Una foto da 6 MB nella cartella: `leggi_file` risponde con nome e dimensione, non con l'immagine. (Task 8)

---

### Task 8: Correzioni lato server dalla revisione finale

**Files:**
- Modify: `server/utils/schema.ts` (`alter table oauth_clients add column if not exists linked_at timestamptz`)
- Modify: `server/utils/oauth.ts` (`exchangeCode` scrive `linked_at = coalesce(linked_at, now())`; la pulizia in `registerClient` cancella solo `linked_at is null and created_at < now() - 7 giorni`)
- Modify: `server/utils/mcp-bandi.ts` (parti, limite immagini)
- Modify: `server/utils/mcp-server.ts` (argomento `parte` per `leggi_bando` e `leggi_file`; `openWorldHint: true` su `crea_cartella_bando`; il 503 di Cloudinary verso Claude diventa "La cartella dei file non è configurata sul server.")
- Modify: `server/routes/mcp.ts` (`createMcpHandler(..., { onerror: e => console.warn('[mcp]', e) })` se l'opzione esiste nella 2.3.1; altrimenti il modo che l'SDK offre per non perdere gli errori)
- Modify: `test/mcp-bandi.test.ts` (`withFolder` raccoglie i lavori con un `run` e `afterEach` li aspetta prima di `vi.unstubAllGlobals()`, come `test/mcp-server.test.ts`)
- Test: `test/oauth.test.ts`, `test/mcp-bandi.test.ts`, `test/mcp-server.test.ts`

**Interfaces:**
- Produces in `mcp-bandi.ts`:
  - `MAX_TOOL_TEXT = 60_000`, `MAX_TOOL_IMAGE_BYTES = 3_500_000`
  - `textPart(text: string, part: number): { text: string, part: number, parts: number }` (parti consecutive di `MAX_TOOL_TEXT`; `parts` almeno 1; `part` fuori da 1..parts: h3 400 "Parte <n> inesistente: il testo ha <parts> parti")
  - `readGrantText(sql, id, part = 1): Promise<string>`: la parte richiesta di `grantExport`, con in testa `[Parte X di Y. Chiedi la parte X+1 con parte: X+1.]` se `parts > 1` (sull'ultima: `[Parte Y di Y, l'ultima.]`)
  - `readGrantFile(sql, store, grantId, fileId, extract = pdfPages, part = 1)`: stesso schema a parti per testo e PDF; immagini oltre `MAX_TOOL_IMAGE_BYTES`: il testo `File "<nome>" (<tipo>, <KB> KB): immagine troppo grande per Claude, aprila dal pannello.`
- Il vecchio `cut()` e `CUT_NOTE` spariscono.

- [ ] **Step 1: Write the failing tests**

```ts
// oauth.test.ts
it('la pulizia tiene i client che hanno avuto un collegamento', async () => {
  // client collegato (exchangeCode), poi revokeLink, poi created_at spostato a 8 giorni fa;
  // un secondo client mai collegato, anche lui di 8 giorni fa
  await registerClient(sql, { name: 'altro', redirectUris: [CLAUDE] })
  expect(await getOAuthClient(sql, c.id)).not.toBeNull()
  expect(await getOAuthClient(sql, mai.id)).toBeNull()
})
// mcp-bandi.test.ts
it('testo a parti', () => {
  const long = 'a'.repeat(MAX_TOOL_TEXT * 2 + 5)
  expect(textPart(long, 1)).toMatchObject({ part: 1, parts: 3 })
  expect(textPart(long, 3).text).toHaveLength(5)
  expect(() => textPart(long, 4)).toThrow(/Parte 4 inesistente/)
  expect(textPart('', 1)).toMatchObject({ part: 1, parts: 1, text: '' })
})
it('leggi_bando a parti con la guida in testa', async () => { /* documento > 60k: parte 1 comincia con "[Parte 1 di" e contiene "## Cosa fare"; l'ultima comincia con "[Parte N di N, l'ultima.]" */ })
it('immagine troppo grande: solo descritta', async () => { /* PNG di MAX_TOOL_IMAGE_BYTES + 1 byte: testo con "troppo grande" */ })
// mcp-server.test.ts
it('leggi_bando accetta parte e la valida', async () => { /* parte 0: isError; parte oltre l'ultima: isError con "inesistente" */ })
it('crea_cartella_bando dichiara il mondo aperto', async () => { /* annotations.openWorldHint true */ })
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run test/oauth.test.ts test/mcp-bandi.test.ts test/mcp-server.test.ts`
Expected: FAIL sui test nuovi.

- [ ] **Step 3: Implement** come nell'Interfaces block e nella lista dei file.

- [ ] **Step 4: Run the covering tests, then the full suite three times** (per provare che il test instabile non lo è più)

Run: `npx vitest run test/oauth.test.ts test/mcp-bandi.test.ts test/mcp-server.test.ts`, poi `npx vitest run` tre volte.
Expected: PASS ogni volta.

- [ ] **Step 5: Commit** `fix(mcp): text in parts, image cap, keep linked clients, stable folder test`

---

### Task 9: Pagina Account, ritocchi dalla revisione finale

**Files:**
- Modify: `server/api/admin/account/claude.get.ts` (risponde `{ links: ClaudeLink[], mcpUrl: string, hasBandi: boolean }` con `mcpUrl = mcpResourceUrl()`)
- Modify: `app/pages/admin/account.vue`

**Interfaces:**
- Consumes: `mcpResourceUrl()` (Task 1), `listLinks` (Task 2).
- Pagina:
  - l'indirizzo del connettore viene da `mcpUrl`, non più da `useRequestURL()`;
  - senza la pagina Bandi la sezione mostra solo "Per collegare Claude ai bandi serve l'accesso alla pagina Bandi: chiedilo a chi gestisce i collaboratori." (nessun elenco, nessun indirizzo);
  - dopo un cambio di password riuscito si ricarica l'elenco, e il toast diventa "Password cambiata. Le altre sessioni e Claude sono stati scollegati." se c'erano collegamenti, altrimenti resta quello di oggi;
  - "Ultimo uso <data>." con il punto, come "Collegato il <data>.".

- [ ] **Step 1: Implement the endpoint change and the page**
- [ ] **Step 2: Verify with curl** (cookie di una persona di prova con e senza Bandi): la risposta ha `mcpUrl` uguale a `<NUXT_PUBLIC_SITE_URL>/mcp` e `hasBandi`; l'HTML della pagina mostra il testo giusto nei due casi.
- [ ] **Step 3: `npx nuxt typecheck`, `npx eslint .`, `npx vitest run`**
- [ ] **Step 4: Commit** `fix(mcp): connector address from the server and Bandi-aware Claude section`

---

### Task 10: Bozza della candidatura: dati e API

**Files:**
- Modify: `server/utils/schema.ts` (tabella `grant_drafts`: `grant_id uuid primary key references radar_grants(id) on delete cascade`, `content text not null`, `version int not null`, `saved_at timestamptz not null default now()`, `saved_by text not null`, `by_claude boolean not null default false`)
- Modify: `test/helpers/db.ts` (`grant_drafts` nel truncate dei bandi)
- Create: `shared/grant-draft.ts`
- Create: `server/utils/grant-draft.ts`
- Create: `server/api/admin/radar/grants/[id]/draft.get.ts`, `server/api/admin/radar/grants/[id]/draft.put.ts`
- Test: `test/grant-draft.test.ts`

**Interfaces:**
- `shared/grant-draft.ts`:
  - `MAX_DRAFT_CHARS = 200_000`
  - `type GrantDraft = { content: string, version: number, savedAt: string, savedBy: string, byClaude: boolean }`
  - `draftSaveSchema` (zod): `{ content: string max MAX_DRAFT_CHARS, baseVersion: number int >= 1 | null }` strict
  - `type DraftConflict = { version: number, savedAt: string, savedBy: string, byClaude: boolean }`
- `server/utils/grant-draft.ts`:
  - `readDraft(sql, grantId): Promise<GrantDraft | null>` (h3 404 "Bando non trovato" se il bando non esiste)
  - `saveDraft(sql, input: { grantId: string, content: string, baseVersion: number | null, savedBy: string, byClaude: boolean }): Promise<{ draft: GrantDraft, folderCreated: boolean }>`: in una transazione con lock sulla riga del bando (`select ... for update` su `radar_grants`): 404 se manca; se la versione attuale non è `baseVersion` (o c'è una bozza e `baseVersion` è null) lancia h3 409 "La bozza è cambiata" con `data: DraftConflict`; scrive la bozza con `version + 1` (o 1); `update radar_grants set folder_at = coalesce(folder_at, now()), liked_at = coalesce(liked_at, now())`; `folderCreated` vero se `folder_at` era null prima.
  - `saveDraftAndFill(sql, store: FileStore | null, input, run?)`: `saveDraft`, poi se `folderCreated` e `store` c'è chiama `startGrantFolder(sql, store, grantId, run)`. Chi chiama passa `useFileStore()` (null senza Cloudinary).
- API: `GET .../draft` → `{ draft: GrantDraft | null, hasFolder: boolean }`; `PUT .../draft` con `draftSaveSchema` → `{ draft }`, `savedBy` = nome della persona della sessione, `byClaude: false`; il 409 porta `data` con la `DraftConflict`. I permessi sono quelli di `/api/admin/radar` (pagina Bandi), già in `shared/admin-access.ts`.

- [ ] **Step 1: Write the failing test** (`describe.skipIf(!TEST_DATABASE_URL)`, bando creato come in `test/mcp-bandi.test.ts`)

```ts
it('prima bozza: versione 1, bando protetto', async () => {
  const { draft, folderCreated } = await saveDraft(sql, { grantId: g, content: '# Domanda', baseVersion: null, savedBy: 'Ale', byClaude: false })
  expect(draft).toMatchObject({ content: '# Domanda', version: 1, savedBy: 'Ale', byClaude: false })
  expect(folderCreated).toBe(true)
  await radarWipe(sql)
  expect(await readDraft(sql, g)).toMatchObject({ version: 1 })
})
it('da versione vecchia: 409 con chi ha salvato, niente scritto', async () => {
  await saveDraft(sql, { grantId: g, content: 'uno', baseVersion: null, savedBy: 'Ale', byClaude: false })
  await saveDraft(sql, { grantId: g, content: 'due', baseVersion: 1, savedBy: 'Ale', byClaude: true })
  await expect(saveDraft(sql, { grantId: g, content: 'tre', baseVersion: 1, savedBy: 'Bea', byClaude: false }))
    .rejects.toMatchObject({ statusCode: 409, data: { version: 2, savedBy: 'Ale', byClaude: true } })
  await expect(saveDraft(sql, { grantId: g, content: 'tre', baseVersion: null, savedBy: 'Bea', byClaude: false }))
    .rejects.toMatchObject({ statusCode: 409 })
  expect((await readDraft(sql, g))!.content).toBe('due')
})
it('due salvataggi insieme dalla stessa versione: uno solo passa', async () => { /* Promise.allSettled di due saveDraft con baseVersion 1: un fulfilled, un rejected 409 */ })
it('senza store la bozza si salva, con store parte il riempimento', async () => { /* saveDraftAndFill con null: nessun lavoro; con memoryStore e un run che raccoglie: un lavoro, eseguito e atteso, poi folder_filled_at valorizzato (fetch finto come test/grant-folder.test.ts) */ })
it('bando inesistente: 404; testo oltre il limite: rifiutato dallo schema', async () => { /* readDraft e saveDraft su uuid casuale: 404; draftSaveSchema.safeParse con MAX_DRAFT_CHARS + 1: success false */ })
```

- [ ] **Step 2: Run to see it fail**: `npx vitest run test/grant-draft.test.ts` → FAIL, modulo mancante.
- [ ] **Step 3: Implement schema, shared types, utils and the two endpoints.**
- [ ] **Step 4: Run** `npx vitest run test/grant-draft.test.ts` → PASS; curl con una persona di prova su un bando di prova: GET senza bozza `{ draft: null }`, PUT prima bozza, PUT da versione vecchia `409` con `data`.
- [ ] **Step 5: Commit** `feat(mcp): grant application draft with versioned saves`

---

### Task 11: Strumenti della bozza e prompt "Prepara la candidatura"

**Files:**
- Modify: `server/utils/mcp-server.ts`, `server/utils/mcp-text.ts`
- Modify: `server/routes/mcp.ts` (passa anche `useFileStore()` per la bozza, accanto a `requireFileStore` per i file)
- Test: `test/mcp-server.test.ts`

**Interfaces:**
- Consumes: `readDraft`, `saveDraftAndFill`, `GrantDraft`, `MAX_DRAFT_CHARS` (Task 10).
- Strumenti nuovi:
  - `leggi_bozza` (`id`), `readOnlyHint: true`: JSON `{ testo, versione, salvata_il, salvata_da, da_claude }`, o il testo "Questo bando non ha ancora una bozza: scrivila con salva_bozza senza versione."
  - `salva_bozza` (`id`, `testo` stringa fino a `MAX_DRAFT_CHARS`, `versione` intero >= 1 facoltativo), `readOnlyHint: false`, `destructiveHint: false`: `saveDraftAndFill` con `savedBy` = nome della persona del token, `byClaude: true`; risposta "Bozza salvata (versione N). La trovi nel pannello, scheda Bozza del bando." più " Ho creato la cartella del bando e l'ho messo tra gli interessanti." se `folderCreated`; un 409 diventa `isError` con "La bozza è cambiata (versione N, salvata da <nome> il <data>): rileggila con leggi_bozza e riapplica le modifiche."
- Il prompt `come_candidarsi` diventa `prepara_candidatura` (argomento `bando`, obbligatorio), con il testo della spec ("Istruzioni e prompt per Claude"): leggere bando (a parti se serve) e profilo; dalla cartella solo i file caricati dalle persone (quelli con autore in `elenca_cartella`); dire se Didap può candidarsi e cosa verificare; se c'è già una bozza leggerla e partire da quella; scrivere la bozza seguendo struttura e criteri del bando con le sezioni della spec e "Da completare" in fondo, segnaposto `[DA COMPLETARE: ...]` per i dati mancanti; chiedere conferma e salvarla con `salva_bozza`; dire in chat cosa ha scritto e cosa resta da fare.
- Le istruzioni del server prendono i punti nuovi della spec (segnaposto, leggere la bozza prima di cambiarla, tenere le correzioni delle persone, chiedere conferma prima di scrivere).

- [ ] **Step 1: Write the failing tests**

```ts
it('nove strumenti, prompt prepara_candidatura', async () => {
  expect((await client.listTools()).tools.map(t => t.name).sort()).toEqual(['cerca_bandi', 'crea_cartella_bando', 'elenca_cartella', 'leggi_bando', 'leggi_bozza', 'leggi_file', 'profilo_azienda', 'salva_bozza', 'segna_interessante'])
  const [p] = (await client.listPrompts()).prompts
  expect(p).toMatchObject({ name: 'prepara_candidatura', arguments: [{ name: 'bando', required: true }] })
})
it('salva e rilegge la bozza come Claude per la persona', async () => {
  const r = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda' } })
  expect(r.isError).toBeFalsy()
  expect(await readDraft(sql, g)).toMatchObject({ version: 1, savedBy: user.name, byClaude: true })
  const stale = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: 'x' } })
  expect(stale).toMatchObject({ isError: true, content: [{ type: 'text', text: expect.stringContaining('leggi_bozza') }] })
  const ok = await client.callTool({ name: 'salva_bozza', arguments: { id: g, testo: '# Domanda v2', versione: 1 } })
  expect(ok.isError).toBeFalsy()
})
```

- [ ] **Step 2: Run to see it fail**: `npx vitest run test/mcp-server.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** `npx vitest run test/mcp-server.test.ts test/grant-draft.test.ts` → PASS, poi suite completa, typecheck, lint.
- [ ] **Step 5: Commit** `feat(mcp): draft tools and the prepara_candidatura prompt`

---

### Task 12: Scheda "Bozza" nel pannello

**Files:**
- Create: `app/components/admin/RadarGrantDraft.vue`
- Modify: `app/components/admin/RadarGrantDetail.vue` (terza scheda; tipo `'detail' | 'files' | 'draft'`)
- Modify: `app/pages/admin/bandi/index.vue` (tipo di `detailTab`)

**Interfaces:**
- Consumes: le API del Task 10 (`GET`/`PUT .../draft`), `GrantDraft`, `DraftConflict`, `MAX_DRAFT_CHARS` da `#shared/grant-draft`.
- Componente con prop sul bando (id, titolo, hasFolder) e `:key` per bando come `RadarGrantFiles` (si rimonta a ogni bando):
  - senza bozza: "Nessuna bozza. Chiedi a Claude di preparare la candidatura, oppure scrivila qui."; senza cartella, sotto Salva: "Salvando, il bando va tra gli interessanti e gli si crea la cartella.";
  - `textarea` alta, carattere del pannello, `maxlength` `MAX_DRAFT_CHARS`; "Salva" spento senza modifiche; sotto "Ultimo salvataggio: <formatDateTime>, <nome>" con " via Claude" se `byClaude`;
  - salvataggio con `baseVersion` = versione caricata (null per la prima); dopo il salvataggio la versione caricata diventa quella nuova; toast "Bozza salvata";
  - `409`: riquadro "La bozza è stata cambiata da <nome> alle <ora>. Copia le tue modifiche, ricarica e riapplicale." con bottone "Ricarica" (rilegge e sostituisce il testo, chiedendo conferma con `AdminConfirm` se ci sono modifiche); il testo scritto resta finché non si ricarica;
  - modifiche non salvate: cambio di bando o di scheda e uscita dalla pagina chiedono conferma (`AdminConfirm` dentro il pannello; per la chiusura della scheda del browser solo il `beforeunload` standard);
  - "Scarica" crea nel browser un file `bozza-<slug del titolo>.md` dal testo attuale;
  - dopo il primo salvataggio da pannello su un bando senza cartella, il bando nell'elenco si aggiorna (cuore e cartella), con lo stesso refresh che usa "Crea cartella del bando".

- [ ] **Step 1: Implement the component and the tab**
- [ ] **Step 2: Verify**: typecheck, lint, suite. L'interazione la prova il controllore nel browser con Alessandro; il report elenca i casi da provare (prima bozza, salva, conflitto con un salvataggio fatto via API nel mezzo, ricarica, uscita con modifiche, scarica).
- [ ] **Step 3: Commit** `feat(mcp): Bozza tab in the grant detail`

---

### Task 13: Prova completa della seconda parte

Come il Task 7 (giro scriptato, nessun `claude mcp add`), più: `leggi_bando` a parti su un bando lungo del database di sviluppo; `salva_bozza`, conflitto e `leggi_bozza` su un bando di prova creato apposta (mai sui bandi veri del database di sviluppo); poi la stessa bozza letta dall'API del pannello. Pulizia di persone, client e bando di prova alla fine. Correzioni come `fix(mcp): <cosa>` con test.
