import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RADAR_SETTINGS,
  evaluateGrant,
  evaluateRadarGrant,
  evaluateRequirement,
  isInScope,
  parseRadarSettings,
  radarSettingsSchema,
  sourceGroup,
  sourceLabel,
  SOURCE_GROUPS,
  usageCost,
  type RadarGrant,
  type Province,
  type RadarProfile,
  type Requirement,
  type SourceGroup,
} from '#shared/radar'
import { parse as parseYaml } from 'yaml'
import { grantExport, grantFileName } from '../server/utils/radar-export'
import { attachmentName, decodeHtml, isPdfLink, mainHtml, pageLinks, safeDecode } from '../server/utils/radar-fetch'
import { parseCallDate, parseGrantReading, parseJudgement, parsePicks } from '../server/utils/radar-reader'
import {
  incentiveText,
  isOpenToPugliaBusinesses,
  parsePugliaListing,
  parseSistemaListing,
  radarSources,
  sistemaFrame,
  tedNoticeText,
} from '../server/utils/radar-sources'

const NOW = new Date('2026-10-20T08:00:00Z')

const profile = (p: Partial<RadarProfile> = {}): RadarProfile => ({ ...DEFAULT_RADAR_SETTINGS.profile, ...p })
const req = (kind: Requirement['kind'], params: Requirement['params'] = {}): Requirement =>
  ({ kind, params, label: kind, quote: '', page: null })
const outcome = (r: Requirement, p: RadarProfile) => evaluateRequirement(r, p, NOW).outcome

describe('valutazione dei requisiti', () => {
  it('fatturato: dentro, oltre il tetto, mancante', () => {
    const r = req('revenue', { max: 2_000_000 })
    expect(outcome(r, profile({ revenue: 2_000_000 }))).toBe('met')
    expect(outcome(r, profile({ revenue: 2_000_001 }))).toBe('not_met')
    expect(outcome(r, profile())).toBe('to_verify')
  })

  it('durata del progetto dentro i limiti del bando', () => {
    const r = req('project_duration', { minMonths: 12, maxMonths: 24 })
    expect(outcome(r, profile({ projectMonths: 18 }))).toBe('met')
    expect(outcome(r, profile({ projectMonths: 6 }))).toBe('not_met')
    expect(outcome(r, profile({ projectMonths: 36 }))).toBe('not_met')
  })

  it('investimento: conta solo il minimo', () => {
    const r = req('investment', { min: 30_000, max: 100_000 })
    expect(outcome(r, profile({ investment: 500_000 }))).toBe('met')
    expect(outcome(r, profile({ investment: 10_000 }))).toBe('not_met')
  })

  it('territorio: Puglia, altre regioni, province', () => {
    expect(outcome(req('region', { regions: ['Puglia', 'Calabria'] }), profile())).toBe('met')
    expect(outcome(req('region', { regions: ['Lombardia'] }), profile())).toBe('not_met')
    expect(outcome(req('region', { regions: ['Puglia'], provinces: ['LE'] }), profile({ province: 'BA' }))).toBe('not_met')
    expect(outcome(req('region', { provinces: ['LE'] }), profile({ province: 'LE' }))).toBe('met')
  })

  it('età dell\'impresa, anche da costituire', () => {
    const r = req('company_age', { maxYears: 5 })
    expect(outcome(r, profile({ foundedYear: 2022 }))).toBe('met')
    expect(outcome(r, profile({ foundedYear: 2015 }))).toBe('not_met')
    expect(outcome(req('company_age', { maxYears: 0 }), profile({ legalForm: 'da_costituire' }))).toBe('met')
    expect(outcome(r, profile())).toBe('to_verify')
  })

  it('ATECO per prefisso, con esclusioni', () => {
    const r = req('ateco', { include: ['62', '63.1'] })
    expect(outcome(r, profile({ ateco: '62.01.00' }))).toBe('met')
    expect(outcome(r, profile({ ateco: '63.11' }))).toBe('met')
    expect(outcome(r, profile({ ateco: '63.91' }))).toBe('not_met')
    expect(outcome(req('ateco', { exclude: ['62.01'] }), profile({ ateco: '62.01.00' }))).toBe('not_met')
    expect(outcome(r, profile())).toBe('to_verify')
  })

  it('forma giuridica, titolare, impresa femminile, altro', () => {
    expect(outcome(req('legal_form', { allowed: ['societa_capitali'] }), profile())).toBe('met')
    expect(outcome(req('legal_form', { allowed: ['cooperativa'] }), profile())).toBe('not_met')
    expect(outcome(req('founder_age', { max: 35 }), profile({ founderAge: 36 }))).toBe('not_met')
    expect(outcome(req('female_led'), profile({ femaleLed: true }))).toBe('met')
    expect(outcome(req('other'), profile())).toBe('to_verify')
  })

  it('esito del bando: un no esclude, un dubbio lascia da verificare', () => {
    const p = profile({ revenue: 100_000 })
    expect(evaluateGrant([], p, NOW).eligibility).toBe('eligible')
    expect(evaluateGrant([req('revenue', { max: 200_000 })], p, NOW).eligibility).toBe('eligible')
    expect(evaluateGrant([req('revenue', { max: 200_000 }), req('other')], p, NOW).eligibility).toBe('to_verify')
    expect(evaluateGrant([req('other'), req('revenue', { max: 50_000 })], p, NOW).eligibility).toBe('excluded')
  })
})

