// Regole di sbandieramento del copy (docs/copy/sbandieramento.md).
// Il testo resta lo stesso: cambiano solo gli spazi, così una riga non
// finisce mai su un articolo, su un numero staccato dalla sua unità o su
// una parola rimasta da sola.

const NBSP = '\u00A0'

// Parole brevi che non chiudono mai una riga: si legano alla parola dopo.
// Italiano e inglese insieme, i due elenchi non si pestano i piedi.
const SHORT_WORDS = new Set([
  // italiano: articoli, preposizioni, congiunzioni
  'a', 'e', 'i', 'o', 'è', 'ed', 'ad', 'od',
  'il', 'lo', 'la', 'le', 'gli', 'un', 'uno', 'una',
  'di', 'da', 'in', 'su', 'per', 'tra', 'fra', 'con',
  'del', 'dei', 'al', 'ai', 'dal', 'dai', 'nel', 'nei', 'sul', 'sui', 'col',
  'che', 'non', 'ma', 'se', 'né', 'mi', 'ti', 'ci', 'vi', 'si', 'ne',
  // inglese
  'an', 'the', 'of', 'to', 'on', 'at', 'by', 'for', 'and', 'or', 'is',
  'as', 'if', 'no', 'so', 'we', 'our', 'your', 'with',
])

// Oltre questa lunghezza l'ultima parola regge da sola la riga.
const WIDOW_MAX = 12

/** Lega le parole brevi, i numeri e l'ultima parola di ogni riga. */
export function typeset(text: string): string {
  if (!text || !text.includes(' ')) return text
  return text
    .split('\n')
    .map((line) => {
      let out = line
        // parola breve + spazio: lo spazio diventa indivisibile
        .replace(/(?<=^|[\s(«“"'’])(\p{L}{1,4}) +(?=\S)/gu, (m, word: string) =>
          SHORT_WORDS.has(word.toLowerCase()) ? `${word}${NBSP}` : m,
        )
        // numero e unità (o parola) dopo: 10 €, 3 novembre, 24 crediti
        .replace(/(\d)( +)(?=[\p{L}€%°])/gu, `$1${NBSP}`)
        // simbolo e numero: € 10
        .replace(/([€$£])( +)(?=\d)/g, `$1${NBSP}`)
      // niente parole orfane: l'ultima si lega alla penultima (se è già
      // legata a una parola breve, la riga è a posto così)
      const words = out.trim().split(/[ \u00A0]+/)
      const last = words[words.length - 1] ?? ''
      if (words.length >= 4 && last.length <= WIDOW_MAX) {
        out = out.replace(/ +([^ \u00A0]+)\s*$/, `${NBSP}$1`)
      }
      return out
    })
    .join('\n')
}

/**
 * Testi che si vedono: dopo il punto si va a capo.
 * Va mostrato in un elemento con `whitespace-pre-line`.
 */
export function typesetLines(text: string): string {
  if (!text) return text
  return typeset(text.replace(/([.!?…])[ \u00A0]+(?=[\p{Lu}\d«“"])/gu, '$1\n'))
}
