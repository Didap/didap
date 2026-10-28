import { z } from 'zod'

// Endpoint dei token (RFC 6749 3.2), in application/x-www-form-urlencoded:
// codice più PKCE, o rinnovo con rotazione. Client pubblici, senza segreto.
// Un parametro ripetuto arriva come array e non passa lo schema
const field = z.string().min(1).max(500)

const codeSchema = z.object({
  code: field,
  redirect_uri: field,
  client_id: field,
  code_verifier: field,
})

const refreshSchema = z.object({
  refresh_token: field,
  client_id: field,
})

const DESCRIPTIONS: Record<OAuthErrorCode, string> = {
  invalid_request: 'Richiesta non valida',
  invalid_client: 'Client sconosciuto',
  invalid_grant: 'Codice o token non valido, scaduto o già usato',
  invalid_redirect_uri: 'Indirizzo di ritorno non ammesso',
  invalid_client_metadata: 'Metadati del client non validi',
}

async function grant(body: Record<string, unknown>, grantType: string): Promise<TokenSet | null> {
  const sql = await useDb()
  if (grantType === 'authorization_code') {
    const p = codeSchema.safeParse(body)
    if (!p.success) throw new OAuthFailure('invalid_request')
    return await exchangeCode(sql, {
      code: p.data.code,
      clientId: p.data.client_id,
      redirectUri: p.data.redirect_uri,
      codeVerifier: p.data.code_verifier,
    })
  }
  if (grantType === 'refresh_token') {
    const p = refreshSchema.safeParse(body)
    if (!p.success) throw new OAuthFailure('invalid_request')
    return await refreshTokens(sql, { refreshToken: p.data.refresh_token, clientId: p.data.client_id })
  }
  return null
}

// Le richieste di claude.ai arrivano tutte dagli stessi IP di Anthropic: per IP
// solo un tetto largo, il limite vero è per IP e client
export default defineEventHandler(async (event) => {
  rateLimit('oauth-token-ip', event, { max: 600, windowMs: OAUTH_WINDOW_MS })
  const body = await readBody(event).catch(() => null)
  const clientId = body && typeof body === 'object' ? (body as Record<string, unknown>).client_id : undefined
  rateLimit('oauth-token', event, { max: 60, windowMs: OAUTH_WINDOW_MS }, typeof clientId === 'string' ? clientId.slice(0, 64) : '')
  const grantType = body && typeof body === 'object' ? (body as Record<string, unknown>).grant_type : undefined
  if (typeof grantType !== 'string' || !grantType) {
    return oauthError(event, 'invalid_request', 'Manca grant_type')
  }
  let tokens
  try {
    tokens = await grant(body as Record<string, unknown>, grantType)
  }
  catch (err) {
    if (err instanceof OAuthFailure) return oauthError(event, err.code, DESCRIPTIONS[err.code])
    throw err
  }
  if (!tokens) return oauthError(event, 'unsupported_grant_type', 'Si accettano authorization_code e refresh_token')
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' })
  return {
    access_token: tokens.accessToken,
    token_type: 'Bearer',
    expires_in: tokens.expiresIn,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope,
  }
})
