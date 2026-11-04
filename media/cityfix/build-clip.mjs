// I clip animati della scheda di CityFix, disegnati col kit come le
// tavole ferme: un progetto HyperFrames per clip in media/cityfix/<clip>/.
// Niente testo: parlano i disegni. Ogni clip finisce com'era all'inizio,
// così il loop non salta.
// Run: node media/cityfix/build-clip.mjs, poi check e render dalla
// cartella del clip (media/README.md)
import fs from 'node:fs'
import { C, at, building, bubble, cone, flip, icon, municipio, patch, person, phone, pin, pothole, statusPixels, street, svgDoc, van } from './kit.mjs'

const here = new URL('./', import.meta.url)

const page = ({ id, w, h, kind, dur, svg, script }) => `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${w}, height=${h}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: ${kind === 'blue' ? C.blue : C.paper}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      #root svg { display: block; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="${dur}" data-width="${w}" data-height="${h}">
      <div id="stage" class="clip" data-start="0" data-duration="${dur}" data-track-index="0" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>
${svgDoc(w, h, kind, svg)}
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${script}
      tl.set({}, {}, ${dur});
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`

// Il pixel dello stato `#<p><i>` acceso del colore `c` al tempo `t`
const lightUp = (p, i, c, t) => `tl.to('#${p}${i}', { fill: '${c}', duration: 0.25, ease: 'power2.out' }, ${t});`