describe('impostazioni del radar', () => {
  it('senza dati usa i default: tutte le fonti, gare comprese, mail a fine scan', () => {
    expect(parseRadarSettings(undefined)).toEqual(DEFAULT_RADAR_SETTINGS)
    expect(DEFAULT_RADAR_SETTINGS.search).toMatchObject({ groups: SOURCE_GROUPS.map(g => g.value), tenders: true })
    expect(DEFAULT_RADAR_SETTINGS.notify).toEqual({ enabled: true, emails: [] })
  })

  it('una ricerca coi comuni spuntati uno a uno diventa le loro province', () => {
    const s = parseRadarSettings({ search: { groups: ['comuni'], comuni: ['072006', '075035', '072004'], digitalOnly: true } })
    expect(s.search).toEqual({ groups: ['comuni'], provinces: ['BA', 'LE'], digitalOnly: true, tenders: true })
  })

  it('un campo non valido torna al default, gli altri restano', () => {
    const s = parseRadarSettings({
      search: { groups: ['governo'], provinces: [] },
      profile: { description: 'vecchia', revenue: 'tanti', employees: 4 },
      notify: { emails: ['a@b.it'], time: '08:00' },
    })
    expect(s.profile.revenue).toBeNull()
    expect(s.profile.employees).toBe(4)
    // Campi tolti (descrizione, ora della mail) cadono
    expect(s.profile).not.toHaveProperty('description')
    expect(s.notify).toEqual({ enabled: true, emails: ['a@b.it'] })
    // Salvate prima di "Solo digitali" e delle gare: filtro acceso, gare dentro
    expect(s.search).toEqual({ groups: ['governo'], provinces: [], digitalOnly: true, tenders: true })
  })

  it('invio attivo senza indirizzi non si salva', () => {
    const bad = { ...DEFAULT_RADAR_SETTINGS, notify: { ...DEFAULT_RADAR_SETTINGS.notify, enabled: true, emails: [] } }
    expect(radarSettingsSchema.safeParse(bad).success).toBe(false)
    const ok = { ...bad, notify: { ...bad.notify, emails: ['william@didap.it'] } }
    expect(radarSettingsSchema.safeParse(ok).success).toBe(true)
  })
})

