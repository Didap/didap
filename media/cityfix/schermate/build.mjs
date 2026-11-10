// Clip della scheda prodotto di CityFix fatti con le schermate della landing: i passi 1 e 3
// dal telefono, il passo 2 e il resoconto dal computer, in una cornice (iPhone dal mockup,
// o finestra del browser) sul blu di CityFix. Dentro gira il clip della landing; sul
// telefono la pagina scende dal titolo al clip, lo lascia girare e torna su.
//
// Scrive un progetto HyperFrames per clip in media/cityfix/schermate/<clip>/: index.html
// (nel repo) e assets/ (generati, fuori dal repo: c'è la cornice del mockup con licenza).
// Poi check, render e codifica come in media/README.md.
//
// Prima la cornice del telefono, una volta: telefono.py (vedi lì).
// Poi la landing in locale (repo cityfix-landing accanto a didap, `npm run dev`):
//   node media/cityfix/schermate/build.mjs [http://localhost:4321/]
// Puppeteer viene da node_modules della landing, didap non ce l'ha.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { C, writeProject } from '../kit.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const LANDING = process.env.CITYFIX_LANDING ?? path.resolve(ROOT, '../cityfix-landing')
const puppeteer = createRequire(path.join(LANDING, 'package.json'))('puppeteer')
const LANDING_URL = process.argv[2] ?? 'http://localhost:4321/'

// Cornice del telefono: misure in pixel del mockup
const FRAME = JSON.parse(readFileSync(path.join(HERE, 'telefono.json'), 'utf8'))
const png = base64 => `data:image/png;base64,${base64}`
const FRAME_PNG = png(readFileSync(path.join(HERE, 'telefono.png')).toString('base64'))
const FRAME_RADIUS = 140 // angoli dello schermo, poco dentro quelli del vetro
const ISLAND_Y = 80 // centro della Dynamic Island dall'alto dello schermo

// Lo schermo è largo 390 punti: la barra di stato sopra, la pagina sotto. La barra
// copre la pagina fino a STATUS + 6 e sfuma fino a STATUS + FADE. In fondo alla discesa
// il clip finisce CLIP_GAP punti sopra il fondo dello schermo.
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
const BAR = 60 // barra della finestra del browser

// Il telefono nella tessera
const PHONE_H = 1320
const K = PHONE_H / FRAME.height // mockup → tessera
const SCREEN_W = FRAME.screen.width * K
const PT = SCREEN_W / SCREEN_PT // un punto dello schermo, in pixel della tessera

// Sul telefono: ferma in cima, discesa, clip, risalita, ferma (secondi)
const HOLD = 0.8
const SCROLL = 1.4

// sel: sezione della landing; poster: secondo del clip per il fotogramma fermo.
// Dal computer (bw: larghezza della finestra) la sezione sta al centro, sotto la testata.
// Le misure delle tessere sono quelle degli slot in media/README.md.
const shots = [
  { name: 'punto1', vp: PHONE, sel: '.view[data-key="cittadino"]', poster: 7.5, tile: [1256, 1520] },
  { name: 'punto2', vp: DESK, sel: '.view[data-key="affido"]', poster: 5.6, tile: [1920, 1080], bw: 1560 },
  { name: 'punto3', vp: PHONE, sel: '.view[data-key="chiuso"]', poster: 5, tile: [816, 1520] },
  { name: 'resoconto', vp: DESK, sel: '.mayor', poster: 8, tile: [1696, 1520], bw: 1480 },
]

// Con meno movimento la landing mostra tutto subito e non fa partire i clip; il clip
// però lo nasconde, qui torna visibile. Fuori dalla foto: banner dei cookie, barra di
// Astro in dev e bottone fisso.
const CAPTURE_CSS = '.motion-video{display:block!important}'
  + '#cookie-banner,astro-dev-toolbar,.cta-dock{display:none!important}'
  + 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'


