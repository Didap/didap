# Preventivi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preventivi in `/admin` strutturati per fasi, emessi con numerazione progressiva e revisioni immutabili, consegnati al cliente con un link privato `/p/:token` e un PDF generato via codice.

**Architecture:** Il dominio puro (schemi zod, calcolo dei totali, date, importi) vive in `shared/` ed è usato da editor, API, pagina pubblica e PDF. I servizi in `server/utils/` ricevono il client Postgres come parametro (testabili senza Nitro); gli handler in `server/api/` sono sottili. Il PDF si costruisce con pdfmake a partire dallo snapshot della revisione e si salva nel database al momento dell'emissione.

**Tech Stack:** Nuxt 4, Nitro, Postgres (postgres.js), zod 3, pdfmake 0.3, Vitest 5, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-15-preventivi-design.md`

## Global Constraints

- Mai trattini lunghi (U+2014) o medi (U+2013) in nessun testo: codice, commenti, copy, commit. Al massimo `-`.
- Commenti nel codice in italiano, brevi, nello stile dei file esistenti; niente punto e virgola a fine riga (stile del repo).
- Importi sempre in centesimi interi; giorni a multipli di 0,5.
- Date di calendario `YYYY-MM-DD` nel fuso `Europe/Rome`; l'anno del numero è quello di Roma al momento dell'emissione.
- Numero preventivo: `${anno}-${progressivo a 3 cifre}`, per esempio `2026-014`.
- Revisioni emesse immutabili: nessun `update` su `quote_revisions`.
- Token pubblico: 32 byte casuali in base64url (43 caratteri).
- Font PDF: Obviously se in `server/assets/fonts/` (`.otf`, `.ttf`, `.woff`; `.woff2` non funziona con fontkit), altrimenti Inter `.woff` incluso.
- Solo italiano: nessuna rotta i18n per admin e pagina pubblica (`defineI18nRoute(false)`).
- Node 22 in produzione (Dockerfile), Node 26 in locale: niente API più nuove di Node 22.
- Postgres locale: container `didap-postgres` su `localhost:5435`; test su database `didap_test`.

## Review Focus

1. Preventivi lunghi (molte fasi e voci, descrizioni lunghe): il PDF va su più pagine, con intestazione della tabella ripetuta e "Pagina X di Y". Test in Task 4.
2. Fasi vuote o senza titolo: non compaiono nel documento emesso; quelle senza titolo diventano "Fase N". Test in Task 2 (`buildSnapshot`).
3. Cliente o impostazioni modificati dopo l'emissione: la revisione emessa (pagina pubblica e PDF) non cambia. Test in Task 5.
4. Scadenza al confine del giorno: il giorno di scadenza il preventivo è ancora valido, il giorno dopo è "Scaduto"; un'emissione alle 23:30 UTC del 31 dicembre prende l'anno successivo. Test in Task 1 e Task 5.
5. Caratteri fuori dal font (emoji, lettere dell'Europa dell'est, virgolette tipografiche): il PDF si genera comunque, senza errori. Test in Task 4.

---

## File Structure

**Shared (dominio puro, usato da client e server)**
- `shared/text.ts`: helper zod per stringhe con limite.
- `shared/money.ts`: formattazione e parsing di importi, giorni, percentuali.
- `shared/dates.ts`: date nel fuso di Roma.
- `shared/settings.ts`: schema e default delle impostazioni.
- `shared/clients.ts`: schema cliente.
- `shared/quote.ts`: schemi della bozza, totali, stati, controlli di emissione, snapshot.

**Server**
- `server/utils/schema.ts`: SQL dello schema (esistente + nuove tabelle).
- `server/utils/db.ts`: usa `DB_SCHEMA` (modifica).
- `server/utils/http.ts`: `uuidParam`, `readSchemaBody`, `sendPdf`.
- `server/utils/settings.ts`, `server/utils/clients.ts`: servizi.
- `server/utils/quotes.ts`: bozze, elenco, duplicazione, stato, anteprima.
- `server/utils/quote-issue.ts`: emissione transazionale.
- `server/utils/quote-public.ts`: letture per il link pubblico e PDF.
- `server/utils/quote-pdf.ts`: documento pdfmake e render.
- `server/utils/pdf-assets.ts`: font e logo dagli asset del server.
- `server/assets/fonts/fallback/*`, `server/assets/fonts/README.md`, `server/assets/pdf/logo.svg`.
- `server/api/admin/settings.*.ts`, `server/api/admin/clients/*`, `server/api/admin/quotes/*`.
- `server/api/quotes/[token].get.ts`, `server/routes/p/[token]/pdf.get.ts`.

**App**
- `app/composables/useAdminSession.ts`, `app/composables/useAdminToast.ts`, `app/utils/adminErrors.ts`.
- `app/components/admin/AdminHeader.vue`, `AdminLogin.vue`, `AdminShell.vue`, `NumberInput.vue`, `QuoteStatusPill.vue`, `QuotePhaseEditor.vue`.
- `app/pages/admin/index.vue` (modifica: header, login, guardie di navigazione).
- `app/pages/admin/impostazioni.vue`, `clienti.vue`, `preventivi/index.vue`, `preventivi/[id].vue`.
- `app/layouts/quote.vue`, `app/pages/p/[token].vue`.

**Test**
- `vitest.config.ts`, `test/helpers/db.ts`, `test/helpers/fixtures.ts`.
- `test/money.test.ts`, `test/dates.test.ts`, `test/quote.test.ts`, `test/settings-clients.test.ts`, `test/quote-pdf.test.ts`, `test/quotes.test.ts`.

---

### Task 1: Vitest, importi e date

**Files:**
- Modify: `package.json` (script `test`, devDependency `vitest`)
- Create: `vitest.config.ts`, `shared/money.ts`, `shared/dates.ts`
- Test: `test/money.test.ts`, `test/dates.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces:
  - `shared/money.ts`: `MAX_CENTS: number`, `formatEuro(cents: number): string`, `formatEuroPlain(cents: number): string`, `formatDecimal(n: number): string`, `parseEuroInput(input: string): number | null`, `parseDaysInput(input: string): number | null`, `parsePercentInput(input: string): number | null`
  - `shared/dates.ts`: `ISO_DATE: RegExp`, `romeDate(now: Date): string`, `romeYear(now: Date): number`, `addDays(isoDate: string, days: number): string`, `formatDate(isoDate: string): string`
  - Comando `npm test`.

- [ ] **Step 1: Committare le dipendenze aggiornate durante l'installazione**

`package.json` e `package-lock.json` hanno già `better-sqlite3@^13.0.3`, `@nuxt/content@^3.16.2` e `allowScripts` (servono per Node 26).

```bash
git add package.json package-lock.json
git commit -m "chore(deps): better-sqlite3 13 and @nuxt/content 3.16 for Node 26

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Installare Vitest e aggiungere lo script**

```bash
npm install -D vitest@^5.0.4 --no-audit --no-fund
npm install-scripts ls
```

Se `install-scripts ls` elenca pacchetti nuovi, approvali con `npm install-scripts approve <nome>` solo se sono `esbuild` o simili già noti; altrimenti chiedi.

In `package.json`, dentro `"scripts"`, aggiungi dopo `"lint:fix"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Creare `vitest.config.ts`**

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Test unitari (shared, PDF) e di integrazione (servizi su Postgres).
// I test di integrazione usano TEST_DATABASE_URL, letta anche da .env.
try {
  process.loadEnvFile('.env')
}
catch {}

export default defineConfig({
  resolve: {
    alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Un solo database di test: i file non girano in parallelo
    fileParallelism: false,
  },
})
```

- [ ] **Step 4: Scrivere i test di `shared/money.ts`**

`test/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  formatDecimal,
  formatEuro,
  formatEuroPlain,
  parseDaysInput,
  parseEuroInput,
  parsePercentInput,
} from '#shared/money'

// Intl usa uno spazio non separabile prima di €
const plain = (s: string) => s.replace(/\s/g, ' ')

describe('formattazione', () => {
  it('formatta euro all\'italiana con le migliaia', () => {
    expect(plain(formatEuro(123450))).toBe('1.234,50 €')
    expect(plain(formatEuro(5))).toBe('0,05 €')
    expect(plain(formatEuro(-5000))).toBe('-50,00 €')
    expect(formatEuroPlain(123450)).toBe('1.234,50')
  })

  it('formatta decimali senza zeri inutili', () => {
    expect(formatDecimal(1.5)).toBe('1,5')
    expect(formatDecimal(22)).toBe('22')
    expect(formatDecimal(1000)).toBe('1.000')
  })
})

describe('parseEuroInput', () => {
  it.each([
    ['1.234,50', 123450],
    ['1234,5', 123450],
    ['1234.50', 123450],
    ['1.234', 123400],
    ['1.5', 150],
    ['12,', 1200],
    ['€ 40', 4000],
    ['0', 0],
  ])('%s -> %d centesimi', (input, cents) => {
    expect(parseEuroInput(input)).toBe(cents)
  })

  it.each(['', 'abc', '-5', '1,2,3', '12.345,6.7', '1,234'])('rifiuta %s', (input) => {
    expect(parseEuroInput(input)).toBeNull()
  })

  it('rifiuta importi oltre il massimo', () => {
    expect(parseEuroInput('100.000.001')).toBeNull()
  })
})

describe('parseDaysInput e parsePercentInput', () => {
  it('accetta giorni a multipli di mezza giornata', () => {
    expect(parseDaysInput('1,5')).toBe(1.5)
    expect(parseDaysInput('3')).toBe(3)
    expect(parseDaysInput('0,5')).toBe(0.5)
  })

  it.each(['0', '0,3', '-1', '1001', 'x', ''])('rifiuta %s giorni', (input) => {
    expect(parseDaysInput(input)).toBeNull()
  })

  it('accetta percentuali tra 0 e 100', () => {
    expect(parsePercentInput('22')).toBe(22)
    expect(parsePercentInput('12,5')).toBe(12.5)
    expect(parsePercentInput('0')).toBe(0)
    expect(parsePercentInput('100,1')).toBeNull()
    expect(parsePercentInput('-3')).toBeNull()
  })
})
```

Nota: `'1,234'` è rifiutato perché ha tre decimali dopo la virgola.

- [ ] **Step 5: Scrivere i test di `shared/dates.ts`**

`test/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { addDays, formatDate, romeDate, romeYear } from '#shared/dates'

describe('date nel fuso di Roma', () => {
  it('usa il giorno di Roma, non quello UTC', () => {
    const lateNight = new Date('2026-12-31T23:30:00Z')
    expect(romeDate(lateNight)).toBe('2027-01-01')
    expect(romeYear(lateNight)).toBe(2027)
    expect(romeDate(new Date('2026-10-15T10:00:00Z'))).toBe('2026-10-15')
  })

  it('aggiunge giorni anche attraverso il cambio dell\'ora', () => {
    expect(addDays('2026-10-15', 30)).toBe('2026-11-14')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('formatta gg/mm/aaaa', () => {
    expect(formatDate('2026-03-09')).toBe('09/03/2026')
  })
})
```

- [ ] **Step 6: Eseguire i test e verificare che falliscano**

Run: `npm test`
Expected: FAIL, `Failed to resolve import "#shared/money"` e `"#shared/dates"`.

- [ ] **Step 7: Implementare `shared/money.ts`**

```ts
// Importi in centesimi interi e numeri scritti all'italiana
// (virgola per i decimali, punto per le migliaia).

export const MAX_CENTS = 10_000_000_000 // 100 milioni di euro

const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})
const plain = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})
const decimal = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

// 123450 -> "1.234,50 €"
export const formatEuro = (cents: number) => euro.format(cents / 100)
// 123450 -> "1.234,50" (campi di input)
export const formatEuroPlain = (cents: number) => plain.format(cents / 100)
// 1.5 -> "1,5"
export const formatDecimal = (n: number) => decimal.format(n)

const clean = (input: string) => input.replace(/[\s €]/g, '')

const WITH_COMMA = /^(\d{1,3}(\.\d{3})+|\d+),\d{0,2}$/
const DOT_DECIMAL = /^\d+\.\d{1,2}$/
const INTEGER = /^(\d{1,3}(\.\d{3})+|\d+)$/

// "1.234,50", "1234,5", "1234.50", "1.234" -> centesimi; null se non valido
export function parseEuroInput(input: string): number | null {
  const s = clean(input)
  let normalized: string
  if (WITH_COMMA.test(s)) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (DOT_DECIMAL.test(s)) normalized = s
  else if (INTEGER.test(s)) normalized = s.replace(/\./g, '')
  else return null
  const cents = Math.round(Number(normalized) * 100)
  return cents <= MAX_CENTS ? cents : null
}

function parseDecimal(input: string) {
  const s = clean(input).replace(',', '.')
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null
}

// Giorni: più di 0, a multipli di mezza giornata, al massimo 1000
export function parseDaysInput(input: string): number | null {
  const n = parseDecimal(input)
  return n !== null && n > 0 && n <= 1000 && Number.isInteger(n * 2) ? n : null
}

// Percentuali tra 0 e 100, arrotondate al centesimo
export function parsePercentInput(input: string): number | null {
  const n = parseDecimal(input)
  return n !== null && n <= 100 ? Math.round(n * 100) / 100 : null
}
```

- [ ] **Step 8: Implementare `shared/dates.ts`**

```ts
// Date del preventivo: giorni di calendario (YYYY-MM-DD) nel fuso di Roma

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// en-CA formatta già come YYYY-MM-DD
const romeDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const romeDate = (now: Date) => romeDay.format(now)
export const romeYear = (now: Date) => Number(romeDate(now).slice(0, 4))

// A mezzogiorno UTC il cambio dell'ora non sposta mai il giorno
export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// "2026-03-09" -> "09/03/2026"
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
```

- [ ] **Step 9: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: PASS, 2 file di test.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts shared/money.ts shared/dates.ts test/money.test.ts test/dates.test.ts
git commit -m "feat(quotes): money and date helpers with vitest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Dominio del preventivo (schemi, totali, stati, snapshot)

**Files:**
- Create: `shared/text.ts`, `shared/settings.ts`, `shared/clients.ts`, `shared/quote.ts`
- Test: `test/quote.test.ts`

**Interfaces:**
- Consumes: `MAX_CENTS`, `addDays`, `ISO_DATE`, `romeDate` (Task 1).
- Produces:
  - `shared/text.ts`: `text(max: number): z.ZodString`
  - `shared/settings.ts`: `companySchema`, `settingsSchema`, `type Company`, `type Settings`, `DEFAULT_SETTINGS: Settings`, `parseSettings(data: unknown): Settings`
  - `shared/clients.ts`: `clientInputSchema`, `type ClientInput`, `type Client = ClientInput & { id: string }`, `emptyClient(): ClientInput`
  - `shared/quote.ts`: `QUOTE_STATUSES`, `type QuoteStatus`, `type DisplayStatus`, `STATUS_LABELS`, `itemSchema`, `phaseSchema`, `quoteContentSchema`, `draftInputSchema`, `statusInputSchema`, `type QuoteItem`, `type QuotePhase`, `type QuoteContent`, `type DraftInput`, `type QuoteTotals`, `type QuoteSnapshot`, `TOKEN_PATTERN`, `newLocalId()`, `newDraftContent(defaults, today)`, `itemAmount(item)`, `computeTotals(content)`, `issueProblems(draft)`, `effectiveStatus(status, validUntil, today)`, `quoteNumber(year, seq)`, `pdfFilename(number, rev)`, `stableStringify(value)`, `buildSnapshot(input)`

- [ ] **Step 1: Scrivere i test**

`test/quote.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { emptyClient } from '#shared/clients'
import {
  buildSnapshot,
  computeTotals,
  draftInputSchema,
  effectiveStatus,
  issueProblems,
  newDraftContent,
  quoteContentSchema,
  quoteNumber,
  stableStringify,
  type QuoteContent,
} from '#shared/quote'
import { DEFAULT_SETTINGS, parseSettings } from '#shared/settings'

const base = (): QuoteContent => newDraftContent(DEFAULT_SETTINGS.defaults, '2026-10-15')

describe('computeTotals', () => {
  it('somma voci a giorni e a corpo, sconto percentuale e IVA', () => {
    const content: QuoteContent = {
      ...base(),
      vatRate: 22,
      discount: { kind: 'percent', value: 10 },
      phases: [
        {
          id: 'p1', title: 'Design', description: '',
          items: [
            { id: 'a', kind: 'days', description: 'UI', days: 1.5, rate: 40000 },
            { id: 'b', kind: 'fixed', description: 'Licenze', amount: 25000 },
          ],
        },
        {
          id: 'p2', title: 'Sviluppo', description: '',
          items: [{ id: 'c', kind: 'days', description: 'Setup', days: 0.5, rate: 33333 }],
        },
      ],
    }
    expect(computeTotals(content)).toEqual({
      phases: [85000, 16667],
      subtotal: 101667,
      discount: 10167,
      taxable: 91500,
      vat: 20130,
      total: 111630,
    })
  })

  it('uno sconto fisso non supera l\'imponibile', () => {
    const content: QuoteContent = {
      ...base(),
      discount: { kind: 'amount', value: 999999 },
      phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed', description: 'x', amount: 1000 }] }],
    }
    expect(computeTotals(content)).toMatchObject({ discount: 1000, taxable: 0, vat: 0, total: 0 })
  })

  it('con IVA 0 il totale è l\'imponibile', () => {
    const content: QuoteContent = {
      ...base(),
      vatRate: 0,
      phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed', description: 'x', amount: 5000 }] }],
    }
    expect(computeTotals(content)).toMatchObject({ vat: 0, total: 5000 })
  })

  it('senza voci è tutto zero', () => {
    expect(computeTotals(base())).toEqual({ phases: [0], subtotal: 0, discount: 0, taxable: 0, vat: 0, total: 0 })
  })
})

describe('schemi', () => {
  it('accetta la bozza nuova', () => {
    expect(quoteContentSchema.safeParse(base()).success).toBe(true)
  })

  it('rifiuta giorni non a mezze giornate, importi negativi e chiavi sconosciute', () => {
    const withItem = (item: unknown) => ({ ...base(), phases: [{ id: 'p', title: '', description: '', items: [item] }] })
    expect(quoteContentSchema.safeParse(withItem({ id: 'i', kind: 'days', description: '', days: 0.3, rate: 100 })).success).toBe(false)
    expect(quoteContentSchema.safeParse(withItem({ id: 'i', kind: 'fixed', description: '', amount: -1 })).success).toBe(false)
    expect(quoteContentSchema.safeParse({ ...base(), extra: 1 }).success).toBe(false)
  })

  it('le impostazioni non valide tornano ai default', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings({ company: 'x' })).toEqual(DEFAULT_SETTINGS)
  })
})

describe('emissione', () => {
  it('elenca cosa manca', () => {
    const draft = { title: '', clientId: null, content: { ...base(), validUntil: '' } }
    expect(issueProblems(draft)).toEqual(['Scegli il cliente', 'Aggiungi almeno una voce', 'Imposta la scadenza'])
  })

  it('segnala voci senza descrizione', () => {
    const draft = draftInputSchema.parse({
      title: 'x',
      clientId: '00000000-0000-4000-8000-000000000000',
      content: { ...base(), phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed', description: ' ', amount: 1 }] }] },
    })
    expect(issueProblems(draft)).toEqual(['Ogni voce ha bisogno di una descrizione'])
  })

  it('una bozza completa non ha problemi', () => {
    const draft = {
      title: 'Sito',
      clientId: '00000000-0000-4000-8000-000000000000',
      content: { ...base(), phases: [{ id: 'p', title: '', description: '', items: [{ id: 'i', kind: 'fixed' as const, description: 'Sito', amount: 1 }] }] },
    }
    expect(issueProblems(draft)).toEqual([])
  })
})

describe('stato, numero, firma', () => {
  it('scade il giorno dopo la scadenza, solo se inviato', () => {
    expect(effectiveStatus('sent', '2026-10-15', '2026-10-15')).toBe('sent')
    expect(effectiveStatus('sent', '2026-10-15', '2026-10-16')).toBe('expired')
    expect(effectiveStatus('accepted', '2026-10-15', '2026-12-01')).toBe('accepted')
    expect(effectiveStatus('sent', '', '2026-12-01')).toBe('sent')
  })

  it('numera con almeno tre cifre', () => {
    expect(quoteNumber(2026, 14)).toBe('2026-014')
    expect(quoteNumber(2026, 1234)).toBe('2026-1234')
  })

  it('la firma non dipende dall\'ordine delle chiavi', () => {
    expect(stableStringify({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: 3 } }))
      .toBe(stableStringify({ a: { c: 3, d: [2, { x: 2, y: 1 }] }, b: 1 }))
  })
})

describe('buildSnapshot', () => {
  it('toglie le fasi vuote e dà un titolo a quelle senza', () => {
    const content: QuoteContent = {
      ...base(),
      phases: [
        { id: 'vuota', title: 'Vuota', description: '', items: [] },
        { id: 'p1', title: '  ', description: '', items: [{ id: 'i', kind: 'fixed', description: 'x', amount: 1000 }] },
        { id: 'p2', title: 'Sviluppo', description: '', items: [{ id: 'j', kind: 'fixed', description: 'y', amount: 500 }] },
      ],
    }
    const s = buildSnapshot({
      number: '2026-001', rev: 1, now: new Date('2026-12-31T23:30:00Z'), title: 'Sito',
      clientId: 'c', client: { ...emptyClient(), name: 'Cliente' }, company: DEFAULT_SETTINGS.company, content,
    })
    expect(s.content.phases.map((p) => p.title)).toEqual(['Fase 1', 'Sviluppo'])
    expect(s.totals.phases).toEqual([1000, 500])
    expect(s.issuedDate).toBe('2027-01-01')
    expect(s.issuedAt).toBe('2026-12-31T23:30:00.000Z')
  })
})
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test -- test/quote.test.ts`
Expected: FAIL, `Failed to resolve import "#shared/clients"`.

- [ ] **Step 3: Implementare `shared/text.ts`**

```ts
import { z } from 'zod'

// Stringa ripulita dagli spazi ai lati, con lunghezza massima
export const text = (max: number) => z.string().trim().max(max)
```

- [ ] **Step 4: Implementare `shared/settings.ts`**

```ts
import { z } from 'zod'
import { MAX_CENTS } from './money'
import { text } from './text'

// Impostazioni dei preventivi: dati di Didap stampati nei documenti e
// valori di partenza copiati in ogni nuova bozza.

export const companySchema = z
  .object({
    name: text(200),
    vatNumber: text(40),
    taxCode: text(40),
    address: text(500),
    email: text(200),
    phone: text(60),
    iban: text(60),
  })
  .strict()

export const settingsSchema = z
  .object({
    company: companySchema,
    defaults: z
      .object({
        dayRate: z.number().int().min(0).max(MAX_CENTS),
        vatRate: z.number().min(0).max(100),
        validityDays: z.number().int().min(1).max(365),
        paymentTerms: text(5000),
        exclusions: text(5000),
        notes: text(5000),
      })
      .strict(),
  })
  .strict()

export type Company = z.infer<typeof companySchema>
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  company: { name: 'Didap', vatNumber: '', taxCode: '', address: '', email: '', phone: '', iban: '' },
  defaults: { dayRate: 0, vatRate: 22, validityDays: 30, paymentTerms: '', exclusions: '', notes: '' },
}

// Niente salvato, o salvato con uno schema vecchio: si riparte dai default
export function parseSettings(data: unknown): Settings {
  const parsed = settingsSchema.safeParse(data)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}
```

- [ ] **Step 5: Implementare `shared/clients.ts`**

```ts
import { z } from 'zod'
import { text } from './text'

// Anagrafica clienti dei preventivi

export const clientInputSchema = z
  .object({
    name: text(200).min(1, 'Ragione sociale obbligatoria'),
    vatNumber: text(40),
    taxCode: text(40),
    address: text(500),
    sdiPec: text(200),
    contactName: text(200),
    email: text(200),
    phone: text(60),
    notes: text(5000),
  })
  .strict()

export type ClientInput = z.infer<typeof clientInputSchema>
export type Client = ClientInput & { id: string }

export const emptyClient = (): ClientInput => ({
  name: '',
  vatNumber: '',
  taxCode: '',
  address: '',
  sdiPec: '',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
})
```

- [ ] **Step 6: Implementare `shared/quote.ts`**

```ts
import { z } from 'zod'
import type { ClientInput } from './clients'
import { addDays, ISO_DATE, romeDate } from './dates'
import { MAX_CENTS } from './money'
import type { Company, Settings } from './settings'
import { text } from './text'

// Preventivi: contenuto della bozza, totali, stati e controlli prima
// dell'emissione. Importi in centesimi interi; giorni a mezze giornate.

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
// "Scaduto" non si salva: si calcola dalla scadenza
export type DisplayStatus = QuoteStatus | 'expired'

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: 'Bozza',
  sent: 'Inviato',
  accepted: 'Accettato',
  rejected: 'Rifiutato',
  expired: 'Scaduto',
}

const cents = z.number().int().min(0).max(MAX_CENTS)
// Id di fasi e voci, generati nel browser
const localId = z.string().regex(/^[a-z0-9]{1,24}$/)

const daysItemSchema = z
  .object({
    id: localId,
    kind: z.literal('days'),
    description: text(500),
    // 0 ammesso in bozza; l'emissione chiede almeno mezza giornata
    days: z.number().min(0).max(1000).refine((d) => Number.isInteger(d * 2), 'Solo mezze giornate'),
    rate: cents,
  })
  .strict()

const fixedItemSchema = z
  .object({
    id: localId,
    kind: z.literal('fixed'),
    description: text(500),
    amount: cents,
  })
  .strict()

export const itemSchema = z.discriminatedUnion('kind', [daysItemSchema, fixedItemSchema])

export const phaseSchema = z
  .object({
    id: localId,
    title: text(200),
    description: text(2000),
    items: z.array(itemSchema).max(100),
  })
  .strict()

const discountSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('percent'), value: z.number().min(0).max(100) }).strict(),
  z.object({ kind: z.literal('amount'), value: cents }).strict(),
])

export const quoteContentSchema = z
  .object({
    intro: text(5000),
    phases: z.array(phaseSchema).max(30),
    dayRate: cents,
    discount: discountSchema,
    vatRate: z.number().min(0).max(100),
    validUntil: z.union([z.literal(''), z.string().regex(ISO_DATE)]),
    timeline: text(5000),
    paymentTerms: text(5000),
    exclusions: text(5000),
    notes: text(5000),
  })
  .strict()

export const draftInputSchema = z
  .object({
    title: text(200),
    clientId: z.string().uuid().nullable(),
    content: quoteContentSchema,
  })
  .strict()

export const statusInputSchema = z
  .object({ status: z.enum(['sent', 'accepted', 'rejected']) })
  .strict()

export type QuoteItem = z.infer<typeof itemSchema>
export type QuotePhase = z.infer<typeof phaseSchema>
export type QuoteContent = z.infer<typeof quoteContentSchema>
export type DraftInput = z.infer<typeof draftInputSchema>

export type QuoteTotals = {
  phases: number[]
  subtotal: number
  discount: number
  taxable: number
  vat: number
  total: number
}

// Tutto ciò che serve a ridisegnare una revisione emessa, senza altre tabelle
export type QuoteSnapshot = {
  number: string
  rev: number
  issuedAt: string
  issuedDate: string
  title: string
  clientId: string
  client: ClientInput
  company: Company
  content: QuoteContent
  totals: QuoteTotals
}

export const TOKEN_PATTERN = /^[\w-]{43}$/

export const newLocalId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12)

export function newDraftContent(defaults: Settings['defaults'], today: string): QuoteContent {
  return {
    intro: '',
    phases: [{ id: newLocalId(), title: '', description: '', items: [] }],
    dayRate: defaults.dayRate,
    discount: { kind: 'none' },
    vatRate: defaults.vatRate,
    validUntil: addDays(today, defaults.validityDays),
    timeline: '',
    paymentTerms: defaults.paymentTerms,
    exclusions: defaults.exclusions,
    notes: defaults.notes,
  }
}

export const itemAmount = (item: QuoteItem) =>
  item.kind === 'days' ? Math.round(item.days * item.rate) : item.amount

export function computeTotals(content: QuoteContent): QuoteTotals {
  const phases = content.phases.map((p) => p.items.reduce((sum, i) => sum + itemAmount(i), 0))
  const subtotal = phases.reduce((a, b) => a + b, 0)
  const d = content.discount
  const discount
    = d.kind === 'percent'
      ? Math.round((subtotal * d.value) / 100)
      : d.kind === 'amount'
        ? Math.min(d.value, subtotal)
        : 0
  const taxable = subtotal - discount
  const vat = Math.round((taxable * content.vatRate) / 100)
  return { phases, subtotal, discount, taxable, vat, total: taxable + vat }
}

// Cosa manca per poter emettere (vuoto = si può)
export function issueProblems(draft: DraftInput): string[] {
  const problems: string[] = []
  const items = draft.content.phases.flatMap((p) => p.items)
  if (!draft.clientId) problems.push('Scegli il cliente')
  if (!items.length) problems.push('Aggiungi almeno una voce')
  if (items.some((i) => !i.description.trim())) problems.push('Ogni voce ha bisogno di una descrizione')
  if (items.some((i) => i.kind === 'days' && i.days <= 0)) problems.push('Le voci a giorni vogliono almeno mezza giornata')
  if (!draft.content.validUntil) problems.push('Imposta la scadenza')
  return problems
}

// Scaduto: inviato e oltre la scadenza (il giorno di scadenza vale ancora)
export function effectiveStatus(status: QuoteStatus, validUntil: string, today: string): DisplayStatus {
  return status === 'sent' && validUntil !== '' && validUntil < today ? 'expired' : status
}

export const quoteNumber = (year: number, seq: number) => `${year}-${String(seq).padStart(3, '0')}`

export const pdfFilename = (number: string, rev: number) => `Preventivo-${number}-rev${rev}.pdf`

// JSON con chiavi ordinate: confronta bozze che tornano da jsonb (che
// riordina le chiavi) con quelle del browser
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  )
}

// Snapshot di una revisione. Le fasi senza voci non compaiono nel
// documento; quelle senza titolo diventano "Fase N".
export function buildSnapshot(input: {
  number: string
  rev: number
  now: Date
  title: string
  clientId: string
  client: ClientInput
  company: Company
  content: QuoteContent
}): QuoteSnapshot {
  const phases = input.content.phases
    .filter((p) => p.items.length > 0)
    .map((p, i) => ({ ...p, title: p.title.trim() || `Fase ${i + 1}` }))
  const content = { ...input.content, phases }
  return {
    number: input.number,
    rev: input.rev,
    issuedAt: input.now.toISOString(),
    issuedDate: romeDate(input.now),
    title: input.title,
    clientId: input.clientId,
    client: input.client,
    company: input.company,
    content,
    totals: computeTotals(content),
  }
}
```

- [ ] **Step 7: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: PASS, 3 file di test.

- [ ] **Step 8: Commit**

```bash
git add shared/text.ts shared/settings.ts shared/clients.ts shared/quote.ts test/quote.test.ts
git commit -m "feat(quotes): quote domain model, totals and snapshot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Schema del database, impostazioni e clienti

**Files:**
- Create: `server/utils/schema.ts`, `server/utils/settings.ts`, `server/utils/clients.ts`, `test/helpers/db.ts`
- Modify: `server/utils/db.ts` (usa `DB_SCHEMA`), `.env.example`, `.env` locale (non committato)
- Test: `test/settings-clients.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_SETTINGS`, `parseSettings`, `type Settings` (Task 2); `type Client`, `type ClientInput`, `emptyClient` (Task 2).
- Produces:
  - `server/utils/schema.ts`: `DB_SCHEMA: string`
  - `server/utils/settings.ts`: `readSettings(sql: postgres.Sql): Promise<Settings>`, `writeSettings(sql: postgres.Sql, data: Settings): Promise<void>`
  - `server/utils/clients.ts`: `rowToClientInput(r: postgres.Row): ClientInput`, `rowToClient(r: postgres.Row): Client`, `listClients(sql)`, `getClient(sql, id)`, `createClient(sql, input)`, `updateClient(sql, id, input)`, `deleteClient(sql, id)`; errori h3 con `statusCode` 404 e 409.
  - `test/helpers/db.ts`: `TEST_DATABASE_URL: string`, `openTestDb(): Promise<postgres.Sql>`, `resetTestDb(sql): Promise<void>`

- [ ] **Step 1: Aggiungere `TEST_DATABASE_URL`**

In `.env.example`, in fondo:

```bash

# Test di integrazione (npm test): database separato, deve finire con _test
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5435/didap_test
```

Aggiungi la stessa riga al `.env` locale (non è versionato).

- [ ] **Step 2: Creare `test/helpers/db.ts`**

```ts
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
}
```

- [ ] **Step 3: Scrivere i test**

`test/settings-clients.test.ts`:

```ts
import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { emptyClient } from '#shared/clients'
import { DEFAULT_SETTINGS } from '#shared/settings'
import { createClient, deleteClient, getClient, listClients, updateClient } from '../server/utils/clients'
import { DB_SCHEMA } from '../server/utils/schema'
import { readSettings, writeSettings } from '../server/utils/settings'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

describe.skipIf(!TEST_DATABASE_URL)('impostazioni e clienti su Postgres', () => {
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

  it('lo schema si applica più volte senza errori', async () => {
    await sql.unsafe(DB_SCHEMA)
    await sql.unsafe(DB_SCHEMA)
  })

  it('senza impostazioni salvate restituisce i default', async () => {
    expect(await readSettings(sql)).toEqual(DEFAULT_SETTINGS)
  })

  it('salva e rilegge le impostazioni', async () => {
    const next = { ...DEFAULT_SETTINGS, company: { ...DEFAULT_SETTINGS.company, iban: 'IT60X0542811101000000123456' } }
    await writeSettings(sql, next)
    await writeSettings(sql, next)
    expect(await readSettings(sql)).toEqual(next)
  })

  it('crea, elenca in ordine alfabetico, modifica ed elimina', async () => {
    const b = await createClient(sql, { ...emptyClient(), name: 'beta srl' })
    const a = await createClient(sql, { ...emptyClient(), name: 'Alfa spa', vatNumber: 'IT01234567890' })
    expect((await listClients(sql)).map((c) => c.name)).toEqual(['Alfa spa', 'beta srl'])

    const updated = await updateClient(sql, a.id, { ...emptyClient(), name: 'Alfa spa', email: 'info@alfa.it' })
    expect(updated).toMatchObject({ id: a.id, email: 'info@alfa.it', vatNumber: '' })

    await deleteClient(sql, b.id)
    await expect(getClient(sql, b.id)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('modificare o eliminare un cliente inesistente dà 404', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'
    await expect(updateClient(sql, missing, { ...emptyClient(), name: 'x' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(deleteClient(sql, missing)).rejects.toMatchObject({ statusCode: 404 })
  })
})
```

- [ ] **Step 4: Eseguire i test e verificare che falliscano**

Run: `npm test -- test/settings-clients.test.ts`
Expected: FAIL, `Failed to resolve import "../server/utils/clients"`.

- [ ] **Step 5: Creare `server/utils/schema.ts`**

Sposta qui lo schema di `server/utils/db.ts` e aggiungi le tabelle nuove:

```ts
// Schema del database, applicato a ogni avvio (idempotente).
// Prodotti, asset e sessioni di /admin; poi preventivi e clienti.
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
      check (status in ('draft', 'sent', 'accepted', 'rejected')),
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
`
```

- [ ] **Step 6: Usare `DB_SCHEMA` in `server/utils/db.ts`**

Elimina il blocco `const SCHEMA = \`...\`` (righe da `const SCHEMA = \`` alla backtick di chiusura) e aggiungi l'import in cima, sotto `import postgres from 'postgres'`:

```ts
import { DB_SCHEMA } from './schema'
```

In `connect()`, sostituisci `await client.unsafe(SCHEMA)` con:

```ts
  await client.unsafe(DB_SCHEMA)
```

- [ ] **Step 7: Implementare `server/utils/settings.ts`**

```ts
import type postgres from 'postgres'
import { parseSettings, type Settings } from '#shared/settings'

// Impostazioni dei preventivi: una riga sola (id = 1)

export async function readSettings(sql: postgres.Sql): Promise<Settings> {
  const [row] = await sql`select data from settings where id = 1`
  return parseSettings(row?.data)
}

export async function writeSettings(sql: postgres.Sql, data: Settings): Promise<void> {
  await sql`
    insert into settings (id, data, updated_at)
    values (1, ${sql.json(data)}, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `
}
```

- [ ] **Step 8: Implementare `server/utils/clients.ts`**

```ts
import { createError } from 'h3'
import type postgres from 'postgres'
import type { Client, ClientInput } from '#shared/clients'

// Anagrafica clienti dei preventivi

type Sql = postgres.Sql

const notFound = () => createError({ statusCode: 404, statusMessage: 'Cliente non trovato' })

export function rowToClientInput(r: postgres.Row): ClientInput {
  return {
    name: r.name,
    vatNumber: r.vat_number,
    taxCode: r.tax_code,
    address: r.address,
    sdiPec: r.sdi_pec,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
  }
}

export const rowToClient = (r: postgres.Row): Client => ({ id: r.id, ...rowToClientInput(r) })

const toRow = (c: ClientInput) => ({
  name: c.name,
  vat_number: c.vatNumber,
  tax_code: c.taxCode,
  address: c.address,
  sdi_pec: c.sdiPec,
  contact_name: c.contactName,
  email: c.email,
  phone: c.phone,
  notes: c.notes,
})

export async function listClients(sql: Sql): Promise<Client[]> {
  const rows = await sql`select * from clients order by lower(name), created_at`
  return rows.map(rowToClient)
}

export async function getClient(sql: Sql, id: string): Promise<Client> {
  const [row] = await sql`select * from clients where id = ${id}`
  if (!row) throw notFound()
  return rowToClient(row)
}

export async function createClient(sql: Sql, input: ClientInput): Promise<Client> {
  const [row] = await sql`insert into clients ${sql(toRow(input))} returning *`
  return rowToClient(row!)
}

export async function updateClient(sql: Sql, id: string, input: ClientInput): Promise<Client> {
  const [row] = await sql`
    update clients set ${sql(toRow(input))}, updated_at = now()
    where id = ${id}
    returning *
  `
  if (!row) throw notFound()
  return rowToClient(row)
}

// Un cliente con preventivi non si elimina: i preventivi lo citano
export async function deleteClient(sql: Sql, id: string): Promise<void> {
  const [used] = await sql`select 1 from quotes where client_id = ${id} limit 1`
  if (used) {
    throw createError({ statusCode: 409, statusMessage: 'Il cliente ha dei preventivi: non si può eliminare' })
  }
  const [row] = await sql`delete from clients where id = ${id} returning id`
  if (!row) throw notFound()
}
```

- [ ] **Step 9: Eseguire i test e verificare che passino**

Il container `didap-postgres` deve essere acceso (`docker start didap-postgres`).

Run: `npm test`
Expected: PASS, 4 file di test; `test/settings-clients.test.ts` non deve risultare "skipped".

- [ ] **Step 10: Verificare che il sito parta ancora**

Run: `npx nuxt dev --port 3000` in background, poi `curl -s http://localhost:3000/api/admin/session`
Expected: `{"configured":true,"database":true,"authenticated":false}`. Poi `docker exec didap-postgres psql -U postgres -d didap -c '\dt'` elenca anche `clients`, `quotes`, `quote_counters`, `quote_revisions`, `settings`. Ferma il server.

- [ ] **Step 11: Commit**

```bash
git add .env.example server/utils/schema.ts server/utils/db.ts server/utils/settings.ts server/utils/clients.ts test/helpers/db.ts test/settings-clients.test.ts
git commit -m "feat(quotes): database schema, settings and clients services

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Generazione del PDF

**Files:**
- Create: `server/utils/quote-pdf.ts`, `server/utils/pdf-assets.ts`, `server/assets/fonts/README.md`, `server/assets/fonts/fallback/*` (4 `.woff` + 2 licenze), `server/assets/pdf/logo.svg`, `test/helpers/fixtures.ts`
- Modify: `package.json` (`pdfmake`, `@types/pdfmake`)
- Test: `test/quote-pdf.test.ts`

**Interfaces:**
- Consumes: `type QuoteSnapshot`, `type QuotePhase`, `itemAmount`, `buildSnapshot` (Task 2); `formatEuro`, `formatDecimal` (Task 1); `formatDate` (Task 1); `emptyClient`, `DEFAULT_SETTINGS`, `newDraftContent` (Task 2).
- Produces:
  - `server/utils/quote-pdf.ts`: `type PdfAssets = { logoSvg: string; sans: { normal: Buffer; bold: Buffer }; wide: Buffer | null; mono: { normal: Buffer; bold: Buffer } }`, `buildQuoteDoc(s: QuoteSnapshot, logoSvg: string): TDocumentDefinitions`, `renderQuotePdf(s: QuoteSnapshot, assets: PdfAssets): Promise<Buffer>`
  - `server/utils/pdf-assets.ts`: `loadPdfAssets(): Promise<PdfAssets>` (solo dentro Nitro)
  - `test/helpers/fixtures.ts`: `testPdfAssets(): PdfAssets`, `sampleSnapshot(patch?: Partial<QuoteContent>): QuoteSnapshot`, `pageCount(pdf: Buffer): number`

- [ ] **Step 1: Installare pdfmake e i tipi**

```bash
npm install pdfmake@^0.3.11 --no-audit --no-fund
npm install -D @types/pdfmake@^0.3.3 --no-audit --no-fund
npm install-scripts ls
```

Expected: "No packages with unreviewed install scripts." Se compaiono pacchetti nuovi, fermati e chiedi.

- [ ] **Step 2: Scaricare font di ripiego, licenze e logo**

```bash
mkdir -p server/assets/fonts/fallback server/assets/pdf
B=https://cdn.jsdelivr.net/npm
F=server/assets/fonts/fallback
curl -fsSL -o $F/inter-400.woff $B/@fontsource/inter@5.3.0/files/inter-latin-400-normal.woff
curl -fsSL -o $F/inter-700.woff $B/@fontsource/inter@5.3.0/files/inter-latin-700-normal.woff
curl -fsSL -o $F/jetbrains-mono-400.woff $B/@fontsource/jetbrains-mono@5.3.0/files/jetbrains-mono-latin-400-normal.woff
curl -fsSL -o $F/jetbrains-mono-500.woff $B/@fontsource/jetbrains-mono@5.3.0/files/jetbrains-mono-latin-500-normal.woff
curl -fsSL -o $F/OFL-Inter.txt $B/@fontsource/inter@5.3.0/LICENSE
curl -fsSL -o $F/OFL-JetBrainsMono.txt $B/@fontsource/jetbrains-mono@5.3.0/LICENSE
cp public/brand/logo-esteso.svg server/assets/pdf/logo.svg
ls -la $F server/assets/pdf
```

Expected: 6 file non vuoti in `fallback/` e `logo.svg`.

- [ ] **Step 3: Scrivere `server/assets/fonts/README.md`**

```markdown
# Font del PDF dei preventivi

Il PDF usa Obviously se in questa cartella ci sono i file:

- `obviously-regular` (testo)
- `obviously-bold` (titoli e grassetti)
- `obviously-wide-bold` (opzionale, la parola "Preventivo" in testata)

con estensione `.otf`, `.ttf` o `.woff`. Il formato `.woff2` non
funziona: la libreria dei font di pdfmake non riesce a estrarne i glifi.

Servono almeno regular e bold. Se mancano, il PDF usa Inter (cartella
`fallback/`, licenza OFL) e il server lo scrive nel log.

JetBrains Mono (numeri e importi, licenza OFL) è sempre in `fallback/`.
```

- [ ] **Step 4: Creare `test/helpers/fixtures.ts`**

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { emptyClient } from '#shared/clients'
import { buildSnapshot, newDraftContent, type QuoteContent, type QuoteSnapshot } from '#shared/quote'
import { DEFAULT_SETTINGS } from '#shared/settings'
import type { PdfAssets } from '../../server/utils/quote-pdf'

// Dati di esempio per i test del PDF

const asset = (path: string) => readFileSync(fileURLToPath(new URL(`../../server/assets/${path}`, import.meta.url)))

export function testPdfAssets(): PdfAssets {
  return {
    logoSvg: asset('pdf/logo.svg').toString('utf8'),
    sans: { normal: asset('fonts/fallback/inter-400.woff'), bold: asset('fonts/fallback/inter-700.woff') },
    wide: null,
    mono: { normal: asset('fonts/fallback/jetbrains-mono-400.woff'), bold: asset('fonts/fallback/jetbrains-mono-500.woff') },
  }
}

export function sampleSnapshot(patch: Partial<QuoteContent> = {}): QuoteSnapshot {
  const content: QuoteContent = {
    ...newDraftContent(DEFAULT_SETTINGS.defaults, '2026-10-15'),
    intro: 'Rifacimento del sito istituzionale.',
    phases: [
      {
        id: 'p1',
        title: 'Design',
        description: 'Interfaccia e prototipo.',
        items: [
          { id: 'a', kind: 'days', description: 'Wireframe', days: 2, rate: 40000 },
          { id: 'b', kind: 'fixed', description: 'Licenze font', amount: 15000 },
        ],
      },
    ],
    ...patch,
  }
  return buildSnapshot({
    number: '2026-001',
    rev: 1,
    now: new Date('2026-10-15T10:00:00Z'),
    title: 'Nuovo sito',
    clientId: '00000000-0000-4000-8000-000000000000',
    client: { ...emptyClient(), name: 'Comune di Prova', address: 'Piazza Grande 1\n72100 Brindisi', vatNumber: '00123456789' },
    company: { ...DEFAULT_SETTINGS.company, address: 'Via Roma 1, Brindisi', iban: 'IT60X0542811101000000123456' },
    content,
  })
}

// Le pagine di un PDF di pdfkit: un dizionario "/Type /Page" ciascuna
export const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length
```

- [ ] **Step 5: Scrivere i test**

`test/quote-pdf.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { QuoteItem } from '#shared/quote'
import { buildQuoteDoc, renderQuotePdf } from '../server/utils/quote-pdf'
import { pageCount, sampleSnapshot, testPdfAssets } from './helpers/fixtures'

const assets = testPdfAssets()

describe('renderQuotePdf', () => {
  it('genera un PDF di una pagina per un preventivo corto', async () => {
    const pdf = await renderQuotePdf(sampleSnapshot(), assets)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBe(1)
  })

  it('va su più pagine con molte voci', async () => {
    const items = (n: number): QuoteItem[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `i${i}`,
        kind: 'days',
        description: `Attività ${i}: ${'analisi, sviluppo e verifica '.repeat(4)}`,
        days: 1.5,
        rate: 40000,
      }))
    const phases = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, title: `Fase ${i}`, description: '', items: items(25) }))
    const pdf = await renderQuotePdf(sampleSnapshot({ phases }), assets)
    expect(pageCount(pdf)).toBeGreaterThanOrEqual(3)
  })

  it('non si rompe con caratteri che il font non ha', async () => {
    const pdf = await renderQuotePdf(sampleSnapshot({
      intro: 'Lancio 🚀 a Łódź con “virgolette” e € ő',
      notes: 'Ciao 👋',
    }), assets)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })
})

describe('buildQuoteDoc', () => {
  it('omette sezioni vuote e righe di sconto a zero', () => {
    const json = JSON.stringify(buildQuoteDoc(sampleSnapshot(), assets.logoSvg))
    expect(json).not.toContain('Esclusioni')
    expect(json).not.toContain('Sconto')
    expect(json).toContain('Wireframe')
    expect(json).toContain('a corpo')
  })

  it('mostra sconto, testi finali e IBAN quando ci sono', () => {
    const json = JSON.stringify(buildQuoteDoc(sampleSnapshot({
      discount: { kind: 'percent', value: 10 },
      exclusions: 'Hosting',
      paymentTerms: '50% alla firma',
    }), assets.logoSvg))
    expect(json).toContain('Sconto 10%')
    expect(json).toContain('Imponibile scontato')
    expect(json).toContain('Esclusioni')
    expect(json).toContain('50% alla firma')
    expect(json).toContain('IT60X0542811101000000123456')
  })

  it('scrive pagina X di Y nel piè di pagina', () => {
    const doc = buildQuoteDoc(sampleSnapshot(), assets.logoSvg)
    const footer = (doc.footer as (page: number, pages: number) => unknown)(2, 5)
    expect(JSON.stringify(footer)).toContain('Pagina 2 di 5')
  })
})
```

- [ ] **Step 6: Eseguire i test e verificare che falliscano**

Run: `npm test -- test/quote-pdf.test.ts`
Expected: FAIL, `Failed to resolve import "../server/utils/quote-pdf"`.

- [ ] **Step 7: Implementare `server/utils/quote-pdf.ts`**

```ts
import pdfmake from 'pdfmake'
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatDate } from '#shared/dates'
import { formatDecimal, formatEuro } from '#shared/money'
import { itemAmount, type QuotePhase, type QuoteSnapshot } from '#shared/quote'

// PDF del preventivo, costruito con pdfmake dallo snapshot di una revisione.
// Font e logo arrivano da fuori (loadPdfAssets in Nitro, file nei test).

export type PdfAssets = {
  logoSvg: string
  sans: { normal: Buffer; bold: Buffer }
  // Obviously Wide per la parola "Preventivo"; senza, si usa sans bold
  wide: Buffer | null
  mono: { normal: Buffer; bold: Buffer }
}

const C = {
  ink: '#161412',
  muted: '#6f6a64',
  cream: '#fbf4e2',
  green: '#2e5d4a',
  paper: '#fffbf2',
}

// Niente download né file locali: font e immagini passano solo dal
// file system virtuale di pdfmake
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy(() => false)

// pdfmake legge i font da un file system virtuale globale (non tipizzato
// in @types/pdfmake): ogni buffer si registra una volta con un nome suo
const vfs = (pdfmake as unknown as { virtualfs: { writeFileSync(name: string, data: Buffer): void } }).virtualfs
const vfsNames = new WeakMap<Buffer, string>()
let vfsCount = 0

function vfsName(data: Buffer) {
  let name = vfsNames.get(data)
  if (!name) {
    name = `font-${++vfsCount}`
    vfs.writeFileSync(name, data)
    vfsNames.set(data, name)
  }
  return name
}

function family(normal: Buffer, bold: Buffer) {
  const n = vfsName(normal)
  const b = vfsName(bold)
  return { normal: n, bold: b, italics: n, bolditalics: b }
}

const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join('\n')

const money = (cents: number, extra: Record<string, unknown> = {}): TableCell => ({
  text: formatEuro(cents),
  font: 'Mono',
  alignment: 'right',
  noWrap: true,
  ...extra,
})

function phaseBlock(phase: QuotePhase, subtotal: number, index: number): Content[] {
  const head: TableCell[] = ['Descrizione', 'Giorni', 'Tariffa', 'Importo'].map((label, i) => ({
    text: label,
    style: 'th',
    alignment: i ? 'right' : 'left',
  }))
  const rows: TableCell[][] = phase.items.map((item) =>
    item.kind === 'days'
      ? [item.description, { text: formatDecimal(item.days), font: 'Mono', alignment: 'right' }, money(item.rate), money(itemAmount(item))]
      : [item.description, '', { text: 'a corpo', alignment: 'right', color: C.muted }, money(item.amount)],
  )
  return [
    { text: `${index + 1}. ${phase.title}`, style: 'h2' },
    ...(phase.description ? [{ text: phase.description, margin: [0, 0, 0, 6] } as Content] : []),
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['*', 42, 72, 80],
        body: [
          head,
          ...rows,
          [{ text: 'Subtotale fase', colSpan: 3, alignment: 'right', bold: true }, '', '', money(subtotal, { bold: true })],
        ],
      },
      layout: 'lightHorizontalLines',
    },
  ]
}

function summaryBlock(s: QuoteSnapshot): Content {
  const t = s.totals
  const d = s.content.discount
  const rows: TableCell[][] = [['Imponibile', money(t.subtotal)]]
  if (t.discount > 0) {
    rows.push([d.kind === 'percent' ? `Sconto ${formatDecimal(d.value)}%` : 'Sconto', money(-t.discount)])
    rows.push(['Imponibile scontato', money(t.taxable)])
  }
  rows.push([`IVA ${formatDecimal(s.content.vatRate)}%`, money(t.vat)])
  const strong = { bold: true, fontSize: 12, color: C.paper, fillColor: C.green }
  rows.push([{ text: 'Totale', ...strong }, money(t.total, strong)])
  return {
    columns: [
      { width: '*', text: '' },
      { width: 240, table: { widths: ['*', 'auto'], body: rows }, layout: 'noBorders' },
    ],
    margin: [0, 22, 0, 0],
    unbreakable: true,
  }
}

export function buildQuoteDoc(s: QuoteSnapshot, logoSvg: string): TDocumentDefinitions {
  const { company, client: c, content } = s
  const body: Content[] = [
    {
      columns: [
        { svg: logoSvg, width: 120 },
        {
          text: lines(
            company.name,
            company.address,
            company.vatNumber && `P.IVA ${company.vatNumber}`,
            company.taxCode && `C.F. ${company.taxCode}`,
            company.email,
            company.phone,
          ),
          alignment: 'right',
          fontSize: 8,
          color: C.muted,
        },
      ],
    },
    { text: 'Preventivo', font: 'Wide', bold: true, fontSize: 28, margin: [0, 28, 0, 6] },
    {
      columns: [
        { text: [{ text: 'N. ', color: C.muted }, { text: `${s.number} · rev. ${s.rev}`, font: 'Mono' }] },
        { text: [{ text: 'Data ', color: C.muted }, formatDate(s.issuedDate)] },
        { text: [{ text: 'Valido fino al ', color: C.muted }, content.validUntil ? formatDate(content.validUntil) : '-'] },
      ],
      fontSize: 9,
    },
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Spett.le', fontSize: 8, color: C.muted },
            { text: c.name, bold: true, fontSize: 11 },
            {
              text: lines(
                c.address,
                c.vatNumber && `P.IVA ${c.vatNumber}`,
                c.taxCode && `C.F. ${c.taxCode}`,
                c.sdiPec && `SDI/PEC ${c.sdiPec}`,
                c.contactName && `Alla c.a. di ${c.contactName}`,
              ),
              fontSize: 9,
            },
          ],
          fillColor: C.cream,
          margin: [10, 8, 10, 8],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 18, 0, 0],
    },
  ]

  if (s.title) body.push({ text: s.title, fontSize: 16, bold: true, margin: [0, 22, 0, 6] })
  if (content.intro) body.push({ text: content.intro })
  content.phases.forEach((phase, i) => body.push(...phaseBlock(phase, s.totals.phases[i] ?? 0, i)))
  body.push(summaryBlock(s))

  const extras: [string, string][] = [
    ['Tempi', content.timeline],
    ['Condizioni di pagamento', content.paymentTerms],
    ['Esclusioni', content.exclusions],
    ['Note', content.notes],
  ]
  for (const [title, text] of extras) {
    if (text.trim()) body.push({ text: title, style: 'h3' }, { text })
  }
  if (company.iban) {
    body.push({ text: [{ text: 'IBAN ', color: C.muted }, { text: company.iban, font: 'Mono' }], margin: [0, 14, 0, 0] })
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    info: { title: `Preventivo ${s.number}`, author: company.name, subject: s.title },
    defaultStyle: { font: 'Sans', fontSize: 9.5, lineHeight: 1.3, color: C.ink },
    styles: {
      h2: { fontSize: 12, bold: true, margin: [0, 18, 0, 4] },
      h3: { fontSize: 10, bold: true, margin: [0, 14, 0, 3] },
      th: { fontSize: 8, bold: true, color: C.muted },
    },
    footer: (page: number, pages: number) => ({
      columns: [
        { text: `${company.name} · Preventivo ${s.number} rev. ${s.rev}` },
        { text: `Pagina ${page} di ${pages}`, alignment: 'right' },
      ],
      margin: [40, 16, 40, 0],
      fontSize: 7,
      color: C.muted,
    }),
    content: body,
  }
}

export async function renderQuotePdf(s: QuoteSnapshot, assets: PdfAssets): Promise<Buffer> {
  const wide = assets.wide ?? assets.sans.bold
  // setFonts e createPdf senza await in mezzo: pdfmake legge i font
  // dentro createPdf, quindi render concorrenti non si mescolano
  pdfmake.setFonts({
    Sans: family(assets.sans.normal, assets.sans.bold),
    Wide: family(wide, wide),
    Mono: family(assets.mono.normal, assets.mono.bold),
  })
  return pdfmake.createPdf(buildQuoteDoc(s, assets.logoSvg)).getBuffer()
}
```

Se `npm run typecheck` (Task 10) segnala tipi pdfmake incompatibili su singole celle, aggiusta con `as TableCell` o `as Content` sulla cella, senza cambiare la struttura.

- [ ] **Step 8: Eseguire i test e verificare che passino**

Run: `npm test -- test/quote-pdf.test.ts`
Expected: PASS, 6 test.

- [ ] **Step 9: Implementare `server/utils/pdf-assets.ts`**

```ts
import type { PdfAssets } from './quote-pdf'

// Font e logo del PDF dagli asset del server (server/assets, inclusi nella
// build). Obviously se ci sono i file (vedi server/assets/fonts/README.md),
// altrimenti Inter.

const EXTENSIONS = ['otf', 'ttf', 'woff']
let cached: Promise<PdfAssets> | null = null

export function loadPdfAssets(): Promise<PdfAssets> {
  cached ??= readPdfAssets().catch((err) => {
    cached = null
    throw err
  })
  return cached
}

async function readPdfAssets(): Promise<PdfAssets> {
  const storage = useStorage('assets:server')
  // In sviluppo arriva un Buffer, nella build un Uint8Array
  const raw = async (key: string) => {
    const value = await storage.getItemRaw(key)
    return value ? Buffer.from(value as Uint8Array) : null
  }
  const required = async (key: string) => {
    const data = await raw(key)
    if (!data) throw new Error(`Asset del PDF mancante: ${key}`)
    return data
  }
  const find = async (name: string) => {
    for (const ext of EXTENSIONS) {
      const data = await raw(`fonts:${name}.${ext}`)
      if (data) return data
    }
    return null
  }

  const logoSvg = (await required('pdf:logo.svg')).toString('utf8')
  const mono = {
    normal: await required('fonts:fallback:jetbrains-mono-400.woff'),
    bold: await required('fonts:fallback:jetbrains-mono-500.woff'),
  }
  const [regular, bold, wide] = await Promise.all([
    find('obviously-regular'),
    find('obviously-bold'),
    find('obviously-wide-bold'),
  ])
  if (regular && bold) return { logoSvg, sans: { normal: regular, bold }, wide, mono }

  console.warn('[pdf] Obviously non trovato in server/assets/fonts: uso Inter')
  return {
    logoSvg,
    sans: {
      normal: await required('fonts:fallback:inter-400.woff'),
      bold: await required('fonts:fallback:inter-700.woff'),
    },
    wide: null,
    mono,
  }
}
```

Viene provato nel Task 6 (anteprima PDF via API) e nel Task 10 (build di produzione).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json server/utils/quote-pdf.ts server/utils/pdf-assets.ts server/assets test/helpers/fixtures.ts test/quote-pdf.test.ts
git commit -m "feat(quotes): PDF rendering with pdfmake and fallback fonts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Servizi dei preventivi (bozza, emissione, letture pubbliche)

**Files:**
- Create: `server/utils/quotes.ts`, `server/utils/quote-issue.ts`, `server/utils/quote-public.ts`
- Test: `test/quotes.test.ts`

**Interfaces:**
- Consumes: Task 2 (`draftInputSchema`, `quoteContentSchema`, `newDraftContent`, `computeTotals`, `effectiveStatus`, `quoteNumber`, `pdfFilename`, `issueProblems`, `buildSnapshot`, `TOKEN_PATTERN`, `parseSettings`, `emptyClient`); Task 1 (`romeDate`, `romeYear`, `addDays`); Task 3 (`readSettings`, `rowToClientInput`, `createClient`, `updateClient`, `deleteClient`, `writeSettings`, helper di test).
- Produces:
  - `server/utils/quotes.ts`:
    - `type QuoteListRow = { id: string; number: string | null; title: string; clientName: string | null; total: number; status: QuoteStatus; displayStatus: DisplayStatus; updatedAt: string }`
    - `type QuoteDetail = { id: string; number: string | null; token: string | null; status: QuoteStatus; displayStatus: DisplayStatus; currentRev: number; draft: DraftInput; issuedDraft: DraftInput | null; revisions: { rev: number; issuedAt: string; total: number }[]; updatedAt: string }`
    - `createQuote(sql, now: Date): Promise<{ id: string }>`
    - `getQuote(sql, id: string, today: string): Promise<QuoteDetail>`
    - `saveDraft(sql, id: string, input: DraftInput): Promise<{ updatedAt: string }>`
    - `listQuotes(sql, today: string): Promise<QuoteListRow[]>`
    - `deleteQuote(sql, id: string): Promise<void>`
    - `duplicateQuote(sql, id: string, now: Date): Promise<{ id: string }>`
    - `setQuoteStatus(sql, id: string, status: 'sent' | 'accepted' | 'rejected'): Promise<void>`
    - `previewSnapshot(sql, id: string, now: Date): Promise<QuoteSnapshot>`
  - `server/utils/quote-issue.ts`: `type RenderPdf = (s: QuoteSnapshot) => Promise<Buffer>`, `issueQuote(sql, id: string, opts: { now: Date; render: RenderPdf }): Promise<{ rev: number; number: string; token: string }>`
  - `server/utils/quote-public.ts`: `getPublicQuote(sql, token: string, today: string): Promise<{ snapshot: QuoteSnapshot; expired: boolean } | null>`, `getPublicPdf(sql, token: string): Promise<{ pdf: Buffer; filename: string } | null>`, `getRevisionPdf(sql, id: string, rev: number): Promise<{ pdf: Buffer; filename: string } | null>`

- [ ] **Step 1: Scrivere i test**

`test/quotes.test.ts`:

```ts
import type postgres from 'postgres'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { emptyClient } from '#shared/clients'
import type { DraftInput } from '#shared/quote'
import { DEFAULT_SETTINGS } from '#shared/settings'
import { createClient, deleteClient, updateClient } from '../server/utils/clients'
import { issueQuote } from '../server/utils/quote-issue'
import { getPublicPdf, getPublicQuote, getRevisionPdf } from '../server/utils/quote-public'
import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  getQuote,
  listQuotes,
  previewSnapshot,
  saveDraft,
  setQuoteStatus,
} from '../server/utils/quotes'
import { writeSettings } from '../server/utils/settings'
import { openTestDb, resetTestDb, TEST_DATABASE_URL } from './helpers/db'

const NOW = new Date('2026-10-15T10:00:00Z')
const TODAY = '2026-10-15'
const render = async () => Buffer.from('%PDF-test')

describe.skipIf(!TEST_DATABASE_URL)('preventivi su Postgres', () => {
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

  // Bozza pronta da emettere: 2 giorni a 400 €, IVA 22% -> 976 €
  async function readyQuote(name = 'Comune di Prova') {
    const client = await createClient(sql, { ...emptyClient(), name })
    const { id } = await createQuote(sql, NOW)
    const { draft } = await getQuote(sql, id, TODAY)
    const ready: DraftInput = {
      title: 'Nuovo sito',
      clientId: client.id,
      content: {
        ...draft.content,
        phases: [{
          id: 'p1',
          title: 'Design',
          description: '',
          items: [{ id: 'i1', kind: 'days', description: 'Interfaccia', days: 2, rate: 40000 }],
        }],
      },
    }
    await saveDraft(sql, id, ready)
    return { id, client, ready }
  }

  it('crea la bozza con i valori di partenza delle impostazioni', async () => {
    await writeSettings(sql, {
      ...DEFAULT_SETTINGS,
      defaults: { ...DEFAULT_SETTINGS.defaults, dayRate: 45000, validityDays: 10, paymentTerms: '50% subito' },
    })
    const { id } = await createQuote(sql, NOW)
    const q = await getQuote(sql, id, TODAY)
    expect(q).toMatchObject({ status: 'draft', number: null, token: null, currentRev: 0, issuedDraft: null })
    expect(q.draft.content).toMatchObject({ dayRate: 45000, validUntil: '2026-10-25', paymentTerms: '50% subito' })
  })

  it('rifiuta una bozza con un cliente inesistente', async () => {
    const { id } = await createQuote(sql, NOW)
    const { draft } = await getQuote(sql, id, TODAY)
    await expect(saveDraft(sql, id, { ...draft, clientId: '00000000-0000-4000-8000-000000000000' }))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('la prima emissione assegna numero, token e rev. 1', async () => {
    const { id } = await readyQuote()
    const res = await issueQuote(sql, id, { now: NOW, render })
    expect(res).toMatchObject({ rev: 1, number: '2026-001' })
    expect(res.token).toMatch(/^[\w-]{43}$/)
    const q = await getQuote(sql, id, TODAY)
    expect(q).toMatchObject({ status: 'sent', currentRev: 1, number: '2026-001', token: res.token })
    expect(q.issuedDraft?.title).toBe('Nuovo sito')
    expect(q.revisions).toEqual([{ rev: 1, issuedAt: NOW.toISOString(), total: 97600 }])
  })

  it('una nuova emissione crea la rev. 2 con lo stesso numero e token', async () => {
    const { id, ready } = await readyQuote()
    const first = await issueQuote(sql, id, { now: NOW, render })
    await saveDraft(sql, id, { ...ready, title: 'Nuovo sito v2' })
    const second = await issueQuote(sql, id, { now: NOW, render })
    expect(second).toEqual({ rev: 2, number: first.number, token: first.token })
    const pub = await getPublicQuote(sql, first.token, TODAY)
    expect(pub?.snapshot).toMatchObject({ rev: 2, title: 'Nuovo sito v2' })
  })

  it('non emette una bozza incompleta e non consuma il numero', async () => {
    const { id } = await createQuote(sql, NOW)
    await expect(issueQuote(sql, id, { now: NOW, render })).rejects.toMatchObject({
      statusCode: 422,
      data: { problems: expect.arrayContaining(['Scegli il cliente', 'Aggiungi almeno una voce']) },
    })
    const ok = await readyQuote()
    expect((await issueQuote(sql, ok.id, { now: NOW, render })).number).toBe('2026-001')
  })

  it('se il PDF fallisce non resta nulla', async () => {
    const { id } = await readyQuote()
    const broken = async (): Promise<Buffer> => {
      throw new Error('pdf rotto')
    }
    await expect(issueQuote(sql, id, { now: NOW, render: broken })).rejects.toThrow('pdf rotto')
    expect(await getQuote(sql, id, TODAY)).toMatchObject({ currentRev: 0, number: null, status: 'draft', revisions: [] })
    expect((await issueQuote(sql, id, { now: NOW, render })).number).toBe('2026-001')
  })

  it('la numerazione riparte ogni anno, con l\'anno di Roma', async () => {
    const a = await readyQuote('A')
    const b = await readyQuote('B')
    expect((await issueQuote(sql, a.id, { now: NOW, render })).number).toBe('2026-001')
    expect((await issueQuote(sql, b.id, { now: new Date('2026-12-31T23:30:00Z'), render })).number).toBe('2027-001')
  })

  it('due emissioni in parallelo hanno numeri diversi', async () => {
    const a = await readyQuote('A')
    const b = await readyQuote('B')
    const results = await Promise.all([
      issueQuote(sql, a.id, { now: NOW, render }),
      issueQuote(sql, b.id, { now: NOW, render }),
    ])
    expect(results.map((r) => r.number).sort()).toEqual(['2026-001', '2026-002'])
  })

  it('cambiare cliente e impostazioni dopo l\'emissione non tocca la revisione', async () => {
    const { id, client } = await readyQuote('Nome vecchio')
    const { token } = await issueQuote(sql, id, { now: NOW, render })
    await updateClient(sql, client.id, { ...emptyClient(), name: 'Nome nuovo' })
    await writeSettings(sql, { ...DEFAULT_SETTINGS, company: { ...DEFAULT_SETTINGS.company, name: 'Altro nome' } })
    const pub = await getPublicQuote(sql, token, TODAY)
    expect(pub?.snapshot.client.name).toBe('Nome vecchio')
    expect(pub?.snapshot.company.name).toBe('Didap')
  })

  it('non elimina un cliente con preventivi né un preventivo emesso', async () => {
    const { id, client } = await readyQuote()
    await expect(deleteClient(sql, client.id)).rejects.toMatchObject({ statusCode: 409 })
    await issueQuote(sql, id, { now: NOW, render })
    await expect(deleteQuote(sql, id)).rejects.toMatchObject({ statusCode: 409 })
    const draft = await createQuote(sql, NOW)
    await deleteQuote(sql, draft.id)
    await expect(getQuote(sql, draft.id, TODAY)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lo stato si cambia solo dopo l\'emissione', async () => {
    const { id } = await readyQuote()
    await expect(setQuoteStatus(sql, id, 'accepted')).rejects.toMatchObject({ statusCode: 409 })
    await issueQuote(sql, id, { now: NOW, render })
    await setQuoteStatus(sql, id, 'accepted')
    expect((await getQuote(sql, id, TODAY)).status).toBe('accepted')
  })

  it('duplica come nuova bozza senza numero, con scadenza ricalcolata', async () => {
    const { id, ready } = await readyQuote()
    await issueQuote(sql, id, { now: NOW, render })
    const copy = await duplicateQuote(sql, id, new Date('2026-11-01T10:00:00Z'))
    const q = await getQuote(sql, copy.id, '2026-11-01')
    expect(q).toMatchObject({ status: 'draft', number: null, token: null, currentRev: 0 })
    expect(q.draft.title).toBe(ready.title)
    expect(q.draft.clientId).toBe(ready.clientId)
    expect(q.draft.content.phases).toEqual(ready.content.phases)
    expect(q.draft.content.validUntil).toBe('2026-12-01')
  })

  it('elenca con totale e stato scaduto dal giorno dopo la scadenza', async () => {
    const { id } = await readyQuote()
    await issueQuote(sql, id, { now: NOW, render })
    // scadenza: 15/10 + 30 giorni = 14/11
    const [onDay] = await listQuotes(sql, '2026-11-14')
    expect(onDay).toMatchObject({ id, number: '2026-001', title: 'Nuovo sito', clientName: 'Comune di Prova', total: 97600, displayStatus: 'sent' })
    const [after] = await listQuotes(sql, '2026-11-15')
    expect(after?.displayStatus).toBe('expired')
    expect((await getPublicQuote(sql, (await getQuote(sql, id, TODAY)).token!, '2026-11-15'))?.expired).toBe(true)
  })

  it('il link pubblico risponde solo a token validi di preventivi emessi', async () => {
    expect(await getPublicQuote(sql, 'non-valido', TODAY)).toBeNull()
    expect(await getPublicQuote(sql, 'a'.repeat(43), TODAY)).toBeNull()
    expect(await getPublicPdf(sql, 'a'.repeat(43))).toBeNull()
    const { id } = await readyQuote()
    const { token } = await issueQuote(sql, id, { now: NOW, render })
    const pdf = await getPublicPdf(sql, token)
    expect(pdf?.filename).toBe('Preventivo-2026-001-rev1.pdf')
    expect(pdf?.pdf.toString()).toBe('%PDF-test')
    expect((await getRevisionPdf(sql, id, 1))?.filename).toBe('Preventivo-2026-001-rev1.pdf')
    expect(await getRevisionPdf(sql, id, 2)).toBeNull()
  })

  it('l\'anteprima usa la bozza, senza numero se mai emessa', async () => {
    const { id } = await createQuote(sql, NOW)
    const s = await previewSnapshot(sql, id, NOW)
    expect(s).toMatchObject({ number: 'BOZZA', rev: 1, client: { name: 'Cliente da scegliere' } })
  })
})
```

- [ ] **Step 2: Eseguire i test e verificare che falliscano**

Run: `npm test -- test/quotes.test.ts`
Expected: FAIL, `Failed to resolve import "../server/utils/quote-issue"`.

- [ ] **Step 3: Implementare `server/utils/quotes.ts`**

```ts
import { createError } from 'h3'
import type postgres from 'postgres'
import { emptyClient } from '#shared/clients'
import { addDays, romeDate } from '#shared/dates'
import {
  buildSnapshot,
  computeTotals,
  draftInputSchema,
  effectiveStatus,
  newDraftContent,
  quoteContentSchema,
  quoteNumber,
  type DisplayStatus,
  type DraftInput,
  type QuoteSnapshot,
  type QuoteStatus,
} from '#shared/quote'
import { parseSettings } from '#shared/settings'
import { rowToClientInput } from './clients'
import { readSettings } from './settings'

// Preventivi in /admin: bozza, elenco, duplicazione, stato, anteprima.
// L'emissione è in quote-issue.ts, le letture pubbliche in quote-public.ts.

type Sql = postgres.Sql

export type QuoteListRow = {
  id: string
  number: string | null
  title: string
  clientName: string | null
  total: number
  status: QuoteStatus
  displayStatus: DisplayStatus
  updatedAt: string
}

export type QuoteDetail = {
  id: string
  number: string | null
  token: string | null
  status: QuoteStatus
  displayStatus: DisplayStatus
  currentRev: number
  draft: DraftInput
  issuedDraft: DraftInput | null
  revisions: { rev: number; issuedAt: string; total: number }[]
  updatedAt: string
}

const notFound = () => createError({ statusCode: 404, statusMessage: 'Preventivo non trovato' })
const iso = (d: Date | string) => new Date(d).toISOString()
const numberOf = (r: postgres.Row) => (r.year ? quoteNumber(r.year, r.seq) : null)

export const rowToDraft = (r: postgres.Row): DraftInput =>
  draftInputSchema.parse({ title: r.title, clientId: r.client_id, content: r.draft })

export async function createQuote(sql: Sql, now: Date): Promise<{ id: string }> {
  const { defaults } = await readSettings(sql)
  const content = newDraftContent(defaults, romeDate(now))
  const [row] = await sql`insert into quotes (draft) values (${sql.json(content)}) returning id`
  return { id: row!.id }
}

export async function getQuote(sql: Sql, id: string, today: string): Promise<QuoteDetail> {
  const [q] = await sql`select * from quotes where id = ${id}`
  if (!q) throw notFound()
  const revisions = await sql`
    select rev, issued_at,
      snapshot->'totals'->>'total' as total,
      snapshot->'content'->>'validUntil' as valid_until
    from quote_revisions where quote_id = ${id}
    order by rev desc
  `
  return {
    id: q.id,
    number: numberOf(q),
    token: q.token,
    status: q.status,
    displayStatus: effectiveStatus(q.status, revisions[0]?.valid_until ?? '', today),
    currentRev: q.current_rev,
    draft: rowToDraft(q),
    issuedDraft: q.issued_draft ? draftInputSchema.parse(q.issued_draft) : null,
    revisions: revisions.map((r) => ({ rev: r.rev, issuedAt: iso(r.issued_at), total: Number(r.total) })),
    updatedAt: iso(q.updated_at),
  }
}

export async function saveDraft(sql: Sql, id: string, input: DraftInput): Promise<{ updatedAt: string }> {
  try {
    const [row] = await sql`
      update quotes
      set title = ${input.title}, client_id = ${input.clientId},
        draft = ${sql.json(input.content)}, updated_at = now()
      where id = ${id}
      returning updated_at
    `
    if (!row) throw notFound()
    return { updatedAt: iso(row.updated_at) }
  }
  catch (err) {
    // 23503: il cliente scelto non esiste (più)
    if ((err as { code?: string }).code === '23503') {
      throw createError({ statusCode: 422, statusMessage: 'Cliente non trovato' })
    }
    throw err
  }
}

export async function listQuotes(sql: Sql, today: string): Promise<QuoteListRow[]> {
  const rows = await sql`
    select q.id, q.title, q.status, q.year, q.seq, q.draft, q.updated_at,
      c.name as client_name,
      r.snapshot->'totals'->>'total' as issued_total,
      r.snapshot->'content'->>'validUntil' as valid_until
    from quotes q
    left join clients c on c.id = q.client_id
    left join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    order by q.updated_at desc
  `
  return rows.map((r) => {
    // Emesso: il totale dell'ultima revisione; bozza: quello della bozza
    const content = quoteContentSchema.safeParse(r.draft)
    const draftTotal = content.success ? computeTotals(content.data).total : 0
    return {
      id: r.id,
      number: numberOf(r),
      title: r.title,
      clientName: r.client_name,
      total: r.issued_total != null ? Number(r.issued_total) : draftTotal,
      status: r.status,
      displayStatus: effectiveStatus(r.status, r.valid_until ?? '', today),
      updatedAt: iso(r.updated_at),
    }
  })
}

// Esiste ma non si può: 409; non esiste: 404
async function conflictOrNotFound(sql: Sql, id: string, message: string): Promise<never> {
  const [exists] = await sql`select 1 from quotes where id = ${id}`
  throw exists ? createError({ statusCode: 409, statusMessage: message }) : notFound()
}

export async function deleteQuote(sql: Sql, id: string): Promise<void> {
  const [row] = await sql`delete from quotes where id = ${id} and current_rev = 0 returning id`
  if (!row) await conflictOrNotFound(sql, id, 'Un preventivo emesso non si può eliminare')
}

export async function setQuoteStatus(sql: Sql, id: string, status: Exclude<QuoteStatus, 'draft'>): Promise<void> {
  const [row] = await sql`
    update quotes set status = ${status}, updated_at = now()
    where id = ${id} and current_rev > 0
    returning id
  `
  if (!row) await conflictOrNotFound(sql, id, 'Emetti il preventivo prima di cambiarne lo stato')
}

export async function duplicateQuote(sql: Sql, id: string, now: Date): Promise<{ id: string }> {
  const [q] = await sql`select title, client_id, draft from quotes where id = ${id}`
  if (!q) throw notFound()
  const { defaults } = await readSettings(sql)
  const content = {
    ...quoteContentSchema.parse(q.draft),
    validUntil: addDays(romeDate(now), defaults.validityDays),
  }
  const [row] = await sql`
    insert into quotes (title, client_id, draft)
    values (${q.title}, ${q.client_id}, ${sql.json(content)})
    returning id
  `
  return { id: row!.id }
}

// PDF della bozza prima di emetterla: stesso documento, numero provvisorio
export async function previewSnapshot(sql: Sql, id: string, now: Date): Promise<QuoteSnapshot> {
  const [q] = await sql`select * from quotes where id = ${id}`
  if (!q) throw notFound()
  const draft = rowToDraft(q)
  const [clientRow] = draft.clientId ? await sql`select * from clients where id = ${draft.clientId}` : []
  const [settingsRow] = await sql`select data from settings where id = 1`
  return buildSnapshot({
    number: numberOf(q) ?? 'BOZZA',
    rev: q.current_rev + 1,
    now,
    title: draft.title,
    clientId: draft.clientId ?? '',
    client: clientRow ? rowToClientInput(clientRow) : { ...emptyClient(), name: 'Cliente da scegliere' },
    company: parseSettings(settingsRow?.data).company,
    content: draft.content,
  })
}
```

- [ ] **Step 4: Implementare `server/utils/quote-issue.ts`**

```ts
import { randomBytes } from 'node:crypto'
import { createError } from 'h3'
import type postgres from 'postgres'
import { romeYear } from '#shared/dates'
import { buildSnapshot, draftInputSchema, issueProblems, quoteNumber, type QuoteSnapshot } from '#shared/quote'
import { parseSettings } from '#shared/settings'
import { rowToClientInput } from './clients'

// Emissione di una revisione in una sola transazione: numero (solo la
// prima volta), snapshot e PDF. Se qualcosa fallisce non resta nulla,
// né un numero consumato né una revisione a metà.

export type RenderPdf = (snapshot: QuoteSnapshot) => Promise<Buffer>

export async function issueQuote(sql: postgres.Sql, id: string, opts: { now: Date; render: RenderPdf }) {
  return sql.begin(async (tx) => {
    // Blocca il preventivo: due emissioni dello stesso vanno in fila
    const [q] = await tx`select * from quotes where id = ${id} for update`
    if (!q) throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato' })

    const draft = draftInputSchema.parse({ title: q.title, clientId: q.client_id, content: q.draft })
    const problems = issueProblems(draft)
    if (problems.length) {
      throw createError({ statusCode: 422, statusMessage: 'Preventivo incompleto', data: { problems } })
    }

    const [clientRow] = await tx`select * from clients where id = ${draft.clientId}`
    const [settingsRow] = await tx`select data from settings where id = 1`

    let year: number = q.year
    let seq: number = q.seq
    let token: string = q.token
    if (q.current_rev === 0) {
      // La riga del contatore resta bloccata fino al commit: due prime
      // emissioni contemporanee prendono numeri diversi
      year = romeYear(opts.now)
      const [counter] = await tx`
        insert into quote_counters (year, last_seq) values (${year}, 1)
        on conflict (year) do update set last_seq = quote_counters.last_seq + 1
        returning last_seq
      `
      seq = counter!.last_seq
      token = randomBytes(32).toString('base64url')
    }

    const rev: number = q.current_rev + 1
    const snapshot = buildSnapshot({
      number: quoteNumber(year, seq),
      rev,
      now: opts.now,
      title: draft.title,
      clientId: draft.clientId!,
      client: rowToClientInput(clientRow!),
      company: parseSettings(settingsRow?.data).company,
      content: draft.content,
    })
    const pdf = await opts.render(snapshot)

    await tx`
      insert into quote_revisions (quote_id, rev, snapshot, pdf, issued_at)
      values (${id}, ${rev}, ${tx.json(snapshot)}, ${pdf}, ${opts.now})
    `
    await tx`
      update quotes set
        year = ${year}, seq = ${seq}, token = ${token}, current_rev = ${rev},
        issued_draft = ${tx.json(draft)},
        status = case when status = 'draft' then 'sent' else status end,
        updated_at = now()
      where id = ${id}
    `
    return { rev, number: snapshot.number, token }
  })
}
```

- [ ] **Step 5: Implementare `server/utils/quote-public.ts`**

```ts
import type postgres from 'postgres'
import { effectiveStatus, pdfFilename, TOKEN_PATTERN, type QuoteSnapshot } from '#shared/quote'

// Letture per il link pubblico /p/:token, sempre sull'ultima revisione
// emessa. Token malformati o sconosciuti danno null (404 generico).

type Sql = postgres.Sql
type Pdf = { pdf: Buffer; filename: string }

export async function getPublicQuote(
  sql: Sql,
  token: string,
  today: string,
): Promise<{ snapshot: QuoteSnapshot; expired: boolean } | null> {
  if (!TOKEN_PATTERN.test(token)) return null
  const [row] = await sql`
    select q.status, r.snapshot
    from quotes q
    join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    where q.token = ${token}
  `
  if (!row) return null
  const snapshot = row.snapshot as QuoteSnapshot
  return { snapshot, expired: effectiveStatus(row.status, snapshot.content.validUntil, today) === 'expired' }
}

export async function getPublicPdf(sql: Sql, token: string): Promise<Pdf | null> {
  if (!TOKEN_PATTERN.test(token)) return null
  const [row] = await sql`
    select r.pdf, r.rev, r.snapshot->>'number' as number
    from quotes q
    join quote_revisions r on r.quote_id = q.id and r.rev = q.current_rev
    where q.token = ${token}
  `
  return row ? { pdf: row.pdf, filename: pdfFilename(row.number, row.rev) } : null
}

export async function getRevisionPdf(sql: Sql, id: string, rev: number): Promise<Pdf | null> {
  const [row] = await sql`
    select pdf, rev, snapshot->>'number' as number
    from quote_revisions where quote_id = ${id} and rev = ${rev}
  `
  return row ? { pdf: row.pdf, filename: pdfFilename(row.number, row.rev) } : null
}
```

- [ ] **Step 6: Eseguire i test e verificare che passino**

Run: `npm test`
Expected: PASS, 6 file di test, nessuno "skipped".

- [ ] **Step 7: Commit**

```bash
git add server/utils/quotes.ts server/utils/quote-issue.ts server/utils/quote-public.ts test/quotes.test.ts
git commit -m "feat(quotes): draft, issue and public read services

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: API admin e pubbliche

**Files:**
- Create: `server/utils/http.ts`
- Create: `server/api/admin/settings.get.ts`, `server/api/admin/settings.put.ts`
- Create: `server/api/admin/clients/index.get.ts`, `index.post.ts`, `[id].get.ts`, `[id].put.ts`, `[id].delete.ts`
- Create: `server/api/admin/quotes/index.get.ts`, `index.post.ts`, `[id]/index.get.ts`, `[id]/index.put.ts`, `[id]/index.delete.ts`, `[id]/issue.post.ts`, `[id]/duplicate.post.ts`, `[id]/status.put.ts`, `[id]/preview.get.ts`, `[id]/revisions/[rev].get.ts`
- Create: `server/api/quotes/[token].get.ts`, `server/routes/p/[token]/pdf.get.ts`

**Interfaces:**
- Consumes: servizi dei Task 3, 4, 5; `useDb` (esistente); schemi `settingsSchema`, `clientInputSchema`, `draftInputSchema`, `statusInputSchema`; `romeDate`.
- Produces (HTTP, tutte JSON salvo i PDF):
  - `GET/PUT /api/admin/settings` → `Settings`
  - `GET /api/admin/clients` → `Client[]`; `POST` → `Client`; `GET/PUT /api/admin/clients/:id` → `Client`; `DELETE` → `{ ok: true }` (409 se ha preventivi)
  - `GET /api/admin/quotes` → `QuoteListRow[]`; `POST` → `{ id }`
  - `GET /api/admin/quotes/:id` → `QuoteDetail`; `PUT` (body `DraftInput`) → `{ updatedAt }`; `DELETE` → `{ ok: true }`
  - `POST /api/admin/quotes/:id/issue` → `{ rev, number, token }` (422 con `data.problems`)
  - `POST /api/admin/quotes/:id/duplicate` → `{ id }`
  - `PUT /api/admin/quotes/:id/status` (body `{ status }`) → `{ ok: true }`
  - `GET /api/admin/quotes/:id/preview` → PDF inline
  - `GET /api/admin/quotes/:id/revisions/:rev` → PDF inline
  - `GET /api/quotes/:token` → `{ snapshot, expired }`
  - `GET /p/:token/pdf` → PDF attachment
  - `server/utils/http.ts`: `uuidParam(event, name?)`, `readSchemaBody(event, schema)`, `sendPdf(event, file, disposition)`

- [ ] **Step 1: Implementare `server/utils/http.ts`**

```ts
import { createError, getRouterParam, readBody, setResponseHeaders, type H3Event } from 'h3'
import type { z } from 'zod'

// Parametri, corpo e PDF delle API: id non validi danno 404, corpi non
// validi 422 con i dettagli di zod (come le API dei prodotti).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function uuidParam(event: H3Event, name = 'id') {
  const value = getRouterParam(event, name) ?? ''
  if (!UUID.test(value)) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  return value
}

export async function readSchemaBody<T extends z.ZodTypeAny>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Dati non validi', data: parsed.error.flatten() })
  }
  return parsed.data
}

export function sendPdf(
  event: H3Event,
  file: { pdf: Buffer; filename: string },
  disposition: 'inline' | 'attachment',
) {
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${disposition}; filename="${file.filename}"`,
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
  })
  return file.pdf
}
```

- [ ] **Step 2: Impostazioni**

`server/api/admin/settings.get.ts`:

```ts
// Impostazioni dei preventivi: dati Didap e valori di partenza
export default defineEventHandler(async () => readSettings(await useDb()))
```

`server/api/admin/settings.put.ts`:

```ts
import { settingsSchema } from '#shared/settings'

export default defineEventHandler(async (event) => {
  const data = await readSchemaBody(event, settingsSchema)
  await writeSettings(await useDb(), data)
  return data
})
```

- [ ] **Step 3: Clienti**

`server/api/admin/clients/index.get.ts`:

```ts
export default defineEventHandler(async () => listClients(await useDb()))
```

`server/api/admin/clients/index.post.ts`:

```ts
import { clientInputSchema } from '#shared/clients'

export default defineEventHandler(async (event) => {
  const input = await readSchemaBody(event, clientInputSchema)
  return createClient(await useDb(), input)
})
```

`server/api/admin/clients/[id].get.ts`:

```ts
export default defineEventHandler(async (event) => getClient(await useDb(), uuidParam(event)))
```

`server/api/admin/clients/[id].put.ts`:

```ts
import { clientInputSchema } from '#shared/clients'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const input = await readSchemaBody(event, clientInputSchema)
  return updateClient(await useDb(), id, input)
})
```

`server/api/admin/clients/[id].delete.ts`:

```ts
export default defineEventHandler(async (event) => {
  await deleteClient(await useDb(), uuidParam(event))
  return { ok: true }
})
```

- [ ] **Step 4: Preventivi (bozza, elenco, stato, duplicazione)**

`server/api/admin/quotes/index.get.ts`:

```ts
import { romeDate } from '#shared/dates'

export default defineEventHandler(async () => listQuotes(await useDb(), romeDate(new Date())))
```

`server/api/admin/quotes/index.post.ts`:

```ts
// Nuova bozza con i valori di partenza delle impostazioni
export default defineEventHandler(async () => createQuote(await useDb(), new Date()))
```

`server/api/admin/quotes/[id]/index.get.ts`:

```ts
import { romeDate } from '#shared/dates'

export default defineEventHandler(async (event) =>
  getQuote(await useDb(), uuidParam(event), romeDate(new Date())),
)
```

`server/api/admin/quotes/[id]/index.put.ts`:

```ts
import { draftInputSchema } from '#shared/quote'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const input = await readSchemaBody(event, draftInputSchema)
  return saveDraft(await useDb(), id, input)
})
```

`server/api/admin/quotes/[id]/index.delete.ts`:

```ts
// Solo bozze mai emesse
export default defineEventHandler(async (event) => {
  await deleteQuote(await useDb(), uuidParam(event))
  return { ok: true }
})
```

`server/api/admin/quotes/[id]/duplicate.post.ts`:

```ts
export default defineEventHandler(async (event) =>
  duplicateQuote(await useDb(), uuidParam(event), new Date()),
)
```

`server/api/admin/quotes/[id]/status.put.ts`:

```ts
import { statusInputSchema } from '#shared/quote'

export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const { status } = await readSchemaBody(event, statusInputSchema)
  await setQuoteStatus(await useDb(), id, status)
  return { ok: true }
})
```

- [ ] **Step 5: Emissione e PDF admin**

`server/api/admin/quotes/[id]/issue.post.ts`:

```ts
// Emette una nuova revisione: numero (la prima volta), snapshot e PDF
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const sql = await useDb()
  const assets = await loadPdfAssets()
  return issueQuote(sql, id, { now: new Date(), render: (s) => renderQuotePdf(s, assets) })
})
```

`server/api/admin/quotes/[id]/preview.get.ts`:

```ts
import { pdfFilename } from '#shared/quote'

// PDF della bozza al volo, non salvato
export default defineEventHandler(async (event) => {
  const snapshot = await previewSnapshot(await useDb(), uuidParam(event), new Date())
  const pdf = await renderQuotePdf(snapshot, await loadPdfAssets())
  return sendPdf(event, { pdf, filename: pdfFilename(snapshot.number, snapshot.rev) }, 'inline')
})
```

`server/api/admin/quotes/[id]/revisions/[rev].get.ts`:

```ts
// PDF di una revisione emessa, così com'era
export default defineEventHandler(async (event) => {
  const id = uuidParam(event)
  const rev = Number(getRouterParam(event, 'rev'))
  if (!Number.isInteger(rev) || rev < 1) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  const file = await getRevisionPdf(await useDb(), id, rev)
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Revisione non trovata' })
  return sendPdf(event, file, 'inline')
})
```

- [ ] **Step 6: API pubbliche**

`server/api/quotes/[token].get.ts`:

```ts
import { romeDate } from '#shared/dates'

// Preventivo per il cliente: ultima revisione emessa. Fuori da
// /api/admin, quindi senza sessione: basta il token.
export default defineEventHandler(async (event) => {
  const found = await getPublicQuote(await useDb(), getRouterParam(event, 'token') ?? '', romeDate(new Date()))
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  setResponseHeaders(event, { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' })
  return found
})
```

`server/routes/p/[token]/pdf.get.ts`:

```ts
// Scarica il PDF dell'ultima revisione dal link del cliente
export default defineEventHandler(async (event) => {
  const file = await getPublicPdf(await useDb(), getRouterParam(event, 'token') ?? '')
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Non trovato' })
  return sendPdf(event, file, 'attachment')
})
```

- [ ] **Step 7: Verificare le API con il server di sviluppo**

Avvia `npx nuxt dev --port 3000` in background, poi esegui (la password è `ADMIN_PASSWORD` nel `.env`):

```bash
B=http://localhost:3000
PW=$(grep ^ADMIN_PASSWORD= .env | cut -d= -f2)
J='content-type: application/json'
CK=$(mktemp)
curl -s -c $CK -H "$J" -d "{\"password\":\"$PW\"}" $B/api/admin/login
echo; curl -s -o /dev/null -w 'senza sessione: %{http_code}\n' $B/api/admin/quotes
CLIENT=$(curl -s -b $CK -H "$J" -d '{"name":"Comune di Prova","vatNumber":"","taxCode":"","address":"Piazza 1","sdiPec":"","contactName":"","email":"","phone":"","notes":""}' $B/api/admin/clients | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
QUOTE=$(curl -s -b $CK -X POST $B/api/admin/quotes | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s -b $CK $B/api/admin/quotes/$QUOTE | node -e '
  const q = JSON.parse(require("fs").readFileSync(0))
  q.draft.title = "Sito di prova"
  q.draft.clientId = process.argv[1]
  q.draft.content.phases[0].items.push({ id: "i1", kind: "days", description: "Design", days: 2, rate: 40000 })
  process.stdout.write(JSON.stringify(q.draft))' $CLIENT > /tmp/draft.json
curl -s -b $CK -X PUT -H "$J" --data @/tmp/draft.json $B/api/admin/quotes/$QUOTE; echo
curl -s -b $CK -o /tmp/preview.pdf -w 'anteprima: %{http_code} %{content_type}\n' $B/api/admin/quotes/$QUOTE/preview
ISSUE=$(curl -s -b $CK -X POST $B/api/admin/quotes/$QUOTE/issue); echo "$ISSUE"
TOKEN=$(echo "$ISSUE" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s $B/api/quotes/$TOKEN | head -c 200; echo
curl -s -D - -o /tmp/public.pdf $B/p/$TOKEN/pdf | grep -i 'content-\|x-robots'
curl -s -o /dev/null -w 'token falso: %{http_code}\n' $B/api/quotes/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
head -c 5 /tmp/public.pdf; echo
```

Expected:
- login `{"ok":true}`; senza sessione `401`
- PUT restituisce `{"updatedAt":...}`
- anteprima `200 application/pdf`
- issue `{"rev":1,"number":"2026-001","token":"..."}` (o il numero successivo se nel database di sviluppo esistono già preventivi)
- `/api/quotes/:token` inizia con `{"snapshot":{`
- header `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Preventivo-2026-001-rev1.pdf"`, `X-Robots-Tag: noindex`
- token falso `404`; `/tmp/public.pdf` inizia con `%PDF-`
- nel log del server: `[pdf] Obviously non trovato in server/assets/fonts: uso Inter`

Apri `/tmp/preview.pdf` e controlla a occhio logo, tabella e totali. Ferma il server.

- [ ] **Step 8: Commit**

```bash
git add server/utils/http.ts server/api/admin/settings.get.ts server/api/admin/settings.put.ts server/api/admin/clients server/api/admin/quotes server/api/quotes server/routes
git commit -m "feat(quotes): admin and public API routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Guscio admin, impostazioni e clienti

**Files:**
- Create: `app/composables/useAdminSession.ts`, `app/composables/useAdminToast.ts`, `app/utils/adminErrors.ts`
- Create: `app/components/admin/AdminHeader.vue`, `app/components/admin/AdminLogin.vue`, `app/components/admin/AdminShell.vue`, `app/components/admin/NumberInput.vue`
- Create: `app/pages/admin/impostazioni.vue`, `app/pages/admin/clienti.vue`
- Modify: `app/pages/admin/index.vue` (sessione, login, header, guardie)

**Interfaces:**
- Consumes: API del Task 6; `parseEuroInput`, `parseDaysInput`, `parsePercentInput`, `formatEuroPlain`, `formatDecimal` (Task 1); `type Settings` (Task 2); `type Client`, `type ClientInput`, `emptyClient` (Task 2).
- Produces:
  - `useAdminSession()` (con `await`, nelle pagine): `AsyncData` con `data: Ref<AdminSession | undefined>` e `refresh`; `useAdminSessionState(): Ref<AdminSession | undefined>` (nei componenti); `adminLogin(password)`, `adminLogout()`
  - `useAdminToast(): { toast: Ref<{ kind: 'ok' | 'error'; text: string } | null>; notify(kind, text) }`
  - `adminErrorText(err: unknown): string`
  - `<AdminShell>`: slot mostrato solo da autenticati
  - `<NumberInput v-model="n" kind="euro" | "days" | "percent" label="..." />`

- [ ] **Step 1: Composable e util**

`app/composables/useAdminSession.ts`:

```ts
// Sessione admin condivisa da tutte le pagine di /admin. Le pagine la
// caricano con `await useAdminSession()`; i componenti leggono lo stesso
// dato con useAdminSessionState().

type AdminSession = { configured: boolean; database: boolean; authenticated: boolean }
const KEY = 'admin-session'

export const useAdminSession = () => useFetch<AdminSession>('/api/admin/session', { key: KEY })

export const useAdminSessionState = () => useNuxtData<AdminSession>(KEY).data

export const refreshAdminSession = () => refreshNuxtData(KEY)

export async function adminLogin(password: string) {
  await $fetch('/api/admin/login', { method: 'POST', body: { password } })
  await refreshAdminSession()
}

export async function adminLogout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await refreshAdminSession()
}
```

`app/composables/useAdminToast.ts`:

```ts
// Messaggio breve in basso nelle pagine admin (lo mostra AdminShell)

type Toast = { kind: 'ok' | 'error'; text: string }
let timer: ReturnType<typeof setTimeout> | undefined

export function useAdminToast() {
  const toast = useState<Toast | null>('admin-toast', () => null)
  function notify(kind: Toast['kind'], text: string) {
    toast.value = { kind, text }
    clearTimeout(timer)
    timer = setTimeout(() => (toast.value = null), kind === 'ok' ? 2500 : 6000)
  }
  return { toast, notify }
}
```

`app/utils/adminErrors.ts`:

```ts
// Messaggio leggibile da un errore di $fetch verso le API admin

export function adminErrorText(err: unknown): string {
  const e = err as {
    statusCode?: number
    statusMessage?: string
    data?: { data?: { problems?: string[] } }
  }
  if (e.statusCode === 401) {
    refreshAdminSession()
    return 'Sessione scaduta, accedi di nuovo'
  }
  const problems = e.data?.data?.problems
  if (problems?.length) return problems.join(' · ')
  if (e.statusCode === 422 && e.statusMessage === 'Dati non validi') return 'Alcuni campi non sono validi'
  return e.statusMessage ?? 'Operazione non riuscita'
}
```

- [ ] **Step 2: `AdminHeader.vue`**

```vue
<script setup lang="ts">
// Barra di /admin: logo, sezioni, link al sito, uscita
defineProps<{ authenticated: boolean }>()
const emit = defineEmits<{ logout: [] }>()

const LINKS = [
  { to: '/admin', label: 'Prodotti' },
  { to: '/admin/preventivi', label: 'Preventivi' },
  { to: '/admin/clienti', label: 'Clienti' },
  { to: '/admin/impostazioni', label: 'Impostazioni' },
]
const route = useRoute()
const isActive = (to: string) => (to === '/admin' ? route.path === '/admin' : route.path.startsWith(to))
</script>

<template>
  <header class="
    flex h-14 shrink-0 items-center gap-4 border-b border-ink/10
    bg-paper-light px-5
  ">
    <NuxtLink
      to="/admin"
      class="flex shrink-0 items-center gap-3"
    >
      <img
        src="/brand/logo-contratto.svg"
        alt=""
        width="27"
        height="30"
        class="h-7 w-auto"
      >
      <span class="text-sm font-bold">Didap<span class="
        hidden
        sm:inline
      "> · Admin</span></span>
    </NuxtLink>
    <nav
      v-if="authenticated"
      class="flex min-w-0 flex-1 gap-1 overflow-x-auto"
      aria-label="Sezioni admin"
    >
      <NuxtLink
        v-for="l in LINKS"
        :key="l.to"
        :to="l.to"
        class="shrink-0 rounded-full px-3 py-1.5 text-sm transition"
        :class="isActive(l.to) ? 'bg-ink text-paper-light' : 'hover:bg-ink/5'"
        :aria-current="isActive(l.to) ? 'page' : undefined"
      >
        {{ l.label }}
      </NuxtLink>
    </nav>
    <div
      v-if="authenticated"
      class="ml-auto flex shrink-0 items-center gap-4 text-sm"
    >
      <a
        href="/"
        target="_blank"
        class="
          hidden opacity-60
          hover:opacity-100
          sm:inline
        "
      >Vai al sito ↗</a>
      <button
        type="button"
        class="
          rounded-full border border-ink/20 px-3 py-1
          hover:border-ink
        "
        @click="emit('logout')"
      >
        Esci
      </button>
    </div>
  </header>
</template>
```

- [ ] **Step 3: `AdminLogin.vue`**

Sposta qui il modulo di accesso e gli "stati di sistema" che oggi sono in `app/pages/admin/index.vue`:

```vue
<script setup lang="ts">
// Accesso a /admin. Se mancano password o database lo spiega invece
// di mostrare il modulo.
const emit = defineEmits<{ authenticated: [] }>()
const session = useAdminSessionState()

const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await adminLogin(password.value)
    password.value = ''
    emit('authenticated')
  }
  catch (err) {
    error.value = (err as { statusMessage?: string }).statusMessage ?? 'Accesso non riuscito'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <main
    v-if="!session?.configured || !session?.database"
    class="flex flex-1 items-center justify-center p-6"
  >
    <div class="max-w-md rounded-2xl border border-ink/10 bg-white p-8">
      <h1 class="text-2xl font-bold">
        {{ !session?.configured ? 'Admin non configurato' : 'Database non disponibile' }}
      </h1>
      <p class="mt-3 opacity-70">
        <template v-if="!session?.configured">
          Imposta la variabile d'ambiente ADMIN_PASSWORD sul server per attivare l'accesso.
        </template>
        <template v-else>
          Imposta DATABASE_URL sul server o controlla che il database sia raggiungibile.
        </template>
      </p>
    </div>
  </main>

  <main
    v-else
    class="flex flex-1 items-center justify-center p-6"
  >
    <form
      class="
        flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-ink/10
        bg-white p-8
      "
      @submit.prevent="submit"
    >
      <div>
        <h1 class="text-2xl font-bold">
          Accedi
        </h1>
        <p class="mt-1 text-sm opacity-60">
          Per gestire le pagine prodotto e i preventivi.
        </p>
      </div>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Password</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          autofocus
          class="admin-input"
        >
      </label>
      <p
        v-if="error"
        class="text-sm text-red"
        role="alert"
      >
        {{ error }}
      </p>
      <button
        type="submit"
        class="
          rounded-full bg-green px-6 py-3 font-medium text-paper-light
          hover:bg-ink
          disabled:opacity-50
        "
        :disabled="busy || !password"
      >
        {{ busy ? 'Accesso…' : 'Entra' }}
      </button>
    </form>
  </main>
</template>
```

- [ ] **Step 4: `AdminShell.vue`**

```vue
<script setup lang="ts">
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminLogin from '~/components/admin/AdminLogin.vue'

// Guscio delle pagine admin (i prodotti hanno il loro): barra, accesso
// e messaggi. Il contenuto compare solo da autenticati.
const session = useAdminSessionState()
const { toast, notify } = useAdminToast()

async function logout() {
  try {
    await adminLogout()
  }
  catch {
    notify('error', 'Uscita non riuscita')
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <AdminHeader
      :authenticated="!!session?.authenticated"
      @logout="logout"
    />
    <AdminLogin v-if="!session?.authenticated" />
    <slot v-else />

    <Transition
      enter-from-class="translate-y-4 opacity-0"
      leave-to-class="translate-y-4 opacity-0"
      enter-active-class="transition"
      leave-active-class="transition"
    >
      <div
        v-if="toast"
        class="
          fixed bottom-6 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)]
          -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium shadow-lg
        "
        :class="toast.kind === 'ok' ? 'bg-ink text-paper-light' : `
          bg-red text-white
        `"
        role="status"
      >
        {{ toast.text }}
      </div>
    </Transition>
  </div>
</template>
```

- [ ] **Step 5: `NumberInput.vue`**

```vue
<script setup lang="ts">
import {
  formatDecimal,
  formatEuroPlain,
  parseDaysInput,
  parseEuroInput,
  parsePercentInput,
} from '#shared/money'

// Campo numerico all'italiana (virgola per i decimali). Con kind="euro"
// il valore è in centesimi. Il modello cambia solo con un testo valido;
// un testo non valido resta visibile e segnato in rosso.
const model = defineModel<number>({ required: true })
const props = defineProps<{ kind: 'euro' | 'days' | 'percent'; label?: string }>()

const PARSERS = { euro: parseEuroInput, days: parseDaysInput, percent: parsePercentInput }
const parse = (t: string) => PARSERS[props.kind](t)
const format = (v: number) => (props.kind === 'euro' ? formatEuroPlain(v) : formatDecimal(v))

const text = ref(format(model.value))
const invalid = ref(false)

// Valore cambiato da fuori (ricarica, cambio di tipo): si riallinea il testo
watch(model, (v) => {
  if (parse(text.value) !== v) {
    text.value = format(v)
    invalid.value = false
  }
})

function onInput(value: string) {
  text.value = value
  const v = parse(value)
  invalid.value = v === null
  if (v !== null && v !== model.value) model.value = v
}

function onBlur() {
  if (!invalid.value) text.value = format(model.value)
}
</script>

<template>
  <input
    :value="text"
    inputmode="decimal"
    autocomplete="off"
    class="admin-input text-right font-mono tabular-nums"
    :class="invalid ? 'ring-2 ring-red' : ''"
    :aria-label="label"
    :aria-invalid="invalid"
    @input="onInput(($event.target as HTMLInputElement).value)"
    @blur="onBlur"
  >
</template>
```

- [ ] **Step 6: Pagina impostazioni `app/pages/admin/impostazioni.vue`**

```vue
<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
import { adminErrorText } from '~/utils/adminErrors'
import type { Settings } from '#shared/settings'

// Dati di Didap stampati nei preventivi e valori di partenza delle bozze
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Impostazioni - Admin Didap' })

const { data: session } = await useAdminSession()
const { notify } = useAdminToast()

const form = ref<Settings | null>(null)
const saving = ref(false)

async function load() {
  try {
    form.value = await $fetch<Settings>('/api/admin/settings')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onMounted(() => {
  watch(() => session.value?.authenticated, (ok) => ok && load(), { immediate: true })
})

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    form.value = await $fetch<Settings>('/api/admin/settings', { method: 'PUT', body: form.value })
    notify('ok', 'Impostazioni salvate')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    saving.value = false
  }
}

const COMPANY_FIELDS = [
  { key: 'name', label: 'Ragione sociale' },
  { key: 'vatNumber', label: 'Partita IVA' },
  { key: 'taxCode', label: 'Codice fiscale' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefono' },
  { key: 'iban', label: 'IBAN' },
] as const
</script>

<template>
  <AdminShell>
    <main class="
      mx-auto w-full max-w-3xl p-6
      lg:p-10
    ">
      <h1 class="text-3xl font-bold">
        Impostazioni
      </h1>
      <p class="mt-2 opacity-60">
        Dati di Didap stampati nei preventivi e valori con cui parte ogni nuova bozza.
        Cambiarli non tocca i preventivi già creati.
      </p>

      <form
        v-if="form"
        class="mt-8 flex flex-col gap-6"
        @submit.prevent="save"
      >
        <AdminSection
          id="azienda"
          title="Didap"
          description="Intestazione e piè di pagina del PDF."
        >
          <div class="
            grid gap-5
            sm:grid-cols-2
          ">
            <AdminField
              v-for="f in COMPANY_FIELDS"
              :key="f.key"
              :label="f.label"
            >
              <input
                v-model="form.company[f.key]"
                class="admin-input"
              >
            </AdminField>
          </div>
          <AdminField label="Indirizzo">
            <textarea
              v-model="form.company.address"
              rows="2"
              class="admin-input"
            />
          </AdminField>
        </AdminSection>

        <AdminSection
          id="partenza"
          title="Valori di partenza"
          description="Copiati in ogni nuova bozza, poi modificabili."
        >
          <div class="
            grid gap-5
            sm:grid-cols-3
          ">
            <AdminField label="Tariffa giornaliera (€)">
              <NumberInput
                v-model="form.defaults.dayRate"
                kind="euro"
              />
            </AdminField>
            <AdminField label="IVA (%)">
              <NumberInput
                v-model="form.defaults.vatRate"
                kind="percent"
              />
            </AdminField>
            <AdminField label="Validità (giorni)">
              <input
                v-model.number="form.defaults.validityDays"
                type="number"
                min="1"
                max="365"
                class="admin-input"
              >
            </AdminField>
          </div>
          <AdminField label="Condizioni di pagamento">
            <textarea
              v-model="form.defaults.paymentTerms"
              rows="3"
              class="admin-input"
            />
          </AdminField>
          <AdminField label="Esclusioni">
            <textarea
              v-model="form.defaults.exclusions"
              rows="3"
              class="admin-input"
            />
          </AdminField>
          <AdminField label="Note">
            <textarea
              v-model="form.defaults.notes"
              rows="3"
              class="admin-input"
            />
          </AdminField>
        </AdminSection>

        <div>
          <button
            type="submit"
            class="
              rounded-full bg-green px-6 py-3 font-medium text-paper-light
              hover:bg-ink
              disabled:opacity-50
            "
            :disabled="saving"
          >
            {{ saving ? 'Salvo…' : 'Salva impostazioni' }}
          </button>
        </div>
      </form>
    </main>
  </AdminShell>
</template>
```

- [ ] **Step 7: Pagina clienti `app/pages/admin/clienti.vue`**

```vue
<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { emptyClient, type Client, type ClientInput } from '#shared/clients'

// Anagrafica clienti dei preventivi
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Clienti - Admin Didap' })

const { data: session } = await useAdminSession()
const { notify } = useAdminToast()

const clients = ref<Client[] | null>(null)
const editing = ref<{ id: string | null; form: ClientInput } | null>(null)
const query = ref('')
const busy = ref(false)
const confirmDelete = ref(false)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const all = clients.value ?? []
  return q
    ? all.filter((c) => [c.name, c.vatNumber, c.contactName, c.email].some((v) => v.toLowerCase().includes(q)))
    : all
})

async function load() {
  try {
    clients.value = await $fetch<Client[]>('/api/admin/clients')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onMounted(() => {
  watch(() => session.value?.authenticated, (ok) => ok && load(), { immediate: true })
})

function edit(client: Client | null) {
  confirmDelete.value = false
  if (!client) {
    editing.value = { id: null, form: emptyClient() }
    return
  }
  const { id, ...form } = client
  editing.value = { id, form }
}

async function save() {
  if (!editing.value) return
  busy.value = true
  try {
    const { id, form } = editing.value
    const saved = await $fetch<Client>(id ? `/api/admin/clients/${id}` : '/api/admin/clients', {
      method: id ? 'PUT' : 'POST',
      body: form,
    })
    await load()
    edit(saved)
    notify('ok', 'Cliente salvato')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function remove() {
  if (!editing.value?.id) return
  busy.value = true
  try {
    await $fetch(`/api/admin/clients/${editing.value.id}`, { method: 'DELETE' })
    editing.value = null
    await load()
    notify('ok', 'Cliente eliminato')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
    confirmDelete.value = false
  }
}

const FIELDS = [
  { key: 'vatNumber', label: 'Partita IVA' },
  { key: 'taxCode', label: 'Codice fiscale' },
  { key: 'sdiPec', label: 'Codice SDI o PEC' },
  { key: 'contactName', label: 'Referente' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefono' },
] as const
</script>

<template>
  <AdminShell>
    <div class="
      grid flex-1 grid-cols-[minmax(0,1fr)]
      lg:grid-cols-[320px_minmax(0,1fr)]
    ">
      <nav
        class="
          flex flex-col gap-3 border-b border-ink/10 bg-paper-light p-4
          lg:border-r lg:border-b-0
        "
        aria-label="Clienti"
      >
        <div class="flex items-center justify-between gap-3">
          <h1 class="text-xl font-bold">
            Clienti
          </h1>
          <button
            type="button"
            class="
              rounded-full bg-green px-4 py-2 text-sm font-medium
              text-paper-light
              hover:bg-ink
            "
            @click="edit(null)"
          >
            + Nuovo
          </button>
        </div>
        <input
          v-model="query"
          type="search"
          placeholder="Cerca"
          aria-label="Cerca cliente"
          class="admin-input"
        >
        <p
          v-if="clients && !clients.length"
          class="px-1 text-sm opacity-60"
        >
          Nessun cliente. Aggiungi il primo con "Nuovo".
        </p>
        <ul class="flex flex-col gap-1">
          <li
            v-for="c in filtered"
            :key="c.id"
          >
            <button
              type="button"
              class="w-full rounded-xl px-3 py-2.5 text-left transition"
              :class="editing?.id === c.id ? 'bg-ink text-paper-light' : `
                hover:bg-ink/5
              `"
              @click="edit(c)"
            >
              <span class="block font-medium">{{ c.name }}</span>
              <span
                v-if="c.contactName || c.vatNumber"
                class="block text-xs opacity-70"
              >{{ c.contactName || c.vatNumber }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <main class="
        p-6
        lg:p-10
      ">
        <p
          v-if="!editing"
          class="opacity-60"
        >
          Scegli un cliente da modificare o aggiungine uno nuovo.
        </p>
        <form
          v-else
          class="flex max-w-2xl flex-col gap-5"
          @submit.prevent="save"
        >
          <h2 class="text-2xl font-bold">
            {{ editing.id ? editing.form.name || 'Cliente' : 'Nuovo cliente' }}
          </h2>
          <AdminField label="Ragione sociale">
            <input
              v-model="editing.form.name"
              required
              maxlength="200"
              class="admin-input"
            >
          </AdminField>
          <div class="
            grid gap-5
            sm:grid-cols-2
          ">
            <AdminField
              v-for="f in FIELDS"
              :key="f.key"
              :label="f.label"
            >
              <input
                v-model="editing.form[f.key]"
                class="admin-input"
              >
            </AdminField>
          </div>
          <AdminField label="Indirizzo">
            <textarea
              v-model="editing.form.address"
              rows="2"
              class="admin-input"
            />
          </AdminField>
          <AdminField
            label="Note interne"
            hint="Non compaiono nel preventivo."
          >
            <textarea
              v-model="editing.form.notes"
              rows="3"
              class="admin-input"
            />
          </AdminField>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              class="
                rounded-full bg-green px-6 py-3 font-medium text-paper-light
                hover:bg-ink
                disabled:opacity-50
              "
              :disabled="busy || !editing.form.name.trim()"
            >
              Salva
            </button>
            <template v-if="editing.id">
              <button
                v-if="!confirmDelete"
                type="button"
                class="
                  rounded-full px-4 py-2 text-sm text-red
                  hover:bg-red/10
                "
                @click="confirmDelete = true"
              >
                Elimina
              </button>
              <template v-else>
                <span class="text-sm">Eliminare il cliente?</span>
                <button
                  type="button"
                  class="rounded-full bg-red px-4 py-2 text-sm text-white"
                  :disabled="busy"
                  @click="remove"
                >
                  Sì, elimina
                </button>
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm"
                  @click="confirmDelete = false"
                >
                  Annulla
                </button>
              </template>
            </template>
          </div>
        </form>
      </main>
    </div>
  </AdminShell>
</template>
```

- [ ] **Step 8: Aggiornare `app/pages/admin/index.vue`**

Leggi il file prima di modificarlo. Quattro modifiche:

**8a.** Import in cima, dopo `import StatusPill from '~/components/StatusPill.vue'`:

```ts
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminLogin from '~/components/admin/AdminLogin.vue'
```

**8b.** Sostituisci tutto il blocco da `const { data: session, refresh: refreshSession } = await useFetch('/api/admin/session')` fino alla fine della funzione `logout()` (compreso il blocco `// ---- Login ---` con `password`, `loginError`, `loggingIn` e `login()`) con:

```ts
const { data: session, refresh: refreshSession } = await useAdminSession()

async function logout() {
  await guard(async () => {
    await adminLogout()
    form.value = null
    await router.replace({ query: {} })
  })
}
```

**8c.** Subito dopo la funzione `guard(...)` e `resolvePending(...)` (sezione "Modifiche non salvate"), aggiungi le guardie per i link della barra:

```ts
// Link della barra (altre sezioni, logo) con modifiche non salvate:
// stessa domanda dei cambi di prodotto
onBeforeRouteLeave((to) => {
  if (!dirty.value) return true
  pending.value = () => router.push(to.fullPath)
  return false
})
onBeforeRouteUpdate((to) => {
  if (!dirty.value) return true
  pending.value = () => router.replace(to.fullPath)
  return false
})
```

**8d.** Nel template:
- Sostituisci l'intero blocco `<!-- Barra -->` (il `<header>` con logo, "Vai al sito" ed "Esci") con:

```vue
    <!-- Barra -->
    <AdminHeader
      :authenticated="!!session?.authenticated"
      @logout="logout"
    />
```

- Sostituisci tutto ciò che sta fra `<!-- Stati di sistema -->` e `<!-- App -->` (i due `<main>` di stato e di login) con:

```vue
    <!-- Accesso -->
    <AdminLogin
      v-if="!session?.authenticated"
      @authenticated="refreshEdits()"
    />
```

Il `<div v-else ...>` che segue `<!-- App -->` resta com'è.

- [ ] **Step 9: Verificare nel browser**

Avvia `npx nuxt dev --port 3000`. Con il browser:
1. `/admin` senza sessione mostra "Accedi"; dopo l'accesso compare la barra con Prodotti, Preventivi, Clienti, Impostazioni e l'elenco prodotti funziona come prima.
2. In un prodotto, modifica un campo senza salvare e clicca "Clienti": compare la domanda sulle modifiche non salvate; "Annulla" resta, "Non salvare" prosegue.
3. `/admin/impostazioni`: inserisci tariffa `450` e IBAN, salva; ricarica: i valori restano. Scrivi `abc` nella tariffa: il campo diventa rosso e il salvataggio manda l'ultimo valore valido.
4. `/admin/clienti`: crea "Comune di Prova", modificalo, cercalo, eliminalo. Crea un secondo cliente e lascialo.
5. "Esci" da `/admin/clienti` riporta al modulo di accesso.

- [ ] **Step 10: Lint e commit**

Run: `npx eslint app/composables app/utils/adminErrors.ts app/components/admin app/pages/admin`
Expected: nessun errore (gli avvisi di ordinamento classi Tailwind si correggono con `npx eslint --fix` sugli stessi file).

```bash
git add app/composables/useAdminSession.ts app/composables/useAdminToast.ts app/utils/adminErrors.ts app/components/admin/AdminHeader.vue app/components/admin/AdminLogin.vue app/components/admin/AdminShell.vue app/components/admin/NumberInput.vue app/pages/admin/impostazioni.vue app/pages/admin/clienti.vue app/pages/admin/index.vue
git commit -m "feat(admin): shared admin shell, settings and clients pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Elenco ed editor dei preventivi

**Files:**
- Create: `app/components/admin/QuoteStatusPill.vue`, `app/components/admin/QuotePhaseEditor.vue`
- Create: `app/pages/admin/preventivi/index.vue`, `app/pages/admin/preventivi/[id].vue`

**Interfaces:**
- Consumes: API del Task 6 (`QuoteListRow`, `QuoteDetail`); Task 2 (`computeTotals`, `issueProblems`, `itemAmount`, `newLocalId`, `stableStringify`, `STATUS_LABELS`, tipi); Task 1 (`formatEuro`, `formatDecimal`); Task 7 (`AdminShell`, `AdminField`, `AdminSection`, `NumberInput`, `useAdminSession`, `useAdminToast`, `adminErrorText`).
- Produces: pagine `/admin/preventivi` e `/admin/preventivi/:id`; componenti `<QuoteStatusPill :status>` e `<QuotePhaseEditor :phase :index :count :day-rate :subtotal @move @remove>`.

- [ ] **Step 1: `QuoteStatusPill.vue`**

```vue
<script setup lang="ts">
import { STATUS_LABELS, type DisplayStatus } from '#shared/quote'

// Stato di un preventivo: bozza tratteggiata, inviato contorno verde,
// accettato verde pieno, rifiutato rosso, scaduto banana
defineProps<{ status: DisplayStatus }>()
</script>

<template>
  <span
    class="
      inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs
      font-medium
    "
    :class="{
      'border border-dashed border-ink/50': status === 'draft',
      'border border-green text-green': status === 'sent',
      'bg-green text-paper-light': status === 'accepted',
      'border border-red text-red': status === 'rejected',
      'bg-banana text-ink': status === 'expired',
    }"
  >{{ STATUS_LABELS[status] }}</span>
</template>
```

- [ ] **Step 2: `QuotePhaseEditor.vue`**

```vue
<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
import { formatEuro } from '#shared/money'
import { itemAmount, newLocalId, type QuoteItem, type QuotePhase } from '#shared/quote'

// Una fase del preventivo con le sue voci (a giorni o a corpo).
// `phase` è l'oggetto della bozza: le modifiche vanno direttamente lì.
const props = defineProps<{
  phase: QuotePhase
  index: number
  count: number
  dayRate: number
  subtotal: number
}>()
const emit = defineEmits<{ move: [delta: -1 | 1]; remove: [] }>()

const confirmRemove = ref(false)
const items = computed(() => props.phase.items)

function addItem(kind: QuoteItem['kind']) {
  items.value.push(kind === 'days'
    ? { id: newLocalId(), kind, description: '', days: 1, rate: props.dayRate }
    : { id: newLocalId(), kind, description: '', amount: 0 })
}

function moveItem(i: number, delta: -1 | 1) {
  const j = i + delta
  if (j < 0 || j >= items.value.length) return
  const [moved] = items.value.splice(i, 1)
  items.value.splice(j, 0, moved!)
}

// Cambio di tipo: passando a corpo l'importo resta quello calcolato
function setKind(i: number, kind: QuoteItem['kind']) {
  const item = items.value[i]
  if (!item || item.kind === kind) return
  items.value[i] = kind === 'fixed'
    ? { id: item.id, kind, description: item.description, amount: itemAmount(item) }
    : { id: item.id, kind, description: item.description, days: 1, rate: props.dayRate }
}

const kindOf = (e: Event) => (e.target as HTMLSelectElement).value as QuoteItem['kind']

function askRemove() {
  if (items.value.length) confirmRemove.value = true
  else emit('remove')
}
</script>

<template>
  <section class="rounded-2xl border border-ink/10 bg-white">
    <header class="flex items-center gap-2 border-b border-ink/10 px-5 py-3">
      <span class="font-mono text-sm opacity-50">{{ index + 1 }}.</span>
      <input
        v-model="phase.title"
        class="admin-input flex-1 font-bold"
        :placeholder="`Fase ${index + 1}`"
        aria-label="Titolo della fase"
        maxlength="200"
      >
      <button
        type="button"
        class="icon-btn"
        :disabled="index === 0"
        aria-label="Sposta la fase in alto"
        @click="emit('move', -1)"
      >
        ↑
      </button>
      <button
        type="button"
        class="icon-btn"
        :disabled="index === count - 1"
        aria-label="Sposta la fase in basso"
        @click="emit('move', 1)"
      >
        ↓
      </button>
      <button
        type="button"
        class="icon-btn"
        aria-label="Elimina la fase"
        @click="askRemove"
      >
        ✕
      </button>
    </header>

    <p
      v-if="confirmRemove"
      class="flex flex-wrap items-center gap-3 bg-red/10 px-5 py-3 text-sm"
      role="alert"
    >
      Eliminare la fase e le sue {{ items.length }} voci?
      <button
        type="button"
        class="rounded-full bg-red px-3 py-1 text-white"
        @click="emit('remove')"
      >
        Elimina
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1"
        @click="confirmRemove = false"
      >
        Annulla
      </button>
    </p>

    <div class="flex flex-col gap-4 px-5 py-4">
      <AdminField label="Descrizione della fase">
        <textarea
          v-model="phase.description"
          rows="2"
          maxlength="2000"
          class="admin-input"
        />
      </AdminField>

      <ul
        v-if="items.length"
        class="flex flex-col gap-3"
      >
        <li
          v-for="(item, i) in items"
          :key="item.id"
          class="flex gap-2 rounded-xl bg-paper p-3"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <input
              v-model="item.description"
              class="admin-input"
              placeholder="Descrizione della voce"
              aria-label="Descrizione della voce"
              maxlength="500"
            >
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <select
                :value="item.kind"
                class="admin-input w-auto"
                aria-label="Tipo di voce"
                @change="setKind(i, kindOf($event))"
              >
                <option value="days">
                  A giorni
                </option>
                <option value="fixed">
                  A corpo
                </option>
              </select>
              <template v-if="item.kind === 'days'">
                <div class="w-20">
                  <NumberInput
                    v-model="item.days"
                    kind="days"
                    label="Giorni"
                  />
                </div>
                <span class="opacity-60">gg ×</span>
                <div class="w-28">
                  <NumberInput
                    v-model="item.rate"
                    kind="euro"
                    label="Tariffa giornaliera"
                  />
                </div>
                <span class="opacity-60">€</span>
              </template>
              <template v-else>
                <div class="w-32">
                  <NumberInput
                    v-model="item.amount"
                    kind="euro"
                    label="Importo"
                  />
                </div>
                <span class="opacity-60">€</span>
              </template>
              <span class="ml-auto font-mono tabular-nums">{{ formatEuro(itemAmount(item)) }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <button
              type="button"
              class="icon-btn"
              :disabled="i === 0"
              aria-label="Sposta la voce in alto"
              @click="moveItem(i, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="icon-btn"
              :disabled="i === items.length - 1"
              aria-label="Sposta la voce in basso"
              @click="moveItem(i, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="icon-btn"
              aria-label="Elimina la voce"
              @click="items.splice(i, 1)"
            >
              ✕
            </button>
          </div>
        </li>
      </ul>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="
            rounded-full border border-ink/20 px-3 py-1.5 text-sm
            hover:border-ink
          "
          @click="addItem('days')"
        >
          + Voce a giorni
        </button>
        <button
          type="button"
          class="
            rounded-full border border-ink/20 px-3 py-1.5 text-sm
            hover:border-ink
          "
          @click="addItem('fixed')"
        >
          + Voce a corpo
        </button>
        <span class="ml-auto text-sm">
          Subtotale <strong class="font-mono tabular-nums">{{ formatEuro(subtotal) }}</strong>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.icon-btn {
  display: flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}

.icon-btn:hover:not(:disabled) {
  background: var(--color-ink);
  color: var(--color-paper-light);
}

.icon-btn:disabled {
  opacity: 0.3;
}
</style>
```

- [ ] **Step 3: Elenco `app/pages/admin/preventivi/index.vue`**

```vue
<script setup lang="ts">
import AdminShell from '~/components/admin/AdminShell.vue'
import QuoteStatusPill from '~/components/admin/QuoteStatusPill.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatEuro } from '#shared/money'
import { STATUS_LABELS, type DisplayStatus, type QuoteStatus } from '#shared/quote'

// Elenco dei preventivi, dal più recente
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Preventivi - Admin Didap' })

type Row = {
  id: string
  number: string | null
  title: string
  clientName: string | null
  total: number
  status: QuoteStatus
  displayStatus: DisplayStatus
  updatedAt: string
}

const { data: session } = await useAdminSession()
const { notify } = useAdminToast()

const rows = ref<Row[] | null>(null)
const filter = ref<DisplayStatus | 'all'>('all')
const query = ref('')
const creating = ref(false)
const FILTERS = ['all', 'draft', 'sent', 'expired', 'accepted', 'rejected'] as const

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (rows.value ?? []).filter((r) =>
    (filter.value === 'all' || r.displayStatus === filter.value)
    && (!q || [r.number ?? '', r.title, r.clientName ?? ''].some((v) => v.toLowerCase().includes(q))),
  )
})

async function load() {
  try {
    rows.value = await $fetch<Row[]>('/api/admin/quotes')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onMounted(() => {
  watch(() => session.value?.authenticated, (ok) => ok && load(), { immediate: true })
})

async function create() {
  creating.value = true
  try {
    const { id } = await $fetch<{ id: string }>('/api/admin/quotes', { method: 'POST' })
    await navigateTo(`/admin/preventivi/${id}`)
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    creating.value = false
  }
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('it-IT')
</script>

<template>
  <AdminShell>
    <main class="
      mx-auto w-full max-w-5xl p-6
      lg:p-10
    ">
      <div class="flex flex-wrap items-center gap-4">
        <h1 class="mr-auto text-3xl font-bold">
          Preventivi
        </h1>
        <button
          type="button"
          class="
            rounded-full bg-green px-5 py-2.5 font-medium text-paper-light
            hover:bg-ink
            disabled:opacity-50
          "
          :disabled="creating"
          @click="create"
        >
          + Nuovo preventivo
        </button>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-2">
        <button
          v-for="f in FILTERS"
          :key="f"
          type="button"
          class="rounded-full px-3 py-1.5 text-sm"
          :class="filter === f ? 'bg-ink text-paper-light' : `
            border border-ink/20
            hover:border-ink
          `"
          :aria-pressed="filter === f"
          @click="filter = f"
        >
          {{ f === 'all' ? 'Tutti' : STATUS_LABELS[f] }}
        </button>
        <input
          v-model="query"
          type="search"
          placeholder="Cerca numero, titolo o cliente"
          aria-label="Cerca"
          class="
            admin-input
            sm:ml-auto sm:max-w-xs
          "
        >
      </div>

      <p
        v-if="rows && !rows.length"
        class="mt-10 opacity-60"
      >
        Ancora nessun preventivo. Crea il primo con "Nuovo preventivo".
      </p>
      <p
        v-else-if="rows && !visible.length"
        class="mt-10 opacity-60"
      >
        Nessun preventivo corrisponde ai filtri.
      </p>
      <ul
        v-else-if="rows"
        class="mt-6 flex flex-col gap-2"
      >
        <li
          v-for="r in visible"
          :key="r.id"
        >
          <NuxtLink
            :to="`/admin/preventivi/${r.id}`"
            class="
              grid items-center gap-x-4 gap-y-1 rounded-2xl border border-ink/10
              bg-white px-5 py-4 transition
              hover:border-ink
              sm:grid-cols-[90px_minmax(0,1fr)_auto_auto]
            "
          >
            <span class="font-mono text-sm">{{ r.number ?? 'Bozza' }}</span>
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ r.title || 'Senza titolo' }}</span>
              <span class="block truncate text-sm opacity-60">
                {{ r.clientName ?? 'Cliente da scegliere' }} · {{ formatDay(r.updatedAt) }}
              </span>
            </span>
            <span class="font-mono text-sm tabular-nums">{{ formatEuro(r.total) }}</span>
            <QuoteStatusPill :status="r.displayStatus" />
          </NuxtLink>
        </li>
      </ul>
    </main>
  </AdminShell>
</template>
```

- [ ] **Step 4: Editor `app/pages/admin/preventivi/[id].vue`**

```vue
<script setup lang="ts">
import { useEventListener, watchDebounced } from '@vueuse/core'
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
import QuotePhaseEditor from '~/components/admin/QuotePhaseEditor.vue'
import QuoteStatusPill from '~/components/admin/QuoteStatusPill.vue'
import { adminErrorText } from '~/utils/adminErrors'
import type { Client } from '#shared/clients'
import { formatDecimal, formatEuro } from '#shared/money'
import {
  computeTotals,
  issueProblems,
  newLocalId,
  stableStringify,
  STATUS_LABELS,
  type DisplayStatus,
  type DraftInput,
  type QuoteContent,
  type QuoteStatus,
} from '#shared/quote'

// Editor di un preventivo. La bozza si salva da sola; "Emetti" crea una
// revisione con numero e PDF, e il link pubblico mostra sempre l'ultima.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)

type Detail = {
  id: string
  number: string | null
  token: string | null
  status: QuoteStatus
  displayStatus: DisplayStatus
  currentRev: number
  draft: DraftInput
  issuedDraft: DraftInput | null
  revisions: { rev: number; issuedAt: string; total: number }[]
  updatedAt: string
}

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: session } = await useAdminSession()
const { notify } = useAdminToast()

const detail = ref<Detail | null>(null)
const form = ref<DraftInput | null>(null)
const clients = ref<Client[]>([])
const loadError = ref('')
const savedSignature = ref('')
const saving = ref(false)
const busy = ref(false)
const confirmDelete = ref(false)
const origin = ref('')

useSeoMeta({ title: () => `${detail.value?.number ?? 'Bozza'} - Preventivi - Admin Didap` })

const signature = computed(() => (form.value ? stableStringify(form.value) : ''))
const dirty = computed(() => !!form.value && signature.value !== savedSignature.value)
const totals = computed(() => (form.value ? computeTotals(form.value.content) : null))
const problems = computed(() => (form.value ? issueProblems(form.value) : []))
// Bozza diversa da com'era all'ultima emissione
const unissued = computed(() =>
  !!detail.value?.issuedDraft && stableStringify(detail.value.issuedDraft) !== signature.value,
)
const canIssue = computed(() =>
  !!detail.value && !problems.value.length && (detail.value.currentRev === 0 || unissued.value),
)
const publicUrl = computed(() => (detail.value?.token ? `${origin.value}/p/${detail.value.token}` : ''))

async function load() {
  loadError.value = ''
  try {
    const [d, c] = await Promise.all([
      $fetch<Detail>(`/api/admin/quotes/${id.value}`),
      $fetch<Client[]>('/api/admin/clients'),
    ])
    detail.value = d
    clients.value = c
    form.value = d.draft
    savedSignature.value = stableStringify(d.draft)
  }
  catch (err) {
    loadError.value = adminErrorText(err)
  }
}

onMounted(() => {
  origin.value = location.origin
  watch([id, () => session.value?.authenticated], ([, ok]) => ok && load(), { immediate: true })
})

// ---- Salvataggio automatico, in coda: mai due PUT insieme ------------------
let queue: Promise<boolean> = Promise.resolve(true)
function save() {
  queue = queue.then(async () => {
    if (!form.value || !dirty.value) return true
    const sent = signature.value
    saving.value = true
    try {
      await $fetch(`/api/admin/quotes/${id.value}`, { method: 'PUT', body: form.value })
      savedSignature.value = sent
      return true
    }
    catch (err) {
      notify('error', adminErrorText(err))
      return false
    }
    finally {
      saving.value = false
    }
  })
  return queue
}

watchDebounced(signature, () => dirty.value && save(), { debounce: 800 })
useEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  if (dirty.value) e.preventDefault()
})

// ---- Azioni: partono sempre dalla bozza salvata -----------------------------
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  try {
    if (await save()) await action()
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function preview() {
  // La scheda si apre dentro il clic, altrimenti il browser la blocca
  const tab = window.open('', '_blank')
  if (!(await save())) {
    tab?.close()
    return
  }
  const url = `/api/admin/quotes/${id.value}/preview`
  if (tab) tab.location.href = url
  else window.location.href = url
}

const issue = () => run(async () => {
  const res = await $fetch<{ rev: number; number: string }>(`/api/admin/quotes/${id.value}/issue`, { method: 'POST' })
  await load()
  notify('ok', `Emesso ${res.number}, rev. ${res.rev}`)
})

const setStatus = (status: Exclude<QuoteStatus, 'draft'>) => run(async () => {
  await $fetch(`/api/admin/quotes/${id.value}/status`, { method: 'PUT', body: { status } })
  await load()
  notify('ok', 'Stato aggiornato')
})

const duplicate = () => run(async () => {
  const copy = await $fetch<{ id: string }>(`/api/admin/quotes/${id.value}/duplicate`, { method: 'POST' })
  await navigateTo(`/admin/preventivi/${copy.id}`)
  notify('ok', 'Copia creata: è una nuova bozza')
})

async function remove() {
  confirmDelete.value = false
  busy.value = true
  try {
    await $fetch(`/api/admin/quotes/${id.value}`, { method: 'DELETE' })
    form.value = null
    await navigateTo('/admin/preventivi')
    notify('ok', 'Bozza eliminata')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    busy.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(publicUrl.value)
    notify('ok', 'Link copiato')
  }
  catch {
    notify('error', 'Copia non riuscita: seleziona il link a mano')
  }
}

// ---- Fasi e sconto ----------------------------------------------------------
function addPhase() {
  form.value?.content.phases.push({ id: newLocalId(), title: '', description: '', items: [] })
}

function movePhase(i: number, delta: -1 | 1) {
  const phases = form.value?.content.phases
  const j = i + delta
  if (!phases || j < 0 || j >= phases.length) return
  const [moved] = phases.splice(i, 1)
  phases.splice(j, 0, moved!)
}

function removePhase(i: number) {
  form.value?.content.phases.splice(i, 1)
}

type DiscountKind = QuoteContent['discount']['kind']
function setDiscountKind(e: Event) {
  if (!form.value) return
  const kind = (e.target as HTMLSelectElement).value as DiscountKind
  form.value.content.discount = kind === 'none' ? { kind } : { kind, value: 0 }
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
const STATUS_CHOICES = ['sent', 'accepted', 'rejected'] as const
</script>

<template>
  <AdminShell>
    <main class="
      mx-auto w-full max-w-6xl p-5
      lg:p-8
    ">
      <NuxtLink
        to="/admin/preventivi"
        class="
          text-sm opacity-60
          hover:opacity-100
        "
      >
        ← Preventivi
      </NuxtLink>

      <p
        v-if="loadError"
        class="mt-6 rounded-2xl border border-red/30 bg-white p-5 text-red"
        role="alert"
      >
        {{ loadError }}
      </p>

      <div
        v-else-if="form && detail"
        class="
          mt-4 grid items-start gap-6
          lg:grid-cols-[minmax(0,1fr)_320px]
        "
      >
        <div class="flex min-w-0 flex-col gap-6">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-3xl font-bold">
              {{ detail.number ?? 'Nuovo preventivo' }}
            </h1>
            <QuoteStatusPill :status="detail.displayStatus" />
            <span
              v-if="unissued"
              class="rounded-full bg-banana px-2.5 py-1 text-xs font-medium"
            >Modifiche non emesse</span>
            <span
              class="ml-auto text-sm opacity-60"
              aria-live="polite"
            >{{ saving ? 'Salvo…' : dirty ? 'Modifiche da salvare' : 'Bozza salvata' }}</span>
          </div>

          <AdminSection
            id="generale"
            title="Preventivo"
          >
            <AdminField
              label="Cliente"
              hint="I dati dei clienti si gestiscono in Clienti."
            >
              <select
                v-model="form.clientId"
                class="admin-input"
              >
                <option :value="null">
                  Scegli un cliente…
                </option>
                <option
                  v-for="c in clients"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </AdminField>
            <AdminField
              label="Titolo del progetto"
              :value="form.title"
              :max="200"
            >
              <input
                v-model="form.title"
                maxlength="200"
                class="admin-input"
              >
            </AdminField>
            <div class="
              grid gap-5
              sm:grid-cols-2
            ">
              <AdminField label="Valido fino al">
                <input
                  v-model="form.content.validUntil"
                  type="date"
                  class="admin-input"
                >
              </AdminField>
              <AdminField
                label="Tariffa giornaliera (€)"
                hint="Usata per le nuove voci a giorni."
              >
                <NumberInput
                  v-model="form.content.dayRate"
                  kind="euro"
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection
            id="premessa"
            title="Premessa"
            description="Obiettivi e contesto del progetto."
          >
            <textarea
              v-model="form.content.intro"
              rows="5"
              maxlength="5000"
              aria-label="Premessa"
              class="admin-input"
            />
          </AdminSection>

          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-bold">
              Fasi
            </h2>
            <QuotePhaseEditor
              v-for="(phase, i) in form.content.phases"
              :key="phase.id"
              :phase="phase"
              :index="i"
              :count="form.content.phases.length"
              :day-rate="form.content.dayRate"
              :subtotal="totals?.phases[i] ?? 0"
              @move="movePhase(i, $event)"
              @remove="removePhase(i)"
            />
            <button
              type="button"
              class="
                self-start rounded-full border border-dashed border-ink/40 px-4
                py-2 text-sm
                hover:border-ink
              "
              @click="addPhase"
            >
              + Aggiungi fase
            </button>
          </div>

          <AdminSection
            id="economico"
            title="Sconto e IVA"
          >
            <div class="
              grid gap-5
              sm:grid-cols-2
            ">
              <AdminField
                label="Sconto"
                group
              >
                <div class="flex gap-2">
                  <select
                    :value="form.content.discount.kind"
                    class="admin-input w-auto"
                    aria-label="Tipo di sconto"
                    @change="setDiscountKind"
                  >
                    <option value="none">
                      Nessuno
                    </option>
                    <option value="percent">
                      Percentuale
                    </option>
                    <option value="amount">
                      Importo fisso
                    </option>
                  </select>
                  <NumberInput
                    v-if="form.content.discount.kind === 'percent'"
                    v-model="form.content.discount.value"
                    kind="percent"
                    label="Sconto in percentuale"
                  />
                  <NumberInput
                    v-else-if="form.content.discount.kind === 'amount'"
                    v-model="form.content.discount.value"
                    kind="euro"
                    label="Sconto in euro"
                  />
                </div>
              </AdminField>
              <AdminField label="IVA (%)">
                <NumberInput
                  v-model="form.content.vatRate"
                  kind="percent"
                />
              </AdminField>
            </div>
          </AdminSection>

          <AdminSection
            id="condizioni"
            title="Condizioni"
          >
            <AdminField label="Tempi di consegna">
              <textarea
                v-model="form.content.timeline"
                rows="3"
                class="admin-input"
              />
            </AdminField>
            <AdminField label="Condizioni di pagamento">
              <textarea
                v-model="form.content.paymentTerms"
                rows="3"
                class="admin-input"
              />
            </AdminField>
            <AdminField label="Esclusioni">
              <textarea
                v-model="form.content.exclusions"
                rows="3"
                class="admin-input"
              />
            </AdminField>
            <AdminField label="Note">
              <textarea
                v-model="form.content.notes"
                rows="3"
                class="admin-input"
              />
            </AdminField>
          </AdminSection>
        </div>

        <aside class="
          flex flex-col gap-4
          lg:sticky lg:top-4
        ">
          <div class="rounded-2xl border border-ink/10 bg-white p-5">
            <dl
              v-if="totals"
              class="flex flex-col gap-2 text-sm"
            >
              <div class="flex justify-between">
                <dt>Imponibile</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(totals.subtotal) }}
                </dd>
              </div>
              <div
                v-if="totals.discount"
                class="flex justify-between"
              >
                <dt>Sconto</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(-totals.discount) }}
                </dd>
              </div>
              <div class="flex justify-between">
                <dt>IVA {{ formatDecimal(form.content.vatRate) }}%</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(totals.vat) }}
                </dd>
              </div>
              <div class="
                mt-1 flex justify-between border-t border-ink/10 pt-3 text-base
                font-bold
              ">
                <dt>Totale</dt>
                <dd class="font-mono tabular-nums">
                  {{ formatEuro(totals.total) }}
                </dd>
              </div>
            </dl>
          </div>

          <div class="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5">
            <ul
              v-if="problems.length"
              class="flex flex-col gap-1 text-sm text-red"
            >
              <li
                v-for="p in problems"
                :key="p"
              >
                {{ p }}
              </li>
            </ul>
            <button
              type="button"
              class="
                rounded-full bg-green px-5 py-3 font-medium text-paper-light
                hover:bg-ink
                disabled:opacity-40 disabled:hover:bg-green
              "
              :disabled="!canIssue || busy"
              @click="issue"
            >
              {{ detail.currentRev ? `Emetti rev. ${detail.currentRev + 1}` : 'Emetti preventivo' }}
            </button>
            <p
              v-if="detail.currentRev && !unissued"
              class="text-xs opacity-60"
            >
              Nessuna modifica dall'ultima emissione.
            </p>
            <button
              type="button"
              class="
                rounded-full border border-ink/20 px-5 py-2.5 text-sm
                hover:border-ink
              "
              @click="preview"
            >
              Anteprima PDF
            </button>
          </div>

          <div
            v-if="detail.token"
            class="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-5"
          >
            <p class="text-sm font-medium">
              Link per il cliente
            </p>
            <input
              :value="publicUrl"
              readonly
              aria-label="Link pubblico"
              class="admin-input font-mono text-xs"
              @focus="($event.target as HTMLInputElement).select()"
            >
            <div class="flex gap-2">
              <button
                type="button"
                class="
                  flex-1 rounded-full border border-ink/20 px-3 py-2 text-sm
                  hover:border-ink
                "
                @click="copyLink"
              >
                Copia link
              </button>
              <a
                :href="publicUrl"
                target="_blank"
                class="
                  flex-1 rounded-full border border-ink/20 px-3 py-2 text-center
                  text-sm
                  hover:border-ink
                "
              >Apri ↗</a>
            </div>
            <p class="text-sm font-medium">
              Stato
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="s in STATUS_CHOICES"
                :key="s"
                type="button"
                class="rounded-full px-3 py-1.5 text-sm"
                :class="detail.status === s ? 'bg-ink text-paper-light' : `
                  border border-ink/20
                  hover:border-ink
                `"
                :aria-pressed="detail.status === s"
                :disabled="busy"
                @click="detail.status !== s && setStatus(s)"
              >
                {{ STATUS_LABELS[s] }}
              </button>
            </div>
          </div>

          <div
            v-if="detail.revisions.length"
            class="rounded-2xl border border-ink/10 bg-white p-5"
          >
            <p class="text-sm font-medium">
              Revisioni
            </p>
            <ul class="mt-2 flex flex-col gap-1 text-sm">
              <li
                v-for="r in detail.revisions"
                :key="r.rev"
              >
                <a
                  :href="`/api/admin/quotes/${detail.id}/revisions/${r.rev}`"
                  target="_blank"
                  class="
                    flex justify-between gap-3 rounded-lg px-2 py-1.5
                    hover:bg-ink/5
                  "
                >
                  <span>rev. {{ r.rev }} · {{ formatDay(r.issuedAt) }}</span>
                  <span class="font-mono tabular-nums">{{ formatEuro(r.total) }}</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="
                rounded-full border border-ink/20 px-4 py-2 text-sm
                hover:border-ink
              "
              :disabled="busy"
              @click="duplicate"
            >
              Duplica
            </button>
            <template v-if="!detail.currentRev">
              <button
                v-if="!confirmDelete"
                type="button"
                class="
                  rounded-full px-4 py-2 text-sm text-red
                  hover:bg-red/10
                "
                @click="confirmDelete = true"
              >
                Elimina bozza
              </button>
              <template v-else>
                <button
                  type="button"
                  class="rounded-full bg-red px-4 py-2 text-sm text-white"
                  :disabled="busy"
                  @click="remove"
                >
                  Sì, elimina
                </button>
                <button
                  type="button"
                  class="rounded-full px-4 py-2 text-sm"
                  @click="confirmDelete = false"
                >
                  Annulla
                </button>
              </template>
            </template>
          </div>
        </aside>
      </div>
    </main>
  </AdminShell>
</template>
```

- [ ] **Step 5: Verificare nel browser**

Avvia `npx nuxt dev --port 3000`. Con il browser, da autenticati:
1. `/admin/preventivi` vuoto mostra il messaggio iniziale. "Nuovo preventivo" apre l'editor di una bozza.
2. "Emetti preventivo" è disabilitato con l'elenco "Scegli il cliente", "Aggiungi almeno una voce".
3. Scegli il cliente, titolo "Sito di prova", aggiungi una voce a giorni (descrizione "Design", 1,5 gg) e una a corpo ("Licenze", `250`). Il riepilogo si aggiorna subito; "Bozza salvata" compare dopo meno di un secondo; ricaricando la pagina i dati restano.
4. Cambia la voce "Licenze" in "A giorni" e poi di nuovo "A corpo": l'importo resta coerente. Sposta e cancella una voce; aggiungi una seconda fase e spostala sopra.
5. Sconto percentuale `10`: compare nel riepilogo. "Anteprima PDF" apre il PDF con numero "BOZZA".
6. "Emetti preventivo": il titolo diventa il numero, stato "Inviato", compaiono link, stato e "rev. 1". Il pulsante diventa "Emetti rev. 2" disabilitato con "Nessuna modifica dall'ultima emissione".
7. Cambia il titolo: compare "Modifiche non emesse" ed "Emetti rev. 2" si abilita. Emetti: due revisioni nell'elenco, ognuna apre il suo PDF.
8. "Accettato" cambia lo stato. "Duplica" apre una nuova bozza senza numero.
9. Nell'elenco: filtri per stato e ricerca funzionano; la bozza duplicata mostra "Bozza". Elimina la bozza duplicata dall'editor.

- [ ] **Step 6: Lint e commit**

Run: `npx eslint --fix app/components/admin app/pages/admin/preventivi && npx eslint app/components/admin app/pages/admin/preventivi`
Expected: nessun errore.

```bash
git add app/components/admin/QuoteStatusPill.vue app/components/admin/QuotePhaseEditor.vue app/pages/admin/preventivi
git commit -m "feat(admin): quotes list and editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Pagina pubblica del preventivo

**Files:**
- Create: `app/layouts/quote.vue`, `app/pages/p/[token].vue`
- Modify: `nuxt.config.ts` (`routeRules` per `/p/**`)

**Interfaces:**
- Consumes: `GET /api/quotes/:token` → `{ snapshot: QuoteSnapshot; expired: boolean }`; `GET /p/:token/pdf` (Task 6); `formatDate`, `formatEuro`, `formatDecimal`, `itemAmount`, `type QuoteSnapshot`.
- Produces: pagina `/p/:token`, `noindex`, senza nav e footer.

- [ ] **Step 1: Layout `app/layouts/quote.vue`**

```vue
<script setup lang="ts">
// Layout del preventivo per il cliente: niente nav e footer del sito,
// mai indicizzato
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <slot />
  </div>
</template>
```

- [ ] **Step 2: Header HTTP in `nuxt.config.ts`**

Dopo il blocco `content: { ... },` aggiungi:

```ts
  // Preventivi per i clienti: link privati, mai in cache condivise né indicizzati
  routeRules: {
    '/p/**': {
      headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' },
    },
  },
```

- [ ] **Step 3: Pagina `app/pages/p/[token].vue`**

```vue
<script setup lang="ts">
import { formatDate } from '#shared/dates'
import { formatDecimal, formatEuro } from '#shared/money'
import { itemAmount, type QuoteSnapshot } from '#shared/quote'

// Preventivo per il cliente: ultima revisione emessa, con PDF da scaricare.
// Link privato (token casuale), mai indicizzato.
definePageMeta({ layout: 'quote' })
defineI18nRoute(false)

const route = useRoute()
const token = String(route.params.token)
const { data } = await useFetch<{ snapshot: QuoteSnapshot; expired: boolean }>(`/api/quotes/${token}`)
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato', fatal: true })
}

const s = computed(() => data.value!.snapshot)
const pdfUrl = `/p/${token}/pdf`

useSeoMeta({
  title: () => `Preventivo ${s.value.number} - ${s.value.company.name}`,
  robots: 'noindex, nofollow',
})

const clientLines = computed(() => {
  const c = s.value.client
  return [
    c.address,
    c.vatNumber && `P.IVA ${c.vatNumber}`,
    c.taxCode && `C.F. ${c.taxCode}`,
    c.sdiPec && `SDI/PEC ${c.sdiPec}`,
    c.contactName && `Alla c.a. di ${c.contactName}`,
  ].filter(Boolean) as string[]
})
const companyLines = computed(() => {
  const c = s.value.company
  return [c.address, c.vatNumber && `P.IVA ${c.vatNumber}`, c.email, c.phone].filter(Boolean) as string[]
})
const discountLabel = computed(() => {
  const d = s.value.content.discount
  return d.kind === 'percent' ? `Sconto ${formatDecimal(d.value)}%` : 'Sconto'
})
const extras = computed(() =>
  ([
    ['Tempi', s.value.content.timeline],
    ['Condizioni di pagamento', s.value.content.paymentTerms],
    ['Esclusioni', s.value.content.exclusions],
    ['Note', s.value.content.notes],
  ] as const).filter(([, body]) => body.trim()),
)
</script>

<template>
  <main
    v-if="data"
    class="
      mx-auto w-full max-w-4xl px-4 py-10
      sm:px-8 sm:py-16
    "
  >
    <header class="flex flex-wrap items-center justify-between gap-6">
      <img
        src="/brand/logo-esteso.svg"
        :alt="s.company.name"
        width="140"
        height="40"
        class="h-10 w-auto"
      >
      <a
        :href="pdfUrl"
        class="
          rounded-full bg-green px-6 py-3 text-button text-paper-light
          transition-colors
          hover:bg-ink
        "
      >Scarica PDF</a>
    </header>

    <p
      v-if="data.expired"
      class="mt-8 rounded-2xl bg-banana/30 px-5 py-3"
      role="status"
    >
      Offerta scaduta il {{ formatDate(s.content.validUntil) }}. Scrivici per un aggiornamento.
    </p>

    <section class="mt-12">
      <p class="text-label opacity-60">
        Preventivo
      </p>
      <h1 class="mt-2 text-title">
        {{ s.title || 'Preventivo' }}
      </h1>
      <dl class="
        mt-6 grid gap-4 text-sm
        sm:grid-cols-3
      ">
        <div>
          <dt class="opacity-60">
            Numero
          </dt>
          <dd class="font-mono">
            {{ s.number }} · rev. {{ s.rev }}
          </dd>
        </div>
        <div>
          <dt class="opacity-60">
            Data
          </dt>
          <dd>{{ formatDate(s.issuedDate) }}</dd>
        </div>
        <div>
          <dt class="opacity-60">
            Valido fino al
          </dt>
          <dd>{{ s.content.validUntil ? formatDate(s.content.validUntil) : '-' }}</dd>
        </div>
      </dl>
    </section>

    <section class="
      mt-10 grid gap-4
      sm:grid-cols-2
    ">
      <div class="rounded-2xl bg-cream p-5">
        <p class="text-label opacity-60">
          Per
        </p>
        <p class="mt-2 font-bold">
          {{ s.client.name }}
        </p>
        <p
          v-for="line in clientLines"
          :key="line"
          class="text-sm whitespace-pre-line"
        >
          {{ line }}
        </p>
      </div>
      <div class="rounded-2xl border border-ink/10 p-5">
        <p class="text-label opacity-60">
          Da
        </p>
        <p class="mt-2 font-bold">
          {{ s.company.name }}
        </p>
        <p
          v-for="line in companyLines"
          :key="line"
          class="text-sm whitespace-pre-line"
        >
          {{ line }}
        </p>
      </div>
    </section>

    <p
      v-if="s.content.intro"
      class="mt-10 text-lg whitespace-pre-line"
    >
      {{ s.content.intro }}
    </p>

    <section
      v-for="(phase, i) in s.content.phases"
      :key="phase.id"
      class="mt-12"
    >
      <h2 class="text-2xl font-bold">
        {{ i + 1 }}. {{ phase.title }}
      </h2>
      <p
        v-if="phase.description"
        class="mt-2 whitespace-pre-line opacity-80"
      >
        {{ phase.description }}
      </p>
      <table class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b-2 border-ink text-left text-xs uppercase">
            <th class="py-2 font-medium opacity-60">
              Descrizione
            </th>
            <th class="py-2 text-right font-medium opacity-60">
              Giorni
            </th>
            <th class="
              hidden py-2 text-right font-medium opacity-60
              sm:table-cell
            ">
              Tariffa
            </th>
            <th class="py-2 text-right font-medium opacity-60">
              Importo
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in phase.items"
            :key="item.id"
            class="border-b border-ink/10 align-top"
          >
            <td class="py-3 pr-4">
              {{ item.description }}
            </td>
            <td class="py-3 text-right font-mono">
              {{ item.kind === 'days' ? formatDecimal(item.days) : '' }}
            </td>
            <td class="
              hidden py-3 text-right font-mono whitespace-nowrap
              sm:table-cell
            ">
              {{ item.kind === 'days' ? formatEuro(item.rate) : 'a corpo' }}
            </td>
            <td class="py-3 pl-4 text-right font-mono whitespace-nowrap">
              {{ formatEuro(itemAmount(item)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td
              colspan="4"
              class="py-3 text-right font-bold"
            >
              Subtotale fase
              <span class="ml-4 font-mono">{{ formatEuro(s.totals.phases[i] ?? 0) }}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="mt-12 ml-auto max-w-sm">
      <dl class="flex flex-col gap-2">
        <div class="flex justify-between">
          <dt>Imponibile</dt>
          <dd class="font-mono">
            {{ formatEuro(s.totals.subtotal) }}
          </dd>
        </div>
        <template v-if="s.totals.discount > 0">
          <div class="flex justify-between">
            <dt>{{ discountLabel }}</dt>
            <dd class="font-mono">
              {{ formatEuro(-s.totals.discount) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>Imponibile scontato</dt>
            <dd class="font-mono">
              {{ formatEuro(s.totals.taxable) }}
            </dd>
          </div>
        </template>
        <div class="flex justify-between">
          <dt>IVA {{ formatDecimal(s.content.vatRate) }}%</dt>
          <dd class="font-mono">
            {{ formatEuro(s.totals.vat) }}
          </dd>
        </div>
        <div class="
          mt-2 flex justify-between rounded-xl bg-green px-4 py-3 text-lg
          font-bold text-paper-light
        ">
          <dt>Totale</dt>
          <dd class="font-mono">
            {{ formatEuro(s.totals.total) }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      v-for="[title, body] in extras"
      :key="title"
      class="mt-10"
    >
      <h2 class="text-lg font-bold">
        {{ title }}
      </h2>
      <p class="mt-2 whitespace-pre-line">
        {{ body }}
      </p>
    </section>

    <p
      v-if="s.company.iban"
      class="mt-10 text-sm"
    >
      <span class="opacity-60">IBAN</span> <span class="font-mono">{{ s.company.iban }}</span>
    </p>

    <footer class="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-6">
      <p class="text-sm opacity-60">
        {{ s.company.name }} · Preventivo {{ s.number }} rev. {{ s.rev }}
      </p>
      <a
        :href="pdfUrl"
        class="
          rounded-full border border-ink/20 px-5 py-2.5 text-sm
          hover:border-ink
        "
      >Scarica PDF</a>
    </footer>
  </main>
</template>
```

- [ ] **Step 4: Verificare nel browser**

Con `npx nuxt dev --port 3000` e il preventivo emesso nel Task 8:
1. Apri il link copiato dall'editor in una finestra anonima (senza sessione admin): si vede il preventivo con il font del sito, l'ultima revisione, i totali giusti; niente nav né footer del sito.
2. "Scarica PDF" scarica `Preventivo-AAAA-NNN-revN.pdf`.
3. `curl -sI http://localhost:3000/p/<token>` mostra `x-robots-tag: noindex, nofollow` e `cache-control: private, no-store`.
4. `/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` dà la pagina 404.
5. Larghezza 375px (DevTools): niente scroll orizzontale; la colonna "Tariffa" sparisce.
6. Nell'editor imposta "Valido fino al" a ieri ed emetti una nuova revisione: ricaricando il link compare "Offerta scaduta il ..." e nell'elenco admin lo stato è "Scaduto". Poi rimetti una data futura ed emetti di nuovo.

- [ ] **Step 5: Lint e commit**

Run: `npx eslint --fix app/layouts/quote.vue app/pages/p nuxt.config.ts && npx eslint app/layouts/quote.vue app/pages/p nuxt.config.ts`
Expected: nessun errore.

```bash
git add app/layouts/quote.vue app/pages/p nuxt.config.ts
git commit -m "feat(quotes): public quote page with PDF download

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Verifica finale e build di produzione

**Files:**
- Modify: eventuali correzioni emerse da typecheck e build; `docs/superpowers/specs/2026-10-15-preventivi-design.md` (stato "approvata" solo se l'utente l'ha approvata)

**Interfaces:**
- Consumes: tutto.
- Produces: branch pronto per la revisione.

- [ ] **Step 1: Test, lint, typecheck**

```bash
npm test
npm run lint
npm run typecheck
```

Expected: test tutti PASS (nessuno skipped), lint senza errori, typecheck senza errori. Correggi gli errori di tipo nel file che li produce, senza cambiare comportamento; rilancia finché è pulito.

- [ ] **Step 2: Build di produzione con PDF reale**

```bash
npm run build
set -a; . ./.env; set +a
PORT=3100 NITRO_PORT=3100 node .output/server/index.mjs &
sleep 3
```

Ripeti lo script del Task 6 Step 7 con `B=http://localhost:3100` (cambia il titolo per creare un preventivo nuovo).
Expected: emissione `200`, `/p/<token>/pdf` restituisce un PDF che inizia con `%PDF-` e si apre con logo e font; nel log compare l'avviso su Obviously. Questo prova che font e logo arrivano nella build tramite `useStorage('assets:server')`. Ferma il server.

Se l'emissione fallisce con "Asset del PDF mancante", controlla che `server/assets` sia stato incluso: `ls .output/server/chunks/raw` deve contenere i `.woff`.

- [ ] **Step 3: Cercare trattini vietati**

```bash
git diff main --name-only | xargs grep -nP '[\x{2013}\x{2014}]' || echo "nessun trattino lungo"
```

Expected: `nessun trattino lungo`.

- [ ] **Step 4: Commit delle correzioni**

```bash
git add -A
git status --short
git commit -m "chore(quotes): typecheck and build fixes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Salta il commit se `git status` è vuoto. Non committare `.env`.
