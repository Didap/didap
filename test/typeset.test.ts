import { describe, expect, it } from 'vitest'
import { typeset, typesetBody, untypeset } from '#shared/typeset'
import itMessages from '../i18n/locales/it.json'
import enMessages from '../i18n/locales/en.json'

const NB = ' '

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

  it('non apre una riga con il trattino di un inciso', () => {
    expect(typeset('Rispondiamo a tutti - anche per dire di no')).toContain(`tutti${NB}- anche`)
  })

  it('lascia il testo a bandiera: nessun a capo aggiunto', () => {
    expect(typeset('Tre full-stack, un designer. E Didi.')).toBe(`Tre full-stack, un${NB}designer. E${NB}Didi.`)
  })
})

// I testi vanno a bandiera: si va a capo solo dove lo vuole il design (i
// titoli spezzati a mano), mai per chiudere una frase.
function strings(o: Record<string, unknown>, prefix = ''): [string, string][] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'string' ? [[prefix + k, v] as [string, string]] : strings(v as Record<string, unknown>, `${prefix}${k}.`),
  )
}

describe.each([['it', itMessages], ['en', enMessages]])('copy %s', (_, messages) => {
  it('nessun a capo dopo la fine di una frase', () => {
    const broken = strings(messages)
      .filter(([, v]) => /[.!?…][  ]*\n/.test(v))
      .map(([key]) => key)
    expect(broken).toEqual([])
  })
})

describe('i18n', () => {
  it('ogni testo tradotto passa dalle regole', async () => {
    // defineI18nConfig è un auto-import di Nuxt: fuori da Nuxt restituisce la funzione
    Object.assign(globalThis, { defineI18nConfig: (fn: unknown) => fn })
    const { createI18n } = await import('vue-i18n')
    const config = (await import('../i18n/i18n.config')).default as unknown as () => object
    const i18n = createI18n({ legacy: false, locale: 'it', messages: { it: itMessages }, ...config() })
    expect(i18n.global.t('contact.intro')).toBe(`Due righe bastano. Rispondiamo a${NB}tutti entro 2${NB}giorni${NB}lavorativi.`)
  })
})

describe('corpo markdown', () => {
  it('unisce le righe del sorgente e lega le parole, senza a capo dopo il punto', () => {
    const body = {
      type: 'minimark',
      value: [
        ['p', {}, 'Il banco tiene i conti.\nLa sera dell\'asta. ', ['strong', {}, 'Tutti'], ' rilanciano dal telefono.'],
        ['pre', {}, ['code', {}, 'a. B']],
      ],
    }
    typesetBody(body)
    const p = body.value[0] as unknown[]
    expect(p[2]).toBe(`Il${NB}banco tiene i${NB}conti. La${NB}sera dell'asta. `)
    expect(p[4]).toBe(` rilanciano dal${NB}telefono.`)
    expect((body.value[1] as unknown[])[2]).toEqual(['code', {}, 'a. B'])
  })
})

describe('untypeset', () => {
  it('torna agli spazi normali, per i campi del form e le email', () => {
    const text = 'Ciao, avvisatemi quando esce Helllo.'
    expect(typeset(text)).not.toBe(text)
    expect(untypeset(typeset(text))).toBe(text)
  })
})
