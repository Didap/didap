# Preventivi: design

Data: 2026-10-15
Stato: approvata

## Obiettivo

Permettere a Didap di creare in `/admin` preventivi strutturati per fasi,
emetterli con numerazione progressiva e revisioni numerate, e consegnarli
al cliente con un link pubblico privato da cui scaricare il PDF.

Successo significa: un preventivo si compila, si emette, il cliente apre
il link e scarica un PDF con il brand Didap; ogni modifica successiva
all'invio produce una nuova revisione senza alterare quelle già emesse.

## Fuori scope

- Self-service del cliente, accettazione o firma online
- Invio email dal sistema
- Fatturazione, statistiche
- Preventivi in lingue diverse dall'italiano

## Decisioni

| Tema | Scelta |
|---|---|
| Chi crea il preventivo | Solo admin interno, in `/admin` |
| Consegna | Link pubblico `/p/:token` + PDF scaricabile |
| Struttura | Fasi con voci; ogni voce a giorni × tariffa oppure a corpo |
| Contenuti | Imponibile, sconto, IVA, totale; numerazione; pagamento e scadenza; testi liberi |
| Clienti | Anagrafica in `/admin` |
| Lingua | Solo italiano |
| Revisioni | Numerate; le emesse sono immutabili |
| Stato | Manuale (Inviato, Accettato, Rifiutato) + Scaduto calcolato |
| PDF | Generato via codice con pdfmake (approccio C) |

## Dati

Le tabelle si aggiungono a `SCHEMA` in `server/utils/db.ts`, che le crea
all'avvio come già fa per prodotti e asset.

### `settings`

Una riga sola (`id = 1`), colonna `data jsonb`:

- `company`: ragione sociale, P.IVA, codice fiscale, indirizzo, email,
  telefono, IBAN
- `defaults`: tariffa giornaliera (centesimi), aliquota IVA (default 22),
  giorni di validità (default 30), condizioni di pagamento, esclusioni,
  note

Un nuovo preventivo copia i default nella propria bozza; cambiare le
impostazioni non tocca i preventivi esistenti.

### `clients`

`id uuid`, `name` (ragione sociale, obbligatorio), `vat_number`,
`tax_code`, `address`, `sdi_pec`, `contact_name`, `email`, `phone`,
`notes`, `created_at`, `updated_at`. Un cliente con preventivi non si
può eliminare.

### `quotes`

- `id uuid`
- `client_id uuid` (nullable in bozza, references `clients`)
- `title text`
- `status text`: `draft`, `sent`, `accepted`, `rejected`
- `year int`, `seq int`: null finché il preventivo non viene emesso;
  `unique (year, seq)`
- `token text unique`: null finché non viene emesso
- `draft jsonb`: contenuto modificabile (vedi sotto)
- `issued_draft jsonb`: bozza (titolo, cliente, contenuto) com'era
  all'ultima emissione; serve a mostrare "modifiche non emesse"
- `current_rev int`: 0 se mai emesso
- `created_at`, `updated_at`

Il numero visualizzato è `${year}-${seq a 3 cifre}`, per esempio
`2026-014`.

### `quote_counters`

`year int primary key`, `last_seq int`. Serve a prendere il progressivo
con `select ... for update` dentro la transazione di emissione.

### `quote_revisions`

`quote_id uuid`, `rev int`, `snapshot jsonb`, `pdf bytea`,
`issued_at timestamptz`; primary key `(quote_id, rev)`. Le righe non si
aggiornano mai.

Lo `snapshot` contiene tutto ciò che serve a ridisegnare il preventivo
senza altre tabelle: numero, revisione, data di emissione, contenuto
della bozza, dati del cliente, dati Didap, totali calcolati.

## Contenuto del preventivo

Definito in `shared/quote.ts` con zod, condiviso da editor, API, pagina
pubblica e PDF.

```ts
type QuoteContent = {
  intro: string            // premessa / obiettivi
  phases: Phase[]
  dayRate: number          // centesimi, default della bozza
  discount: { kind: 'none' } | { kind: 'percent', value: number }
          | { kind: 'amount', value: number /* centesimi */ }
  vatRate: number          // percentuale, 0 ammesso
  validUntil: string       // data ISO (YYYY-MM-DD)
  timeline: string         // tempi di consegna
  paymentTerms: string
  exclusions: string
  notes: string
}

type Phase = { id: string, title: string, description: string, items: Item[] }

type Item =
  | { id: string, kind: 'days', description: string, days: number, rate: number }
  | { id: string, kind: 'fixed', description: string, amount: number }
```

