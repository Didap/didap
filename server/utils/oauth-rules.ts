import { createHash, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

// Regole pure dell'OAuth del connettore MCP: redirect ammessi, PKCE,
// metadati. Nessun accesso al DB e nessuna richiesta HTTP.

export const OAUTH_SCOPE = 'bandi'

// Origine pubblica del sito, mai dedotta dalla richiesta (header falsificabili).
// Letta a ogni chiamata, non al caricamento del modulo
export function siteOrigin() {
  const url = process.env.NUXT_PUBLIC_SITE_URL || 'https://didap.it'
  return url.replace(/\/+$/, '')
}

export const mcpResourceUrl = () => `${siteOrigin()}/mcp`

const CLAUDE_REDIRECTS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback'
]
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1']
const LOOPBACK_PATH = '/callback'

function parseLoopback(uri: string) {
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    return null
  }
  const ok = url.protocol === 'http:'
    && LOOPBACK_HOSTS.includes(url.hostname)
    && url.pathname === LOOPBACK_PATH
    && !url.search && !url.hash
  return ok ? url : null
}

// Solo i callback di Claude (web e desktop) e il loopback di Claude Code
export function isAllowedRedirect(uri: string) {
  return CLAUDE_REDIRECTS.includes(uri) || parseLoopback(uri) !== null
}

// Per i loopback la porta cambia a ogni avvio (RFC 8252): si ignora.
// Gli https si confrontano esatti
export function redirectMatches(registered: string[], requested: string) {
  const req = parseLoopback(requested)
  return registered.some((r) => {
    if (!req) return r === requested
    const reg = parseLoopback(r)
    return reg !== null && reg.hostname === req.hostname
  })
}

// PKCE S256: base64url(sha256(verifier)) uguale alla challenge, a tempo costante
export function verifyPkce(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false
  const expected = Buffer.from(createHash('sha256').update(verifier).digest('base64url'))
  const given = Buffer.from(challenge)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function protectedResourceMetadata() {
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [siteOrigin()],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Didap - Bandi'
  }
}

export function authorizationServerMetadata() {
  const origin = siteOrigin()
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [OAUTH_SCOPE, 'offline_access']
  }
}

export const authorizeQuerySchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().uuid(),
  redirect_uri: z.string(),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  state: z.string().max(500).optional(),
  scope: z.string().optional(),
  // Confronto alla chiamata, non al caricamento: l'origine dipende dall'env
  resource: z.string().optional().refine(r => r === undefined || r === mcpResourceUrl())
})
