import type { McpHandlerRequestOptions, McpHttpHandler } from '@modelcontextprotocol/server'
import { getRequestURL, getRequestWebStream, type H3Event } from 'h3'

// Una richiesta a /mcp passata all'SDK. h3 non dice all'SDK quando il client
// se ne va: toWebRequest non ha signal e sendStream non cancella lo stream.
// Senza, uno stream SSE (strumento lungo, subscriptions/listen) resterebbe
// aperto per sempre, keepalive su un socket morto, anche a token revocato.
// Qui la chiusura della connessione interrompe la richiesta (l'SDK chiude il
// suo server) e cancella il corpo della risposta.
export async function serveMcp(event: H3Event, handler: McpHttpHandler, options: McpHandlerRequestOptions): Promise<Response> {
  const gone = new AbortController()
  event.node.res.once('close', () => gone.abort())
  const request = new Request(getRequestURL(event), {
    // @ts-expect-error opzione di undici, serve per un corpo in stream
    duplex: 'half',
    method: event.method,
    headers: event.headers,
    body: getRequestWebStream(event),
    signal: gone.signal,
  })
  const response = await handler.fetch(request, options)
  // L'SDK mette il suo Cache-Control (no-cache sugli stream SSE), che h3
  // scriverebbe sopra al nostro. no-transform: i proxy non comprimono né
  // trattengono lo stream
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store, no-transform')
  const body = response.body && untilGone(response.body, gone.signal)
  return new Response(body, { status: response.status, statusText: response.statusText, headers })
}

// Il corpo dell'SDK letto a richiesta; a connessione chiusa si cancella
function untilGone(body: ReadableStream<Uint8Array>, signal: AbortSignal): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  const stop = () => void reader.cancel().catch(() => {})
  if (signal.aborted) stop()
  else signal.addEventListener('abort', stop, { once: true })
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (!done) return controller.enqueue(value)
      signal.removeEventListener('abort', stop)
      controller.close()
    },
    cancel(reason) {
      signal.removeEventListener('abort', stop)
      return reader.cancel(reason)
    },
  })
}