// Fotografa la sezione col clip fermo sul primo fotogramma. Dal telefono la pagina va
// dal titolo della sezione al fondo del clip, in più schermate una sotto l'altra.
async function capture(browser, s) {
  const page = await browser.newPage()
  try {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.setViewport(s.vp)
    await page.goto(LANDING_URL, { waitUntil: 'networkidle0', timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: CAPTURE_CSS })

    const clip = await page.evaluate(async (sel) => {
      const v = document.querySelector(`${sel} video`)
      if (!v) throw new Error(`${sel}: nessun clip nella landing`)
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
      if (v.currentTime !== 0) {
        v.currentTime = 0
        await within('il clip non torna all\'inizio', new Promise(r => v.addEventListener('seeked', r, { once: true })))
      }
      await Promise.race([new Promise(r => v.requestVideoFrameCallback(r)), new Promise(r => setTimeout(r, 1000))])
      const slot = v.closest('.motion-slot')
      if (!slot) throw new Error(`${sel}: il clip non sta in un .motion-slot`)
      const r = slot.getBoundingClientRect()
      return {
        x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height,
        radius: parseFloat(getComputedStyle(slot).borderTopLeftRadius),
        src: decodeURIComponent(new URL(v.currentSrc || v.src).pathname),
        duration: v.duration,
      }
    }, s.sel)

    // Dove inizia la pagina fotografata (y nel documento), quanto scende il telefono e quanto
    // è alta. In fondo alla discesa in cima allo schermo c'è un blocco di testo intero (il
    // paragrafo o la lista) da cui il clip ci sta tutto sotto, così nessuna frase parte a metà.
    const { top, fall, height } = await page.evaluate((sel, phone, under, gap) => {
      const el = document.querySelector(sel)
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const docTop = node => node.getBoundingClientRect().top + window.scrollY
      if (phone) {
        const role = el.querySelector('.view-role')
        if (!role) throw new Error(`${sel}: manca il titolo .view-role`)
        const start = docTop(role) - under
        const clipBottom = el.querySelector('.motion-slot').getBoundingClientRect().bottom + window.scrollY
        const need = clipBottom + gap - vh - start
        const stops = [...el.querySelectorAll('.view-body, .view-points')].map(b => docTop(b) - under - start)
        const fall = Math.max(0, stops.find(f => f >= need) ?? need)
        return { top: start, fall, height: fall + vh }
      }
      const header = document.querySelector('.site-header')?.offsetHeight ?? 0
      return { top: r.top + window.scrollY - header - (vh - header - r.height) / 2, fall: 0, height: vh }
    }, s.sel, s.vp === PHONE, FADE + 2, CLIP_GAP)

    const vh = s.vp.height
    const parts = []
    for (let dy = 0; ; dy = Math.min(dy + vh, height - vh)) {
      // Anche le immagini che si caricano scorrendo
      await page.evaluate(async (y) => {
        window.scrollTo(0, y)
        await new Promise(r => setTimeout(r, 300))
        await Promise.all([...document.images].filter(i => !i.complete)
          .map(i => new Promise((r) => {
            i.addEventListener('load', r)
            i.addEventListener('error', r)
            setTimeout(r, 5000)
          })))
      }, top + dy)
      const real = await page.evaluate(() => window.scrollY)
      parts.push({ dy: real - top, img: png(await page.screenshot({ captureBeyondViewport: false, encoding: 'base64' })) })
      if (dy >= height - vh) break
    }
    return { parts, fall, height, clip: { ...clip, y: clip.y - top } }
  }
  finally {
    await page.close()
  }
}

// Tessere ferme fatte in Chromium: il fondo, e per il telefono la cornice sopra la pagina
const BASE_CSS = `
  *{margin:0;box-sizing:border-box}
  html,body{width:100%;height:100%}
  body{display:grid;place-items:center;overflow:hidden;font-family:system-ui,'Segoe UI',sans-serif}
  img{display:block}
  .phone{position:relative;width:${FRAME.width * K}px;height:${PHONE_H}px}
  .shadow{filter:drop-shadow(0 40px 50px rgba(10,6,80,.65))}
  .frame{position:absolute;inset:0;width:100%;height:100%}
  .screen{position:absolute;left:${FRAME.screen.x * K}px;top:${FRAME.screen.y * K}px;width:${SCREEN_W}px;
    height:${FRAME.screen.height * K}px;border-radius:${FRAME_RADIUS * K}px;overflow:hidden}
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
  .browser{border-radius:20px;overflow:hidden;background:#fefeff;box-shadow:0 60px 120px -40px rgba(10,6,80,.65)}
  .bar{position:relative;height:${BAR}px;display:flex;align-items:center;gap:10px;padding:0 24px;background:#ececf1;border-bottom:1px solid #dcdce3}
  .bar i{width:14px;height:14px;border-radius:50%;background:#c9c9d2}
  .url{position:absolute;left:50%;translate:-50% 0;padding:8px 120px;border-radius:10px;background:#fefeff;font-size:20px;color:#52525c}
`

const layers = {
  // Il blu, l'ombra e il telefono con lo schermo bianco
  phoneBase: () => `<body style="background:${C.blue}"><div class="phone shadow">
    <div class="screen" style="background:#fefeff"></div><img class="frame" src="${FRAME_PNG}"></div>`,
  // Sopra la pagina: barra di stato e cornice, il resto trasparente
  phoneTop: () => `<body style="background:none"><div class="phone">
    <div class="screen"><div class="status"><p><span>9:41</span><span class="bars"><b></b><b></b><b></b><b></b></span></p></div></div>
    <img class="frame" src="${FRAME_PNG}"></div>`,
  // La finestra del browser con la schermata
  desk: (s, shot) => `<body style="background:${C.blue}"><div class="browser" style="width:${s.bw}px">
    <div class="bar"><i></i><i></i><i></i><span class="url">cityfix.io</span></div>
    <img src="${shot.parts[0].img}" style="width:${s.bw}px"></div>`,
}

async function still(browser, [w, h], body, out) {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: w, height: h })
    await page.setContent(`<!doctype html><style>${BASE_CSS}</style>${body}`, { waitUntil: 'load' })
    await page.screenshot({ path: out, omitBackground: true })
  }
  finally {
    await page.close()
  }
}

