import { guessTopic, type DidiTopic } from '#shared/didi'

/**
 * La chat con Didi della pagina "Lavora con noi" (DidiChat). Per ora
 * tutto nel browser: Didi capisce di cosa si tratta dalle parole chiave
 * (shared/didi.ts) dopo una breve pausa. Quando arriverà l'AI, `ask`
 * chiederà al server e il resto resta com'è.
 */
export function useDidiChat() {
  // Quello che ha scritto il cliente, l'ultima volta
  const said = ref('')
  const topic = ref<DidiTopic | null>(null)
  const thinking = ref(false)
  let run = 0

  async function ask(text: string) {
    const id = ++run
    said.value = text
    topic.value = null
    thinking.value = true
    await new Promise(r => setTimeout(r, 900))
    if (id !== run) return
    topic.value = guessTopic(text)
    thinking.value = false
  }

  function reset() {
    run++
    said.value = ''
    topic.value = null
    thinking.value = false
  }

  return { said, topic, thinking, ask, reset }
}
