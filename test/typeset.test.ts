import { describe, expect, it } from 'vitest'
import { typeset, typesetLines } from '#shared/typeset'
import itMessages from '../i18n/locales/it.json'
import enMessages from '../i18n/locales/en.json'

const NB = '\u00A0'

describe('sbandieramento', () => {
  it('lega articoli e preposizioni alla parola dopo', () => {
    expect(typeset('Lavoriamo su prodotti per il mercato europeo')).toBe(
      `Lavoriamo su${NB}prodotti per${NB}il${NB}mercato${NB}europeo`,
    )
  })

  it('tiene il numero attaccato alla sua unità', () => {
    expect(typeset('Torna dopo il 3 novembre con 24 crediti')).toContain(`3${NB}novembre`)
    expect(typeset('Un credito costa € 10 a lega')).toContain(`€${NB}10`)
  })

  it('non lascia l\'ultima parola da sola', () => {
    expect(typeset('Nessuna città è mai finita')).toMatch(new RegExp(`mai${NB}finita$`))
  })

  it('lascia stare le stringhe di una parola e le righe brevi', () => {
    expect(typeset('Didap')).toBe('Didap')
    expect(typeset('Apri il prodotto')).toBe(`Apri il${NB}prodotto`)
  })

  it('nei testi brevi va a capo dopo il punto', () => {
    expect(typesetLines('Tre full-stack, un designer. E Didi.')).toBe(`Tre full-stack, un${NB}designer.\nE${NB}Didi.`)
  })
})

// Ogni testo che si vede va a capo dopo ogni frase: il punto seguito da
// spazio e maiuscola vuol dire che manca un a capo. Fuori dalla regola solo
// i testi che non si vedono (alt, SEO).
const FLOW = [/\.alt$/, /seo_description$/]

function strings(o: Record<string, unknown>, prefix = ''): [string, string][] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' ? [[prefix + k, v] as [string, string]] : strings(v as Record<string, unknown>, `${prefix}${k}.`),
  )
}

describe.each([['it', itMessages], ['en', enMessages]])('copy %s', (_, messages) => {
  it('ogni testo ha una frase per riga', () => {
    const missing = strings(messages)
      .filter(([key]) => !FLOW.some((re) => re.test(key)))
      .filter(([, v]) => /[.!?][ \u00A0]+[\p{Lu}]/u.test(v))
      .map(([key]) => key)
    expect(missing).toEqual([])
  })
})

describe('i18n', () => {
  it('ogni testo tradotto passa dalle regole', async () => {
    // defineI18nConfig è un auto-import di Nuxt: fuori da Nuxt restituisce la funzione
    Object.assign(globalThis, { defineI18nConfig: (fn: unknown) => fn })
    const { createI18n } = await import('vue-i18n')
    const config = (await import('../i18n/i18n.config')).default as unknown as () => object
    const i18n = createI18n({ legacy: false, locale: 'it', messages: { it: itMessages }, ...config() })
    expect(i18n.global.t('home.team_intro')).toBe(`Tre full-stack engineer, un${NB}designer, un${NB}project${NB}manager.\nE${NB}Didi.`)
  })
})
