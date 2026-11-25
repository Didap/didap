// Scrive home/index.html (1920x1152) e home-mobile/index.html (1080x2340): lo sfondo della
// home del sito per CityFix. Sulla mappa di Brindisi dell'hero racconta il giro in quattro
// passaggi, senza parole (lo stesso video serve la home italiana e inglese):
//   1. dal telefono il cittadino manda foto e posizione;
//   2. la segnalazione compare sulla mappa, rossa;
//   3. il Comune la vede e la affida all'impresa, il segnaposto diventa giallo;
//   4. l'impresa ripara la buca, il segnaposto diventa verde, il contatore sale e il
//      cittadino riceve la conferma.
// Il logo non c'è: il sito mette sopra cityfix-wordmark.svg. Colori e ombre come le
// illustrazioni della landing (media/cityfix/landing/). Legge solo file del repo: le icone da
// pixel-icons.json e le strade da osm/roads.json (OpenStreetMap, ODbL).
// Esegui: node media/cityfix/build-home.mjs
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const ICONS = JSON.parse(fs.readFileSync(path.join(here, 'pixel-icons.json'), 'utf8'));
const roads = JSON.parse(fs.readFileSync(path.join(here, 'osm/roads.json'), 'utf8'));

// Stessa proiezione di build-hero.mjs (e di osm2svg.js)
const MW = 2112, MH = 1268, LAT0 = 40.6365, LON0 = 17.9445, SPAN = 0.044;
const kx = MW / SPAN;
const ky = (kx * 111.0) / (111.32 * Math.cos((LAT0 * Math.PI) / 180));
const proj = (lat, lon) => [(lon - LON0) * kx + MW / 2, (LAT0 - lat) * ky + MH / 2];
const nodes = [];
for (const e of roads.elements) {
  if (!e.geometry || !/residential|tertiary|secondary|primary|pedestrian|unclassified/.test(e.tags.highway)) continue;
  for (const p of e.geometry) nodes.push(proj(p.lat, p.lon));
}
const snap = ([x, y]) => {
  let best = [x, y], bd = Infinity;
  for (const n of nodes) {
    const dd = (n[0] - x) ** 2 + (n[1] - y) ** 2;
    if (dd < bd) { bd = dd; best = n; }
  }
  return best;
};

// Palette della landing
const C = {
  blue: '#2B1CE8', blueSoft: '#E8E6F7', blueDeep: '#1A05A2',
  red: '#F44747', redSoft: '#FDE8E8',
  amber: '#F5A524', amberSoft: '#FFF1D6',
  green: '#479B3E', greenSoft: '#E3F1DE',
  ink: '#0A0A0F', paper: '#F4F4F4', paperDeep: '#E6E6E9', white: '#FEFEFF', bar: '#E6E6EE',
};
const glyph = (name, size, fill = '#FFFFFF', id = '') =>
  `<svg${id ? ` id="${id}"` : ''} class="g" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${ICONS[name]}" fill="${fill}" shape-rendering="crispEdges"/></svg>`;

const pinOutline = 'M12 1C6.2 1 1.5 5.7 1.5 11.5 1.5 19 12 33 12 33s10.5-14 10.5-21.5C22.5 5.7 17.8 1 12 1z';

// La buca: asfalto con la linea di mezzeria, prima il buco e poi la toppa
const pothole = (w, h) => `
            <svg width="${w}" height="${h}" viewBox="0 0 120 84">
              <rect width="120" height="84" rx="12" fill="#6B7079"/>
              <rect x="8" y="72" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.75"/><rect x="49" y="72" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.75"/><rect x="90" y="72" width="22" height="4" rx="2" fill="#FFFFFF" opacity="0.75"/>
              <circle cx="20" cy="18" r="1.6" fill="#8C919A"/><circle cx="98" cy="26" r="1.4" fill="#8C919A"/><circle cx="78" cy="58" r="1.6" fill="#8C919A"/><circle cx="16" cy="54" r="1.3" fill="#8C919A"/>
              <g class="buco"><path d="M34 38c2-12 16-18 30-16 14 1 25 8 23 19-2 10-15 16-30 15-15 0-25-7-23-18z" fill="#2E3137" stroke="#9AA0A9" stroke-width="2.5"/>
                <path d="M44 36l8 6-5 6M70 30l-4 8 7 4" stroke="#55595F" stroke-width="2" fill="none" stroke-linecap="round"/></g>
              <g class="toppa"><rect x="28" y="20" width="64" height="42" rx="3" fill="#3A3E45" stroke="#2A2D32" stroke-width="2"/></g>
            </svg>`;

