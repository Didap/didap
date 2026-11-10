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
import { C } from '../kit.mjs'

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
// copre la pagina fino a STATUS + 6 e sfuma fino a STATUS + FADE. Il clip finisce
// almeno CLIP_GAP punti sopra il fondo dello schermo.
const SCREEN_PT = 390
const STATUS = 54
const FADE = 18
const CLIP_GAP = 12
const PHONE = {
  width: SCREEN_PT,
  height: Math.round(SCREEN_PT * FRAME.screen.height / FRAME.screen.width) - STATUS,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
}
const DESK = { width: 1440, height: 810, deviceScaleFactor: 2 }

// Il telefono nella tessera
const PHONE_H = 1320
const K = PHONE_H / FRAME.height // mockup → tessera
const SCREEN_W = FRAME.screen.width * K
const PT = SCREEN_W / SCREEN_PT // un punto dello schermo, in pixel della tessera

// sel: sezione della landing; t: secondo a cui fermare il clip della sezione.
// Dal telefono: in cima allo schermo il primo blocco di testo da cui il clip ci sta tutto
// sotto (il paragrafo sotto il titolo, se no la lista), così nessuna frase parte a metà.
// Dal computer (bw: larghezza della finestra): la sezione al centro, sotto la testata.
// Le misure delle tessere sono quelle degli slot in media/README.md.
const shots = [
  { name: 'cityfix-punto1', vp: PHONE, sel: '.view[data-key="cittadino"]', t: 7.5, tile: [1256, 1520] },
  { name: 'cityfix-punto2', vp: DESK, sel: '.view[data-key="affido"]', t: 5.6, tile: [1920, 1080], bw: 1560 },
  { name: 'cityfix-punto3', vp: PHONE, sel: '.view[data-key="chiuso"]', t: 6.5, tile: [816, 1520] },
  { name: 'cityfix-resoconto', vp: DESK, sel: '.mayor', t: 6, tile: [1696, 1520], bw: 1480 },
]

// Con meno movimento la landing mostra tutto subito e non fa partire i clip; il clip
// però lo nasconde, qui torna visibile. Fuori dalla foto: banner dei cookie, barra di
// Astro in dev e bottone fisso.
const CAPTURE_CSS = '.motion-video{display:block!important}'
  + '#cookie-banner,astro-dev-toolbar,.cta-dock{display:none!important}'
  + 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'

async function capture(browser, s) {
  const page = await browser.newPage()
  try {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.setViewport(s.vp)
    await page.goto(LANDING_URL, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: CAPTURE_CSS })
    await page.evaluate((sel, phone, under, gap) => {
      const el = document.querySelector(sel)
      if (!el) throw new Error(`${sel} non c'è nella landing`)
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      if (phone) {
        // Sotto la barra di stato la pagina sfuma: il testo parte sotto la sfumatura
        const minTop = r.bottom - vh + gap
        const blocks = [...el.querySelectorAll('.view-body, .view-points')].map(b => b.getBoundingClientRect().top - under)
        window.scrollBy(0, blocks.find(t => t >= minTop) ?? blocks.at(-1))
        return
      }
      const header = document.querySelector('.site-header')?.offsetHeight ?? 0
      window.scrollBy(0, r.top - header - (vh - header - r.height) / 2)
    }, s.sel, s.vp === PHONE, FADE + 2, CLIP_GAP)
    // Il clip fermo sul secondo t
    await page.evaluate(async (sel, t) => {
      const v = document.querySelector(`${sel} video`)
      if (!v) throw new Error(`${sel}: nessun clip`)
      const within = (what, p) => Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${sel}: ${what}`)), 15000)),
      ])
      if (v.readyState < 2) {
        const what = 'il clip non si carica'
        v.preload = 'auto'
        v.load()
        await within(what, new Promise((r, reject) => {
          v.addEventListener('loadeddata', r, { once: true })
          v.addEventListener('error', () => reject(new Error(`${sel}: ${what}`)), { once: true })
        }))
      }
      v.currentTime = t
      await within('il clip non va al secondo giusto', new Promise(r => v.addEventListener('seeked', r, { once: true })))
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

const phone = img => `
  <div class="phone">
    <div class="screen">
      <img src="${img}" style="width:${SCREEN_W}px">
      <div class="status"><p><span>9:41</span><span class="bars"><b></b><b></b><b></b><b></b></span></p></div>
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
  body{background:${C.blue};display:grid;place-items:center;overflow:hidden;font-family:system-ui,'Segoe UI',sans-serif}
  img{display:block}
  .phone{position:relative;width:${FRAME.width * K}px;height:${PHONE_H}px;filter:drop-shadow(0 40px 50px ${SHADOW})}
  .frame{position:absolute;inset:0;width:100%;height:100%}
  .screen{position:absolute;left:${FRAME.screen.x * K}px;top:${FRAME.screen.y * K}px;width:${SCREEN_W}px;
    height:${FRAME.screen.height * K}px;border-radius:${FRAME_RADIUS * K}px;overflow:hidden;background:#fefeff}
  .screen>img{margin-top:${STATUS * PT}px}
  /* La barra di stato sfuma sulla pagina, come quando si scorre; ora e tacche in linea
     col centro della Dynamic Island */
  .status{position:absolute;inset:0 0 auto;height:${(STATUS + FADE) * PT}px;
    background:linear-gradient(#fefeff ${(STATUS + 6) * PT}px,rgb(254 254 255 / 0))}
  .status p{position:absolute;inset:${ISLAND_Y * K}px 0 auto;translate:0 -50%;display:flex;justify-content:space-between;
    align-items:center;padding:0 ${32 * PT}px;font-weight:600;font-size:${16 * PT}px;color:#0a0a0f}
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
      `<!doctype html><style>${CSS}</style><body style="width:${w}px;height:${h}px">${s.vp === PHONE ? phone(img) : window_(img, s.bw)}</body>`,
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