describe('lettura del modello', () => {
  it('scarta i bandi non aperti alle imprese', () => {
    expect(parseGrantReading({ admitsCompanies: false, title: 'x' })).toEqual({ admitsCompanies: false })
  })

  it('normalizza requisiti, parametri e date', () => {
    const r = parseGrantReading({
      admitsCompanies: true,
      title: 'Resto al Sud 2.0',
      issuer: 'Invitalia',
      summary: 'Contributi per nuove imprese.',
      deadline: '2026-12-31',
      maxAmount: 200000.4,
      funding: 'Fondo perduto',
      requirements: [
        { kind: 'founder_age', params: { max: 35 }, label: 'Under 35', quote: 'età tra 18 e 35 anni', page: 3 },
        { kind: 'qualcosa', params: null, label: 'Strano', quote: '' },
        { kind: 'ateco', params: { include: ['62', 'J', 62] }, label: 'ATECO', quote: '' },
        { kind: 'region', params: { regions: ['Puglia'], provinces: ['le', 'XX'] }, label: 'Puglia', quote: '' },
        'non un oggetto',
      ],
    })
    if (!r.admitsCompanies) throw new Error('atteso true')
    expect(r.digital).toBeNull()
    expect(r.maxAmount).toBe(200000)
    expect(r.deadline?.toISOString()).toBe('2026-12-31T22:59:59.000Z')
    expect(r.requirements).toHaveLength(4)
    expect(r.requirements[0]).toMatchObject({ kind: 'founder_age', params: { max: 35 }, page: 3 })
    expect(r.requirements[1]!.kind).toBe('other')
    expect(r.requirements[2]!.params).toEqual({ include: ['62'] })
    expect(r.requirements[3]!.params).toEqual({ regions: ['Puglia'], provinces: ['LE'] })
  })

  it('date in ora di Roma, estate e inverno', () => {
    expect(parseCallDate('2026-07-15', true)?.toISOString()).toBe('2026-07-15T21:59:59.000Z')
    expect(parseCallDate('2026-07-15T12:00', false)?.toISOString()).toBe('2026-07-15T10:00:00.000Z')
    expect(parseCallDate('2026-04-31', true)).toBeNull()
    expect(parseCallDate(null, true)).toBeNull()
  })

  it('legge se è una gara e se c\'è l\'IA; una risposta strana vale come finanziamento e non detta', () => {
    const read = (raw: Record<string, unknown>) => {
      const r = parseGrantReading({ admitsCompanies: true, title: 'x', ...raw })
      return r.admitsCompanies ? { kind: r.kind, ai: r.ai } : undefined
    }
    expect(read({ kind: 'tender', ai: true })).toEqual({ kind: 'tender', ai: true })
    expect(read({ kind: 'appalto', ai: 'si' })).toEqual({ kind: 'grant', ai: null })
    expect(read({})).toEqual({ kind: 'grant', ai: null })
  })

  it('legge se il bando è digitale; una risposta strana vale come non detta', () => {
    const read = (digital: unknown) => {
      const r = parseGrantReading({ admitsCompanies: true, digital, title: 'x' })
      return r.admitsCompanies ? r.digital : undefined
    }
    expect(read(true)).toBe(true)
    expect(read(false)).toBe(false)
    expect(read('si')).toBeNull()
  })

  it('il giudizio vuole un esito tra sì, no e forse', () => {
    expect(parseJudgement({ verdict: 'no', reason: 'Fuori provincia' })).toEqual({ verdict: 'no', reason: 'Fuori provincia' })
    expect(() => parseJudgement({ verdict: 'boh', reason: '' })).toThrow()
  })

  it('i link scelti dal modello: solo indici esistenti, una volta', () => {
    const links = [{ text: 'Avvisi', href: 'https://c.it/avvisi' }, { text: 'Bando', href: 'https://c.it/bando' }]
    const raw = { picks: [{ index: 1, kind: 'call' }, { index: 7, kind: 'call' }, { index: 0, kind: 'list' }, { index: 1, kind: 'list' }] }
    expect(parsePicks(raw, links)).toEqual([
      { href: 'https://c.it/bando', kind: 'call' },
      { href: 'https://c.it/avvisi', kind: 'list' },
    ])
  })

  it('legge la presentazione della domanda, se c\'è', () => {
    const base = { admitsCompanies: true, title: 'x' }
    const read = (application: unknown) => {
      const r = parseGrantReading({ ...base, application })
      return r.admitsCompanies ? r.application : undefined
    }
    expect(read({ platform: '', documents: [] })).toBeNull()
    expect(read({ platform: 'PEC', documents: [{ name: 'Domanda', format: 'PDF firmato', notes: '' }, { name: '' }] }))
      .toEqual({ platform: 'PEC', documents: [{ name: 'Domanda', format: 'PDF firmato', notes: '' }] })
  })

  it('una risposta senza admitsCompanies non è valida', () => {
    expect(() => parseGrantReading({ title: 'x' })).toThrow()
  })
})

