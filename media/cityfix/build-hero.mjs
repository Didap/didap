// Builds hero/index.html (and hero-mobile/index.html) from the baked Brindisi map.
// Run: node media/cityfix/build-hero.mjs media/cityfix/osm/roads.json (strade di Brindisi da OpenStreetMap, ODbL)
// Pins are snapped to the nearest road point of OpenStreetMap so they stand on real streets.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const roadsFile = process.argv[2];
const icons = fs.readFileSync('C:/Users/aless/Documents/GitHub/cityfix/app/src/components/pixel-icons.ts', 'utf8');
const glyph = (n) => icons.match(new RegExp(`\\n  '?${n}'?: \\{\\s*pixels:\\s*'([^']+)'`))[1];
const logoSrc = fs.readFileSync('C:/Users/aless/Documents/GitHub/cityfix/app/src/components/CityFixLogo.tsx', 'utf8');
const logoPaths = [...logoSrc.matchAll(/'(M[^']+)'/g)].map((m) => m[1]);
const logoPoly = logoSrc.match(/cityPolygon = '([^']+)'/)[1];

// Same projection as osm2svg.js
const MW = 2112, MH = 1268, LAT0 = 40.6365, LON0 = 17.9445, SPAN = 0.044;
const kx = MW / SPAN;
const ky = (kx * 111.0) / (111.32 * Math.cos((LAT0 * Math.PI) / 180));
const proj = (lat, lon) => [(lon - LON0) * kx + MW / 2, (LAT0 - lat) * ky + MH / 2];

const nodes = [];
if (roadsFile) {
  for (const e of JSON.parse(fs.readFileSync(roadsFile, 'utf8')).elements) {
    if (!e.geometry || !/residential|tertiary|secondary|primary|pedestrian|unclassified/.test(e.tags.highway)) continue;
    for (const p of e.geometry) nodes.push(proj(p.lat, p.lon));
  }
}
const snap = ([x, y]) => {
  let best = [x, y], bd = Infinity;
  for (const n of nodes) {
    const dd = (n[0] - x) ** 2 + (n[1] - y) ** 2;
    if (dd < bd) { bd = dd; best = n; }
  }
  return best;
};

// Map-space targets (px), spread around the centre, away from the logo.
const PINS = [
  { at: [560, 330], icon: 'road', label: 'Buca' },
  { at: [1480, 300], icon: 'bulb', label: 'Lampione spento' },
  { at: [430, 820], icon: 'tree' },
  { at: [1650, 860], icon: 'trash', label: 'Rifiuti abbandonati' },
  { at: [820, 1000], icon: 'road' },
  { at: [1300, 1010], icon: 'building', label: 'Panchina rotta' },
  { at: [300, 520], icon: 'trash' },
  { at: [1820, 560], icon: 'road' },
  { at: [980, 250], icon: 'tree' },
].map((p) => ({ ...p, at: snap(p.at) }));

const PIN_W = 54, PIN_H = 76.5;
const pinOutline = 'M12 1C6.2 1 1.5 5.7 1.5 11.5 1.5 19 12 33 12 33s10.5-14 10.5-21.5C22.5 5.7 17.8 1 12 1z';
const pinHtml = (p, i) => `
        <div class="pin" id="pin-${i}" style="left:${(p.at[0] - PIN_W / 2).toFixed(1)}px;top:${(p.at[1] - PIN_H).toFixed(1)}px">
          <div class="pin-body" id="pin-${i}-body">
            <svg width="${PIN_W}" height="${PIN_H}" viewBox="0 0 24 34"><path d="${pinOutline}" fill="#2B1CE8" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>
              <path d="${glyph(p.icon)}" transform="translate(5.5 5) scale(0.54)" fill="#FFFFFF" shape-rendering="crispEdges"/></svg>
          </div>${p.label ? `
          <div class="tag" id="pin-${i}-tag"><span class="dot"></span>${p.label}</div>` : ''}
        </div>`;

