# Cartella dei bandi su Cloudinary: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sostituire "Crea cartella su Drive" con una cartella in stile Finder nella scheda File del dettaglio di ogni bando, con i file su Cloudinary e la struttura nel nostro database.

**Architecture:** un piccolo client REST di Cloudinary dietro un'interfaccia `FileStore` (in memoria nei test). Cartelle e file stanno in due tabelle Postgres con funzioni che ricevono `sql` e `store`, come le altre utility. Il riempimento automatico riusa la logica di oggi di `radar-drive.ts`, che sparisce insieme a `drive.ts`. Il pannello parla solo con API nostre: nessun URL Cloudinary arriva al browser.

**Tech Stack:** Nuxt 4, Nitro, Postgres (`postgres`), zod, API REST di Cloudinary con firma SHA-1 (nessuna dipendenza nuova), reka-ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-cartella-bandi-cloudinary-design.md`

## Global Constraints

- Nessun trattino lungo né medio (U+2014, U+2013) in codice, commenti, testi, commit (CLAUDE.md).
- Nessuna nuova dipendenza. Se serve toccare il lockfile, `npx npm@10`.
- Commenti e testi in italiano, nello stile dei file vicini.
- Variabili: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Senza, le API dei file rispondono 503 "Cloudinary non configurato (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)".
- Su Cloudinary: tutti i file `raw`, tipo `authenticated`, public id `didap/bandi/<id bando>/<uuid casuale>`.
- Dimensione massima per file: 10 MB (`10 * 1024 * 1024` byte), sia per i caricamenti sia per i PDF del bando.
- Massimo 10 PDF presi dalla pagina del bando, 4 alla volta (valori di oggi).
- Il browser non riceve mai URL di Cloudinary: vedere e scaricare passa da `GET .../content`.
- Tutte le API nuove stanno sotto `/api/admin/radar/` (permesso `bandi`, già nel middleware). L'autore di un caricamento è `requireUser(event).id`.
- Commit con la riga finale `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Test di integrazione: `describe.skipIf(!TEST_DATABASE_URL)`, `resetTestDb` esteso alle nuove tabelle.

## Review Focus

1. Un file HTML, SVG o JS caricato e poi aperto: non deve mai essere servito inline dal nostro dominio (sarebbe codice eseguito nel pannello). Solo PDF e immagini PNG, JPEG, GIF, WebP vanno inline; tutto il resto come allegato, sempre con `X-Content-Type-Options: nosniff` e `Content-Security-Policy: sandbox`. Test in Task 4.
2. Nomi di file con accenti, virgolette, punto e virgola, barre, nomi lunghissimi o solo spazi: il nome si salva ripulito, le barre e i nomi `.`/`..` sono rifiutati, e l'intestazione di download usa `filename*=UTF-8''...`. Test in Task 2 e Task 4.
3. Spostare una cartella dentro sé stessa o in una sua sottocartella: 400, nessun ciclo. Test in Task 2.
4. Cloudinary che fallisce a metà: un caricamento fallito non lascia righe nel database; un'eliminazione lascia il database pulito anche se Cloudinary non risponde (l'errore va nel log). Test in Task 2.
5. File da 10 MB e un byte: rifiutato con 413 prima di chiamare Cloudinary, e il pannello lo dice prima ancora di inviarlo. Test in Task 2.

---

### Task 1: Client Cloudinary e prova sull'account vero

**Files:**
- Create: `server/utils/file-store.ts`
- Create: `server/utils/cloudinary.ts`
- Create: `test/helpers/memory-store.ts`
- Modify: `.env.example` (blocco Cloudinary al posto di `GOOGLE_SERVICE_ACCOUNT_JSON` e `RADAR_DRIVE_FOLDER_ID`)
- Test: `test/cloudinary.test.ts`

**Interfaces:**
- Produces, in `server/utils/file-store.ts`:
  - `type FileStore = { put(key: string, data: Buffer, filename: string): Promise<void>, get(key: string): Promise<Buffer>, remove(key: string): Promise<void> }`
  - `grantFileKey(grantId: string): string` = `didap/bandi/<grantId>/<randomUUID()>`
  - `useFileStore(): FileStore | null` (Cloudinary se configurato, altrimenti null)
  - `requireFileStore(): FileStore` (503 col messaggio dei Global Constraints)
