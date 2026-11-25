import { projectTypeFromQuery } from '#shared/contact'
import { guessTopic, lastMessages, type DidiMessage, type DidiTopic } from '#shared/didi'
import { untypeset } from '#shared/typeset'

// `invalid`: il modello ha chiuso con un contatto che il server non
// accetta; al posto del suo grazie Didi chiede di nuovo il contatto
type DidiAnswer = { reply: string, topic: DidiTopic, sent: boolean, failed?: boolean, invalid?: boolean }

// Le risposte che arrivano dopo un "Ricomincia" non contano
let run = 0

/**
 * La chat con Didi, una sola per pagina: la nuvoletta di HomeDock e la
 * chiusura della home (DidiTalk, DidiChatPanel) mostrano la stessa
 * conversazione, così chi ha già lasciato l'idea non la rimanda.
 * `ask` manda la conversazione al server (/api/didi, il modello su
 * Groq): Didi capisce l'idea, chiede nome e contatto e, quando li ha, il
 * server ce la manda (`sent`); se non riesce `failed`. Se il server non
 * ha l'AI o non risponde, Didi torna alle parole chiave (shared/didi.ts)
 * e alle frasi già scritte (`ai` falso). `thread` è quello che si vede:
 * la domanda di Didi, i messaggi, e senza AI la frase sull'argomento.
 */
export function useDidiChat() {
  const { locale, t } = useI18n()
  const { mailto: mailtoFor, whatsapp: whatsappFor } = useDidiContact()

  const messages = useState<DidiMessage[]>('didi-chat-messages', () => [])
  const topic = useState<DidiTopic | null>('didi-chat-topic', () => null)
  const thinking = useState('didi-chat-thinking', () => false)
  const ai = useState('didi-chat-ai', () => false)
  const sent = useState('didi-chat-sent', () => false)
  const failed = useState('didi-chat-failed', () => false)

  // Quello che ha scritto il cliente, l'ultima volta
  const said = computed(() => messages.value.findLast(m => m.role === 'user')?.content ?? '')

  const thread = computed<DidiMessage[]>(() => {
    const list: DidiMessage[] = [{ role: 'assistant', content: t('chat.ask') }, ...messages.value]
    if (!ai.value && topic.value && !thinking.value) list.push({ role: 'assistant', content: t(`chat.reply.${topic.value}`) })
    if (failed.value) list.push({ role: 'assistant', content: t('chat.send_failed') })
    return list
  })

  const mailto = computed(() => (topic.value ? mailtoFor(topic.value, said.value) : ''))
  const whatsapp = computed(() => (said.value ? whatsappFor(said.value) : ''))
  // Le strade per sentirci: con le frasi già scritte, se l'invio non è
  // riuscito o quando l'idea è partita (allora solo "Ricomincia")
  const actions = computed(() => !!topic.value && (!ai.value || failed.value || sent.value))

  async function ask(text: string) {
    const id = ++run
    topic.value = null
    thinking.value = true
    failed.value = false
    messages.value = [...messages.value, { role: 'user', content: text }]
    const started = Date.now()
    try {
      const answer = await $fetch<DidiAnswer>('/api/didi', {
        method: 'POST',
        // Solo gli ultimi messaggi che il server accetta: una chat lunga
        // continua invece di tornare alle frasi già scritte
        body: { locale: locale.value === 'en' ? 'en' : 'it', messages: lastMessages(messages.value) },
      })
      if (id !== run) return
      const content = answer.invalid ? untypeset(t('chat.contact_invalid')) : answer.reply
      messages.value = [...messages.value, { role: 'assistant', content }]
      topic.value = answer.topic
      sent.value = answer.sent
      failed.value = !!answer.failed
      ai.value = true
    } catch {
      // Senza AI: le parole chiave, dopo una breve pausa come se pensasse
      await new Promise(r => setTimeout(r, Math.max(0, 900 - (Date.now() - started))))
      if (id !== run) return
      ai.value = false
      topic.value = guessTopic(text)
    } finally {
      if (id === run) thinking.value = false
    }
  }

  function reset() {
    run++
    messages.value = []
    topic.value = null
    thinking.value = false
    ai.value = false
    sent.value = false
    failed.value = false
  }

  // Quello già scritto a Didi passa al modulo; prima della risposta anche
  // il testo nel campo non ancora inviato
  const formPayload = (draft: string) => [projectTypeFromQuery(topic.value), said.value || draft.trim()] as const

  return { messages, thread, said, topic, thinking, ai, sent, failed, mailto, whatsapp, actions, ask, reset, formPayload }
}
