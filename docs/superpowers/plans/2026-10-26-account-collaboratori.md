# Account personali e pagina Collaboratori: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sostituire la password condivisa di /admin con account personali (email e password) e una pagina Collaboratori dove si spuntano le pagine accessibili a ogni persona, con il blocco applicato anche alle API.

**Architecture:** due moduli condivisi (`shared/users.ts` per tipi e validazione, `shared/admin-access.ts` per la mappa pagine/API) usati sia dal server sia dal pannello. Lato server, `server/utils/users.ts` contiene tutta la logica su Postgres (persone, link, sessioni, prima persona) con funzioni che ricevono `sql` come le altre utility; `admin-session.ts` e il middleware si appoggiano a quelle. Gli endpoint sono sottili, come quelli esistenti.

**Tech Stack:** Nuxt 4, Nitro, Postgres con `postgres` (SQL a template), zod, `node:crypto` (scrypt), Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-account-collaboratori-design.md`

## Global Constraints

- Nessun trattino lungo né medio (U+2014, U+2013) in codice, commenti, testi, commit. Solo `-` o frasi separate (CLAUDE.md).
- Nessuna nuova dipendenza: hash con `scrypt` di `node:crypto`; zod come già usato. Se serve toccare il lockfile, `npx npm@10`.
- Commenti e testi dell'interfaccia in italiano, nello stile dei file vicini.
- Password: minimo 10 caratteri (massimo 200).
- Link d'invito valido 7 giorni, link di reset valido 1 ora, entrambi usabili una volta; nel database solo l'hash del token.
- Sessione: 7 giorni, cookie sigillato `didap_admin` con dentro solo l'id della sessione; chiave da `SESSION_SECRET`, non più da `ADMIN_PASSWORD`.
- Email confrontate in minuscolo e senza spazi ai lati.
- Le chiavi delle pagine sono, in quest'ordine: `prodotti`, `preventivi`, `clienti`, `bandi`, `impostazioni`, `collaboratori`.
- Messaggi d'errore: 401 senza sessione, 403 pagina non accessibile, 409 per le regole anti blocco, 410 link scaduto o già usato.
- Test di integrazione: `describe.skipIf(!TEST_DATABASE_URL)` come `test/settings-clients.test.ts`; `resetTestDb` va esteso alle nuove tabelle.

## Review Focus

1. Email con maiuscole o spazi ("  Mario@Didap.IT ") al login, all'invito e al reset: deve trovare la stessa persona. Test in Task 3 e Task 4.
2. L'unico gestore attivo prova a disattivarsi o a togliersi Collaboratori mentre esiste solo un altro gestore con invito in attesa: deve essere rifiutato (409). Test in Task 3.
3. Un link d'invito usato due volte, o scaduto, o un link di reset dopo che è stato chiesto un link più nuovo: 410, nessuna modifica. Test in Task 4.
4. A una persona con una sessione aperta si tolgono pagine o la si disattiva: la richiesta successiva vede subito i permessi nuovi (403) o nessuna sessione (401). Test in Task 4.
5. Percorsi API con barra finale o non in mappa (`/api/admin/clients/`, `/api/admin/nuova-cosa`): la barra finale non cambia l'esito, quelli non in mappa sono rifiutati. Test in Task 1.

---

### Task 1: Pagine, permessi e validazione condivisi

**Files:**
- Create: `shared/users.ts`
- Create: `shared/admin-access.ts`
- Test: `test/admin-access.test.ts`

**Interfaces:**
- Produces, in `shared/users.ts`:
  - `ADMIN_PAGES = ['prodotti', 'preventivi', 'clienti', 'bandi', 'impostazioni', 'collaboratori'] as const`, `type AdminPage = typeof ADMIN_PAGES[number]`
  - `ADMIN_PAGE_INFO: Record<AdminPage, { label: string, path: string }>` con label `Prodotti, Preventivi, Clienti, Bandi, Impostazioni, Collaboratori` e path `/admin, /admin/preventivi, /admin/clienti, /admin/bandi, /admin/impostazioni, /admin/collaboratori`
  - `emailSchema` (trim, minuscolo, email valida, max 200), `passwordSchema` (string, min 10 con messaggio "Almeno 10 caratteri", max 200)
  - `pagesSchema` (array di `z.enum(ADMIN_PAGES)`, duplicati rimossi, ordinato come `ADMIN_PAGES`)
  - `userCreateSchema = { name: text(120).min(1), email: emailSchema, pages: pagesSchema }` strict
  - `userUpdateSchema = { name: text(120).min(1), pages: pagesSchema, active: z.boolean() }` strict
  - `type UserStatus = 'attivo' | 'invito' | 'disattivato'`
  - `type AdminUser = { id: string, name: string, email: string, pages: AdminPage[] }` (la persona della sessione)
  - `type AdminUserRow = AdminUser & { status: UserStatus, createdAt: string, lastLoginAt: string | null }` (riga della pagina Collaboratori)
- Produces, in `shared/admin-access.ts`:
  - `type ApiAccess = { kind: 'open' } | { kind: 'session' } | { kind: 'pages', anyOf: AdminPage[] } | { kind: 'deny' }`
  - `apiAccess(path: string, method: string): ApiAccess`
  - `pageForPath(routePath: string): AdminPage | 'session' | 'open' | null` (null: non è una pagina admin)
  - `firstAllowedPath(pages: AdminPage[]): string | null`

- [ ] **Step 1: Scrivi i test che falliscono** in `test/admin-access.test.ts`:

```ts
it('API aperte, solo sessione, per pagina', () => {
  for (const p of ['/api/admin/login', '/api/admin/session', '/api/admin/password/forgot', '/api/admin/password/set'])
    expect(apiAccess(p, 'POST').kind).toBe('open')
  expect(apiAccess('/api/admin/logout', 'POST')).toEqual({ kind: 'session' })
  expect(apiAccess('/api/admin/account/password', 'POST')).toEqual({ kind: 'session' })
  expect(apiAccess('/api/admin/products/abc', 'PUT')).toEqual({ kind: 'pages', anyOf: ['prodotti'] })
  expect(apiAccess('/api/admin/assets', 'POST')).toEqual({ kind: 'pages', anyOf: ['prodotti'] })
  expect(apiAccess('/api/admin/quotes/x/send', 'POST')).toEqual({ kind: 'pages', anyOf: ['preventivi'] })
  expect(apiAccess('/api/admin/radar/grants/1/like', 'PUT')).toEqual({ kind: 'pages', anyOf: ['bandi'] })
  expect(apiAccess('/api/admin/settings', 'PUT')).toEqual({ kind: 'pages', anyOf: ['impostazioni'] })
  expect(apiAccess('/api/admin/users/1', 'DELETE')).toEqual({ kind: 'pages', anyOf: ['collaboratori'] })
})
it('i clienti si leggono anche da Preventivi, si modificano solo da Clienti', () => {
  expect(apiAccess('/api/admin/clients', 'GET')).toEqual({ kind: 'pages', anyOf: ['clienti', 'preventivi'] })
  expect(apiAccess('/api/admin/clients/1', 'GET')).toEqual({ kind: 'pages', anyOf: ['clienti', 'preventivi'] })
  expect(apiAccess('/api/admin/clients', 'POST')).toEqual({ kind: 'pages', anyOf: ['clienti'] })
  expect(apiAccess('/api/admin/clients/1', 'DELETE')).toEqual({ kind: 'pages', anyOf: ['clienti'] })
})
it('barra finale indifferente, percorsi sconosciuti rifiutati', () => {
  expect(apiAccess('/api/admin/clients/', 'GET')).toEqual(apiAccess('/api/admin/clients', 'GET'))
  expect(apiAccess('/api/admin/nuova-cosa', 'GET')).toEqual({ kind: 'deny' })
  expect(apiAccess('/api/admin/productsx', 'GET')).toEqual({ kind: 'deny' })
})
it('pagine del pannello', () => {
  expect(pageForPath('/admin')).toBe('prodotti')
  expect(pageForPath('/admin/preventivi/123')).toBe('preventivi')
  expect(pageForPath('/admin/collaboratori')).toBe('collaboratori')
  expect(pageForPath('/admin/account')).toBe('session')
  expect(pageForPath('/admin/password')).toBe('open')
  expect(pageForPath('/')).toBeNull()
})
it('prima pagina accessibile nell\'ordine del menu', () => {
  expect(firstAllowedPath(['bandi', 'clienti'])).toBe('/admin/clienti')
  expect(firstAllowedPath([])).toBeNull()
})
it('validazione', () => {
  expect(userCreateSchema.parse({ name: ' Mario ', email: '  Mario@Didap.IT ', pages: ['bandi', 'prodotti', 'bandi'] }))
    .toEqual({ name: 'Mario', email: 'mario@didap.it', pages: ['prodotti', 'bandi'] })
  expect(passwordSchema.safeParse('123456789').success).toBe(false)
  expect(userCreateSchema.safeParse({ name: 'x', email: 'x@y.it', pages: ['root'] }).success).toBe(false)
})
```

- [ ] **Step 2: Esegui** `npx vitest run test/admin-access.test.ts`. Atteso: FAIL, moduli mancanti.
- [ ] **Step 3: Implementa** `shared/users.ts` e `shared/admin-access.ts`. Corrispondenza per segmenti di percorso (prefisso seguito da `/` o fine stringa), barra finale tolta prima del confronto. `pageForPath` usa `ADMIN_PAGE_INFO` (`/admin` solo esatto), `/admin/account` è `session`, `/admin/password` è `open`.
- [ ] **Step 4: Esegui** il test. Atteso: PASS.
- [ ] **Step 5: Commit** `feat(admin): shared pages, permissions and user validation`

---

### Task 2: Password e token

**Files:**
- Create: `server/utils/passwords.ts`
- Test: `test/passwords.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(password: string): Promise<string>` formato `scrypt$<salt base64url>$<hash base64url>`, sale di 16 byte, chiave di 64 byte
  - `verifyPassword(password: string, stored: string | null): Promise<boolean>` (false con `stored` null o malformato, confronto con `timingSafeEqual`)
  - `newToken(): { token: string, hash: string }` (32 byte casuali in base64url; hash sha256 esadecimale)
  - `hashToken(token: string): string`

- [ ] **Step 1: Test che falliscono:** stessa password due hash diversi; `verifyPassword` vero con la giusta, falso con la sbagliata, con `null` e con `'abc'`; `hashToken(t.token) === t.hash`; due `newToken()` diversi.
- [ ] **Step 2: Esegui** `npx vitest run test/passwords.test.ts`. Atteso: FAIL.
- [ ] **Step 3: Implementa** con `scrypt` promisificato.
- [ ] **Step 4: Esegui.** Atteso: PASS.
- [ ] **Step 5: Commit** `feat(admin): password hashing and one time tokens`

---

### Task 3: Persone su Postgres e regole anti blocco

**Files:**
- Modify: `server/utils/schema.ts` (dopo `admin_sessions`)
- Create: `server/utils/users.ts`
- Modify: `test/helpers/db.ts` (`resetTestDb`)
- Test: `test/users.test.ts`

**Interfaces:**
- Consumes: Task 1 (`AdminPage`, `AdminUser`, `AdminUserRow`, tipi degli schemi), Task 2 (`hashPassword`, `verifyPassword`).
- Schema da aggiungere:

```sql
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
```

- Produces (tutte con `sql: postgres.Sql` come primo argomento, errori con `createError` di h3):
  - `listUsers(sql): Promise<AdminUserRow[]>` ordinate per nome; `status` = `disattivato` se non attiva, altrimenti `invito` se senza password, altrimenti `attivo`
  - `getUser(sql, id): Promise<AdminUserRow>` (404 "Collaboratore non trovato")
  - `createUser(sql, input: UserCreate): Promise<AdminUserRow>` (409 "Email già usata" sul vincolo unico)
  - `updateUser(sql, actorId: string, id: string, input: UserUpdate): Promise<AdminUserRow>`
  - `deleteUser(sql, actorId: string, id: string): Promise<void>`
  - `checkLogin(sql, email: string, password: string): Promise<AdminUser | null>` (null se inesistente, disattivata, senza password o password errata; aggiorna `last_login_at` se valido)
  - `setPassword(sql, id: string, password: string): Promise<void>` (salva l'hash, cancella token e sessioni della persona)

Regole di `updateUser` e `deleteUser`, in transazione con `select pg_advisory_xact_lock(<costante>)` all'inizio:
- 409 "Non puoi toglierti l'accesso a Collaboratori" se `id === actorId` e mancano `collaboratori` o `active`.
- 409 "Non puoi eliminare il tuo account" se `deleteUser` con `id === actorId`.
- Dopo la modifica: se `select count(*) from admin_users where active and password_hash is not null and 'collaboratori' = any(pages)` vale 0, 409 "Deve restare almeno una persona attiva con accesso a Collaboratori" e rollback.
- Disattivare cancella le sessioni della persona.

- [ ] **Step 1: Estendi `resetTestDb`** con `truncate admin_sessions, admin_user_tokens, admin_users cascade`.
- [ ] **Step 2: Test che falliscono** in `test/users.test.ts` (aiuto locale `manager(name)` che crea una persona con `collaboratori` e `setPassword`):
  - crea, elenca per nome, stato `invito` prima della password e `attivo` dopo; email duplicata con maiuscole diverse dà 409
  - `checkLogin(sql, '  Mario@Didap.IT ', pw)` trova la persona creata con `mario@didap.it`; password sbagliata, persona disattivata e persona senza password danno null; `lastLoginAt` valorizzato dopo un login
  - A gestore unico, B invitato con `collaboratori` ma senza password: A che si toglie `collaboratori`, si disattiva o si elimina dà 409; anche con un terzo attore C (gestore disattivato, passato come `actorId`) togliere `collaboratori` ad A dà 409, perché B in attesa non conta
  - con due gestori attivi A e B: A disattiva B ok; poi A toglie `collaboratori` a sé stesso 409
  - disattivare cancella le righe di `admin_sessions` della persona
  - lo schema si applica due volte senza errori
- [ ] **Step 3: Esegui** `npx vitest run test/users.test.ts`. Atteso: FAIL.
- [ ] **Step 4: Implementa** schema e `server/utils/users.ts`.
- [ ] **Step 5: Esegui** di nuovo, più `npx vitest run test/settings-clients.test.ts` per lo schema. Atteso: PASS.
- [ ] **Step 6: Commit** `feat(admin): admin users with lockout rules`

---

### Task 4: Link, sessioni e prima persona

**Files:**
- Modify: `server/utils/users.ts`
- Modify: `server/utils/db.ts` (`connect()`, dopo `DB_SCHEMA`)
- Test: `test/users.test.ts`

**Interfaces:**
- Consumes: Task 2 (`newToken`, `hashToken`), Task 3.
- Produces:
  - `issueToken(sql, userId: string, kind: 'invite' | 'reset'): Promise<string>`: cancella i token precedenti della persona, ne crea uno (7 giorni per invite, 1 ora per reset), restituisce il token in chiaro
  - `requestReset(sql, email: string): Promise<{ user: AdminUser, token: string } | null>` (null se l'email non esiste o la persona è disattivata)
  - `redeemToken(sql, token: string, password: string): Promise<AdminUser>`: in transazione, 410 "Link scaduto o già usato" se assente o scaduto; altrimenti `setPassword` (che cancella anche il token)
  - `createSession(sql, userId: string): Promise<string>` (id casuale come oggi, 7 giorni, cancella le sessioni scadute)
  - `sessionUser(sql, sid: string): Promise<AdminUser | null>` (join con `admin_users`, solo se sessione non scaduta e persona attiva)
  - `deleteSession(sql, sid)`, `deleteOtherSessions(sql, userId, keepSid)`
  - `changeOwnPassword(sql, user: AdminUser, sid: string, current: string, next: string): Promise<void>` (401 "Password attuale errata"; aggiorna l'hash e cancella le altre sessioni, tiene `sid`)
  - `ensureFirstAdmin(sql, env: { ADMIN_EMAIL?: string, ADMIN_PASSWORD?: string, ADMIN_RESET?: string }): Promise<void>`:
    - con `ADMIN_RESET === 'true'` ed email e password presenti: crea o aggiorna la persona di `ADMIN_EMAIL` con tutte le pagine, attiva, password `ADMIN_PASSWORD`, cancella le sue sessioni, `console.warn` che la variabile va tolta
    - altrimenti, se `admin_users` è vuota ed email e password presenti: crea la persona con tutte le pagine e quella password
    - altrimenti non fa nulla
  - In `db.ts`, `connect()` chiama `await ensureFirstAdmin(client, process.env)` dopo lo schema.

- [ ] **Step 1: Test che falliscono:**
  - invito: `issueToken` + `redeemToken` imposta la password (poi `checkLogin` ok); secondo `redeemToken` con lo stesso token 410
  - token scaduto (aggiorna `expires_at` nel passato via SQL) 410 e la password non cambia
  - un secondo `issueToken` invalida il primo (410 sul primo)
  - `requestReset` con email maiuscola e spazi trova la persona; con email inesistente o persona disattivata dà null
  - `sessionUser` restituisce le pagine aggiornate dopo `updateUser`; null dopo disattivazione; null dopo `setPassword`
  - `changeOwnPassword` con password attuale sbagliata 401; con quella giusta tiene la sessione corrente e cancella le altre
  - `ensureFirstAdmin`: tabella vuota crea la persona con tutte e 6 le pagine; seconda chiamata non duplica; con persone già presenti e senza reset non fa nulla; con `ADMIN_RESET: 'true'` riattiva una persona disattivata, le ridà tutte le pagine e la password, e cancella le sue sessioni
- [ ] **Step 2: Esegui.** Atteso: FAIL.
- [ ] **Step 3: Implementa.**
- [ ] **Step 4: Esegui** `npx vitest run`. Atteso: PASS.
- [ ] **Step 5: Commit** `feat(admin): invite and reset links, sessions per person, first admin`

---

### Task 5: Login, middleware ed endpoint dell'account

**Files:**
- Rewrite: `server/utils/admin-session.ts`
- Rewrite: `server/middleware/admin-auth.ts`
- Modify: `server/api/admin/login.post.ts`, `server/api/admin/session.get.ts`, `server/api/admin/logout.post.ts`
- Create: `server/utils/rate-limit.ts`
- Create: `server/emails/account.ts`
- Create: `server/api/admin/password/forgot.post.ts`, `server/api/admin/password/set.post.ts`, `server/api/admin/account/password.post.ts`
- Modify: `.env.example`
- Test: `test/account-email.test.ts`

**Interfaces:**
- Consumes: Task 1 (`apiAccess`, schemi), Task 4.
- Produces:
  - `sessionSecret(): string` (da `SESSION_SECRET`, vuota se manca o sotto 32 caratteri)
  - `startAdminSession(event, userId: string): Promise<void>`, `endAdminSession(event): Promise<void>`
  - `currentUser(event): Promise<AdminUser | null>` (memorizzato in `event.context.adminUser`)
  - `requireUser(event): Promise<AdminUser>` (401 "Accesso non autorizzato")
  - `currentSessionId(event): Promise<string | null>`
  - `rateLimit(bucket: string, event: H3Event, opts: { max: number, windowMs: number }): void` (429 "Troppi tentativi, riprova più tardi"; IP preso come oggi, ultimo valore di `X-Forwarded-For`), con `clearRateLimit(bucket, event)`
  - `accountEmail(kind: 'invite' | 'reset', opts: { name: string, url: string }): { subject: string, html: string, text: string }` con lo stesso guscio di `server/emails/radar-digest.ts`
  - `accountLink(event, token: string): string` = `${NUXT_PUBLIC_SITE_URL || origine}/admin/password?token=${token}`
  - `GET /api/admin/session` restituisce `{ configured: boolean, database: boolean, authenticated: boolean, user: AdminUser | null }` (`configured` = `sessionSecret() !== ''`)

Comportamento:
- Middleware: per i percorsi `/api/admin/*` usa `apiAccess`. `open` passa; `session` richiede `requireUser`; `pages` richiede la persona e almeno una pagina di `anyOf`, altrimenti 403 "Non hai accesso a questa sezione"; `deny` 403.
- `POST /api/admin/login` `{ email, password }`: limite come oggi (8 tentativi in 10 minuti per IP); errore unico 401 "Email o password errati".
- `POST /api/admin/password/forgot` `{ email }`: limite 5 in 10 minuti per IP; se `requestReset` trova la persona e c'è Resend, manda l'email `reset`; risponde sempre `{ ok: true }`.
- `POST /api/admin/password/set` `{ token, password }`: `redeemToken`, poi `startAdminSession`. Limite 10 in 10 minuti per IP.
- `POST /api/admin/account/password` `{ current, next }`: `changeOwnPassword` con la sessione corrente.
- `.env.example`: sostituisci il blocco di `ADMIN_PASSWORD` con `ADMIN_EMAIL`, `ADMIN_PASSWORD` (solo password iniziale), `SESSION_SECRET` (almeno 32 caratteri casuali), `ADMIN_RESET` commentata, con un commento d'uso per ciascuna.

- [ ] **Step 1: Test che falliscono** in `test/account-email.test.ts`: per `invite` e `reset` l'oggetto contiene il nome, `html` e `text` contengono l'URL, `html` scappa i caratteri di `name` (`<b>` non compare tale e quale); il testo del reset dice che il link vale 1 ora, quello dell'invito 7 giorni.
- [ ] **Step 2: Esegui.** Atteso: FAIL.
- [ ] **Step 3: Implementa** tutti i file della task.
- [ ] **Step 4: Esegui** `npx vitest run`, `npm run lint`, `npm run typecheck`. Atteso: tutto verde.
- [ ] **Step 5: Verifica a mano** con `npm run dev` e `.env` con `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`: `curl` a `/api/admin/login` con email in maiuscolo dà 200 e un cookie; con quel cookie `/api/admin/session` riporta `user`; `/api/admin/nuova-cosa` dà 403; senza cookie `/api/admin/clients` dà 401.
- [ ] **Step 6: Commit** `feat(admin): personal login, permission middleware, password links`

---

### Task 6: API dei Collaboratori

**Files:**
- Create: `server/api/admin/users/index.get.ts`, `index.post.ts`, `[id].put.ts`, `[id].delete.ts`, `[id]/invite.post.ts`

**Interfaces:**
- Consumes: Task 3, 4, 5 (`requireUser`, `accountEmail`, `accountLink`, `hasMailer`, `resendMailer`).
- Produces:
  - `GET /api/admin/users` → `AdminUserRow[]`
  - `POST /api/admin/users` `UserCreate` → `{ user: AdminUserRow, inviteUrl: string | null }`: crea, emette un token `invite`; con Resend manda l'email e `inviteUrl` è null, senza Resend restituisce il link
  - `PUT /api/admin/users/:id` `UserUpdate` → `AdminUserRow`, attore = `requireUser(event).id`
  - `DELETE /api/admin/users/:id` → `{ ok: true }`
  - `POST /api/admin/users/:id/invite` → `{ inviteUrl: string | null }`: 409 "Ha già scelto la password" se la persona ha già una password; altrimenti come la creazione
  - `:id` letto con l'helper uuid già usato dagli altri endpoint (`uuidParam`)

- [ ] **Step 1: Implementa** gli endpoint, sottili come `server/api/admin/clients/*`.
- [ ] **Step 2: Verifica** con `npm run typecheck` e `curl` in dev: creazione senza `RESEND_API_KEY` restituisce `inviteUrl`; aprendo quel link e facendo `POST /api/admin/password/set` si entra; un utente senza `collaboratori` riceve 403 su `/api/admin/users`.
- [ ] **Step 3: Commit** `feat(admin): collaborators API`

---

### Task 7: Accesso nel pannello

**Files:**
- Modify: `app/composables/useAdminSession.ts`
- Modify: `app/components/admin/AdminLogin.vue`, `AdminHeader.vue`, `AdminShell.vue`
- Modify: `app/pages/admin/index.vue` (guscio dei Prodotti)
- Create: `app/pages/admin/password.vue`, `app/pages/admin/account.vue`

**Interfaces:**
- Consumes: Task 1 (`ADMIN_PAGES`, `ADMIN_PAGE_INFO`, `pageForPath`, `firstAllowedPath`), Task 5 (forma di `/api/admin/session`).
- Produces:
  - tipo `AdminSession` aggiornato con `user: AdminUser | null`
  - `adminLogin(email: string, password: string)`
  - `useAdminPageAccess(): { state: ComputedRef<'login' | 'allowed' | 'none'> }`: con persona autenticata e pagina non accessibile esegue `navigateTo(firstAllowedPath(pages), { replace: true })`; se `firstAllowedPath` è null, `state` è `none`

Comportamento:
- `AdminLogin.vue`: campi email e password; link "Password dimenticata?" che mostra un campo email e chiama `/api/admin/password/forgot`, poi il messaggio "Se l'email è registrata, ti abbiamo mandato un link". Il testo "non configurato" parla di `SESSION_SECRET`.
- `AdminHeader.vue`: menu da `ADMIN_PAGE_INFO` filtrato con `session.user.pages`; nome della persona che porta a `/admin/account`; "Esci" come oggi.
- `AdminShell.vue` e il guscio di `app/pages/admin/index.vue` usano `useAdminPageAccess`; con `none` mostrano "Non hai ancora accesso a nessuna sezione. Chiedi a chi gestisce i collaboratori." al posto del contenuto. Il caricamento dei prodotti in `index.vue` parte solo se la pagina è accessibile.
- `password.vue`: legge `?token`, chiede password e conferma (devono coincidere, almeno 10 caratteri), chiama `/api/admin/password/set`, poi `refreshAdminSession()` e va su `/admin`. Con 410 mostra "Il link è scaduto o è già stato usato. Chiedine uno nuovo." con il link alla schermata di accesso. Layout `admin`, `defineI18nRoute(false)` come le altre pagine admin.
- `account.vue`: dentro `AdminShell`, mostra nome ed email e un modulo "Cambia password" (attuale, nuova, conferma).

- [ ] **Step 1: Implementa.**
- [ ] **Step 2: Esegui** `npm run lint` e `npm run typecheck`. Atteso: verde.
- [ ] **Step 3: Verifica nel browser** (skill `run`): login con la prima persona; con una seconda persona che ha solo Bandi, il menu mostra solo Bandi e aprire `/admin` porta a `/admin/bandi`; una persona senza pagine vede il messaggio; il cambio password da `/admin/account` funziona; un link `/admin/password?token=` già usato mostra il messaggio di link scaduto.
- [ ] **Step 4: Commit** `feat(admin): login by email, menu and pages by permission`

---

### Task 8: Pagina Collaboratori

**Files:**
- Create: `app/pages/admin/collaboratori.vue`

**Interfaces:**
- Consumes: Task 6 (API), Task 7 (`AdminShell`), Task 1 (`ADMIN_PAGES`, `ADMIN_PAGE_INFO`, `AdminUserRow`).

Comportamento, sul modello di `app/pages/admin/clienti.vue`:
- Elenco con nome, email, pagine (etichette), stato (Attivo, Invito in attesa, Disattivato) e ultimo accesso (`formatDateTime`, "mai" se null).
- "Aggiungi": nome, email, caselle delle 6 pagine. Dopo la creazione: se `inviteUrl` non è null, mostra il link con un bottone "Copia" e la nota che l'email non è partita; altrimenti avviso "Invito inviato".
- Modifica: nome, caselle delle pagine, interruttore attivo (`AdminSwitch`); per gli inviti in attesa, "Rimanda invito".
- "Elimina" con conferma (`AlertDialog` di reka-ui come nelle altre pagine).
- Gli errori 409 del server compaiono come avviso con il loro messaggio (`useAdminToast`).
- Sulla propria riga, la casella Collaboratori, l'interruttore attivo e "Elimina" sono disabilitati, con un title che spiega il perché.

- [ ] **Step 1: Implementa.**
- [ ] **Step 2: Esegui** `npm run lint` e `npm run typecheck`. Atteso: verde.
- [ ] **Step 3: Verifica nel browser:** aggiungi una persona senza Resend e copia il link; aprilo in una finestra privata e scegli la password; dalla prima finestra togli una pagina alla nuova persona e controlla che nella seconda la pagina sparisca al primo cambio di pagina e che le sue API diano 403; prova a toglierti Collaboratori e controlla che sia impedito.
- [ ] **Step 4: Commit** `feat(admin): Collaboratori page`
