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

  it('il link pubblico non espone note interne, contatti e id del cliente', async () => {
    const { id, client } = await readyQuote('Comune di Prova')
    await updateClient(sql, client.id, {
      ...emptyClient(),
      name: 'Comune di Prova',
      notes: 'nota interna',
      email: 'ufficio@comune.it',
      phone: '0123456',
    })
    const { token } = await issueQuote(sql, id, { now: NOW, render })
    const pub = await getPublicQuote(sql, token, TODAY)
    expect(pub?.snapshot.client).toEqual({
      name: 'Comune di Prova',
      address: '',
      vatNumber: '',
      taxCode: '',
      sdiPec: '',
      contactName: '',
    })
    expect(pub?.snapshot).not.toHaveProperty('clientId')
    expect(JSON.stringify(pub)).not.toContain('nota interna')
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
