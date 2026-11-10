// Schermate della landing di CityFix per la scheda prodotto: fotografa i passi 1 e 3
// dal telefono, il passo 2 e il resoconto dal computer, li mette in una cornice
// (iPhone dal mockup, o finestra del browser) sul blu di CityFix e scrive i WebP
// in public/covers/.
//
// Prima la cornice del telefono, una volta: telefono.py (vedi lì).
// Poi la landing in locale (repo cityfix-landing accanto a didap, `npm run dev`):
//   node media/cityfix/schermate/build.mjs [http://localhost:4321/]
// Puppeteer viene da node_modules della landing, didap non ce l'ha.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const LANDING = process.env.CITYFIX_LANDING ?? path.resolve(ROOT, '../cityfix-landing')
const puppeteer = createRequire(path.join(LANDING, 'package.json'))('puppeteer')
const LANDING_URL = process.argv[2] ?? 'http://localhost:4321/'

// Cornice del telefono: misure in pixel del mockup
const FRAME = JSON.parse(readFileSync(path.join(HERE, 'telefono.json'), 'utf8'))
const FRAME_PNG = `data:image/png;base64,${readFileSync(path.join(HERE, 'telefono.png')).toString('base64')}`
const FRAME_RADIUS = 140 // angoli dello schermo, poco dentro quelli del vetro
const ISLAND_Y = 80 // centro della Dynamic Island dall'alto dello schermo

// Lo schermo è largo 390 punti: la barra di stato sopra, la pagina sotto. La barra
// copre la pagina fino a STATUS + 6 e sfuma fino a STATUS + FADE
const STATUS = 54
const FADE = 18
const SCREEN_PT = Math.round(390 * FRAME.screen.height / FRAME.screen.width)
const PHONE = { width: 390, height: SCREEN_PT - STATUS, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 810, deviceScaleFactor: 2 }

// sel: sezione della landing; t: secondo a cui fermare il clip della sezione.
// align top: in cima allo schermo il primo blocco di testo da cui il clip ci sta tutto
// sotto (il paragrafo sotto il titolo, se no la lista), così nessuna frase parte a metà.
// center: la sezione al centro, spostata di offset.
// Le misure delle tessere sono quelle degli slot in media/README.md.
const shots = [
  { name: 'cityfix-punto1', vp: PHONE, sel: '.view[data-key="cittadino"]', t: 7.5, align: 'top', tile: [1256, 1520] },
  { name: 'cityfix-punto2', vp: DESK, sel: '.view[data-key="affido"]', t: 5.6, align: 'center', offset: -32, tile: [1920, 1080], bw: 1560 },
  { name: 'cityfix-punto3', vp: PHONE, sel: '.view[data-key="chiuso"]', t: 6.5, align: 'top', tile: [816, 1520] },
  { name: 'cityfix-resoconto', vp: DESK, sel: '.mayor', t: 6, align: 'center', tile: [1696, 1520], bw: 1480 },
]

// Banner dei cookie, barra di Astro in dev e bottone fisso fuori dalla foto. Le entrate
// animate già arrivate: ScrollTrigger a volte non scatta dopo uno scrollTo
const HIDE = '#cookie-banner,astro-dev-toolbar,.cta-dock{display:none!important}'
  + 'html{scroll-behavior:auto!important;scrollbar-width:none}::-webkit-scrollbar{display:none}'
  + '[data-reveal],[data-reveal-group]>*{opacity:1!important;transform:none!important}'

const wait = ms => new Promise(r => setTimeout(r, ms))