describe('ricerca e giudizio', () => {
  const grant = (over: Partial<RadarGrant> = {}): RadarGrant => ({
    id: 'g1',
    source: 'incentivi-gov',
    url: 'https://example.com',
    kind: 'grant',
    digital: true,
    ai: null,
    verdict: null,
    verdictReason: '',
    title: 'Voucher digitale',
    issuer: 'Ministero',
    summary: '',
    opensAt: null,
    deadline: null,
    maxAmount: null,
    funding: '',
    requirements: [],
    application: null,
    notifiedAt: null,
    liked: false,
    hasFolder: false,
    folderFilled: false,
    folderFilling: false,
    folderFailed: false,
    folderNote: '',
    closed: false,
    createdAt: NOW.toISOString(),
    runId: null,
    ...over,
  })

  it('moduli, province dei comuni, solo digitali e gare', () => {
    const search = { groups: ['governo', 'comuni'] as SourceGroup[], provinces: ['BA'] as Province[], digitalOnly: true, tenders: true }
    expect(isInScope(grant(), search)).toBe(true)
    expect(isInScope(grant({ source: 'sistema-puglia' }), search)).toBe(false)
    expect(isInScope(grant({ source: 'comune-072006' }), search)).toBe(true)
    expect(isInScope(grant({ source: 'comune-071001' }), search)).toBe(false)
    expect(isInScope(grant({ digital: false }), search)).toBe(false)
    expect(isInScope(grant({ digital: null }), search)).toBe(true)
    expect(isInScope(grant({ digital: false }), { ...search, digitalOnly: false })).toBe(true)
    expect(isInScope(grant({ kind: 'tender' }), search)).toBe(true)
    expect(isInScope(grant({ kind: 'tender' }), { ...search, tenders: false })).toBe(false)
    expect(sourceLabel('comune-072006')).toBe('Comune di Bari')
    expect(sourceGroup('puglia-sviluppo')).toBe('regione')
    expect(sourceGroup('innovapuglia')).toBe('regione')
    expect(sourceGroup('camera-ba')).toBe('camere')
    expect(sourceGroup('ted-puglia')).toBe('gare')
  })

  it('il giudizio pesa più delle regole, tranne che per escludere', () => {
    const p = { ...DEFAULT_RADAR_SETTINGS.profile, revenue: 100_000 }
    const rich = [req('revenue', { max: 50_000 })]
    const e = (over: Partial<RadarGrant>) => evaluateRadarGrant(grant(over), p, NOW).eligibility
    expect(e({})).toBe('eligible')
    expect(e({ verdict: 'maybe' })).toBe('to_verify')
    expect(e({ verdict: 'no' })).toBe('excluded')
    expect(e({ requirements: [req('other')], verdict: 'yes' })).toBe('eligible')
    expect(e({ requirements: rich, verdict: 'yes' })).toBe('excluded')
  })

  it('costo stimato dei token', () => {
    const u = { calls: 1, input: 1_000_000, output: 100_000, cacheWrite: 0, cacheRead: 1_000_000 }
    expect(usageCost('claude-haiku-5-5', u)).toBeCloseTo(0.1 + 0.05 + 0.01)
    expect(usageCost('modello-ignoto', u)).toBeNull()
  })

  it('le fonti della ricerca: un crawler per ogni comune spuntato', () => {
    const picker = async () => []
    const slugs = (groups: SourceGroup[], provinces: Province[] = []) => radarSources({ groups, provinces }, picker).map(s => s.slug)
    expect(slugs(['governo'])).toEqual(['incentivi-gov'])
    expect(slugs(['regione'])).toEqual(['regione-puglia', 'sistema-puglia', 'puglia-sviluppo', 'arti-puglia', 'innovapuglia'])
    expect(slugs(['camere'])).toEqual(['camera-ba', 'camera-brta', 'camera-fg', 'camera-le'])
    expect(slugs(['gare'])).toEqual(['ted-puglia'])
    expect(slugs(['comuni'], ['BT'])).toHaveLength(10)
    expect(slugs(['comuni'], ['BT'])).toContain('comune-110001')
    expect(slugs(['comuni', 'governo'], [])).toEqual(['incentivi-gov'])
  })

  it('esporta il bando con un front matter YAML leggibile', () => {
    const g = {
      ...grant({
        title: 'Voucher "digitale": PMI',
        verdict: 'yes' as const,
        verdictReason: 'Siete una PMI',
        requirements: [req('other')],
        application: { platform: 'PEC', documents: [{ name: 'Domanda', format: 'PDF firmato', notes: '' }] },
      }),
      eligibility: 'eligible' as const,
      evaluations: [{ outcome: 'to_verify' as const, reason: 'Da verificare a mano' }],
    }
    const md = grantExport(g, 'Testo del bando: art. 1', DEFAULT_RADAR_SETTINGS.profile)
    const [, front, body] = md.split(/^---$/m)
    const data = parseYaml(front!)
    expect(data).toMatchObject({
      titolo: 'Voucher "digitale": PMI',
      giudizio: { esito: 'Potete candidarvi', motivo: 'Siete una PMI' },
      requisiti: [{ esito: 'da verificare' }],
      presentazione: { piattaforma: 'PEC', documenti: [{ nome: 'Domanda', formato: 'PDF firmato' }] },
    })
    expect(data).toMatchObject({ genere: 'finanziamento', trovato_il: '2026-10-20' })
    expect(data.azienda).toContain('software house')
    expect(data.azienda).toContain('Forma giuridica')
    expect(body).toContain('Testo del bando: art. 1')
    expect(grantFileName(g)).toBe('bando-voucher-digitale-pmi.md')
  })
})

