import { z } from 'zod'

// Registrazione dinamica del client (RFC 7591), in JSON. Indirizzi di ritorno
// solo di Claude (registerClient); gli altri metadati non servono, e il
// client non ha segreto
const urisSchema = z.array(z.string().max(2000)).max(20)
const nameSchema = z.string().max(1000).optional()

const DESCRIPTIONS = {
  invalid_redirect_uri: 'Indirizzi di ritorno non ammessi',
  invalid_client_metadata: 'Metadati del client non validi',
} as const

// Come per i token: claude.ai registra dagli stessi IP per tutti, il tetto è largo
export default defineEventHandler(async (event) => {
  rateLimit('oauth-register', event, { max: 200, windowMs: OAUTH_WINDOW_MS })
  const body = (await readBody(event).catch(() => null)) as Record<string, unknown> | null
  const uris = urisSchema.safeParse(body?.redirect_uris)
  if (!uris.success) return oauthError(event, 'invalid_redirect_uri', DESCRIPTIONS.invalid_redirect_uri)
  const name = nameSchema.safeParse(body?.client_name)
  if (!name.success) return oauthError(event, 'invalid_client_metadata', DESCRIPTIONS.invalid_client_metadata)
  let client
  try {
    client = await registerClient(await useDb(), { name: name.data ?? '', redirectUris: uris.data })
  }
  catch (err) {
    if (err instanceof OAuthFailure && err.code === 'invalid_redirect_uri') {
      return oauthError(event, err.code, DESCRIPTIONS[err.code])
    }
    throw err
  }
  setResponseStatus(event, 201)
  oauthNoStore(event)
  return {
    client_id: client.id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: client.name,
    redirect_uris: client.redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }
})