const VERSIONS = [
  {
    // Zone della home desktop: barra in alto (12%), velo in basso (ultimo 40%), menu a
    // capsula (x 90-100%, y 30-70%), logo a 50% x e 38% y largo il 30%. Tutto il racconto
    // sta ai lati del logo e fra y 15% e 59%; la segnalazione passa sopra il logo, mai sotto.
    dir: 'home', id: 'home', W: 1920, H: 1152, portrait: false, mapScale: 1,
    k: 1, pinScale: 1.3,
    phone: { x: 110, y: 175 },
    pin: [470, 490],
    // schede più piccole (x0.7) a destra del logo, sopra e sotto la sua altezza: a 1440x900
    // l'indice con l'etichetta attiva occupa x 80-100% fra y 28% e 72%, quindi le schede
    // finiscono entro x 76% del fotogramma (1459 px)
    cardK: 0.7,
    comune: { x: 1175, y: 150, w: 281 },
    impresa: { x: 1175, y: 534, w: 281 },
    halo: { cx: 960, cy: 438, w: 1760, h: 1000 },
    paths: (P) => ({
      send: `M368 318 Q ${P[0] - 40} ${P[1] - 200} ${P[0] - 6} ${P[1] - 112}`,
      arc: `M${P[0] + 8} ${P[1] - 116} Q 820 20 1167 222`,
      down: 'M1316 308 L1316 530',
    }),
  },
  {
    // Telefono verticale a tutto schermo (riferimento 390x844): logo a 50% x e 30% y in un
    // riquadro x 20-80%, y 22-38%; da y 55% in giù la nuvoletta di Didi. Il racconto gira
    // attorno al riquadro: telefono e schede sotto (y 38-55%), il segnaposto sopra, le
    // segnalazioni salgono e scendono lungo i lati (x 8-20% e 80-92%).
    dir: 'home-mobile', id: 'home-mobile', W: 1080, H: 2340, portrait: true, mapScale: 1.13,
    k: 0.76, pinScale: 1.7,
    phone: { x: 96, y: 898 },
    pin: [540, 410],
    comune: { x: 330, y: 900, w: 650 },
    impresa: { x: 330, y: 1113, w: 650 },
    halo: { cx: 540, cy: 702, w: 1700, h: 1120 },
    fadeFrom: 0.53,
    paths: (P) => ({
      send: `M190 890 C 110 700 120 ${P[1] - 40} ${P[0] - 58} ${P[1] - 92}`,
      arc: `M${P[0] + 58} ${P[1] - 92} C 960 ${P[1] - 40} 970 700 900 892`,
      down: 'M655 1068 L655 1112',
    }),
  },
];

