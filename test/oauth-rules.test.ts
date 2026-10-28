import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authorizationServerMetadata,
  authorizeQuerySchema,
  isAllowedRedirect,
  protectedResourceMetadata,
  redirectMatches,
  verifyPkce
} from '../server/utils/oauth-rules'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('redirect di Claude', () => {
  it('accetta solo Claude', () => {
    expect(isAllowedRedirect('https://claude.ai/api/mcp/auth_callback')).toBe(true)
    expect(isAllowedRedirect('https://claude.com/api/mcp/auth_callback')).toBe(true)
    expect(isAllowedRedirect('http://localhost:3118/callback')).toBe(true)
    expect(isAllowedRedirect('http://127.0.0.1:50000/callback')).toBe(true)
    expect(isAllowedRedirect('http://localhost:3118/altro')).toBe(false)
    expect(isAllowedRedirect('https://claude.ai.evil.com/api/mcp/auth_callback')).toBe(false)
    expect(isAllowedRedirect('http://claude.ai/api/mcp/auth_callback')).toBe(false)
    expect(isAllowedRedirect('https://localhost/callback')).toBe(false)
    expect(isAllowedRedirect('http://localhost:3118/callback?x=1')).toBe(false)
    expect(isAllowedRedirect('non un url')).toBe(false)
  })
  it('loopback senza porta, https esatti', () => {
    expect(redirectMatches(['http://localhost:3118/callback'], 'http://localhost:4022/callback')).toBe(true)
    expect(redirectMatches(['http://localhost:3118/callback'], 'http://127.0.0.1:4022/callback')).toBe(false)
    expect(redirectMatches(['https://claude.ai/api/mcp/auth_callback'], 'https://claude.com/api/mcp/auth_callback')).toBe(false)
  })
})

describe('PKCE', () => {
  it('S256 dell\'esempio della RFC 7636', () => {
    expect(verifyPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(true)
    expect(verifyPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXx', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(false)
    expect(verifyPkce('corto', 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')).toBe(false)
  })
})

describe('metadati', () => {
  it('dal sito pubblico, non dalla richiesta', () => {
    vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://didap.it/')
    expect(protectedResourceMetadata()).toMatchObject({ resource: 'https://didap.it/mcp', authorization_servers: ['https://didap.it'] })
    expect(authorizationServerMetadata()).toMatchObject({ issuer: 'https://didap.it', token_endpoint: 'https://didap.it/oauth/token', code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'] })
  })
  it('resource diverso da /mcp è rifiutato', () => {
    vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://didap.it')
    const base = { response_type: 'code', client_id: crypto.randomUUID(), redirect_uri: 'https://claude.ai/api/mcp/auth_callback', code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', code_challenge_method: 'S256' }
    expect(authorizeQuerySchema.safeParse(base).success).toBe(true)
    expect(authorizeQuerySchema.safeParse({ ...base, resource: 'https://didap.it/mcp' }).success).toBe(true)
    expect(authorizeQuerySchema.safeParse({ ...base, resource: 'https://altro.it/mcp' }).success).toBe(false)
    expect(authorizeQuerySchema.safeParse({ ...base, code_challenge_method: 'plain' }).success).toBe(false)
  })
})