// Generatore deterministico per le posizioni sparse, uno per clip
const random = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// Il logo di CityFix, la parte che disegna la scritta (l'<svg> dentro
// quello col fondo blu)
const logo = () => {
  const svg = fs.readFileSync(new URL('../../public/covers/cityfix-logo.svg', import.meta.url), 'utf8')
  const mark = svg.match(/<svg x="[\s\S]*?<\/svg>/)?.[0]
  if (!mark) throw new Error('cityfix-logo.svg: manca la scritta in un <svg x="..."> interno')
  return mark
}

const HYPERFRAMES = {
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  media: { autoProxy: true },
}

const CLIPS = {
  // pair[1], 1256x1520: il telefono inquadra la buca, scatta, la scheda
  // si compila (posizione, tipo, descrizione), parte e diventa un pin che
  // accende il primo pixel dello stato
  scatta: () => {
    const sw = 528
    const sh = 1005
    const cam = `<g id="cam" clip-path="url(#scr)">
<rect width="${sw}" height="${sh}" fill="${C.lav}"/>
${at(264, 380, 1, building({ w: 420, h: 520, cols: 3, rows: 2 }))}
${street(0, 380, sw, 90, 600)}
${at(264, 690, 1, pothole(300))}
<g id="brackets" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round">
<path d="M84 600 V560 H124 M404 560 H444 V600 M444 790 V830 H404 M124 830 H84 V790"/></g>
<rect y="865" width="${sw}" height="140" fill="${C.deep}"/>
<circle cx="264" cy="935" r="48" fill="none" stroke="#fff" stroke-width="8"/>
<g id="shutter"><circle cx="264" cy="935" r="36" fill="#fff"/></g>
</g>`
    const bars = (x, y, ws) => ws.map((w, i) => `<rect x="${x}" y="${y + i * 26}" width="${w}" height="14" rx="7" fill="${C.lav2}"/>`).join('')
    const chip = (id, y, name) => `<g id="${id}"><rect x="36" y="${y}" width="456" height="100" rx="50" fill="#fff" stroke="${C.blue}" stroke-width="5"/>
<circle cx="88" cy="${y + 50}" r="34" fill="${C.blue}"/>${at(88, y + 50, 1, icon(name, 40))}
${bars(140, y + 30, [220, 140])}${at(450, y + 50, 1, icon('check', 36, C.green))}</g>`
    const form = `<g id="form" opacity="0"><g id="formInner">
<rect width="${sw}" height="${sh}" rx="60" fill="#fff"/>
<g id="thumb"><rect x="36" y="40" width="456" height="300" rx="28" fill="${C.lav2}" stroke="${C.blue}" stroke-width="5"/>
<rect x="36" y="40" width="456" height="90" rx="28" fill="${C.lav}"/><rect x="36" y="110" width="456" height="20" fill="${C.lav}"/>
${at(264, 230, 0.75, pothole(300))}</g>
${chip('c1', 380, 'map-pin')}
${chip('c2', 500, 'road')}
<g id="c3"><rect x="36" y="626" width="456" height="160" rx="28" fill="${C.lav}"/>${bars(70, 660, [380, 340, 220, 300].slice(0, 4))}</g>
<g id="send"><rect x="36" y="850" width="456" height="104" rx="52" fill="${C.blue}"/>
<path d="M232 902 H296 M272 878 L298 902 L272 926" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
</g></g>
<g id="ok" opacity="0"><circle cx="264" cy="480" r="120" fill="${C.blue}"/>${at(264, 480, 1, icon('check', 150))}</g>
<rect id="flash" width="${sw}" height="${sh}" rx="60" fill="#fff" opacity="0"/>`
    const svg = `<defs><clipPath id="scr"><rect width="${sw}" height="${sh}" rx="60"/></clipPath></defs>
<rect class="w o" x="300" y="1180" width="660" height="440" rx="120"/>
${at(628, 1400, 1, phone({ w: 600, h: 1120, fill: 'd', screen: cam + form }))}
<rect class="w o" x="922" y="760" width="70" height="78" rx="36"/><rect class="w o" x="922" y="852" width="70" height="78" rx="36"/><rect class="w o" x="922" y="944" width="70" height="78" rx="36"/>
<rect class="w o" x="282" y="960" width="80" height="210" rx="40" transform="rotate(14 322 1065)"/>
<path class="d o" d="M380 1520 L400 1420 H860 L880 1520 Z"/>
<g id="status"><rect x="548" y="70" width="160" height="160" rx="32" fill="#fff"/>${at(579, 101, 1, statusPixels(0, 44, 10, C.blue, C.lav2, 'st'))}</g>
${at(0, 0, 1, pin(C.red, 'road', 3.4), 'fly', 'opacity="0"')}`
    const script = `
      tl.set('#brackets', { opacity: 0, scale: 1.18, transformOrigin: '50% 50%' }, 0);
      tl.set('#fly', { x: 628, y: 900 }, 0);
      tl.to('#brackets', { opacity: 1, duration: 0.3 }, 0.2);
      tl.to('#brackets', { scale: 1, duration: 1.1, ease: 'power3.out' }, 0.2);
      tl.to('#shutter', { scale: 0.82, transformOrigin: '50% 50%', duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 1.55);
      tl.to('#flash', { opacity: 1, duration: 0.06 }, 1.7);
      tl.to('#flash', { opacity: 0, duration: 0.4, ease: 'power2.out' }, 1.78);
      tl.set('#brackets', { opacity: 0 }, 1.78);
      tl.to('#form', { opacity: 1, duration: 0.45, ease: 'power2.out' }, 2.2);
      tl.to('#cam', { opacity: 0, duration: 0.2 }, 2.65);
      tl.from('#thumb', { scale: 1.25, y: 120, transformOrigin: '50% 0%', duration: 0.6, ease: 'expo.out' }, 2.2);
      tl.from('#c1', { opacity: 0, x: -40, duration: 0.45, ease: 'expo.out' }, 2.9);
      tl.from('#c2', { opacity: 0, x: -40, duration: 0.45, ease: 'expo.out' }, 3.4);
      tl.from('#c3', { opacity: 0, x: -40, duration: 0.45, ease: 'expo.out' }, 3.9);
      tl.from('#send', { opacity: 0, y: 30, duration: 0.45, ease: 'expo.out' }, 4.3);
      tl.to('#send', { scale: 0.94, transformOrigin: '50% 50%', duration: 0.12, yoyo: true, repeat: 1 }, 5.0);
      tl.to('#formInner', { scale: 0.2, opacity: 0, transformOrigin: '50% 50%', duration: 0.45, ease: 'power3.in' }, 5.3);
      tl.fromTo('#fly', { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 5.65);
      tl.to('#fly', { y: 250, scale: 0.45, duration: 0.8, ease: 'power2.in' }, 6.1);
      tl.to('#fly', { opacity: 0, duration: 0.12 }, 6.85);
      ${lightUp('st', 0, C.blue, 6.9)}
      tl.fromTo('#status', { scale: 1 }, { scale: 1.12, transformOrigin: '50% 50%', duration: 0.15, yoyo: true, repeat: 1 }, 6.9);
      tl.fromTo('#ok', { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 7.1);
      tl.to('#ok', { opacity: 0, duration: 0.4 }, 10.6);
      tl.to('#form', { opacity: 0, duration: 0.4 }, 10.6);
      tl.to('#cam', { opacity: 1, duration: 0.4 }, 10.6);
      tl.set('#formInner', { scale: 1, opacity: 1 }, 11.0);
      ${lightUp('st', 0, C.lav2, 10.8)}
      tl.set('#fly', { y: 900, scale: 1, opacity: 0 }, 11.0);`
    return { w: 1256, h: 1520, kind: 'blue', dur: 12, svg, script }
  },

  // wide, 1920x1080: il giro intero. Il cittadino scatta, la
  // segnalazione va al Comune, il Comune la passa alla ditta, il furgone
  // arriva e ripara, il pin diventa verde e la notizia torna al telefono.
  // In alto i quattro pixel dello stato si accendono a ogni passaggio
  giro: () => {
    const garage = `<rect class="w o" x="-190" y="-320" width="380" height="320"/>
<rect class="l2 o" x="-160" y="-230" width="320" height="230"/>
${[0, 1, 2, 3, 4].map(i => `<line class="o t" x1="-160" y1="${-190 + i * 40}" x2="160" y2="${-190 + i * 40}"/>`).join('')}
<rect class="b o" x="-110" y="-300" width="220" height="50" rx="10"/>${at(0, -275, 1, icon('wrench', 34))}`
    const svg = `
${at(560, 760, 1, building({ w: 300, h: 440, cols: 2, rows: 2, fill: 'l' }))}
${at(1330, 760, 1, building({ w: 340, h: 500, cols: 3, rows: 2, fill: 'l' }))}
${at(960, 760, 0.85, municipio({ flagId: 'flag', windowId: 'emb' }))}
${at(1700, 760, 1, garage)}
${street(0, 760, 1920, 80, 240)}
${at(560, 960, 1, patch(240), 'patch', 'opacity="0"')}
${at(560, 960, 1, pothole(240), 'hole')}
${at(400, 990, 0.9, cone(), 'cone', 'opacity="0"')}
${at(560, 940, 1, pin(C.red, 'road'), 'pinR', 'opacity="0"')}
${at(560, 940, 1, pin(C.green, 'check'), 'pinG', 'opacity="0"')}
${at(1700, 1010, 0.8, flip(van({ wheelIds: ['w1', 'w2'], beaconId: 'beacon' })), 'van')}
${at(300, 800, 0.95, person({ pose: 'shoot', jacket: C.lav }), 'pShoot')}
${at(300, 800, 0.95, person({ pose: 'cheer', jacket: C.lav }), 'pCheer', 'opacity="0"')}
<circle id="flashP" cx="412" cy="545" r="60" fill="#fff" opacity="0"/>
${at(250, 380, 1, bubble(46, icon('check', 52, C.green)), 'note', 'opacity="0"')}
${at(560, 770, 1, `<circle r="40" fill="${C.blue}"/>${icon('wrench', 44)}`, 'fix', 'opacity="0"')}
${[0, 1, 2].map(i => at(0, 0, 1, `<circle r="${18 - i * 3}" fill="${C.lav}" stroke="${C.blue}" stroke-width="4"/>`, `dust${i}`, 'opacity="0"')).join('')}
<g><rect x="880" y="40" width="160" height="160" rx="32" fill="#fff" stroke="${C.blue}" stroke-width="6"/>${at(911, 71, 1, statusPixels(0, 44, 10, C.blue, C.lav2, 'st'))}</g>
${at(0, 0, 1, pin(C.red, 'road', 2.2), 'tokR', 'opacity="0"')}
${at(0, 0, 1, pin(C.blue, 'landmark', 2.2), 'tokB', 'opacity="0"')}
${at(0, 0, 1, pin(C.green, 'check', 2.2), 'tokG', 'opacity="0"')}`
    // Un gettone che vola ad arco da (x0,y0) a (x1,y1)
    const fly = (id, [x0, y0], [x1, y1], t, d = 1.2) => `
      tl.set('#${id}', { x: ${x0}, y: ${y0}, scale: 0.6, transformOrigin: '50% 100%' }, ${t});
      tl.to('#${id}', { opacity: 1, scale: 1, duration: 0.2 }, ${t});
      tl.to('#${id}', { x: ${x1}, duration: ${d}, ease: 'power1.inOut' }, ${t});
      tl.to('#${id}', { keyframes: [{ y: ${Math.min(y0, y1) - 110}, duration: ${d / 2}, ease: 'power2.out' }, { y: ${y1}, duration: ${d / 2}, ease: 'power2.in' }] }, ${t});
      tl.to('#${id}', { opacity: 0, scale: 0.6, duration: 0.18 }, ${t + d - 0.05});`
    const drive = (x0, x1, t, d) => {
      // Le ruote girano quanto il furgone avanza (raggio 32 px a scala 0.8)
      const turns = Math.abs(x1 - x0) * 0.8 / (2 * Math.PI * 32)
      return `
      tl.to('#van', { x: ${x1}, duration: ${d}, ease: 'power2.inOut' }, ${t});
      tl.to(['#w1', '#w2'], { rotation: '+=${Math.round(turns * 360)}', duration: ${d}, ease: 'power2.inOut' }, ${t});`
    }
    const script = `
      tl.set('#van', { x: 0 }, 0);
      tl.set(['#w1', '#w2'], { rotation: 0, transformOrigin: '50% 50%' }, 0);
      tl.to('#flashP', { opacity: 0.95, scale: 1.2, transformOrigin: '50% 50%', duration: 0.08 }, 0.5);
      tl.to('#flashP', { opacity: 0, duration: 0.4 }, 0.6);
      tl.fromTo('#pinR', { opacity: 0, y: -60 }, { opacity: 1, y: 0, duration: 0.5, ease: 'bounce.out' }, 0.7);
      ${lightUp('st', 0, C.blue, 1.1)}
      ${fly('tokR', [560, 840], [960, 400], 1.3)}
      tl.to('#emb', { fill: '${C.blue}', duration: 0.15, yoyo: true, repeat: 3 }, 2.5);
      tl.fromTo('#flag', { skewY: 0 }, { skewY: 10, transformOrigin: '0% 50%', duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 2.5);
      ${lightUp('st', 1, C.blue, 2.8)}
      ${fly('tokB', [960, 400], [1600, 760], 3.1)}
      tl.to('#beacon', { fill: '${C.lav}', duration: 0.12, yoyo: true, repeat: 7 }, 4.3);
      ${lightUp('st', 2, C.blue, 4.4)}
      ${drive(0, -1000, 4.7, 2.2)}
      tl.fromTo('#cone', { opacity: 0, scale: 0.3, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 7.0);
      tl.fromTo('#fix', { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 7.2);
      tl.to('#fix', { rotation: -25, duration: 0.18, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 7.5);
      ${[0, 1, 2].map(i => `tl.fromTo('#dust${i}', { x: ${520 + i * 40}, y: 950, opacity: 0, scale: 0.4 }, { x: ${470 + i * 70}, y: ${880 - i * 18}, opacity: 1, scale: 1.2, duration: 0.5, ease: 'power2.out' }, ${7.6 + i * 0.2});
      tl.to('#dust${i}', { opacity: 0, duration: 0.3 }, ${8.1 + i * 0.2});`).join('\n      ')}
      tl.to('#hole', { scale: 0.2, opacity: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'power2.in' }, 7.9);
      tl.fromTo('#patch', { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' }, 8.4);
      tl.to('#fix', { opacity: 0, scale: 0.4, duration: 0.25 }, 8.6);
      tl.to('#pinR', { opacity: 0, duration: 0.15 }, 8.8);
      tl.fromTo('#pinG', { opacity: 0, scale: 0.6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)' }, 8.8);
      ${[0, 1, 2, 3].map(i => lightUp('st', i, C.green, 9.0 + i * 0.06)).join('\n      ')}
      ${fly('tokG', [560, 830], [280, 470], 9.2, 1.0)}
      tl.to('#pShoot', { opacity: 0, duration: 0.15 }, 10.1);
      tl.to('#pCheer', { opacity: 1, duration: 0.15 }, 10.1);
      tl.fromTo('#note', { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2.5)' }, 10.1);
      tl.to('#cone', { opacity: 0, scale: 0.3, duration: 0.25 }, 10.6);
      ${drive(-1000, -2700, 10.8, 1.6)}
      tl.to(['#patch', '#pinG', '#note'], { opacity: 0, duration: 0.4 }, 12.4);
      tl.to('#hole', { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, 12.6);
      tl.to('#pCheer', { opacity: 0, duration: 0.2 }, 12.4);
      tl.to('#pShoot', { opacity: 1, duration: 0.2 }, 12.4);
      ${[0, 1, 2, 3].map(i => lightUp('st', i, C.lav2, 12.5)).join('\n      ')}
      tl.set('#van', { x: 0, opacity: 0 }, 12.4);
      tl.set(['#w1', '#w2'], { rotation: 0 }, 12.4);
      tl.to('#van', { opacity: 1, duration: 0.6 }, 12.8);`
    return { w: 1920, h: 1080, kind: 'light', dur: 14, svg, script }
  },

  // feature[0], 1696x1520: un sistema solo al centro, tanti Comuni
  // intorno, ognuno chiuso col suo lucchetto e con le sue segnalazioni
  comuni: () => {
    const T = 250
    const G = 46
    const x0 = (1696 - (5 * T + 4 * G)) / 2
    const y0 = (1520 - (4 * T + 3 * G)) / 2
    const core = { x: x0 + T + G, y: y0 + T + G, w: 3 * T + 2 * G, h: 2 * T + G }
    const cx = core.x + core.w / 2
    const cy = core.y + core.h / 2
    const rnd = random(7)
    const tiles = []
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        if (r >= 1 && r <= 2 && c >= 1 && c <= 3) continue
        tiles.push({ x: x0 + c * (T + G), y: y0 + r * (T + G) })
      }
    }
    const lock = `<circle r="30" fill="#fff" stroke="${C.blue}" stroke-width="5"/>
<path d="M-9 -4 V-11 a9 9 0 0 1 18 0 V-4" fill="none" stroke="${C.blue}" stroke-width="5"/><rect x="-14" y="-5" width="28" height="22" rx="4" fill="${C.blue}"/>`
    // Le segnalazioni di ogni Comune: due o tre pin sparsi, alcuni
    // diventano verdi
    const pins = tiles.map((t, i) => Array.from({ length: 2 + (i % 2) }, (_, j) => ({
      x: t.x + 50 + rnd() * (T - 100),
      y: t.y + 60 + rnd() * 70,
      at: 3.6 + rnd() * 4.6,
      done: rnd() > 0.45,
      id: `p${i}_${j}`,
    })))
    const svg = `
${tiles.map((t, i) => `<line id="ln${i}" x1="${cx}" y1="${cy}" x2="${t.x + T / 2}" y2="${t.y + T / 2}" stroke="#fff" stroke-width="4" opacity="0.45"/>`).join('')}
<g id="core"><rect x="${core.x}" y="${core.y}" width="${core.w}" height="${core.h}" rx="44" fill="#fff"/>
${logo().replace(/x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*"/, `x="${cx - 280}" y="${cy - 78}" width="560" height="157"`).replaceAll('fill="#FFFFFF"', `fill="${C.blue}"`)}</g>
${tiles.map((t, i) => `<g id="t${i}"><rect x="${t.x}" y="${t.y}" width="${T}" height="${T}" rx="30" fill="rgba(255,255,255,0.12)" stroke="#fff" stroke-width="4"/>
${at(t.x + T / 2, t.y + T - 24, 0.27, municipio())}
${pins[i].map(p => at(p.x, p.y, 1, pin(C.red, 'road', 1.25), p.id, 'opacity="0"') + (p.done ? at(p.x, p.y, 1, pin(C.green, 'check', 1.25), `${p.id}g`, 'opacity="0"') : '')).join('')}
${at(t.x + T - 8, t.y + 8, 1, lock, `l${i}`, 'opacity="0"')}</g>`).join('\n')}`
    const n = tiles.length
    const script = `
      for (let i = 0; i < ${n}; i++) {
        const ln = document.getElementById('ln' + i);
        const len = ln.getTotalLength();
        tl.set(ln, { strokeDasharray: len, strokeDashoffset: len }, 0);
        tl.to(ln, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, 0.3 + i * 0.06);
        tl.fromTo('#t' + i, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' }, 0.8 + i * 0.07);
        tl.fromTo('#l' + i, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 2.4 + i * 0.05);
        tl.to(['#t' + i, '#l' + i], { opacity: 0, duration: 0.4 }, 10.7 + i * 0.03);
        tl.to(ln, { strokeDashoffset: len, duration: 0.5, ease: 'power2.in' }, 11.0 + i * 0.02);
      }
${pins.flat().map(p => `      tl.fromTo('#${p.id}', { opacity: 0, y: -24, scale: 0.5, transformOrigin: '50% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2.5)' }, ${p.at.toFixed(2)});${p.done
      ? `\n      tl.to('#${p.id}', { opacity: 0, duration: 0.15 }, ${(p.at + 1.6).toFixed(2)});
      tl.fromTo('#${p.id}g', { opacity: 0, scale: 0.6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, ${(p.at + 1.6).toFixed(2)});
      tl.to('#${p.id}g', { opacity: 0, duration: 0.3 }, 10.5);`
      : `\n      tl.to('#${p.id}', { opacity: 0, duration: 0.3 }, 10.5);`}`).join('\n')}`
    return { w: 1696, h: 1520, kind: 'blue', dur: 12, svg, script }
  },

  // triple[2], 822x1080: la ditta fotografa la buca, la riempie, la
  // fotografa di nuovo. Le due foto, prima e dopo, e il timbro verde
  riparata: () => {
    const shovel = `<path class="limb" d="M40 -250 L196 -40" stroke="${C.blue}" stroke-width="16"/><path class="limb" d="M40 -250 L196 -40" stroke="#fff" stroke-width="6"/>
<path class="l2 o" d="M176 -66 L226 -30 L204 12 L154 -24 Z"/>`
    const polaroid = (inner) => `<rect x="-150" y="-170" width="300" height="340" rx="10" fill="#fff" stroke="${C.blue}" stroke-width="6"/>
<rect x="-126" y="-146" width="252" height="232" rx="4" fill="${C.lav2}"/>
<rect x="-126" y="-146" width="252" height="70" fill="${C.lav}"/>
${inner}
<rect x="-90" y="110" width="120" height="14" rx="7" fill="${C.lav2}"/>`
    const svg = `
${at(411, 640, 1, building({ w: 760, h: 300, cols: 5, rows: 1, fill: 'l' }))}
${street(0, 640, 822, 80, 360)}
${at(430, 900, 1, patch(260), 'patch', 'opacity="0"')}
${at(430, 900, 1, pothole(260), 'hole')}
${[0, 1, 2].map(i => at(0, 0, 1, `<circle r="${12 - i * 2}" fill="${C.deep}"/>`, `ch${i}`, 'opacity="0"')).join('')}
${at(700, 960, 1, cone())}
${at(170, 960, 0.9, person({ pose: 'shovel', hat: true, armId: 'arm', tool: shovel }))}
${at(430, 870, 1, pin(C.red, 'road'), 'pinR')}
${at(430, 870, 1, pin(C.green, 'check'), 'pinG', 'opacity="0"')}
${at(230, 290, 1, polaroid(at(0, 10, 0.55, pothole(300))), 'pol1', 'opacity="0"')}
${at(590, 320, 1, polaroid(at(0, 10, 0.55, patch(300))), 'pol2', 'opacity="0"')}
${at(411, 520, 1, `<circle r="62" fill="${C.green}" stroke="#fff" stroke-width="8"/>${icon('check', 76)}`, 'ok', 'opacity="0"')}
<rect id="flash" width="822" height="1080" fill="#fff" opacity="0"/>`
    const flash = t => `
      tl.to('#flash', { opacity: 0.85, duration: 0.06 }, ${t});
      tl.to('#flash', { opacity: 0, duration: 0.4, ease: 'power2.out' }, ${t + 0.08});`
    const dig = t => `
      tl.to('#arm', { attr: { transform: 'rotate(-24 10 -230)' }, duration: 0.45, ease: 'power2.inOut' }, ${t});
      tl.to('#arm', { attr: { transform: 'rotate(0 10 -230)' }, duration: 0.35, ease: 'power3.in' }, ${t + 0.45});`
    const throwChunk = (i, t) => `
      tl.fromTo('#ch${i}', { x: 350, y: 880, opacity: 1 }, { x: ${400 + i * 30}, y: 900, duration: 0.35, ease: 'power2.in' }, ${t});
      tl.to('#ch${i}', { keyframes: [{ y: 840, duration: 0.17, ease: 'power2.out' }, { y: 900, duration: 0.18, ease: 'power2.in' }] }, ${t});
      tl.to('#ch${i}', { opacity: 0, duration: 0.1 }, ${t + 0.35});`
    const script = `
      ${flash(0.6)}
      tl.fromTo('#pol1', { opacity: 0, y: -60, rotation: -16, transformOrigin: '50% 50%' }, { opacity: 1, y: 0, rotation: -6, duration: 0.6, ease: 'expo.out' }, 0.75);
      ${[1.6, 2.6, 3.6].map(dig).join('')}
      ${[0, 1, 2].map(i => throwChunk(i, 2.1 + i)).join('')}
      tl.to('#hole', { scale: 0.75, transformOrigin: '50% 50%', duration: 0.3 }, 2.45);
      tl.to('#hole', { scale: 0.45, duration: 0.3 }, 3.45);
      tl.to('#hole', { scale: 0, opacity: 0, duration: 0.3 }, 4.45);
      tl.fromTo('#patch', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' }, 4.6);
      tl.to('#pinR', { opacity: 0, duration: 0.15 }, 5.1);
      tl.fromTo('#pinG', { opacity: 0, scale: 0.6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.5)' }, 5.1);
      ${flash(5.7)}
      tl.fromTo('#pol2', { opacity: 0, y: -60, rotation: 16, transformOrigin: '50% 50%' }, { opacity: 1, y: 0, rotation: 6, duration: 0.6, ease: 'expo.out' }, 5.85);
      tl.fromTo('#ok', { opacity: 0, scale: 1.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'expo.out' }, 6.7);
      tl.to(['#pol1', '#pol2', '#ok'], { opacity: 0, y: -40, duration: 0.5, ease: 'power2.in' }, 10.6);
      tl.to('#patch', { opacity: 0, duration: 0.4 }, 11.0);
      tl.to('#hole', { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, 11.1);
      tl.to('#pinG', { opacity: 0, duration: 0.2 }, 11.1);
      tl.to('#pinR', { opacity: 1, duration: 0.2 }, 11.2);`
    return { w: 822, h: 1080, kind: 'light', dur: 12, svg, script }
  },
}

const only = process.argv.slice(2)
for (const [id, make] of Object.entries(CLIPS)) {
  if (only.length && !only.includes(id)) continue
  const clip = make()
  const dir = new URL(`${id}/`, here)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(new URL('index.html', dir), page({ id, ...clip }))
  fs.writeFileSync(new URL('meta.json', dir), JSON.stringify({ id: `cityfix-${id}`, name: `cityfix-${id}` }))
  fs.writeFileSync(new URL('hyperframes.json', dir), `${JSON.stringify(HYPERFRAMES, null, 2)}
`)
  console.log(`media/cityfix/${id}/index.html`)
}
