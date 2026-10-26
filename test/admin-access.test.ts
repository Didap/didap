import { describe, expect, it } from 'vitest'
import { apiAccess, firstAllowedPath, pageForPath } from '#shared/admin-access'
import { passwordSchema, userCreateSchema } from '#shared/users'

describe('accesso al pannello', () => {
  it('API aperte, solo sessione, per pagina', () => {
    for (const p of ['/api/admin/login', '/api/admin/session', '/api/admin/password/forgot', '/api/admin/password/set'])
      expect(apiAccess(p, 'POST').kind).toBe('open')
    expect(apiAccess('/api/admin/logout', 'POST')).toEqual({ kind: 'session' })
    expect(apiAccess('/api/admin/account/password', 'POST')).toEqual({ kind: 'session' })
    expect(apiAccess('/api/admin/products/abc', 'PUT')).toEqual({ kind: 'pages', anyOf: ['prodotti'] })
    expect(apiAccess('/api/admin/assets', 'POST')).toEqual({ kind: 'pages', anyOf: ['prodotti'] })
    expect(apiAccess('/api/admin/quotes/x/send', 'POST')).toEqual({ kind: 'pages', anyOf: ['preventivi'] })
    expect(apiAccess('/api/admin/radar/grants/1/like', 'PUT')).toEqual({ kind: 'pages', anyOf: ['bandi'] })
    expect(apiAccess('/api/admin/settings', 'PUT')).toEqual({ kind: 'pages', anyOf: ['impostazioni'] })
    expect(apiAccess('/api/admin/users/1', 'DELETE')).toEqual({ kind: 'pages', anyOf: ['collaboratori'] })
  })
  it('i clienti si leggono anche da Preventivi, si modificano solo da Clienti', () => {
    expect(apiAccess('/api/admin/clients', 'GET')).toEqual({ kind: 'pages', anyOf: ['clienti', 'preventivi'] })
    expect(apiAccess('/api/admin/clients/1', 'GET')).toEqual({ kind: 'pages', anyOf: ['clienti', 'preventivi'] })
    expect(apiAccess('/api/admin/clients', 'POST')).toEqual({ kind: 'pages', anyOf: ['clienti'] })
    expect(apiAccess('/api/admin/clients/1', 'DELETE')).toEqual({ kind: 'pages', anyOf: ['clienti'] })
  })
  it('barra finale indifferente, percorsi sconosciuti rifiutati', () => {
    expect(apiAccess('/api/admin/clients/', 'GET')).toEqual(apiAccess('/api/admin/clients', 'GET'))
    expect(apiAccess('/api/admin/nuova-cosa', 'GET')).toEqual({ kind: 'deny' })
    expect(apiAccess('/api/admin/productsx', 'GET')).toEqual({ kind: 'deny' })
  })
  it('pagine del pannello', () => {
    expect(pageForPath('/admin')).toBe('prodotti')
    expect(pageForPath('/admin/preventivi/123')).toBe('preventivi')
    expect(pageForPath('/admin/collaboratori')).toBe('collaboratori')
    expect(pageForPath('/admin/account')).toBe('session')
    expect(pageForPath('/admin/password')).toBe('open')
    expect(pageForPath('/')).toBeNull()
  })
  it('prima pagina accessibile nell\'ordine del menu', () => {
    expect(firstAllowedPath(['bandi', 'clienti'])).toBe('/admin/clienti')
    expect(firstAllowedPath([])).toBeNull()
  })
  it('validazione', () => {
    expect(userCreateSchema.parse({ name: ' Mario ', email: '  Mario@Didap.IT ', pages: ['bandi', 'prodotti', 'bandi'] }))
      .toEqual({ name: 'Mario', email: 'mario@didap.it', pages: ['prodotti', 'bandi'] })
    expect(passwordSchema.safeParse('123456789').success).toBe(false)
    expect(userCreateSchema.safeParse({ name: 'x', email: 'x@y.it', pages: ['root'] }).success).toBe(false)
  })
})