async function capture(browser, s) {
  const page = await browser.newPage()
  try {
    await page.setViewport(s.vp)
    await page.goto(LANDING_URL, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: HIDE })
    // Scende a passi fino alla sezione, così si carica tutto quello che sta sopra
    await page.evaluate(async (sel) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`${sel} non c'è nella landing`)
      const target = el.getBoundingClientRect().top + window.scrollY
      for (let y = 0; y < target; y += 300) {
        window.scrollTo(0, y)
        await new Promise(r => setTimeout(r, 40))
      }
    }, s.sel)
    await wait(1500)
    // Poi, a pagina ferma, la mette in posizione
    await page.evaluate((sel, align, offset, under) => {
      const el = document.querySelector(sel)
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      if (align === 'top') {
        // Sotto la barra di stato la pagina sfuma: il testo parte sotto la sfumatura
        const minTop = r.bottom - vh + 12
        const blocks = [...el.querySelectorAll('.view-body, .view-points')].map(b => b.getBoundingClientRect().top - under)
        const top = blocks.find(t => t >= minTop) ?? blocks.at(-1)
        window.scrollTo(0, window.scrollY + top)
        return
      }
      window.scrollTo(0, window.scrollY + r.top + r.height / 2 - vh / 2 + offset)
    }, s.sel, s.align, s.offset ?? 0, FADE + 2)
    await wait(800)
    // Il clip si ferma su t solo adesso: la landing lo fa partire quando entra nello schermo
    await page.evaluate(async (sel, t) => {
      const v = document.querySelector(sel).querySelector('video')
      if (!v) return
      const within = (p, what) => Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${sel}: ${what}`)), 15000)),
      ])
      v.play = () => Promise.resolve()
      v.pause()
      if (v.readyState < 2) {
        v.preload = 'auto'
        v.load()
        await within(new Promise((r, reject) => {
          v.addEventListener('loadeddata', r, { once: true })
          v.addEventListener('error', () => reject(new Error(`${sel}: il clip non si carica`)), { once: true })
        }), 'il clip non si carica')
      }
      v.currentTime = t
      await within(new Promise(r => v.addEventListener('seeked', r, { once: true })), 'il clip non va al secondo giusto')
      // Il fotogramma dev'essere disegnato, non solo cercato
      await Promise.race([new Promise(r => v.requestVideoFrameCallback(r)), new Promise(r => setTimeout(r, 1000))])
    }, s.sel, s.t)
    const png = await page.screenshot({ captureBeyondViewport: false, encoding: 'base64' })
    return `data:image/png;base64,${png}`
  }
  finally {
    await page.close()
  }
}

const PHONE_H = 1320
const K = PHONE_H / FRAME.height // mockup → tessera
const SCREEN_W = FRAME.screen.width * K
const PT = SCREEN_W / 390 // un punto dello schermo, in pixel della tessera

const phone = img => `
  <div class="phone">
    <div class="screen">
      <div class="status"><span>9:41</span><span class="bars"><b></b><b></b><b></b><b></b></span></div>
      <img src="${img}" style="width:${SCREEN_W}px">
    </div>
    <img class="frame" src="${FRAME_PNG}">
  </div>`

const window_ = (img, bw) => `
  <div class="browser" style="width:${bw}px">
    <div class="bar"><i></i><i></i><i></i><span class="url">cityfix.io</span></div>
    <img src="${img}" style="width:${bw}px">
  </div>`

const SHADOW = 'rgba(10,6,80,.65)'
const CSS = `
  *{margin:0;box-sizing:border-box}
  body{background:#2b1ce8;display:grid;place-items:center;overflow:hidden;font-family:system-ui,'Segoe UI',sans-serif}
  img{display:block}
  .phone{position:relative;width:${FRAME.width * K}px;height:${PHONE_H}px;filter:drop-shadow(0 40px 50px ${SHADOW})}
  .frame{position:absolute;inset:0;width:100%;height:100%}
  .screen{position:absolute;left:${FRAME.screen.x * K}px;top:${FRAME.screen.y * K}px;width:${SCREEN_W}px;
    height:${FRAME.screen.height * K}px;border-radius:${FRAME_RADIUS * K}px;overflow:hidden;background:#fefeff}
  /* La barra di stato sfuma sulla pagina, come quando si scorre */
  .status{position:absolute;inset:0 0 auto;height:${(STATUS + FADE) * PT}px;display:flex;justify-content:space-between;align-items:center;
    padding:0 ${32 * PT}px;font-weight:600;font-size:${16 * PT}px;color:#0a0a0f;
    /* il testo in linea col centro della Dynamic Island */
    padding-top:${2 * ISLAND_Y * K - STATUS * PT}px;padding-bottom:${FADE * PT}px;
    background:linear-gradient(#fefeff ${(STATUS + 6) * PT}px,rgb(254 254 255 / 0))}
  .screen>img{margin-top:${STATUS * PT}px}
  .bars{display:flex;gap:${1.5 * PT}px;align-items:flex-end}
  .bars b{width:${3 * PT}px;border-radius:1px;background:#0a0a0f}
  .bars b:nth-child(1){height:${4 * PT}px}.bars b:nth-child(2){height:${6 * PT}px}
  .bars b:nth-child(3){height:${8 * PT}px}.bars b:nth-child(4){height:${10 * PT}px}
  .browser{border-radius:20px;overflow:hidden;background:#fefeff;box-shadow:0 60px 120px -40px ${SHADOW}}
  .bar{position:relative;height:60px;display:flex;align-items:center;gap:10px;padding:0 24px;background:#ececf1;border-bottom:1px solid #dcdce3}
  .bar i{width:14px;height:14px;border-radius:50%;background:#c9c9d2}
  .url{position:absolute;left:50%;translate:-50% 0;padding:8px 120px;border-radius:10px;background:#fefeff;font-size:20px;color:#52525c}
`

const browser = await puppeteer.launch({ headless: true, args: ['--font-render-hinting=none'] })
try {
  for (const s of shots) {
    const img = await capture(browser, s)
    const [w, h] = s.tile
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h })
    await page.setContent(
      `<!doctype html><style>${CSS}</style><body style="width:${w}px;height:${h}px">${s.bw ? window_(img, s.bw) : phone(img)}</body>`,
      { waitUntil: 'load' },
    )
    const out = path.join(ROOT, 'public/covers', `${s.name}.webp`)
    await page.screenshot({ path: out, type: 'webp', quality: 88 })
    await page.close()
    console.log(path.relative(ROOT, out))
  }
}
finally {
  await browser.close()
}
