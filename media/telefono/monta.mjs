// Mette uno schermo da telefono dentro l'iPhone, alla misura di uno slot della scheda, come
// punto1 e punto3 di CityFix (media/cityfix/landing). Scrive il progetto HyperFrames del
// telefono: index.html, hyperframes.json, meta.json e assets/telefono.png.
//
//   node media/telefono/monta.mjs <cartella> --slot pair|feature --ombra "<rgba>" [--durata 10]
//
// Poi si renderizza lo schermo (progetto a parte, 1080x2330, con barra di stato e indicatore
// home) in <cartella>/assets/schermo.mp4 e infine il telefono. Prima di tutto serve
// telefono.png: python media/telefono/telefono.py
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    slot: { type: 'string', default: 'pair' },
    ombra: { type: 'string', default: 'rgba(22, 20, 18, 0.28)' },
    durata: { type: 'string', default: '10' },
  },
})
const dir = positionals[0]
if (!dir) throw new Error('Manca la cartella del progetto')
const FRAME = path.join(HERE, 'telefono.png')
if (!existsSync(FRAME)) throw new Error('Manca telefono.png: prima python media/telefono/telefono.py')

// Slot della scheda (media/README.md): il telefono è alto 1320 in tutti e due, centrato
const SLOTS = { pair: 1256, feature: 816 }
const W = SLOTS[values.slot]
if (!W) throw new Error(`Slot sconosciuto: ${values.slot}`)
const H = 1520
const dx = (W - 1256) / 2 // punto1 è la pair: la feature sposta tutto di -220
const body = { x: 309.88 + dx, y: 100, w: 636.23, h: 1320, r: 91.41 }
const screen = { x: 326.95 + dx, y: 108.53, w: 603.32, h: 1301.72, r: 85.32 }
const frameX = 309 + dx // telefono.png è ritagliato sui pixel interi del clip di CityFix
const d = Number(values.durata)
const id = path.basename(path.resolve(dir))
const px = n => `${+n.toFixed(2)}px`

mkdirSync(path.join(dir, 'assets'), { recursive: true })
copyFileSync(FRAME, path.join(dir, 'assets', 'telefono.png'))

writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="it">
  <!-- Generato da media/telefono/monta.mjs: lo schermo (assets/schermo.mp4, 1080x2330) dentro
       l'iPhone 17 Pro di CityFix (assets/telefono.png, da media/telefono/telefono.py), slot ${values.slot} ${W}x${H}. -->
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #f4f4f4; }
      #root { position: relative; width: 100%; height: 100%; background: #f4f4f4; }
      /* L'ombra del telefono: una sagoma con gli angoli del vetro, sotto la cornice */
      #ombra {
        position: absolute; left: ${px(body.x)}; top: ${px(body.y)}; width: ${px(body.w)}; height: ${px(body.h)};
        border-radius: ${px(body.r)}; box-shadow: 0 46px 90px -40px ${values.ombra};
      }
      #schermo {
        position: absolute; left: ${px(screen.x)}; top: ${px(screen.y)}; width: ${px(screen.w)}; height: ${px(screen.h)};
        border-radius: ${px(screen.r)}; overflow: hidden; background: #fefeff;
      }
      #clip { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      #telefono { position: absolute; left: ${frameX}px; top: 100px; width: 638px; height: 1320px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="${d}" data-width="${W}" data-height="${H}">
      <div id="ombra" class="clip" data-start="0" data-duration="${d}" data-track-index="0"></div>
      <div id="schermo" data-layout-allow-overlap>
        <video id="clip" class="clip" data-start="0" data-duration="${d}" data-track-index="1" src="assets/schermo.mp4" muted playsinline></video>
      </div>
      <img id="telefono" class="clip" data-start="0" data-duration="${d}" data-track-index="2" src="assets/telefono.png" alt="" data-layout-allow-overlap />
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["${id}"] = gsap.timeline({ paused: true }).set({}, {}, ${d});
    </script>
  </body>
</html>
`)
writeFileSync(path.join(dir, 'hyperframes.json'), `${JSON.stringify({
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  media: { autoProxy: true },
  authoringSkill: 'hyperframes',
}, null, 2)}\n`)
writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify({ id, name: id })}\n`)
console.log(`${dir}: telefono ${values.slot} ${W}x${H}, ${d} s`)