function page({ id, W, H, mapScale, logoW }) {
  const mx = (W - MW * mapScale) / 2, my = (H - MH * mapScale) / 2;
  const lh = (logoW * 186.23) / 664.14;
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /* CityFix hero: the blueprint map of the app (white ground, blue roads, pixel pins) on Brindisi */
      @font-face { font-family: 'Urbanist'; src: url('assets/Urbanist-SemiBold.ttf'); font-weight: 600; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #FFFFFF; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Urbanist', sans-serif; }
      #cam { position: absolute; left: ${mx.toFixed(1)}px; top: ${my.toFixed(1)}px; width: ${MW}px; height: ${MH}px; transform-origin: 50% 50%; }
      #map { position: absolute; inset: 0; width: ${MW}px; height: ${MH}px; }
      .pin { position: absolute; width: ${PIN_W}px; height: ${PIN_H}px; }
      .pin-body { position: absolute; inset: 0; transform-origin: 50% 100%; opacity: 0; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.28)); }
      .tag { position: absolute; left: ${PIN_W + 8}px; top: 4px; white-space: nowrap; display: flex; align-items: center; gap: 10px;
        background: #FFFFFF; color: #000; font-size: 24px; font-weight: 600; padding: 10px 18px 10px 14px; border-radius: 999px;
        border: 1.5px solid rgba(43, 28, 232, 0.28); box-shadow: 0 6px 18px rgba(26, 5, 162, 0.14); opacity: 0; }
      .tag .dot { width: 12px; height: 12px; border-radius: 3px; background: #2B1CE8; }
      #halo { position: absolute; left: 50%; top: 50%; width: ${logoW * 1.9}px; height: ${lh * 3.6}px; margin: -${(lh * 1.8).toFixed(1)}px 0 0 -${logoW * 0.95}px;
        background: radial-gradient(closest-side, rgba(255,255,255,0.97) 55%, rgba(255,255,255,0)); }
      #logo { position: absolute; left: 50%; top: 50%; width: ${logoW}px; height: ${lh.toFixed(1)}px; margin: -${(lh / 2).toFixed(1)}px 0 0 -${logoW / 2}px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="12" data-width="${W}" data-height="${H}">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow>
        <div id="cam">
          <img id="map" src="assets/brindisi.svg" alt="" />${PINS.map(pinHtml).join('')}
        </div>
        <div id="halo"></div>
        <svg id="logo" viewBox="0 0 664.14 186.23" fill="#2B1CE8">${logoPaths.map((d) => `<path d="${d}"/>`).join('')}<polygon points="${logoPoly}"/></svg>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      // The camera drifts out and back: the last frame meets the first.
      tl.fromTo('#cam', { scale: ${mapScale}, x: 0, y: 0 }, { scale: ${(mapScale * 1.05).toFixed(3)}, x: -${Math.round(W * 0.02)}, y: ${Math.round(H * 0.012)}, duration: 6, ease: 'sine.inOut' }, 0);
      tl.to('#cam', { scale: ${mapScale}, x: 0, y: 0, duration: 6, ease: 'sine.inOut' }, 6);
      const n = ${PINS.length};
      for (let i = 0; i < n; i++) {
        const t = 0.5 + i * 0.55;
        tl.fromTo('#pin-' + i + '-body', { opacity: 0, y: -40, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'expo.out' }, t);
        tl.to('#pin-' + i + '-body', { opacity: 0, scale: 0.6, duration: 0.3, ease: 'power3.in' }, 10.6 + i * 0.08);
        if (document.getElementById('pin-' + i + '-tag')) {
          tl.fromTo('#pin-' + i + '-tag', { opacity: 0, x: -12, filter: 'blur(6px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.4, ease: 'power4.out' }, t + 0.35);
          tl.to('#pin-' + i + '-tag', { opacity: 0, filter: 'blur(6px)', duration: 0.22, ease: 'power3.in' }, 10.4 + i * 0.08);
        }
      }
      tl.set({}, {}, 12);
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

for (const [dir, cfg] of [
  ['hero', { id: 'hero', W: 1920, H: 1152, mapScale: 1, logoW: 620 }],
  ['hero-mobile', { id: 'hero-mobile', W: 960, H: 576, mapScale: 0.5, logoW: 360 }],
]) {
  const d = path.join(here, dir);
  fs.mkdirSync(path.join(d, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), page(cfg));
}
console.log('ok', PINS.map((p) => p.at.map(Math.round)));
