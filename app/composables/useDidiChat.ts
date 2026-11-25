import { guessTopic, type DidiTopic } from '#shared/didi'

type ChatMessage = { role: 'user' | 'assistant', content: string }
type DidiAnswer = { reply: string, topic: DidiTopic, sent: boolean, failed?: boolean }

/**
 * La chat con Didi (DidiTalk nella chiusura della home, HomeDock da
 * telefono). `ask` manda la conversazione al server (/api/didi, il
 * modello su Groq): Didi capisce l'idea, chiede nome e contatto e, quando
 * li ha, il server ce la manda per email (`sent`). Se l'invio non riesce
 * `failed`. Se il server non ha l'AI o non risponde, Didi torna alle
 * parole chiave (shared/didi.ts) e alle frasi già scritte: `ai` falso,
 * `reply` vuoto, e chi la usa mostra `chat.reply.<topic>` con WhatsApp,
 * la mail e il modulo.
 */
export function useDidiChat() {
  const { locale } = useI18n()

  // Quello che ha scritto il cliente, l'ultima volta
  const said = ref('')
  const topic = ref<DidiTopic | null>(null)
  const thinking = ref(false)
  // La risposta di Didi dal server; null con le frasi già scritte
  const reply = ref<string | null>(null)
  const ai = ref(false)
  const sent = ref(false)
  const failed = ref(false)
  const messages = ref<ChatMessage[]>([])
  let run = 0

  async function ask(text: string) {
    const id = ++run
    said.value = text
    thinking.value = true
    failed.value = false
    messages.value = [...messages.value, { role: 'user', content: text }]
    const started = Date.now()
    try {
      const answer = await $fetch<DidiAnswer>('/api/didi', {
        method: 'POST',
        body: { locale: locale.value === 'en' ? 'en' : 'it', messages: messages.value },
      })
      if (id !== run) return
      messages.value = [...messages.value, { role: 'assistant', content: answer.reply }]
      reply.value = answer.reply
      topic.value = answer.topic
      sent.value = answer.sent
      failed.value = !!answer.failed
      ai.value = true
    } catch {
      // Senza AI: le parole chiave, dopo una breve pausa come se pensasse
      await new Promise(r => setTimeout(r, Math.max(0, 900 - (Date.now() - started))))
      if (id !== run) return
      reply.value = null
      ai.value = false
      topic.value = guessTopic(text)
    } finally {
      if (id === run) thinking.value = false
    }
  }

  function reset() {
    run++
    said.value = ''
    topic.value = null
    thinking.value = false
    reply.value = null
    ai.value = false
    sent.value = false
    failed.value = false
    messages.value = []
  }

  return { said, topic, thinking, reply, ai, sent, failed, messages, ask, reset }
}
