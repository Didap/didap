import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RADAR_SETTINGS,
  evaluateGrant,
  evaluateRequirement,
  parseRadarSettings,
  radarSettingsSchema,
  type RadarProfile,
  type Requirement,
} from '#shared/radar'
import { parseCallDate, parseGrantReading } from '../server/utils/radar-reader'
import { attachmentName, incentiveText, isOpenToPugliaBusinesses, parsePugliaListing } from '../server/utils/radar-sources'
import { romeClock } from '#shared/dates'
import { shouldIngest, shouldSendDigest } from '../server/utils/radar'

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
  it('senza dati usa i default, dal lunedì al venerdì alle 8', () => {
    expect(parseRadarSettings(undefined)).toEqual(DEFAULT_RADAR_SETTINGS)
    expect(DEFAULT_RADAR_SETTINGS.notify.weekdays).toEqual([1, 2, 3, 4, 5])
  })

  it('un campo non valido torna al default, gli altri restano', () => {
    const s = parseRadarSettings({ profile: { revenue: 'tanti', employees: 4 }, notify: { emails: ['a@b.it'], time: '25:00' } })
    expect(s.profile.revenue).toBeNull()
    expect(s.profile.employees).toBe(4)
    expect(s.notify.emails).toEqual(['a@b.it'])
    expect(s.notify.time).toBe('08:00')
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

  it('una risposta senza admitsCompanies non è valida', () => {
    expect(() => parseGrantReading({ title: 'x' })).toThrow()
  })
})

describe('fonti', () => {
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

  it('nome degli allegati Liferay', () => {
    expect(attachmentName('https://www.regione.puglia.it/documents/1/2/Avviso+pubblico.pdf/abc-123')).toBe('Avviso pubblico.pdf')
  })
})

describe('calendario', () => {
  const notify = { enabled: true, emails: ['a@b.it'], weekdays: [1, 2, 3, 4, 5], time: '08:00' }

  it('ora e giorno di Roma', () => {
    // martedì 20 ottobre 2026, 10:00 a Roma (UTC+2)
    expect(romeClock(NOW)).toEqual({ date: '2026-10-20', weekday: 2, minutes: 600 })
  })

  it('scarica una volta al giorno dalle 6', () => {
    expect(shouldIngest(null, NOW)).toBe(true)
    expect(shouldIngest(new Date('2026-10-20T04:30:00Z'), NOW)).toBe(false)
    expect(shouldIngest(new Date('2026-10-19T05:00:00Z'), NOW)).toBe(true)
    // 5:30 a Roma: ancora presto
    expect(shouldIngest(new Date('2026-10-19T05:00:00Z'), new Date('2026-10-20T03:30:00Z'))).toBe(false)
  })

  it('mail nei giorni scelti, dall\'ora scelta, una volta', () => {
    expect(shouldSendDigest(notify, null, NOW)).toBe(true)
    expect(shouldSendDigest(notify, '2026-10-20', NOW)).toBe(false)
    expect(shouldSendDigest({ ...notify, time: '10:30' }, null, NOW)).toBe(false)
    expect(shouldSendDigest({ ...notify, weekdays: [1] }, null, NOW)).toBe(false)
    expect(shouldSendDigest({ ...notify, enabled: false }, null, NOW)).toBe(false)
    // sabato 24 ottobre
    expect(shouldSendDigest(notify, null, new Date('2026-10-24T08:00:00Z'))).toBe(false)
  })
})