describe('fonti', () => {
  it('TED: una gara in italiano, coi campi per lotto', () => {
    const text = tedNoticeText({
      'notice-title': { ita: 'Sviluppo della piattaforma digitale', eng: 'Digital platform' },
      'buyer-name': { ita: ['Comune di Martina Franca'] },
      'publication-date': '2026-10-01+02:00',
      'deadline-receipt-tender-date-lot': ['2026-11-02+02:00', '2026-11-02+02:00'],
      'estimated-value-lot': ['241935.48'],
      'description-lot': { ita: ['Servizi di sviluppo software e assistente virtuale.'] },
    })
    expect(text).toContain('Titolo: Sviluppo della piattaforma digitale')
    expect(text).toContain('Ente appaltante: Comune di Martina Franca')
    expect(text).toContain('Termine per le offerte: 2026-11-02\n')
    expect(text).toContain('Servizi di sviluppo software')
    expect(text).not.toContain('Digital platform')
  })

  it('incentivi.gov.it: imprese, Puglia, ancora aperti', () => {
    const base = { zm_field_subject_type_value: ['Impresa'], zm_field_regions_value: ['Puglia'], zs_field_close_date: '2026-10-20T00:00:00Z' }
    expect(isOpenToPugliaBusinesses(base, NOW)).toBe(true)
    expect(isOpenToPugliaBusinesses({ ...base, zs_field_close_date: '2026-10-19' }, NOW)).toBe(false)
    expect(isOpenToPugliaBusinesses({ ...base, zm_field_regions_value: ['Lazio'] }, NOW)).toBe(false)
    expect(isOpenToPugliaBusinesses({ ...base, zm_field_subject_type_value: ['Ente Pubblico'] }, NOW)).toBe(false)
    expect(isOpenToPugliaBusinesses({ ...base, zm_field_subject_type_value: ['Impresa da costituire - Giovanile'] }, NOW)).toBe(true)
    expect(isOpenToPugliaBusinesses({ ...base, zm_field_subject_type_value: ['Professionista'] }, NOW)).toBe(true)
  })

  it('incentivi.gov.it: testo leggibile dal modello', () => {
    const regions = Array.from({ length: 20 }, (_, i) => `R${i}`)
    const t = incentiveText({ zs_title: 'Bando', zm_field_regions_value: regions, zs_body: '<p>Uno</p><p>Due &amp; tre</p>' })
    expect(t).toContain('Titolo: Bando')
    expect(t).toContain('Regioni: tutte le regioni italiane')
    expect(t).toContain('Due & tre')
  })

  it('Regione Puglia: segna i bandi chiusi, salta concorsi e link esterni', () => {
    const item = (href: string, badge = 'Bando aperto') =>
      `<div class="news-list-item"><span class="badge badge-light">${badge}</span><a href="${href}">x</a></div>`
    const html = [
      item('https://www.regione.puglia.it/web/cai/-/avviso-1'),
      item('https://www.regione.puglia.it/web/cai/-/avviso-2', 'Bando chiuso'),
      item('https://www.regione.puglia.it/web/concorsi/-/concorso'),
      item('https://example.com/web/cai/-/fuori'),
      item('/web/europuglia/-/relativo?a=1&amp;b=2', 'A sportello'),
    ].join('')
    const { listings, items } = parsePugliaListing(html)
    expect(items).toBe(5)
    expect(listings.map(l => [l.externalId, !!l.closed])).toEqual([
      ['/web/cai/-/avviso-1', false],
      ['/web/cai/-/avviso-2', true],
      ['/web/europuglia/-/relativo', false],
    ])
    expect(listings[2]!.url).toBe('https://www.regione.puglia.it/web/europuglia/-/relativo?a=1&b=2')
  })

  it('Sistema Puglia: gli avvisi aperti, in https', () => {
    const html = [
      '<td> <a title="vai alla pagina di CIG 2025" href="http://www.sistema.puglia.it/SistemaPuglia/cig2025" target="blank">CIG</a>',
      '<td> <a title="vai alla pagina di Taranto" href="https://www.sistema.puglia.it/portal/page/portal/SistemaPuglia/TrasformazioniPerTaranto">T</a>',
      '<td> <a title="vai alla pagina di Doppio" href="https://www.sistema.puglia.it/SistemaPuglia/cig2025">D</a>',
      '<a href="https://www.sistema.puglia.it/altro">altro</a>',
    ].join('')
    expect(parseSistemaListing(html)).toEqual([
      { externalId: 'cig2025', url: 'https://www.sistema.puglia.it/SistemaPuglia/cig2025' },
      { externalId: 'trasformazionipertaranto', url: 'https://www.sistema.puglia.it/portal/page/portal/SistemaPuglia/TrasformazioniPerTaranto' },
    ])
  })

  it('Sistema Puglia: la scheda sta nell\'iframe di dettaglio, non nelle immagini', () => {
    const page = '<iframe src="/images/pobtrans.gif"></iframe><iframe src="https://www.sistema.puglia.it/portal/pls/portal/sispuglia.DYN_DETTAGLIO_DOC.SHOW?id=1"></iframe>'
    expect(sistemaFrame(page)).toContain('DYN_DETTAGLIO_DOC')
    expect(sistemaFrame('<iframe src="/images/x.gif"></iframe>')).toBeUndefined()
  })

  it('link di una pagina: stessa origine, col testo, senza file e ancore', () => {
    const html = `
      <a href="/avvisi">Avvisi <b>e bandi</b></a>
      <a href="https://www.comune.bari.it/avvisi#top">Avvisi pubblici</a>
      <a href="https://altro.it/x">Fuori</a>
      <a href="/logo.png">Logo</a>
      <a href="mailto:a@b.it">Scrivi</a>
      <a href="/contributi" title="Contributi alle imprese"><img src="x.png"></a>
      <a href="/vuoto"></a>`
    expect(pageLinks(html, 'https://www.comune.bari.it/', 'https://www.comune.bari.it')).toEqual([
      { text: 'Avvisi pubblici', href: 'https://www.comune.bari.it/avvisi' },
      { text: 'Contributi alle imprese', href: 'https://www.comune.bari.it/contributi' },
    ])
  })

  it('pagine in latin1 e area principale', () => {
    const latin = Buffer.from('<meta charset="ISO-8859-1"><p>Modalit\xe0</p>', 'latin1')
    expect(decodeHtml(latin)).toContain('Modalità')
    expect(decodeHtml(Buffer.from('<p>Modalità</p>'))).toContain('Modalità')
    const body = `<body><nav>menu</nav><main>${'Testo del bando. '.repeat(20)}</main></body>`
    expect(mainHtml(body)).not.toContain('menu')
  })

  it('nome degli allegati Liferay', () => {
    expect(attachmentName('https://www.regione.puglia.it/documents/1/2/Avviso+pubblico.pdf/abc-123')).toBe('Avviso pubblico.pdf')
    expect(isPdfLink('https://www.regione.puglia.it/documents/1/2/Avviso+pubblico.pdf/abc-123')).toBe(true)
    expect(isPdfLink('https://c.it/avviso.PDF')).toBe(true)
    expect(isPdfLink('https://c.it/avvisi')).toBe(false)
    // Un "%" che non è una sequenza valida non fa cadere niente
    expect(safeDecode('/contributo-50%-imprese')).toBe('/contributo-50%-imprese')
    expect(attachmentName('https://c.it/avviso%.pdf')).toBe('avviso%.pdf')
  })
})