function page(v) {
  const { id, W, H, portrait, mapScale, k, pinScale } = v;
  const mx = (W - MW) / 2, my = (H - MH) / 2;
  // Orizzontale: mappa al centro, misura vera. Verticale: girata di 90 gradi in senso orario
  // e ingrandita, così copre lo schermo alto.
  const toMap = portrait
    ? ([fx, fy]) => [MW / 2 + (fy - H / 2) / mapScale, MH / 2 - (fx - W / 2) / mapScale]
    : ([fx, fy]) => [MW / 2 + (fx - W / 2) / mapScale, MH / 2 + (fy - H / 2) / mapScale];
  const toFrame = portrait
    ? ([x, y]) => [W / 2 - (y - MH / 2) * mapScale, H / 2 + (x - MW / 2) * mapScale]
    : ([x, y]) => [W / 2 + (x - MW / 2) * mapScale, H / 2 + (y - MH / 2) * mapScale];
  const P = toFrame(snap(toMap(v.pin))).map((n) => Math.round(n));
  const paths = v.paths(P);
  const u = (n) => `${+(n * k).toFixed(1)}px`;
  const pw = 54 * pinScale, ph = 76.5 * pinScale;
  const phoneW = 250 * k, phoneH = 500 * k;
  const kc = v.cardK ?? k; // scala delle schede, sul telefono la stessa del resto
  const uc = (n) => `${+(n * kc).toFixed(1)}px`;
  const cardH = 220 * kc;
  const css = `
      @font-face { font-family: 'Urbanist'; src: url('assets/Urbanist-SemiBold.ttf'); font-weight: 600; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FFFFFF; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Urbanist', sans-serif; color: ${C.ink}; }
      #map { position: absolute; left: ${mx.toFixed(1)}px; top: ${my.toFixed(1)}px; width: ${MW}px; height: ${MH}px;${portrait ? ` transform: rotate(90deg) scale(${mapScale});` : ''} }
      ${portrait ? `/* l'ultimo tratto in basso sta sotto la nuvoletta di Didi: la mappa si schiarisce */
      #fade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255,255,255,0) ${Math.round(v.fadeFrom * 100)}%, rgba(255,255,255,0.62) ${Math.round(v.fadeFrom * 100) + 7}%, rgba(255,255,255,0.72) 100%); }` : ''}
      /* Alone dietro il logo: sfumatura ampia e morbida, senza bordo; bianco quasi pieno al centro */
      #halo { position: absolute; left: ${v.halo.cx - v.halo.w / 2}px; top: ${v.halo.cy - v.halo.h / 2}px; width: ${v.halo.w}px; height: ${v.halo.h}px;
        background: radial-gradient(closest-side, rgba(255,255,255,1) 0%, rgba(255,255,255,0.97) 22%, rgba(255,255,255,0.9) 38%, rgba(255,255,255,0.76) 52%, rgba(255,255,255,0.56) 65%, rgba(255,255,255,0.34) 77%, rgba(255,255,255,0.15) 88%, rgba(255,255,255,0.04) 95%, rgba(255,255,255,0) 100%); }
      #flow { position: absolute; inset: 0; width: ${W}px; height: ${H}px; overflow: visible; }
      #flow .line { fill: none; stroke: ${C.blue}; stroke-opacity: 0.45; stroke-width: ${3 * Math.max(k, 0.9) * (portrait ? 1.4 : 1)}; stroke-linecap: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; }
      #flow .dot { opacity: 0; }
      .card { position: absolute; background: ${C.white}; border-radius: ${u(26)}; opacity: 0;
        box-shadow: 0 2px 0 ${C.paperDeep}, 0 ${u(40)} ${u(80)} -${u(44)} rgba(43, 28, 232, 0.42), 0 0 0 1.5px rgba(43, 28, 232, 0.08); }
      .badge { position: absolute; display: flex; align-items: center; justify-content: center; width: ${u(56)}; height: ${u(56)}; border-radius: ${u(16)}; }
      .bar { position: absolute; height: ${u(12)}; border-radius: ${u(6)}; background: ${C.bar}; }
      .tile { position: absolute; display: flex; align-items: center; justify-content: center; width: ${u(56)}; height: ${u(56)}; border-radius: ${u(16)}; background: ${C.blueSoft}; }
      .status { position: absolute; width: ${u(26)}; height: ${u(26)}; border-radius: 50%; }
      .num { font-size: ${u(40)}; line-height: ${u(48)}; font-weight: 600; letter-spacing: -0.01em; }
      /* il telefono del cittadino */
      #phone { position: absolute; left: ${v.phone.x}px; top: ${v.phone.y}px; width: ${phoneW}px; height: ${phoneH}px; border-radius: ${u(44)}; background: #15151A; opacity: 0;
        box-shadow: 0 ${u(40)} ${u(70)} -${u(36)} rgba(26, 5, 162, 0.45); }
      #screen { position: absolute; inset: ${u(9)}; border-radius: ${u(36)}; background: ${C.paper}; overflow: hidden; }
      #island { position: absolute; left: 50%; top: ${u(12)}; width: ${u(74)}; height: ${u(22)}; margin-left: -${u(37)}; border-radius: ${u(11)}; background: #15151A; }
      .bub { position: absolute; display: flex; align-items: center; gap: ${u(8)}; border-radius: ${u(18)}; padding: 0 ${u(14)}; opacity: 0; }
      .bub.in { left: ${u(14)}; background: ${C.white}; box-shadow: 0 1px 0 ${C.paperDeep}; border-bottom-left-radius: ${u(6)}; }
      .bub.out { right: ${u(14)}; background: ${C.blue}; border-bottom-right-radius: ${u(6)}; }
      #b-photo { position: absolute; right: ${u(14)}; top: ${u(170)}; border-radius: ${u(16)}; overflow: hidden; opacity: 0; }
      #b-ok { background: ${C.greenSoft}; color: #2F6E28; font-size: ${u(28)}; font-weight: 600; }
      #composer { position: absolute; left: ${u(12)}; right: ${u(12)}; bottom: ${u(16)}; height: ${u(44)}; border-radius: ${u(22)}; background: ${C.white}; box-shadow: 0 1px 0 ${C.paperDeep}; }
      #send { position: absolute; right: ${u(5)}; top: ${u(5)}; width: ${u(34)}; height: ${u(34)}; border-radius: 50%; background: ${C.blue}; display: flex; align-items: center; justify-content: center; }
      /* il segnaposto sulla mappa */
      #pin { position: absolute; left: ${(P[0] - pw / 2).toFixed(1)}px; top: ${(P[1] - ph).toFixed(1)}px; width: ${pw.toFixed(1)}px; height: ${ph.toFixed(1)}px; }
      #pin-body { position: absolute; inset: 0; transform-origin: 50% 100%; opacity: 0; filter: drop-shadow(0 ${u(4)} ${u(5)} rgba(0,0,0,0.28)); }
      #pin-body svg { position: absolute; left: 0; top: 0; }
      .ring { position: absolute; left: ${P[0] - 60 * pinScale}px; top: ${P[1] - 20 * pinScale}px; width: ${120 * pinScale}px; height: ${40 * pinScale}px; border-radius: 50%; border: ${2.5 * pinScale}px solid ${C.red}; opacity: 0; }
      #ring-ok { border-color: ${C.green}; }
      .swap { position: absolute; overflow: hidden; height: ${u(48)}; }
      .swap span { display: block; }
      #progress { position: absolute; height: ${u(14)}; border-radius: ${u(7)}; background: ${C.bar}; overflow: hidden; }
      #progress-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; border-radius: ${u(7)}; background: ${C.amber}; transform-origin: 0 50%; }
      #done { position: absolute; width: ${u(48)}; height: ${u(48)}; border-radius: 50%; background: ${C.green}; display: flex; align-items: center; justify-content: center; opacity: 0; }
      #assign { position: absolute; display: flex; align-items: center; gap: ${u(8)}; height: ${u(44)}; padding: 0 ${u(16)}; border-radius: ${u(22)}; background: ${C.blue}; }${kc !== k ? `
      /* schede in scala ridotta */
      .card { border-radius: ${uc(26)}; box-shadow: 0 2px 0 ${C.paperDeep}, 0 ${uc(40)} ${uc(80)} -${uc(44)} rgba(43, 28, 232, 0.42), 0 0 0 1.5px rgba(43, 28, 232, 0.08); }
      .card .badge, .card .tile { width: ${uc(56)}; height: ${uc(56)}; border-radius: ${uc(16)}; }
      .card .bar { height: ${uc(12)}; border-radius: ${uc(6)}; }
      .card .status { width: ${uc(26)}; height: ${uc(26)}; }
      .card .num { font-size: ${uc(40)}; line-height: ${uc(48)}; }
      .card .swap { height: ${uc(48)}; }
      #progress, #progress-fill { height: ${uc(14)}; border-radius: ${uc(7)}; }
      #done { width: ${uc(48)}; height: ${uc(48)}; }
      #assign { gap: ${uc(8)}; height: ${uc(44)}; padding: 0 ${uc(16)}; border-radius: ${uc(22)}; }` : ''}`;

  const cw = v.comune.w / kc, iw = v.impresa.w / kc; // larghezze in unità della scheda
  const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/MotionPathPlugin.min.js"></script>
    <style>
      /* CityFix, sfondo della home: il giro di una segnalazione sulla mappa di Brindisi. Generato da build-home.mjs */${css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="12" data-width="${W}" data-height="${H}">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow data-layout-allow-overlap>
        <img id="map" src="assets/brindisi.svg" alt="" />${portrait ? `
        <div id="fade"></div>` : ''}
        <div id="halo"></div>

        <svg id="flow" viewBox="0 0 ${W} ${H}">
          <path id="p-send" class="line" pathLength="1" d="${paths.send}"/>
          <path id="p-arc" class="line" pathLength="1" d="${paths.arc}"/>
          <path id="p-down" class="line" pathLength="1" d="${paths.down}"/>
          <circle id="d-send" class="dot" r="${9 * Math.max(k, 0.9) * (portrait ? 1.4 : 1)}" fill="${C.blue}"/>
          <circle id="d-arc" class="dot" r="${9 * Math.max(k, 0.9) * (portrait ? 1.4 : 1)}" fill="${C.red}"/>
          <circle id="d-down" class="dot" r="${9 * Math.max(k, 0.9) * (portrait ? 1.4 : 1)}" fill="${C.amber}"/>
          <circle id="d-up" class="dot" r="${9 * Math.max(k, 0.9) * (portrait ? 1.4 : 1)}" fill="${C.green}"/>
          <circle id="d-back" class="dot" r="${9 * Math.max(k, 0.9) * (portrait ? 1.4 : 1)}" fill="${C.green}"/>
        </svg>

        <!-- 2. la segnalazione sulla mappa -->
        <div id="ring" class="ring"></div>
        <div id="ring-ok" class="ring"></div>
        <div id="pin">
          <div id="pin-body">
            <svg width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" viewBox="0 0 24 34"><path id="pin-fill" d="${pinOutline}" style="fill:${C.red}" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>
              <path id="pin-road" d="${ICONS.road}" transform="translate(5.5 5) scale(0.54)" fill="#FFFFFF" shape-rendering="crispEdges"/>
              <path id="pin-check" d="${ICONS.check}" transform="translate(5.5 5) scale(0.54)" fill="#FFFFFF" shape-rendering="crispEdges" opacity="0"/></svg>
          </div>
        </div>

        <!-- 1. il cittadino segnala dal telefono -->
        <div id="phone">
          <div id="screen">
            <div id="b-hello" class="bub in" style="top:${u(56)};height:${u(56)};flex-direction:column;align-items:flex-start;justify-content:center;gap:${u(7)}"><span class="bar" style="position:static;width:${u(120)}"></span><span class="bar" style="position:static;width:${u(80)}"></span></div>
            <div id="b-cam" class="bub out" style="top:${u(124)};height:${u(38)}">${glyph('camera', 26 * k)}</div>
            <div id="b-photo">${pothole(150 * k, 105 * k)}</div>
            <div id="b-where" class="bub out" style="top:${u(285)};height:${u(38)}">${glyph('map-pin', 26 * k)}</div>
            <div id="b-ok" class="bub in" style="top:${u(338)};height:${u(44)}">${glyph('check', 24 * k, C.green)}<span>+25</span></div>
            <div id="composer"><div id="send">${glyph('plus', 20 * k)}</div></div>
            <div id="island"></div>
          </div>
        </div>

        <!-- 3. il Comune vede la segnalazione e la affida -->
        <div id="comune" class="card" style="left:${v.comune.x}px;top:${v.comune.y}px;width:${v.comune.w}px;height:${cardH}px">
          <div class="badge" style="left:${uc(22)};top:${uc(20)};background:${C.blue}">${glyph('landmark', 30 * kc)}</div>
          <div style="position:absolute;right:${uc(24)};top:${uc(24)};display:flex;align-items:center;gap:${uc(8)}">${glyph('check', 28 * k, C.green)}
            <div class="swap num" style="position:relative;width:${uc(76)}"><span id="n-old">129</span><span id="n-new" style="position:absolute;left:0;top:0;opacity:0">130</span></div></div>
          <div class="tile" style="left:${uc(22)};top:${uc(96)}">${glyph('road', 30 * k, C.blue)}</div>
          <span class="bar" style="left:${uc(92)};top:${uc(106)};width:${uc(150)}"></span>
          <span class="bar" style="left:${uc(92)};top:${uc(128)};width:${uc(96)};opacity:0.7"></span>
          <div id="st-red" class="status" style="left:${uc(cw - 52)};top:${uc(111)};background:${C.red};box-shadow:0 0 0 ${uc(6)} ${C.redSoft}"></div>
          <div id="st-amber" class="status" style="left:${uc(cw - 52)};top:${uc(111)};background:${C.amber};box-shadow:0 0 0 ${uc(6)} ${C.amberSoft};opacity:0"></div>
          <div id="st-green" class="status" style="left:${uc(cw - 52)};top:${uc(111)};background:${C.green};box-shadow:0 0 0 ${uc(6)} ${C.greenSoft};opacity:0"></div>
          <div id="assign" style="left:${uc(cw - 170)};top:${uc(158)}">${glyph('wrench', 24 * kc)}<svg width="${26 * k}" height="${18 * k}" viewBox="0 0 26 18"><path d="M2 9h19M15 3l6 6-6 6" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        </div>

        <!-- 4. l'impresa ripara -->
        <div id="impresa" class="card" style="left:${v.impresa.x}px;top:${v.impresa.y}px;width:${v.impresa.w}px;height:${cardH}px">
          <div class="badge" style="left:${uc(22)};top:${uc(20)};background:${C.blueDeep}">${glyph('wrench', 30 * k, '#FFFFFF', 'wrench')}</div>
          <div id="done" style="left:${uc(iw - 70)};top:${uc(24)}">${glyph('check', 28 * kc)}</div>
          <div id="i-photo" style="position:absolute;left:${uc(22)};top:${uc(92)};border-radius:${uc(14)};overflow:hidden">${pothole(130 * k, 91 * kc)}</div>
          <div id="progress" style="left:${uc(172)};top:${uc(112)};width:${uc(iw - 196)}"><div id="progress-fill"></div></div>
          <span class="bar" style="left:${uc(172)};top:${uc(146)};width:${uc(130)}"></span>
          <span class="bar" style="left:${uc(172)};top:${uc(168)};width:${uc(84)};opacity:0.7"></span>
        </div>
      </div>
    </div>
    <script>
      gsap.registerPlugin(MotionPathPlugin);
      const tl = gsap.timeline({ paused: true });
      const C = ${JSON.stringify({ red: C.red, amber: C.amber, green: C.green })};
      const travel = (dot, path, at, dur, rev) => {
        tl.set(dot, { opacity: 1 }, at);
        tl.to(dot, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], start: rev ? 1 : 0, end: rev ? 0 : 1 }, duration: dur, ease: 'power2.inOut' }, at);
        tl.to(dot, { opacity: 0, duration: 0.12 }, at + dur - 0.06);
      };
      const pop = (el, at) => tl.fromTo(el, { opacity: 0, y: ${12 * k}, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.6)' }, at);

      // 1. il cittadino: foto, posizione, invio (0.4 - 2.7)
      tl.fromTo('#phone', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.4);
      pop('#b-hello', 0.9);
      pop('#b-cam', 1.3);
      pop('#b-photo', 1.65);
      pop('#b-where', 2.05);
      tl.fromTo('#send', { scale: 1 }, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 2.35);
      tl.to('#p-send', { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 2.4);
      travel('#d-send', '#p-send', 2.4, 0.6);

      // 2. la segnalazione compare sulla mappa, rossa (2.9 - 3.6)
      tl.fromTo('#pin-body', { opacity: 0, y: -50, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'expo.out' }, 2.95);
      tl.fromTo('#ring', { opacity: 0.9, scale: 0.2 }, { opacity: 0, scale: 1.4, duration: 0.9, ease: 'power2.out', immediateRender: false }, 3.1);

      // 3. il Comune la vede e la affida (3.6 - 5.9)
      tl.to('#p-arc', { strokeDashoffset: 0, duration: 0.85, ease: 'power2.inOut' }, 3.6);
      travel('#d-arc', '#p-arc', 3.6, 0.85);
      pop('#comune', 4.1);
      tl.fromTo('#assign', { scale: 1 }, { scale: 0.88, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut' }, 5.0);
      tl.to('#st-amber', { opacity: 1, duration: 0.3 }, 5.25);
      tl.to('#st-red', { opacity: 0, duration: 0.3 }, 5.25);
      tl.to('#pin-fill', { fill: C.amber, duration: 0.35 }, 5.3);
      tl.to('#p-down', { strokeDashoffset: 0, duration: 0.4, ease: 'power2.inOut' }, 5.35);
      travel('#d-down', '#p-down', 5.35, 0.4);

      // 4. l'impresa ripara, tutto diventa verde (5.7 - 9.8)
      pop('#impresa', 5.7);
      tl.fromTo('#progress-fill', { scaleX: 0 }, { scaleX: 1, duration: 2.0, ease: 'power1.inOut' }, 6.2);
      tl.to('#progress-fill', { backgroundColor: C.green, duration: 0.3 }, 7.9);
      tl.fromTo('#wrench', { rotation: 0 }, { rotation: -22, duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut', transformOrigin: '50% 50%' }, 6.3);
      tl.to('#i-photo .buco, #b-photo .buco', { opacity: 0, duration: 0.5 }, 7.3);
      tl.fromTo('#i-photo .toppa, #b-photo .toppa', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 7.3);
      tl.fromTo('#done', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, 8.1);
      travel('#d-up', '#p-down', 8.3, 0.4, true);
      tl.to('#st-green', { opacity: 1, duration: 0.3 }, 8.6);
      tl.to('#st-amber', { opacity: 0, duration: 0.3 }, 8.6);
      tl.to('#n-old', { y: -${48 * kc}, opacity: 0, duration: 0.35, ease: 'power2.in' }, 8.65);
      tl.fromTo('#n-new', { y: ${48 * kc}, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, 8.8);
      travel('#d-back', '#p-arc', 8.7, 0.8, true);
      tl.to('#pin-fill', { fill: C.green, duration: 0.3 }, 9.45);
      tl.to('#pin-road', { opacity: 0, duration: 0.2 }, 9.45);
      tl.to('#pin-check', { opacity: 1, duration: 0.25 }, 9.55);
      tl.to('#pin-body', { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' }, 9.45);
      tl.fromTo('#ring-ok', { opacity: 0.9, scale: 0.2 }, { opacity: 0, scale: 1.4, duration: 0.9, ease: 'power2.out', immediateRender: false }, 9.5);
      pop('#b-ok', 9.75);

      // tutto si spegne e torna la mappa vuota del primo fotogramma (10.5 - 11.6)
      tl.to('#p-send, #p-arc, #p-down', { opacity: 0, duration: 0.5, ease: 'power2.in' }, 10.5);
      tl.to('#impresa', { opacity: 0, y: ${10 * k}, duration: 0.45, ease: 'power2.in' }, 10.6);
      tl.to('#comune', { opacity: 0, y: ${10 * k}, duration: 0.45, ease: 'power2.in' }, 10.7);
      tl.to('#pin-body', { opacity: 0, scale: 0.6, duration: 0.35, ease: 'power3.in' }, 10.85);
      tl.to('#phone', { opacity: 0, y: 20, duration: 0.5, ease: 'power2.in' }, 10.95);
      tl.set({}, {}, 12);
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  return { html, P };
}

for (const v of VERSIONS) {
  const d = path.join(here, v.dir);
  fs.mkdirSync(path.join(d, 'assets'), { recursive: true });
  const { html, P } = page(v);
  fs.writeFileSync(path.join(d, 'index.html'), html);
  console.log(v.dir, 'segnaposto', P.join(','));
}
