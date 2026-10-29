import { PROJECT_TYPES } from './contact'

// Didi nella pagina "Lavora con noi": da quello che scrive il cliente
// capisce di cosa si tratta, per proporgli il contatto giusto. Per ora
// bastano le parole chiave; poi lo farà l'AI dal server, con la stessa
// risposta (una voce di PROJECT_TYPES, o 'chat' se non è chiaro).
// Le voci di Didi: quelle del modulo e in più due chiacchiere
export const DIDI_TOPICS = [...PROJECT_TYPES, 'chat'] as const
export type DidiTopic = (typeof DIDI_TOPICS)[number]

// In ordine: "web app" è un'app, "sito web" è un sito
const RULES: [DidiTopic, RegExp][] = [
  ['grant', /\b(band[oi]|finanzia|contribut|fondo perduto|pnrr|incentiv|agevolaz|grant|funding)/i],
  ['app', /\b(apps?|saas|piattaform|gestional|software|dashboard|platform)\b/i],
  ['site', /\b(sit[oi]|web|landing|e-?commerce|shop|website|negozio online)\b/i],
  ['product', /\b(prodott|idea|startup|mvp|product)/i],
]

export function guessTopic(text: string): DidiTopic {
  return RULES.find(([, re]) => re.test(text))?.[0] ?? 'chat'
}