- Importi in centesimi interi.
- `days` ammette multipli di 0,5, maggiori di 0.
- Sconto percentuale tra 0 e 100; aliquota IVA tra 0 e 100.
- `rate` parte da `dayRate` ma è modificabile per voce.

### Calcolo dei totali

Funzione pura `computeTotals(content)` in `shared/quote.ts`:

1. Importo voce: `days` → `Math.round(days * rate)`; `fixed` → `amount`
2. Subtotale fase: somma delle voci
3. Imponibile: somma delle fasi
4. Sconto: percentuale → `Math.round(imponibile * value / 100)`; fisso →
   `min(value, imponibile)`
5. Imponibile scontato: imponibile meno sconto
6. IVA: `Math.round(scontato * vatRate / 100)`
7. Totale: scontato più IVA

La stessa funzione alimenta editor, pagina pubblica, PDF e snapshot.

## Ciclo di vita

1. **Crea**: nuova bozza, `status = draft`, nessun numero, nessun token.
2. **Emetti** (`POST /api/admin/quotes/:id/issue`), in una transazione:
   1. valida che ci siano cliente, almeno una fase con almeno una voce,
      scadenza
   2. se è la prima emissione: blocca la riga di `quote_counters`
      dell'anno corrente (fuso Europe/Rome), incrementa, assegna `year`/`seq`, genera il
      token (32 byte casuali, base64url)
   3. costruisce lo snapshot e genera il PDF
   4. inserisce la revisione `current_rev + 1`, aggiorna `current_rev`;
      se `status = draft` diventa `sent`
   Se un passo fallisce, rollback completo: nessun numero consumato,
   nessuna revisione parziale.
3. **Modifica dopo l'emissione**: si modifica la bozza; l'editor mostra
   "modifiche non emesse" quando la bozza differisce dall'ultima
   revisione. Una nuova emissione crea la revisione successiva; il link
   mostra sempre l'ultima.
4. **Stato**: `sent`, `accepted`, `rejected` impostati a mano. "Scaduto"
   è calcolato (scadenza passata e stato `sent`), non
   salvato.
5. **Duplica**: nuova bozza con lo stesso cliente e contenuto, senza
   numero, token né revisioni, scadenza ricalcolata dai default.
6. **Elimina**: solo preventivi mai emessi.

## API

Tutte sotto `/api/admin/`, protette dal middleware esistente; input
validato con zod; errori 422 con i dettagli come per i prodotti.

| Metodo | Percorso | Funzione |
|---|---|---|
| GET, PUT | `settings` | Leggi / salva impostazioni |
| GET, POST | `clients` | Lista / crea cliente |
| GET, PUT, DELETE | `clients/:id` | Leggi / modifica / elimina (409 se ha preventivi) |
| GET, POST | `quotes` | Lista (filtro stato, ricerca) / crea bozza |
| GET, PUT, DELETE | `quotes/:id` | Leggi / salva bozza / elimina (409 se emesso) |
| POST | `quotes/:id/issue` | Emetti nuova revisione |
| POST | `quotes/:id/duplicate` | Duplica |
| PUT | `quotes/:id/status` | Cambia stato |
| GET | `quotes/:id/revisions/:rev` | PDF di una revisione |
| GET | `quotes/:id/preview` | PDF della bozza al volo, non salvato |

Pubbliche:

| Metodo | Percorso | Funzione |
|---|---|---|
| GET | `/api/quotes/:token` | Snapshot dell'ultima revisione e flag `expired` |
| GET | `/p/:token/pdf` | PDF dell'ultima revisione |

Token sconosciuto: 404 generico. Risposte pubbliche con
`X-Robots-Tag: noindex` e `Cache-Control: private, no-store`.

## Admin UI

- Il layout `app/layouts/admin.vue` riceve una barra di navigazione:
  Prodotti (`/admin`), Preventivi, Clienti, Impostazioni.
- `/admin/preventivi`: tabella con numero, cliente, titolo, totale,
  stato (pill), data; filtri per stato; pulsante "Nuovo preventivo".
