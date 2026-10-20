import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fetchFromSource } from '../server/utils/radar-fetch'

// Un sito finto: ogni percorso decide come risponde alla richiesta n
const hits: Record<string, number> = {}
let server: Server
let origin = ''

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = req.url ?? ''
    const n = (hits[path] = (hits[path] ?? 0) + 1)
    if (path === '/lento-poi-ok' && n === 1) return // non risponde: scade il tempo
    if (path === '/503-poi-ok' && n === 1) {
      res.writeHead(503).end()
      return
    }
    if (path === '/sempre-503') {
      res.writeHead(503).end()
      return
    }
    if (path === '/manca') {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200).end('ok')
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.closeAllConnections()
  server.close()
})

const get = (path: string, optional = false) =>
  optional
    ? fetchFromSource(`${origin}${path}`, { origin, maxBytes: 1000, timeoutMs: 300, optional: true })
    : fetchFromSource(`${origin}${path}`, { origin, maxBytes: 1000, timeoutMs: 300 })

describe('download dalle fonti', () => {
  it('riprova una volta se il sito non risponde in tempo', async () => {
    expect((await get('/lento-poi-ok'))?.toString()).toBe('ok')
    expect(hits['/lento-poi-ok']).toBe(2)
  }, 10_000)

  it('riprova una volta un errore del server, poi si arrende', async () => {
    expect((await get('/503-poi-ok'))?.toString()).toBe('ok')
    await expect(get('/sempre-503')).rejects.toThrow('ha risposto 503')
    expect(hits['/sempre-503']).toBe(2)
  }, 15_000)

  it('un file che non c\'è non si riprova', async () => {
    expect(await get('/manca', true)).toBeNull()
    await expect(get('/manca')).rejects.toThrow('ha risposto 404')
    expect(hits['/manca']).toBe(2)
  })
})