- Produces, in `server/utils/cloudinary.ts`:
  - `type CloudinaryConfig = { cloudName: string, apiKey: string, apiSecret: string }`
  - `cloudinaryConfig(): CloudinaryConfig | null` (da env, null se manca una delle tre)
  - `cloudinarySignature(params: Record<string, string | number>, apiSecret: string): string`: parametri ordinati per nome, `chiave=valore` uniti da `&`, poi il secret in coda, SHA-1 esadecimale
  - `cloudinaryStore(cfg: CloudinaryConfig, fetchImpl = fetch): FileStore`:
    - `put`: POST multipart a `https://api.cloudinary.com/v1_1/<cloud>/raw/upload` con `file`, `public_id`, `type=authenticated`, `timestamp`, `api_key`, `signature` (firmati: `public_id`, `timestamp`, `type`)
    - `get`: GET `https://api.cloudinary.com/v1_1/<cloud>/raw/download` con `public_id`, `type=authenticated`, `timestamp`, `expires_at` (ora + 60 s), `api_key`, `signature` (firmati: `expires_at`, `public_id`, `timestamp`, `type`); restituisce il corpo come Buffer
    - `remove`: POST a `.../raw/destroy` con `public_id`, `type=authenticated`, `invalidate=true`, `timestamp`, `api_key`, `signature`; "not found" non è un errore
    - risposte non 2xx: `Error('Cloudinary ha risposto <status>: <messaggio>')`
- Produces, in `test/helpers/memory-store.ts`: `memoryStore(opts?: { failPut?: boolean, failRemove?: boolean }): FileStore & { files: Map<string, Buffer> }`

- [ ] **Step 1: Test che falliscono** in `test/cloudinary.test.ts`:
  - firma col vettore della documentazione Cloudinary: `cloudinarySignature({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd')` vale `'bfd09f95f331f558cbd1320e67aa8d488770583e'`
  - `put` con un `fetchImpl` finto: URL `.../v1_1/demo/raw/upload`, campi `public_id`, `type: 'authenticated'`, `api_key`, firma corretta per i tre parametri firmati
  - `get` chiama `.../raw/download` con `expires_at` e restituisce i byte del corpo
  - `remove` con risposta `{ result: 'not found' }` non lancia; una risposta 500 lancia `Cloudinary ha risposto 500`
  - `cloudinaryConfig()` è null se manca una variabile (`vi.stubEnv`)
- [ ] **Step 2: Esegui** `npx vitest run test/cloudinary.test.ts`. Atteso: FAIL.
- [ ] **Step 3: Implementa** i tre file e aggiorna `.env.example`.
- [ ] **Step 4: Esegui.** Atteso: PASS.
- [ ] **Step 5: Prova sull'account vero** con uno script usa e getta nello scratchpad (non nel repo) che legge `.env` e usa `cloudinaryStore`: `put` di un PDF piccolo valido con chiave `didap/bandi/prova/<uuid>`, `get` e confronto dei byte, `remove`. Atteso: byte identici e nessun errore. Se Cloudinary rifiuta il caricamento o il download (per esempio per la consegna dei PDF bloccata), fermati e riporta BLOCKED con la risposta esatta.
- [ ] **Step 6: Commit** `feat(radar): Cloudinary file store`

---

### Task 2: Cartelle e file su Postgres

**Files:**
- Modify: `server/utils/schema.ts` (in fondo alla parte radar)
- Create: `shared/grant-files.ts`
- Create: `server/utils/grant-files.ts`
- Modify: `test/helpers/db.ts`
- Test: `test/grant-files.test.ts`

**Interfaces:**
- Consumes: Task 1 (`FileStore`, `grantFileKey`, `memoryStore`).
- Schema:

```sql
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
```

  (`parent_id`/`folder_id` null = cartella principale del bando; `uploaded_by` null = messo dal radar.)
