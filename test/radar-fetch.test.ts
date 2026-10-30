import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crawlSource } from '../server/utils/radar-crawl'
import { fetchFromSource, resolveOrigin, SourceUnreachable, withAttachments, withDownHosts } from '../server/utils/radar-fetch'

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
    if (path === '/vietato') {
      res.writeHead(403, { 'content-type': 'text/html' }).end('<h1>Accesso negato</h1>')
      return
    }
    if (path === '/captcha') {
      res.writeHead(403, { 'content-type': 'text/html' }).end('<title>Visitor anti-robot validation</title>')
      return
    }
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<a href="/avvisi">Avvisi alle imprese</a>')
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

// Una porta su cui non ascolta nessuno: la connessione viene rifiutata
async function closedPort() {
  const s = createServer()
  await new Promise<void>(resolve => s.listen(0, '127.0.0.1', resolve))
  const { port } = s.address() as AddressInfo
  await new Promise(resolve => s.close(resolve))
  return port
}

describe('download dalle fonti', () => {
  it('nessuna risposta in tempo: non si riprova e il sito resta giù per lo scan', async () => {
    await withDownHosts(async () => {
      await expect(get('/lento-poi-ok')).rejects.toBeInstanceOf(SourceUnreachable)
      expect(hits['/lento-poi-ok']).toBe(1)
      await expect(get('/')).rejects.toThrow('non risponde')
    })
    // Fuori da quello scan si riprova
    expect((await get('/lento-poi-ok'))?.toString()).toBe('ok')
  }, 10_000)

  it('connessione rifiutata: un secondo tentativo, poi il sito è giù senza altre attese', async () => {
    const dead = `http://127.0.0.1:${await closedPort()}`
    const fetchDead = (path: string) => fetchFromSource(`${dead}${path}`, { origin: dead, maxBytes: 1000, timeoutMs: 300 })
    await withDownHosts(async () => {
      await expect(fetchDead('/a')).rejects.toBeInstanceOf(SourceUnreachable)
      const start = Date.now()
      await expect(fetchDead('/b')).rejects.toThrow('non risponde')
      expect(Date.now() - start).toBeLessThan(100)
    })
  }, 10_000)

  it('riprova una volta un errore del server, poi lascia perdere senza fermare il sito', async () => {
    await withDownHosts(async () => {
      expect((await get('/503-poi-ok'))?.toString()).toBe('ok')
      await expect(get('/sempre-503')).rejects.toThrow(SourceUnreachable)
      await expect(get('/sempre-503')).rejects.toThrow('ha risposto 503')
      expect(hits['/sempre-503']).toBe(4)
      expect((await get('/'))?.toString()).toContain('Avvisi')
    })
  }, 20_000)

  it('un allegato che non arriva si salta: il bando si legge col resto', async () => {
    expect(await withAttachments('Testo del bando', [`${origin}/sempre-503`], origin)).toBe('Testo del bando')
  }, 15_000)

  it('un file che non c\'è non si riprova', async () => {
    expect(await get('/manca', true)).toBeNull()
    await expect(get('/manca')).rejects.toThrow('ha risposto 404')
    expect(hits['/manca']).toBe(2)
  })

  it('un 403 dice il codice, o il CAPTCHA se c\'è', async () => {
    await expect(get('/vietato')).rejects.toThrow('ha risposto 403')
    await expect(get('/captcha')).rejects.toThrow('CAPTCHA anti-robot')
  })

  it('con più pagine di partenza, una che non risponde si salta', async () => {
    const source = crawlSource(
      { slug: 'puglia-sviluppo', startUrls: [`${origin}/manca`, `${origin}/`], maxDepth: 0, maxCalls: 5 },
      async ({ links }) => links.map(l => ({ href: l.href, kind: 'call' as const })),
    )
    expect((await source.fetchListing()).map(l => l.externalId)).toEqual(['/avvisi'])
  })

  it('una pagina di partenza che dà 404 si riprova dalla home del sito', async () => {
    expect(await resolveOrigin(`${origin}/manca`)).toBe(origin)
    const seen: string[] = []
    const source = crawlSource(
      { slug: 'comune-072006', startUrls: [`${origin}/manca`], maxDepth: 0, maxCalls: 5 },
      async ({ url, links }) => {
        seen.push(url)
        return links.map(l => ({ href: l.href, kind: 'call' as const }))
      },
    )
    expect(await source.fetchListing()).toEqual([{ externalId: '/avvisi', url: `${origin}/avvisi` }])
    expect(seen).toEqual([`${origin}/`])
  })
})
