import { X509Certificate } from 'node:crypto'
import https from 'node:https'
import { Readable } from 'node:stream'
import tls from 'node:tls'

// Richieste HTTP del radar verso i siti degli enti.
// - Intestazioni da browser: alcuni firewall dei comuni rispondono 403 ai
//   client che non sembrano un browser.
// - Certificato incompleto (manca l'intermedio, es. Comune di Lecce): come
//   fanno i browser, l'intermedio si scarica dall'indirizzo scritto nel
//   certificato stesso e si usa solo se è firmato da un'autorità di sistema.
//   La verifica resta accesa.

export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
}

export const errorCode = (err: unknown): string =>
  (err as { cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code ?? ''

let roots: X509Certificate[] | null = null
const systemRoots = () => (roots ??= tls.rootCertificates.map(pem => new X509Certificate(pem)))

// Intermedi scaricati e verificati, in PEM; host per cui servono
const intermediates: string[] = []
const chainByHost = new Map<string, Promise<boolean>>()

function leafCertificate(hostname: string, port: number): Promise<tls.PeerCertificate> {
  return new Promise((resolve, reject) => {
    // Solo per leggere il certificato: nessun dato passa su questa connessione
    const socket = tls.connect({ host: hostname, port, servername: hostname, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      resolve(cert)
    })
    socket.setTimeout(15_000, () => socket.destroy(new Error('Certificato non letto in tempo')))
    socket.on('error', reject)
  })
}

const MAX_CHAIN = 3

async function downloadCertificate(uri: string): Promise<X509Certificate | null> {
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    return new X509Certificate(Buffer.from(await res.arrayBuffer()))
  }
  catch {
    // Indirizzo irraggiungibile o file non valido
    return null
  }
}

const issuerUris = (infoAccess: string | undefined) =>
  [...(infoAccess ?? '').matchAll(/CA Issuers - URI:(\S+)/g)].map(m => m[1]!)

// Risale gli indirizzi "CA Issuers" fino a un certificato firmato da una
// radice di sistema (Let's Encrypt ne ha due di fila). Gli indirizzi sono
// spesso http: ogni anello vale solo se firma il precedente e la catena
// arriva a una radice.
async function findIntermediate(url: URL): Promise<boolean> {
  const leaf = await leafCertificate(url.hostname, Number(url.port) || 443)
  let uris = (leaf.infoAccess as Record<string, string[]> | undefined)?.['CA Issuers - URI'] ?? []
  const chain: X509Certificate[] = []
  while (chain.length < MAX_CHAIN && uris.length) {
    const cert = await downloadCertificate(uris[0]!)
    const below = chain.at(-1)
    if (!cert?.ca || (below && !(below.checkIssued(cert) && below.verify(cert.publicKey)))) return false
    chain.push(cert)
    if (systemRoots().some(root => cert.checkIssued(root) && cert.verify(root.publicKey))) {
      intermediates.push(...chain.map(c => c.toString()))
      return true
    }
    uris = issuerUris(cert.infoAccess)
  }
  return false
}

const completeChain = (url: URL) => {
  if (!chainByHost.has(url.host)) chainByHost.set(url.host, findIntermediate(url).catch(() => false))
  return chainByHost.get(url.host)!
}

const NULL_BODY = new Set([204, 205, 304])

// Come fetch, con le autorità di sistema più gli intermedi trovati
// Un agente solo, rifatto quando si aggiunge un intermedio: le autorità si
// caricano una volta e le connessioni si riusano
let agent: { size: number, value: https.Agent } | null = null
const caAgent = () => {
  if (agent?.size !== intermediates.length) {
    agent = { size: intermediates.length, value: new https.Agent({ ca: [...tls.rootCertificates, ...intermediates], keepAlive: true }) }
  }
  return agent.value
}

function fetchWithIntermediates(url: string, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { headers: BROWSER_HEADERS, agent: caAgent(), signal }, (res) => {
      const headers = new Headers()
      for (const [k, v] of Object.entries(res.headers)) {
        if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : String(v))
      }
      const status = res.statusCode ?? 502
      try {
        // 204, 205 e 304 non hanno corpo: Response lo rifiuta
        const body = NULL_BODY.has(status) ? null : Readable.toWeb(res) as ReadableStream
        if (!body) res.resume()
        resolve(new Response(body, { status, headers }))
      }
      catch (err) {
        res.destroy()
        reject(err)
      }
    })
    req.on('error', reject)
    req.end()
  })
}

// Una richiesta senza seguire i redirect (li controlla chi chiama)
export async function webRequest(url: string, signal: AbortSignal): Promise<Response> {
  const target = new URL(url)
  if (target.protocol === 'https:' && chainByHost.has(target.host) && await chainByHost.get(target.host)) {
    return fetchWithIntermediates(url, signal)
  }
  try {
    return await fetch(url, { headers: BROWSER_HEADERS, redirect: 'manual', signal })
  }
  catch (err) {
    if (errorCode(err) !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || !(await completeChain(target))) throw err
    return fetchWithIntermediates(url, signal)
  }
}
