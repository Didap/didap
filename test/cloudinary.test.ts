import { afterEach, describe, expect, it, vi } from 'vitest'
import { cloudinaryConfig, cloudinarySignature, cloudinaryStore } from '../server/utils/cloudinary'

const cfg = { cloudName: 'demo', apiKey: 'key123', apiSecret: 'abcd' }

type Call = { url: string, init: RequestInit }

function fakeFetch(respond: () => Response) {
  const calls: Call[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    return respond()
  }) as unknown as typeof fetch
  return { calls, impl }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('cloudinarySignature', () => {
  it('coincide col vettore della documentazione Cloudinary', () => {
    const sig = cloudinarySignature({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }, 'abcd')
    expect(sig).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
  })
})

describe('cloudinaryStore', () => {
  it('put: multipart firmato su raw/upload', async () => {
    const { calls, impl } = fakeFetch(() => json({ public_id: 'k' }))
    await cloudinaryStore(cfg, impl).put('didap/bandi/1/abc', Buffer.from('%PDF-1.4'), 'bando.pdf')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://api.cloudinary.com/v1_1/demo/raw/upload')
    expect(calls[0]!.init.method).toBe('POST')
    const form = calls[0]!.init.body as FormData
    expect(form.get('public_id')).toBe('didap/bandi/1/abc')
    expect(form.get('type')).toBe('authenticated')
    expect(form.get('api_key')).toBe('key123')
    const timestamp = String(form.get('timestamp'))
    expect(timestamp).toMatch(/^\d+$/)
    expect(form.get('signature')).toBe(cloudinarySignature({ public_id: 'didap/bandi/1/abc', timestamp, type: 'authenticated' }, 'abcd'))
    expect(form.get('file')).toBeInstanceOf(Blob)
  })

  it('get: scarica da raw/download e restituisce i byte', async () => {
    const { calls, impl } = fakeFetch(() => new Response(new Uint8Array([1, 2, 3, 255])))
    const data = await cloudinaryStore(cfg, impl).get('didap/bandi/1/abc')
    expect([...data]).toEqual([1, 2, 3, 255])
    const url = new URL(calls[0]!.url)
    expect(url.origin + url.pathname).toBe('https://api.cloudinary.com/v1_1/demo/raw/download')
    const q = url.searchParams
    expect(q.get('public_id')).toBe('didap/bandi/1/abc')
    expect(q.get('type')).toBe('authenticated')
    expect(q.get('api_key')).toBe('key123')
    const timestamp = q.get('timestamp')!
    expect(Number(q.get('expires_at'))).toBe(Number(timestamp) + 60)
    expect(q.get('signature')).toBe(cloudinarySignature({ expires_at: q.get('expires_at')!, public_id: 'didap/bandi/1/abc', timestamp, type: 'authenticated' }, 'abcd'))
  })

  it('remove: "not found" non è un errore', async () => {
    const { calls, impl } = fakeFetch(() => json({ result: 'not found' }))
    await expect(cloudinaryStore(cfg, impl).remove('didap/bandi/1/abc')).resolves.toBeUndefined()
    expect(calls[0]!.url).toBe('https://api.cloudinary.com/v1_1/demo/raw/destroy')
    const form = calls[0]!.init.body as FormData
    expect(form.get('invalidate')).toBe('true')
    expect(form.get('type')).toBe('authenticated')
  })

  it('remove: una risposta 500 lancia', async () => {
    const { impl } = fakeFetch(() => json({ error: { message: 'boom' } }, 500))
    await expect(cloudinaryStore(cfg, impl).remove('x')).rejects.toThrow('Cloudinary ha risposto 500: boom')
  })

  it('put: una risposta 401 lancia col messaggio', async () => {
    const { impl } = fakeFetch(() => json({ error: { message: 'Invalid Signature' } }, 401))
    await expect(cloudinaryStore(cfg, impl).put('x', Buffer.from('a'), 'a.pdf')).rejects.toThrow('Cloudinary ha risposto 401: Invalid Signature')
  })
})

describe('cloudinaryConfig', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('legge le tre variabili', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('CLOUDINARY_API_KEY', 'k')
    vi.stubEnv('CLOUDINARY_API_SECRET', 's')
    expect(cloudinaryConfig()).toEqual({ cloudName: 'demo', apiKey: 'k', apiSecret: 's' })
  })

  it('è null se ne manca una', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'demo')
    vi.stubEnv('CLOUDINARY_API_KEY', 'k')
    vi.stubEnv('CLOUDINARY_API_SECRET', '')
    expect(cloudinaryConfig()).toBeNull()
  })
})
