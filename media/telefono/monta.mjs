// Mette uno schermo da telefono dentro l'iPhone, alla misura di uno slot della scheda, come
// punto1 e punto3 di CityFix (media/cityfix/landing). Scrive il progetto HyperFrames del
// telefono: index.html, hyperframes.json, meta.json e assets/telefono.png.
//
//   node media/telefono/monta.mjs <cartella> --slot pair|feature --ombra "<rgba>" [--durata 10]
//     [--sfondo "#f4f4f4"] [--fps 24]
//
// Poi si renderizza lo schermo (progetto a parte, 1080x2330, con barra di stato e indicatore
// home) in <cartella>/assets/schermo.mp4 e infine il telefono. Prima di tutto serve
// telefono.png: python media/telefono/telefono.py
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
    // Il colore della tessera: #f4f4f4 come CityFix, o la carta del marchio
    sfondo: { type: 'string', default: '#f4f4f4' },
    // Solo se lo schermo non è a 30 fps (Helllo è a 24): lo scrive in data-fps
    fps: { type: 'string' },
  },
})
const dir = positionals[0]
if (!dir) throw new Error('Manca la cartella del progetto')
const FRAME = path.join(HERE, 'telefono.png')
if (!existsSync(FRAME)) throw new Error('Manca telefono.png: prima python media/telefono/telefono.py')

// Le misure di punto1 (la pair), le stesse con cui telefono.py ha ritagliato la cornice
const M = JSON.parse(readFileSync(path.join(HERE, 'misure.json'), 'utf8'))
// Slot della scheda (media/README.md): il telefono è alto 1320 in tutti e due, centrato
const SLOTS = { pair: M.tessera.w, feature: 816 }
const W = SLOTS[values.slot]
if (!W) throw new Error(`Slot sconosciuto: ${values.slot}`)
const H = M.tessera.h
const dx = (W - SLOTS.pair) / 2 // la feature sposta tutto di -220
const body = { ...M.body, x: M.body.x + dx }
const screen = { ...M.screen, x: M.screen.x + dx }
// telefono.png è ritagliato sui pixel interi del clip di CityFix
const frame = {
  x: Math.floor(M.body.x) + dx, y: Math.floor(M.body.y),
  w: Math.ceil(M.body.x + M.body.w) - Math.floor(M.body.x), h: Math.ceil(M.body.y + M.body.h) - Math.floor(M.body.y),
}
const d = Number(values.durata)
if (!(d > 0)) throw new Error(`Durata non valida: ${values.durata}`)
const fps = values.fps === undefined ? null : Number(values.fps)
if (fps !== null && !(fps > 0)) throw new Error(`fps non validi: ${values.fps}`)
const bg = values.sfondo
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
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${bg}; }
      #root { position: relative; width: 100%; height: 100%; background: ${bg}; }
      /* L'ombra del telefono: una sagoma con gli angoli del vetro, sotto la cornice */
      #ombra {
        position: absolute; left: ${px(body.x)}; top: ${px(body.y)}; width: ${px(body.w)}; height: ${px(body.h)};
        border-radius: ${px(body.r)}; box-shadow: ${M.ombra} ${values.ombra};
      }
      #schermo {
        position: absolute; left: ${px(screen.x)}; top: ${px(screen.y)}; width: ${px(screen.w)}; height: ${px(screen.h)};
        border-radius: ${px(screen.r)}; overflow: hidden; background: #fefeff;
      }
      #clip { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      #telefono { position: absolute; left: ${frame.x}px; top: ${frame.y}px; width: ${frame.w}px; height: ${frame.h}px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="${d}"${fps ? ` data-fps="${fps}"` : ''} data-width="${W}" data-height="${H}">
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
console.log(`${dir}: telefono ${values.slot} ${W}x${H}, ${d} s${fps ? `, ${fps} fps` : ''}, sfondo ${bg}`)