- Produces, in `shared/grant-files.ts`:
  - `MAX_FILE_BYTES = 10 * 1024 * 1024`
  - `entryNameSchema`: trim, da 1 a 200 caratteri, rifiuta `/`, `\`, caratteri di controllo, `.` e `..` (messaggio "Nome non valido")
  - `type EntryKind = 'folder' | 'file'`
  - `type FolderEntry = { id: string, name: string, createdAt: string, fileCount: number }` (`fileCount`: file contenuti anche nelle sottocartelle)
  - `type FileEntry = { id: string, name: string, mime: string, bytes: number, createdAt: string, uploadedBy: string | null }` (nome della persona, null se dal radar)
  - `type FolderListing = { path: { id: string | null, name: string }[], folders: FolderEntry[], files: FileEntry[] }` (`path` parte dalla cartella principale, nome = titolo del bando)
  - `uniqueName(taken: Set<string>, name: string): string`: `"visura.pdf"` occupato dà `"visura (2).pdf"`, poi `(3)`; senza estensione `"Bozze (2)"`; confronto senza maiuscole
- Produces, in `server/utils/grant-files.ts` (tutte con `sql` per primo; 404 "Cartella non trovata" / "File non trovato" se l'elemento non è di quel bando):
  - `listFolder(sql, grantId: string, folderId: string | null): Promise<FolderListing>` (cartelle e file in ordine di nome)
  - `createFolder(sql, grantId, parentId: string | null, name: string): Promise<FolderEntry>` (nome occupato: `uniqueName`)
  - `addFile(sql, store: FileStore, f: { grantId: string, folderId: string | null, name: string, mime: string, data: Buffer, userId: string | null }): Promise<FileEntry>`: 413 "File oltre 10 MB" sopra `MAX_FILE_BYTES`, senza chiamare lo store; nome occupato: `uniqueName`; prima `store.put`, poi la riga; se la riga fallisce, `store.remove`
  - `renameEntry(sql, grantId, kind: EntryKind, id: string, name: string): Promise<void>` (409 "Esiste già un elemento con questo nome" se occupato da un altro elemento nella stessa cartella)
  - `moveEntry(sql, grantId, kind: EntryKind, id: string, targetFolderId: string | null): Promise<void>` (400 "Non puoi spostare una cartella dentro sé stessa" se la destinazione è la cartella o una sua discendente; 409 come sopra se il nome è occupato nella destinazione)
  - `deleteEntry(sql, store: FileStore, grantId, kind: EntryKind, id: string): Promise<{ files: number }>`: raccoglie le chiavi dei file contenuti (CTE ricorsiva), cancella le righe, poi `store.remove` di ognuna; gli errori dello store vanno nel log e non fanno fallire
  - `readFileEntry(sql, grantId, fileId: string): Promise<{ name: string, mime: string, storeKey: string }>`
  - `folderNames(sql, grantId, folderId: string | null): Promise<Set<string>>` (nomi presenti, per il riempimento)

- [ ] **Step 1: Estendi `resetTestDb`**: `grant_files` e `grant_folders` si svuotano con `radar_grants` (aggiungile al `truncate` del radar).
- [ ] **Step 2: Test che falliscono** in `test/grant-files.test.ts` (unitari per `uniqueName` e `entryNameSchema`; su Postgres per il resto, con un bando creato come in `test/radar-db.test.ts` e una persona da `createUser`):
  - `uniqueName(new Set(['visura.pdf']), 'Visura.pdf')` vale `'Visura (2).pdf'`; con `visura (2).pdf` occupato vale `'Visura (3).pdf'`; `uniqueName(new Set(['bozze']), 'Bozze')` vale `'Bozze (2)'`
  - `entryNameSchema` accetta `'Domanda è "finale"; v2.docx'`, rifiuta `'a/b'`, `'..'`, `'   '`, 201 caratteri
  - crea cartelle annidate, elenca con `path` dalla principale; `fileCount` conta anche le sottocartelle
  - `addFile` di 10 MB + 1 byte: 413 e `memoryStore().files.size === 0`
  - `addFile` con `memoryStore({ failPut: true })`: errore e nessuna riga in `grant_files`
  - due caricamenti con lo stesso nome danno `x.pdf` e `x (2).pdf`; `uploadedBy` è il nome della persona, null per `userId: null`
  - `renameEntry` su un nome occupato: 409; su un nome libero: rinomina, la chiave dello store non cambia
  - `moveEntry` di una cartella dentro una sua sottocartella: 400; di un file in un'altra cartella: ok
  - `deleteEntry` di una cartella con due file in una sottocartella: `{ files: 2 }`, righe sparite, `store.files.size === 0`; con `memoryStore({ failRemove: true })` le righe spariscono lo stesso
  - un id di cartella di un altro bando dà 404
- [ ] **Step 3: Esegui** `npx vitest run test/grant-files.test.ts`. Atteso: FAIL.
- [ ] **Step 4: Implementa.**
- [ ] **Step 5: Esegui** `npx vitest run`. Atteso: PASS.
- [ ] **Step 6: Commit** `feat(radar): folders and files of a grant`

---

### Task 3: Cartella del bando al posto di Drive, e bandi protetti

**Files:**
- Modify: `server/utils/schema.ts` (colonne di `radar_grants`)
- Create: `server/utils/grant-folder.ts`
- Delete: `server/utils/radar-drive.ts`, `server/utils/drive.ts`, `server/api/admin/radar/grants/[id]/drive.post.ts`, `test/radar-drive.test.ts`
- Create: `server/api/admin/radar/grants/[id]/folder.post.ts`
- Modify: `server/utils/radar.ts` (`listGrants`, `readGrantDocument`, ramo di cancellazione nella lettura, `radarWipe`, `radarStatus`), `server/api/admin/radar/wipe.post.ts`, `shared/radar.ts`
- Test: `test/grant-folder.test.ts`, `test/radar-db.test.ts`

**Interfaces:**
- Consumes: Task 1 (`FileStore`, `requireFileStore`), Task 2 (`createFolder`, `addFile`, `folderNames`).
- Schema: in `radar_grants` aggiungi `folder_at timestamptz` (cartella creata, mai azzerata), `folder_claimed_at timestamptz` (riempimento in corso), `folder_filled_at timestamptz`, `folder_note text not null default ''`; togli con `drop column if exists` le quattro colonne `drive_*`.
- Produces:
  - in `shared/radar.ts`: `RadarGrant` perde `driveUrl`, `driveCreating`, `driveNote` e guadagna `hasFolder: boolean`, `folderFilling: boolean`, `folderNote: string`, `closed: boolean`; `RadarStatus.driveConfigured` diventa `filesConfigured`; `DriveStart` diventa `type FolderStart = { status: 'ready' } | { status: 'filling' }`; `DRIVE_CLAIM_MINUTES` diventa `FOLDER_CLAIM_MINUTES` (stesso valore)
  - `listGrants(sql, now, { unnotified, id, withFolders = false })`: con `withFolders` include anche i bandi con `folder_at` chiusi o scaduti (`closed: true`); il riepilogo email non lo passa
  - `readGrantDocument(sql, id, now)` usa `withFolders: true`
  - `startGrantFolder(sql, store: FileStore, id: string, run = (job) => void job()): Promise<FolderStart>`: imposta `folder_at` (se null) e il cuore; se già riempita `{ status: 'ready' }`; altrimenti prende il turno come oggi e in background crea (o riusa) la sottocartella "Dal bando", ci mette `bando-<slug>.md` e i PDF della pagina (salta i nomi già presenti, per la ripresa), salva `folder_filled_at` e la nota
  - nota: `"<n> PDF del bando caricati"` più, se servono, `"<n> non scaricati dal sito"`, `"<n> oltre 10 MB, da scaricare dal sito del bando"`, `"<n> non caricati"`; in errore `"Non riuscita: <messaggio>"`
  - `radarWipe(sql): Promise<{ deleted: number, kept: number }>`: cancella i documenti tranne quelli il cui bando ha `folder_at`; `kept` li conta. `wipe.post.ts` restituisce entrambi
  - nella lettura, il ramo "non è per le imprese" su un bando con `folder_at` non cancella il bando e lascia il documento `read`
  - `POST /api/admin/radar/grants/:id/folder` → `FolderStart` (con `requireFileStore()`)

- [ ] **Step 1: Test che falliscono:**
  - in `test/grant-folder.test.ts`, riprendendo l'impianto di `test/radar-drive.test.ts` (fonte finta, `fetch` finto per la pagina e i PDF, `run` che accoda): crea la cartella con "Dal bando", dentro `bando-voucher-bando-a.md` e `avviso.pdf`; il secondo clic durante il lavoro non apre un altro lavoro; a fine lavoro `hasFolder: true`, `folderFilling: false`, `liked: true`, nota `"1 PDF del bando caricati, 1 non scaricati dal sito"`; un PDF di 10 MB + 1 byte finisce nella nota come `"1 oltre 10 MB, da scaricare dal sito del bando"`; uno store che fallisce sul file `.md` lascia `"Non riuscita: ..."` e il clic dopo riprende senza ricaricare il PDF già presente
  - in `test/radar-db.test.ts`: `radarWipe` con due bandi di cui uno con cartella dà `{ deleted: 1, kept: 1 }` e il bando con cartella resta; un bando con cartella scaduto compare in `listGrants(sql, now, { withFolders: true })` con `closed: true` e non in `listGrants(sql, now)`; una rilettura che lo dichiara "non per le imprese" non lo cancella
  - aggiorna il test esistente di `radarWipe` (ora restituisce un oggetto)
- [ ] **Step 2: Esegui** `npx vitest run test/grant-folder.test.ts test/radar-db.test.ts`. Atteso: FAIL.
- [ ] **Step 3: Implementa** e cancella i file di Drive. `server/api/admin/radar/grants/index.get.ts` passa `withFolders: true`.
- [ ] **Step 4: Esegui** `npx vitest run` e `npm run typecheck`. Atteso: PASS. (Il pannello può dare errori di tipo finché non arriva la Task 6: in quel caso sistemali qui solo quanto basta a compilare, rinominando i campi usati da `RadarGrantDetail.vue` e `bandi/index.vue`.)
- [ ] **Step 5: Commit** `feat(radar): grant folder on Cloudinary replaces Drive`

---

### Task 4: API della cartella

**Files:**
- Create in `server/api/admin/radar/grants/[id]/files/`: `index.get.ts`, `folders.post.ts`, `upload.post.ts`, `[kind]/[entryId].patch.ts`, `[kind]/[entryId].delete.ts`, `[fileId]/content.get.ts`
- Create: `server/utils/file-response.ts`
- Test: `test/file-response.test.ts`

**Interfaces:**
- Consumes: Task 1 (`requireFileStore`), Task 2 (tutte le funzioni e gli schemi), `requireUser`, `uuidParam`, `readSchemaBody`.
- Produces:
  - `GET files?folder=<uuid>` (senza `folder`: la principale) → `FolderListing`
  - `POST files/folders` `{ parentId: string | null, name }` → `FolderEntry`
  - `POST files/upload?folder=<uuid>` multipart, uno o più campi `file` → `FileEntry[]`; un file vuoto o oltre il limite dà 413 prima di caricare gli altri
  - `PATCH files/:kind/:entryId` `{ name }` oppure `{ folderId: string | null }` → `{ ok: true }` (`kind` diverso da `folder`/`file`: 404)
  - `DELETE files/:kind/:entryId` → `{ files: number }`
  - `GET files/:fileId/content?download=1` → i byte del file
  - in `server/utils/file-response.ts`: `inlineAllowed(mime: string): boolean` (vero solo per `application/pdf`, `image/png`, `image/jpeg`, `image/gif`, `image/webp`) e `fileHeaders(name: string, mime: string, download: boolean): Record<string, string>` con `Content-Type` (il mime se inline, altrimenti `application/octet-stream`), `Content-Disposition` (`inline` solo se `!download && inlineAllowed`, altrimenti `attachment`; sempre `filename="<ascii ripulito>"; filename*=UTF-8''<percent-encoded>`), `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`
  - il mime di un caricamento arriva dal campo multipart; se manca, `application/octet-stream`

- [ ] **Step 1: Test che falliscono** in `test/file-response.test.ts`: `fileHeaders('Bando è "ok".pdf', 'application/pdf', false)` è inline con `filename*=UTF-8''Bando%20%C3%A8%20%22ok%22.pdf` e `filename` senza virgolette né caratteri non ASCII; `fileHeaders('x.svg', 'image/svg+xml', false)` e `fileHeaders('x.html', 'text/html', false)` sono `attachment` con `Content-Type: application/octet-stream`; con `download: true` anche il PDF è `attachment`; tutti hanno `nosniff` e `sandbox`.
- [ ] **Step 2: Esegui.** Atteso: FAIL.
- [ ] **Step 3: Implementa** helper ed endpoint, sottili come quelli di `server/api/admin/clients/*`.
- [ ] **Step 4: Esegui** `npx vitest run` e `npm run typecheck`; poi verifica con `npm run dev` (account di prova creato in locale, `.env` locale con Cloudinary): creazione cartella del bando, elenco, nuova cartella, caricamento di un PDF piccolo, rinomina, spostamento, download, eliminazione; un file HTML caricato torna come allegato. Cancella dal pannello quello che hai caricato.
- [ ] **Step 5: Commit** `feat(radar): folder API`

---

### Task 5: Pagina Bandi senza Drive

**Files:**
- Modify: `app/pages/admin/bandi/index.vue`, `app/components/admin/RadarGrantDetail.vue`

**Interfaces:**
- Consumes: Task 3 (`RadarGrant` con `hasFolder`, `folderFilling`, `folderNote`, `closed`; `RadarStatus.filesConfigured`; `FolderStart`; risposta di wipe `{ deleted, kept }`).
- Produces: `RadarGrantDetail.vue` con due schede "Dettaglio" e "File"; la scheda File mostra il componente `RadarGrantFiles` (Task 6) con prop `grant: EvaluatedGrant` e `configured: boolean`, ed emette `folder: [id: string, start: FolderStart]` verso la pagina come oggi `drive`.

Comportamento:
- Spariscono "Crea cartella su Drive", "Apri cartella Drive" e la nota Drive dal dettaglio.
- Nella pagina, il polling di oggi (`busyRadar` su `driveCreating`) usa `folderFilling`.
- I bandi con `hasFolder` non vengono nascosti da `isInScope`. I bandi `closed` compaiono solo nella scheda "Interessanti" e hanno un'etichetta "Chiuso" accanto alla scadenza, nell'elenco e nel dettaglio.
- "Svuota i dati" mostra quanti bandi ha cancellato e, se `kept > 0`, "<n> bandi con cartella tenuti".
- Le schede del dettaglio si scelgono con pulsanti nello stile dei toggle già usati nella pagina; quella scelta resta mentre si passa da un bando all'altro.

- [ ] **Step 1: Implementa.** Finché la Task 6 non c'è, la scheda File mostra un segnaposto con il bottone "Crea cartella del bando" (chiama `POST .../folder` ed emette `folder`).
- [ ] **Step 2: Esegui** `npm run lint` e `npm run typecheck`. Atteso: verde.
- [ ] **Step 3: Commit** `feat(radar): Bandi page without Drive, detail tabs`

---

### Task 6: La scheda File in stile Finder

**Files:**
- Create: `app/components/admin/RadarGrantFiles.vue`
- Create (se serve tenerli piccoli): `app/components/admin/FileIcon.vue`, `app/composables/useGrantFiles.ts`

**Interfaces:**
- Consumes: Task 4 (API), Task 5 (prop ed evento), `shared/grant-files.ts` (`MAX_FILE_BYTES`, `entryNameSchema`, tipi).

Comportamento (colonna stretta: elenco a una colonna):
- Senza cartella: testo breve e bottone "Crea cartella del bando"; con `folderFilling` uno stato "Preparo la cartella..." e poi l'elenco. Senza Cloudinary configurato: messaggio "Cloudinary non configurato" e niente bottoni.
- Barra in alto: percorso cliccabile (titolo del bando / sottocartelle), bottoni "Nuova cartella" e "Carica" (input file multiplo).
- Righe: icona per tipo (cartella, PDF, immagine, documento, foglio di calcolo, altro), nome, dimensione leggibile, data, chi l'ha caricato ("radar" se null). Le cartelle mostrano il numero di file. Doppio clic o Invio su una cartella ci entra; su un file lo apre.
- Trascinare file dal computer sulla scheda li carica nella cartella aperta, con un riquadro evidenziato durante il trascinamento. Trascinare una riga su una cartella (o su un elemento del percorso) la sposta.
- Menu su ogni riga (DropdownMenu di reka-ui): Apri, Scarica, Rinomina, Sposta in... (elenco delle cartelle del bando), Elimina.
- Rinomina: campo nella riga, Invio salva, Esc annulla, errori del server come avviso.
- Elimina: conferma con AlertDialog; per una cartella dice "Elimina la cartella e i suoi <n> file?".
- Apri: PDF in un iframe e immagini in un img, dentro una finestra sopra il pannello, dall'API `content`; gli altri file si scaricano.
- File oltre 10 MB: avviso "<nome> supera i 10 MB" senza inviarlo; gli altri dello stesso gruppo partono.
- Durante i caricamenti, una riga per file con lo stato; alla fine l'elenco si ricarica.
- La nota del riempimento (`folderNote`) si vede sotto la barra finché la cartella "Dal bando" esiste.

- [ ] **Step 1: Implementa**, sostituendo il segnaposto della Task 5.
- [ ] **Step 2: Esegui** `npm run lint` e `npm run typecheck`. Atteso: verde.
- [ ] **Step 3: Verifica con `npm run dev`** tutto quello che si può via HTTP e scrivi nel report cosa resta per il giro nel browser del controller (trascinamenti, menu, anteprima, rinomina in riga).
- [ ] **Step 4: Commit** `feat(radar): Finder style folder in the grant detail`
