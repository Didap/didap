import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { createMcpHandler, type McpHttpHandler, McpServer } from '@modelcontextprotocol/server'
import { createApp, eventHandler, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { serveMcp } from '../server/utils/mcp-http'

// /mcp su un vero server HTTP: quando il client chiude la connessione,
// l'SDK lo deve sapere e chiudere il suo lato, anche a stream aperto

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const within = (p: Promise<unknown>, ms: number) =>
  Promise.race([p.then(() => 'fatto'), new Promise(r => setTimeout(() => r('scaduto'), ms))])

describe('/mcp e connessione chiusa', () => {
  let http: Server | undefined
  const clients: Client[] = []

  afterEach(async () => {
    await Promise.allSettled(clients.splice(0).map(c => c.close()))
    http?.closeAllConnections()
    await new Promise(r => http?.close(r))
  })

  async function listen(handler: McpHttpHandler) {
    const app = createApp()
    app.use('/mcp', eventHandler(event => serveMcp(event, handler, {})))
    http = createServer(toNodeListener(app))
    await new Promise<void>(r => http!.listen(0, '127.0.0.1', r))
    return (http.address() as AddressInfo).port
  }

  it('il client chiude a strumento in corso: il server MCP si chiude', async () => {
    const started = deferred()
    const closed = deferred()
    // Uno strumento che non finisce mai: lo stream SSE resta aperto
    const port = await listen(createMcpHandler(() => {
      const server = new McpServer({ name: 'prova', version: '1.0.0' })
      server.registerTool('aspetta', { description: 'Non risponde' }, () => {
        started.resolve()
        return new Promise(() => {})
      })
      server.server.onclose = () => closed.resolve()
      return server
    }))

    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'aspetta', arguments: {} } })
    const req = request({
      host: '127.0.0.1',
      port,
      path: '/mcp',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-06-18',
      },
    })
    // Chiudendo la connessione la richiesta dà errore: qui non interessa
    req.on('error', () => {})
    req.end(body)

    await started.promise
    expect(await within(closed.promise, 200)).toBe('scaduto')

    req.destroy()
    expect(await within(closed.promise, 3000)).toBe('fatto')
  })

  it('subscriptions/listen: a connessione caduta il posto si libera', async () => {
    // Un solo stream di ascolto ammesso: il secondo apre solo se il primo è finito
    // Con uno strumento il server accetta l'ascolto dei suoi cambi
    const port = await listen(createMcpHandler(() => {
      const server = new McpServer({ name: 'prova', version: '1.0.0' })
      server.registerTool('niente', { description: 'Niente' }, () => ({ content: [] }))
      return server
    }, { maxSubscriptions: 1 }))
    // `drop` fa cadere la rete di quel client: le sue connessioni si chiudono
    // senza che mandi notifications/cancelled
    const connect = async (drop = new AbortController()) => {
      // Era 2026-07-28: subscriptions/listen esiste solo lì
      const client = new Client({ name: 'test', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } })
      clients.push(client)
      const dropping: typeof fetch = (url, init) =>
        fetch(url, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, drop.signal]) : drop.signal })
      await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), { fetch: dropping }))
      return client
    }

    const drop = new AbortController()
    const first = await (await connect(drop)).listen({ toolsListChanged: true })
    drop.abort()
    expect(await within(first.closed, 3000)).toBe('fatto')

    const second = await (await connect()).listen({ toolsListChanged: true })
    expect(second.honoredFilter).toEqual({ toolsListChanged: true })
  })
})
