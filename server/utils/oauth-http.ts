import { createError, readBody, setResponseHeaders, setResponseStatus, type H3Event } from 'h3'
import type { z } from 'zod'
import type { AdminUser } from '#shared/users'
import { authorizeQuerySchema, isAllowedRedirect, redirectMatches } from './oauth-rules'
import { getOAuthClient, type OAuthClient } from './oauth'
import { requireUser } from './admin-session'
import { useDb } from './db'

// Risposte degli endpoint OAuth e controlli comuni del consenso

export const OAUTH_WINDOW_MS = 10 * 60 * 1000

// Token, client ed errori OAuth mai in cache (RFC 6749 5.1)
export const oauthNoStore = (event: H3Event) =>
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' })

// Errore OAuth (RFC 6749 5.2, RFC 7591 3.2.2): `{ error, error_description }`,
// 401 solo per invalid_client
export function oauthError(event: H3Event, error: string, description: string) {
  setResponseStatus(event, error === 'invalid_client' ? 401 : 400)
  oauthNoStore(event)
  return { error, error_description: description }
}

export type ConsentRequest = {
  query: z.infer<typeof authorizeQuerySchema>
  client: OAuthClient
  user: AdminUser
}

const invalidRequest = () => createError({ statusCode: 400, statusMessage: 'Richiesta di collegamento non valida' })
const badRedirect = () => createError({ statusCode: 400, statusMessage: 'Indirizzo di ritorno non ammesso' })

// Il corpo è la query di /oauth/authorize. Prima la persona (401 se manca),
// poi parametri, indirizzo di ritorno e client registrato
export async function readConsentRequest(event: H3Event): Promise<ConsentRequest> {
  const user = await requireUser(event)
  const parsed = authorizeQuerySchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) throw invalidRequest()
  const query = parsed.data
  if (!isAllowedRedirect(query.redirect_uri)) throw badRedirect()
  const client = await getOAuthClient(await useDb(), query.client_id)
  if (!client) throw invalidRequest()
  if (!redirectMatches(client.redirectUris, query.redirect_uri)) throw badRedirect()
  return { query, client, user }
}
