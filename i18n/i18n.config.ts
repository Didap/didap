import { typeset } from '#shared/typeset'

// Ogni testo tradotto passa dalle regole di sbandieramento
// (docs/copy/sbandieramento.md): spazi indivisibili dopo le parole brevi,
// tra numero e unità e prima dell'ultima parola. Gli a capo dopo il punto
// stanno invece nei testi stessi, come \n.
export default defineI18nConfig(() => ({
  postTranslation: <T>(text: T): T => (typeof text === 'string' ? (typeset(text) as T) : text),
}))