const round = n => Math.round(n * 100) / 100
const box = (x, y, w, h) => `left:${round(x)}px;top:${round(y)}px;width:${round(w)}px;height:${round(h)}px`

function indexHtml(s, shot) {
  const [w, h] = s.tile
  const d = round(shot.clip.duration)
  const phone = s.vp === PHONE
  const total = phone ? round(HOLD + SCROLL + d + SCROLL + HOLD) : d
  const clipStart = phone ? HOLD + SCROLL : 0
  let body
  let timeline = ''
  if (phone) {
    const sx = (w - FRAME.width * K) / 2 + FRAME.screen.x * K
    const sy = (h - PHONE_H) / 2 + FRAME.screen.y * K
    const c = shot.clip
    const fall = round(shot.fall * PT)
    body = `
      <img id="fondo" class="clip" data-start="0" data-duration="${total}" data-track-index="0" src="assets/fondo.png" alt="">
      <div id="schermo" data-layout-allow-overflow data-layout-allow-overlap style="${box(sx, sy, SCREEN_W, FRAME.screen.height * K)};border-radius:${round(FRAME_RADIUS * K)}px">
        <div id="pagina" style="top:${round(STATUS * PT)}px;height:${round(shot.height * PT)}px">
${shot.parts.map((p, i) => `          <img src="assets/pagina-${i}.png" alt="" style="top:${round(p.dy * PT)}px">`).join('\n')}
          <video id="clip" class="clip" data-start="${clipStart}" data-duration="${d}" data-track-index="1" src="assets/clip.mp4" muted playsinline
            style="${box(c.x * PT, c.y * PT, c.w * PT, c.h * PT)};border-radius:${round(c.radius * PT)}px"></video>
        </div>
      </div>
      <img id="telefono" class="clip" data-start="0" data-duration="${total}" data-track-index="2" src="assets/telefono.png" alt="">`
    timeline = `
      tl.to('#pagina', { y: -${fall}, duration: ${SCROLL}, ease: 'power2.inOut' }, ${HOLD})
      tl.to('#pagina', { y: 0, duration: ${SCROLL}, ease: 'power2.inOut' }, ${round(HOLD + SCROLL + d)})`
  }
  else {
    const scale = s.bw / s.vp.width
    const bh = BAR + s.vp.height * scale
    const bx = (w - s.bw) / 2
    const by = (h - bh) / 2 + BAR
    // La schermata parte dove la pagina si è davvero fermata
    const c = { ...shot.clip, y: shot.clip.y - shot.parts[0].dy }
    body = `
      <img id="fondo" class="clip" data-start="0" data-duration="${total}" data-track-index="0" src="assets/fondo.png" alt="">
      <div id="schermo" data-layout-allow-overflow data-layout-allow-overlap style="${box(bx + c.x * scale, by + c.y * scale, c.w * scale, c.h * scale)};border-radius:${round(c.radius * scale)}px">
        <video id="clip" class="clip" data-start="0" data-duration="${d}" data-track-index="1" src="assets/clip.mp4" muted playsinline
          style="inset:0;width:100%;height:100%"></video>
      </div>`
  }
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${w}, height=${h}" />
    <!-- Generato da media/cityfix/schermate/build.mjs -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: ${C.blue}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      #fondo${phone ? ', #telefono' : ''} { position: absolute; inset: 0; width: 100%; height: 100%; }
      #schermo { position: absolute; overflow: hidden; background: #fefeff; }
      #clip { position: absolute; object-fit: cover; }${phone ? `
      #pagina { position: absolute; left: 0; width: 100%; }
      #pagina img { position: absolute; left: 0; width: 100%; }` : ''}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${s.name}" data-start="0" data-duration="${total}" data-width="${w}" data-height="${h}">
${body}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true })${timeline}
      tl.set({}, {}, ${total})
      window.__timelines['${s.name}'] = tl
    </script>
  </body>
</html>
`
}

const browser = await puppeteer.launch({ headless: true, args: ['--font-render-hinting=none'] })
try {
  for (const s of shots) {
    const shot = await capture(browser, s)
    const dir = path.join(HERE, s.name)
    const assets = path.join(dir, 'assets')
    mkdirSync(assets, { recursive: true })
    copyFileSync(path.join(LANDING, 'public', shot.clip.src), path.join(assets, 'clip.mp4'))
    if (s.vp === PHONE) {
      await still(browser, s.tile, layers.phoneBase(), path.join(assets, 'fondo.png'))
      await still(browser, s.tile, layers.phoneTop(), path.join(assets, 'telefono.png'))
      shot.parts.forEach((p, i) => writeFileSync(path.join(assets, `pagina-${i}.png`), Buffer.from(p.img.split(',')[1], 'base64')))
    }
    else {
      await still(browser, s.tile, layers.desk(s, shot), path.join(assets, 'fondo.png'))
    }
    writeFileSync(path.join(dir, 'index.html'), indexHtml(s, shot))
    writeProject(dir, s.name)
    const poster = round((s.vp === PHONE ? HOLD + SCROLL : 0) + s.poster)
    console.log(`${path.relative(ROOT, dir)}  poster a ${poster}s`)
  }
}
finally {
  await browser.close()
}
