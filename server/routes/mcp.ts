import { createMcpHandler } from '@modelcontextprotocol/server'
import type { H3Event } from 'h3'

// Endpoint MCP del connettore (Streamable HTTP), tutti i metodi. Prima i
// controlli nostri: origine (i browser la mandano, Claude dal suo server no)
// e token d'accesso del nostro OAuth. Poi l'SDK, con un server nuovo per la
// persona del token; la sua Response torna così com'è.

// RFC 6750 3 e RFC 9728 5.1: da qui Claude trova il server di autorizzazione.
// Senza token nessun codice d'errore, con un token rifiutato invalid_token
function unauthorized(event: H3Event, invalidToken: boolean) {
  const challenge = [
    `Bearer resource_metadata="${siteOrigin()}/.well-known/oauth-protected-resource"`,
    `scope="${OAUTH_SCOPE}"`,
    ...(invalidToken ? ['error="invalid_token"'] : []),
  ].join(', ')
  setResponseStatus(event, 401)
  setResponseHeader(event, 'WWW-Authenticate', challenge)
  return { error: invalidToken ? 'Token non valido o scaduto' : 'Serve un token: collega Claude dal connettore Didap' }
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const origin = getRequestHeader(event, 'origin')
  if (origin && origin !== siteOrigin()) {
    setResponseStatus(event, 403)
    return { error: 'Origine non ammessa' }
  }

  const token = /^Bearer\s+(\S+)\s*$/i.exec(getRequestHeader(event, 'authorization') ?? '')?.[1]
  if (!token) return unauthorized(event, false)
  const sql = await useDb()
  const access = await verifyAccessToken(sql, token)
  if (!access) return unauthorized(event, true)

  const handler = createMcpHandler(() => buildMcpServer({ sql, store: requireFileStore, user: access.user }))
  const response = await handler.fetch(toWebRequest(event), {
    authInfo: { token, clientId: access.clientId, scopes: [OAUTH_SCOPE], extra: { userId: access.user.id } },
  })
  // L'SDK mette il suo Cache-Control (no-cache sugli stream SSE), che h3
  // scriverebbe sopra al nostro: si rifà la Response, il corpo resta in stream.
  // no-transform: i proxy non comprimono né trattengono lo stream
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store, no-transform')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
})