- `/admin/preventivi/:id`: editor.
  - Colonna sinistra: cliente (select dall'anagrafica), titolo, premessa,
    fasi (aggiungi, riordina, elimina; voci con scelta giorni o a corpo),
    tariffa giornaliera, sconto, IVA, scadenza, tempi, pagamento,
    esclusioni, note.
  - Colonna destra, sticky: totali, stato, azioni (Anteprima PDF,
    Emetti, Copia link, Duplica), elenco revisioni con download PDF.
  - Salvataggio automatico con debounce, come l'editor prodotti.
  - "Emetti" disabilitato con elenco di cosa manca se la bozza non è
    valida per l'emissione.
- `/admin/clienti`: lista e modulo cliente.
- `/admin/impostazioni`: dati Didap e default.
- Riuso di `AdminField`, `AdminSection`, `StatusPill`.

## Pagina pubblica

- `app/pages/p/[token].vue`, con `defineI18nRoute(false)`, layout
  dedicato senza nav e footer, `noindex`.
- Mostra l'ultima revisione dallo snapshot: intestazione, cliente,
  premessa, fasi con voci, riepilogo, testi finali.
- Pulsante "Scarica PDF" verso `/p/:token/pdf`.
- Se scaduto: etichetta "Offerta scaduta il ...", contenuto comunque
  visibile.

## PDF

- Libreria: `pdfmake`, lato server, in `server/utils/quote-pdf.ts`.
  Funzione `renderQuotePdf(snapshot): Promise<Buffer>`.
- A4, margini 40pt.
- Struttura:
  1. Intestazione: logo da `public/logo_esteso.svg` (vettoriale) e dati
     Didap; sotto "Preventivo n. 2026-014 · rev. 2", data di emissione,
     scadenza
  2. Destinatario: dati cliente; titolo progetto; premessa
  3. Per ogni fase: titolo, descrizione, tabella Descrizione / Giorni /
     Tariffa / Importo (giorni e tariffa vuoti per le voci a corpo),
     subtotale; intestazione tabella ripetuta a cambio pagina
  4. Riepilogo: imponibile, sconto, imponibile scontato, IVA, totale in
     evidenza
  5. Tempi, condizioni di pagamento, esclusioni, note, IBAN
  6. Piè di pagina: numero preventivo, "pagina X di Y"
- Colori dai token del brand in `app/assets/css/main.css`.
- Importi formattati `it-IT` in euro.

### Font

- Obviously per titoli e testo, JetBrains Mono per numeri e importi.
- I file vanno in `server/assets/fonts/`. Il loader cerca i file
  `obviously-regular`, `obviously-bold`, `obviously-wide-bold` in
  `.otf`, `.ttf` o `.woff`; Didap si occupa di fornire i file.
  `.woff2` non è supportato: la libreria dei font usata da pdfmake
  (fontkit) fallisce nel sottoinsieme dei glifi (verificato).
- Se Obviously manca, si usa un font di ripiego incluso nel progetto
  (Inter in `.woff`, licenza OFL) e il server lo segnala una volta nel
  log.
- I font si leggono dagli asset del server (`useStorage('assets:server')`),
  così finiscono nella build e nell'immagine Docker.
- JetBrains Mono (OFL) è incluso nel progetto.

## Errori

- Emissione transazionale come descritto nel ciclo di vita.
- Numerazione: lock di riga su `quote_counters` per evitare doppioni con
  emissioni concorrenti; `unique (year, seq)` come seconda difesa.
- Database non configurato: 503 come oggi.
- PDF che fallisce in emissione: 500 con messaggio, nessuna modifica nel
  database.

## Test

- Aggiunta di Vitest al progetto (`npm test`).
- Unitari:
  - `computeTotals`: arrotondamenti, mezzi giorni, sconto percentuale e
    fisso, sconto maggiore dell'imponibile, IVA 0
  - schema zod del contenuto: casi validi e non validi
  - `renderQuotePdf`: genera un buffer che inizia con `%PDF`, con un
    numero di pagine plausibile per uno snapshot di esempio lungo
- Integrazione sul Postgres locale (database `didap_test`, URL da
  `TEST_DATABASE_URL`):
  - prima emissione assegna numero e token, seconda crea rev. 2 con lo
    stesso numero
  - numerazione che riparte per anno
  - rollback se la generazione del PDF fallisce
  - due emissioni in parallelo producono numeri diversi
- Verifica manuale nel browser: crea, emetti, apri link, scarica PDF.

## Nuove dipendenze

- `pdfmake` (runtime)
- `vitest` (dev)
- File font: Inter e JetBrains Mono in `server/assets/fonts/`
