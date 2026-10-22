// Regole di sbandieramento del copy (docs/copy/sbandieramento.md).
// Il testo resta lo stesso: cambiano solo gli spazi, così una riga non
// finisce mai su un articolo, su un numero staccato dalla sua unità o su
// una parola rimasta da sola.

const NBSP = String.fromCharCode(160)
// Uno spazio qualsiasi, normale o indivisibile
const ANY_SPACE = `[ ${NBSP}]`

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

const WORDS = new RegExp(`${ANY_SPACE}+`)
const LAST_WORD = new RegExp(` +([^ ${NBSP}]+)\\s*$`)
const SENTENCE_END = new RegExp(`([.!?…])${ANY_SPACE}+(?=[\\p{Lu}\\d«“"])`, 'gu')

/**
 * Lega le parole brevi, i numeri e l'ultima parola di ogni riga. Con
 * `tail: false` il testo è un pezzo di un paragrafo che continua (prima di
 * un grassetto, di un link): la sua ultima riga non finisce qui, e l'ultima
 * parola non va legata.
 */
export function typeset(text: string, { tail = true }: { tail?: boolean } = {}): string {
  if (!text || !text.includes(' ')) return text
  const lines = text.split('\n')
  return lines
    .map((line, i) => {
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
      const words = out.trim().split(WORDS)
      const last = words[words.length - 1] ?? ''
      const ends = tail || i < lines.length - 1
      if (ends && words.length >= 4 && last.length <= WIDOW_MAX) {
        out = out.replace(LAST_WORD, `${NBSP}$1`)
      }
      return out
    })
    .join('\n')
}

/**
 * Testi che si vedono: dopo il punto si va a capo.
 * Va mostrato in un elemento con `whitespace-pre-line`.
 */
export function typesetLines(text: string, options?: { tail?: boolean }): string {
  if (!text) return text
  return typeset(text.replace(SENTENCE_END, '$1\n'), options)
}

// Nodi del corpo markdown di Nuxt Content: minimark ([tag, props, ...figli])
// o albero MDC ({ type, tag, children, value }).
type MinimarkNode = string | [string, Record<string, unknown>, ...MinimarkNode[]]
interface MdcNode {
  type: string
  tag?: string
  value?: string
  children?: MdcNode[]
}

const BLOCKS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'td', 'th'])
const SKIP = new Set(['code', 'pre'])

/**
 * Applica le regole al corpo in markdown di un contenuto: i testi dei
 * paragrafi e delle voci vanno a capo dopo il punto, gli a capo del sorgente
 * diventano spazi. Va mostrato con `whitespace-pre-line` sui blocchi.
 */
export function typesetBody<T>(body: T): T {
  const b = body as { type?: string, value?: MinimarkNode[], children?: MdcNode[] }
  if (b?.type === 'minimark' && Array.isArray(b.value)) b.value.forEach((n) => minimark(n, false))
  else if (Array.isArray(b?.children)) b.children.forEach((n) => mdc(n, false))
  return body
}

// Un pezzo di testo: gli a capo del sorgente diventano spazi; se il pezzo
// chiude una frase e dopo c'è altro (un grassetto, un link), si va a capo.
function piece(text: string, last: boolean): string {
  let t = text.replace(/\s*\n\s*/g, ' ')
  if (!last && /[.!?…] +$/.test(t)) t = t.replace(/ +$/, '\n')
  return typesetLines(t, { tail: last })
}

function minimark(node: MinimarkNode, inBlock: boolean): void {
  if (typeof node === 'string' || !Array.isArray(node)) return
  const [tag, , ...kids] = node
  if (SKIP.has(tag)) return
  const block = inBlock || BLOCKS.has(tag)
  kids.forEach((kid, i) => {
    if (typeof kid === 'string') {
      if (block) node[i + 2] = piece(kid, i === kids.length - 1)
    }
    else minimark(kid, block)
  })
}

function mdc(node: MdcNode, inBlock: boolean): void {
  if (!node.children || (node.tag && SKIP.has(node.tag))) return
  const block = inBlock || (!!node.tag && BLOCKS.has(node.tag))
  node.children.forEach((kid, i, all) => {
    if (kid.type === 'text' && typeof kid.value === 'string') {
      if (block) kid.value = piece(kid.value, i === all.length - 1)
    }
    else mdc(kid, block)
  })
}
