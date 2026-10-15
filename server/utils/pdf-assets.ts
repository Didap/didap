import type { PdfAssets } from './quote-pdf'

// Font e logo del PDF dagli asset del server (server/assets, inclusi nella
// build). Obviously se ci sono i file (vedi server/assets/fonts/README.md),
// altrimenti Inter.

const EXTENSIONS = ['otf', 'ttf', 'woff']
let cached: Promise<PdfAssets> | null = null

export function loadPdfAssets(): Promise<PdfAssets> {
  cached ??= readPdfAssets().catch((err) => {
    cached = null
    throw err
  })
  return cached
}

async function readPdfAssets(): Promise<PdfAssets> {
  const storage = useStorage('assets:server')
  // In sviluppo arriva un Buffer, nella build un Uint8Array
  const raw = async (key: string) => {
    const value = await storage.getItemRaw(key)
    return value ? Buffer.from(value as Uint8Array) : null
  }
  const required = async (key: string) => {
    const data = await raw(key)
    if (!data) throw new Error(`Asset del PDF mancante: ${key}`)
    return data
  }
  const find = async (name: string) => {
    for (const ext of EXTENSIONS) {
      const data = await raw(`fonts:${name}.${ext}`)
      if (data) return data
    }
    return null
  }

  const logoSvg = (await required('pdf:logo.svg')).toString('utf8')
  const mono = {
    normal: await required('fonts:fallback:jetbrains-mono-400.woff'),
    bold: await required('fonts:fallback:jetbrains-mono-500.woff'),
  }
  const [regular, bold, wide] = await Promise.all([
    find('obviously-regular'),
    find('obviously-bold'),
    find('obviously-wide-bold'),
  ])
  if (regular && bold) return { logoSvg, sans: { normal: regular, bold }, wide, mono }

  console.warn('[pdf] Obviously non trovato in server/assets/fonts: uso Inter')
  return {
    logoSvg,
    sans: {
      normal: await required('fonts:fallback:inter-400.woff'),
      bold: await required('fonts:fallback:inter-700.woff'),
    },
    wide: null,
    mono,
  }
}
