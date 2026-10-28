import { createMcpHandler } from '@modelcontextprotocol/server'
import type { H3Event } from 'h3'

// Endpoint MCP del connettore (Streamable HTTP), tutti i metodi. Prima i
// controlli nostri: origine (i browser la mandano, Claude dal suo server no)
// e token d'accesso del nostro OAuth. Poi l'SDK, con un server nuovo per la
// persona del token; la sua Response torna con il nostro Cache-Control e
// legata alla connessione (serveMcp).

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

  // useFileStore e non requireFileStore: senza Cloudinary la bozza si salva
  // lo stesso, gli strumenti dei file rispondono che la cartella non c'è.
  // onerror: errori fuori dalle risposte e richieste rifiutate dall'SDK, nel log
  const handler = createMcpHandler(() => buildMcpServer({ sql, store: useFileStore, user: access.user }), {
    onerror: e => console.warn('[mcp]', e),
  })
  return await serveMcp(event, handler, {
    authInfo: { token, clientId: access.clientId, scopes: [OAUTH_SCOPE], extra: { userId: access.user.id } },
  })
})
