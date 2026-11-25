// Groq per la chat con Didi: l'API è compatibile con quella di OpenAI
// (chat completions). La chiave sta solo sul server (GROQ_API_KEY), il
// modello si sceglie con GROQ_MODEL. Si chiede sempre una risposta JSON,
// che chi chiama valida.

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export const hasGroq = () => !!process.env.GROQ_API_KEY
export const groqModel = () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

export type GroqMessage = { role: 'system' | 'user' | 'assistant', content: string }

export class GroqError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'GroqError'
  }
}

// La risposta del modello come oggetto JSON; lancia GroqError se Groq
// non risponde, risponde male o non manda JSON
export async function groqJson(messages: GroqMessage[], { maxTokens = 1500, timeoutMs = 20_000 } = {}): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel(),
        messages,
        temperature: 0.5,
        // Anche il ragionamento dei modelli gpt-oss conta nei token: breve,
        // così la chat resta svelta e la risposta ci sta
        max_tokens: maxTokens,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw new GroqError(`Groq non raggiungibile: ${(err as Error).message}`)
  }
  if (!res.ok) {
    throw new GroqError(`Groq ha risposto ${res.status}`, res.status)
  }
  const body = await res.json() as { choices?: { message?: { content?: string } }[] }
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new GroqError('Groq non ha mandato una risposta')
  try {
    return JSON.parse(content)
  } catch {
    throw new GroqError('Groq non ha mandato JSON valido')
  }
}
