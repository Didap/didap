// Builds mappa/index.html (1696x1520) and mappa-mobile/index.html (810x1440): the app's map screen.
// Run: node media/cityfix/build-mappa.mjs media/cityfix/osm/roads.json (strade di Brindisi da OpenStreetMap, ODbL)
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const icons = fs.readFileSync('C:/Users/aless/Documents/GitHub/cityfix/app/src/components/pixel-icons.ts', 'utf8');
const glyph = (n) => {
  const i = icons.indexOf('\n  ' + (n.includes('-') ? `'${n}'` : n) + ': {');
  return icons.slice(i, i + 3000).match(/pixels:\s*'([^']+)'/)[1];
};
const logo = fs.readFileSync(path.join(here, '../../public/covers/cityfix-logo.svg'), 'utf8').split('fill="#FFFFFF">')[1].split('</svg>')[0];

const MW = 2112, MH = 1268, LAT0 = 40.6365, LON0 = 17.9445, SPAN = 0.044;
const kx = MW / SPAN;
const ky = (kx * 111.0) / (111.32 * Math.cos((LAT0 * Math.PI) / 180));
const nodes = [];
for (const e of JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).elements) {
  if (!e.geometry || !/residential|tertiary|secondary|primary|pedestrian/.test(e.tags.highway)) continue;
  for (const p of e.geometry) nodes.push([(p.lon - LON0) * kx + MW / 2, (LAT0 - p.lat) * ky + MH / 2]);
}
const snap = ([x, y]) => nodes.reduce((b, n) => ((n[0] - x) ** 2 + (n[1] - y) ** 2 < (b[0] - x) ** 2 + (b[1] - y) ** 2 ? n : b), [1e9, 1e9]);

// Phone viewport into the map (map px): left/top of the visible window
const VX = 760, VY = 330;
const PINS = [
  [880, 520, 'road'], [1060, 470, 'bulb'], [960, 700, 'trash'], [1110, 820, 'tree'], [850, 900, 'road'], [1020, 1000, 'bulb'], [900, 1080, 'trash'],
].map(([x, y, icon]) => { const [sx, sy] = snap([x, y]); return { x: sx - VX, y: sy - VY, icon }; });
const SEL = 4;
const pinOutline = 'M12 1C6.2 1 1.5 5.7 1.5 11.5 1.5 19 12 33 12 33s10.5-14 10.5-21.5C22.5 5.7 17.8 1 12 1z';
const pin = (p, i) => `<div class="pin" id="pin-${i}" style="left:${(p.x - 18).toFixed(1)}px;top:${(p.y - 51).toFixed(1)}px"><svg width="36" height="51" viewBox="0 0 24 34"><path d="${pinOutline}" fill="#2B1CE8" stroke="#fff" stroke-width="1.6"/><path d="${glyph(p.icon)}" transform="translate(5.5 5) scale(0.54)" fill="#fff" shape-rendering="crispEdges"/></svg></div>`;
const px = (n, size, fill = '#fff') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" shape-rendering="crispEdges"><path d="${glyph(n)}"/></svg>`;

function page({ id, W, H, scale }) {
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      /* CityFix app, map screen (screens/MapScreen, MapHeaderBar, FloatingNavBar, ReportPreviewCard) */
      @font-face { font-family: 'Urbanist'; src: url('assets/Urbanist_500Medium.ttf'); font-weight: 500; }
      @font-face { font-family: 'Urbanist'; src: url('assets/Urbanist_700Bold.ttf'); font-weight: 700; }
      @font-face { font-family: 'Bitcount'; src: url('assets/BitcountGridSingle_600SemiBold.ttf'); font-weight: 600; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #2B1CE8; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Urbanist', sans-serif; background-color: #2B1CE8; background-image: linear-gradient(rgba(255,255,255,0.10) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.10) 2px, transparent 2px); background-size: 40px 40px; background-position: 19px 19px; }
      #ground { position: absolute; left: ${(W - MW) / 2}px; top: ${(H - MH) / 2}px; width: ${MW}px; height: ${MH}px; opacity: 0.16; filter: grayscale(1) brightness(3); }
      #phone { position: absolute; left: 50%; top: 50%; width: 413px; height: 872px; margin: -436px 0 0 -206.5px; border-radius: 62px; background: #0E0B2E; padding: 10px; scale: ${scale}; }
      #screen { position: relative; width: 393px; height: 852px; border-radius: 52px; overflow: hidden; background: #fff; }
      #map { position: absolute; left: 0; top: 0; width: ${MW}px; height: ${MH}px; }
      #map img { position: absolute; left: -${VX}px; top: -${VY}px; width: ${MW}px; height: ${MH}px; }
      .pin { position: absolute; width: 36px; height: 51px; filter: drop-shadow(0 2px 2.5px rgba(0,0,0,0.28)); transform-origin: 50% 100%; }
      #head { position: absolute; left: 0; right: 0; top: 0; height: 118px; background: #2B1CE8; border-radius: 0 0 24px 24px; }
      .status { position: absolute; top: 16px; left: 34px; right: 30px; display: flex; justify-content: space-between; color: #fff; font-weight: 700; font-size: 15px; }
      #head .logo { position: absolute; left: 20px; top: 66px; width: 110px; height: 31px; }
      .rb { position: absolute; top: 58px; width: 46px; height: 46px; border-radius: 23px; background: #4141FD; display: flex; align-items: center; justify-content: center; }
      #bar { position: absolute; left: 16px; right: 16px; bottom: 26px; height: 68px; border-radius: 34px; background: #2B1CE8; box-shadow: 0 8px 24px rgba(26, 5, 162, 0.2); display: flex; align-items: center; justify-content: space-between; padding: 0 8px; }
      .who { display: flex; align-items: center; gap: 12px; color: #fff; }
      .av { width: 52px; height: 52px; border-radius: 26px; background: linear-gradient(135deg, #FB923C, #D63636); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #fff; }
      .who b { display: block; font-weight: 700; font-size: 17px; line-height: 22px; }
      .who span { font-weight: 500; font-size: 12px; color: #DDDBFB; }
      .act { position: relative; height: 52px; width: 156px; }
      .act > div { position: absolute; right: 0; top: 0; height: 52px; border-radius: 26px; background: #fff; display: flex; align-items: center; gap: 8px; padding: 0 20px 0 18px; font-weight: 700; font-size: 16px; color: #2B1CE8; white-space: nowrap; }
      #card { position: absolute; left: 16px; right: 16px; bottom: 108px; background: #fff; border-radius: 20px; padding: 14px; display: flex; gap: 12px; box-shadow: 0 8px 24px rgba(26, 5, 162, 0.14); border: 1px solid #E4E3EE; }
      .ph { width: 76px; height: 76px; border-radius: 12px; flex: none; background: radial-gradient(ellipse 34% 22% at 50% 55%, #2c2a2a 0 55%, #4b4744 72%, transparent 80%), linear-gradient(200deg, #b0aba4, #85807a); }
      .ph.w { background: radial-gradient(circle at 60% 50%, #3f3a35 0 18%, transparent 19%), linear-gradient(160deg, #8b8f6a, #5d6447); }
      #card .lab { font-family: 'Bitcount'; font-weight: 600; font-size: 11px; letter-spacing: 0.44px; text-transform: uppercase; color: #5B5B70; display: flex; align-items: center; gap: 6px; }
      #card b { display: block; font-weight: 700; font-size: 17px; line-height: 22px; margin: 4px 0 2px; }
      #card .m { font-weight: 500; font-size: 13px; color: #5B5B70; }
      .sp { position: relative; width: 12px; height: 12px; }
      .sp i { position: absolute; width: 5px; height: 5px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="12" data-width="${W}" data-height="${H}">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>
        <div id="phone"><div id="screen">
          <div id="map"><img src="assets/brindisi.svg" alt="" />${PINS.map(pin).join('')}</div>
          <div id="head"><div class="status"><span>9:41</span><span>5G</span></div>
            <svg class="logo" viewBox="0 0 664.14 186.23" fill="#fff">${logo}</svg>
            <div class="rb" style="left:233px">${px('search', 22)}</div><div class="rb" style="left:285px">${px('filter', 22)}</div><div class="rb" style="left:337px; width:40px">${px('list', 20)}</div>
          </div>
          <div id="card">
            <div class="ph"></div>
            <div><div class="lab"><span class="sp"><i style="left:0;top:0;background:#2B1CE8"></i><i style="right:0;top:0;background:#2B1CE8"></i><i style="right:0;bottom:0;background:#DDDBFB"></i><i style="left:0;bottom:0;background:#DDDBFB"></i></span>Presa in carico</div>
              <b>Buca in Via Ostuni</b><div class="m">Strade · 26 ott · 6 persone la sostengono</div></div>
          </div>
          <div id="bar">
            <div class="who"><div class="av">GR</div><div><b>Giulia R.</b><span>3 segnalazioni attive</span></div></div>
            <div class="act"><div id="a1">${px('wrench', 22, '#2B1CE8')}Segnala ora</div><div id="a2">${px('thumbs-up', 22, '#2B1CE8')}Sostieni</div></div>
          </div>
        </div></div>
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.set('#a2', { opacity: 0 }, 0);
      tl.set('#card', { y: 140, opacity: 0 }, 0);
      // A slow pan over the city, out and back
      tl.fromTo('#map', { x: 0, y: 0 }, { x: -30, y: -40, duration: 6, ease: 'sine.inOut' }, 0);
      tl.to('#map', { x: 0, y: 0, duration: 6, ease: 'sine.inOut' }, 6);
      // Tap on a pin: it lifts, the preview card comes up and the bar's action becomes Sostieni
      tl.fromTo('#pin-${SEL}', { scale: 1 }, { scale: 1.3, duration: 0.35, ease: 'expo.out' }, 2.2);
      tl.to('#card', { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }, 2.35);
      tl.fromTo('#a1', { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9, duration: 0.2, ease: 'power3.in' }, 2.5);
      tl.fromTo('#a2', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'expo.out' }, 2.65);
      // Closes again
      tl.to('#card', { y: 140, opacity: 0, duration: 0.3, ease: 'power3.in' }, 8.6);
      tl.to('#pin-${SEL}', { scale: 1, duration: 0.3, ease: 'power3.in' }, 8.6);
      tl.to('#a2', { opacity: 0, scale: 0.9, duration: 0.2, ease: 'power3.in' }, 8.7);
      tl.to('#a1', { opacity: 1, scale: 1, duration: 0.3, ease: 'expo.out' }, 8.85);
      tl.set({}, {}, 12);
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}
for (const [dir, cfg] of [
  ['mappa', { id: 'mappa', W: 1696, H: 1520, scale: 1.6 }],
  ['mappa-mobile', { id: 'mappa-mobile', W: 810, H: 1440, scale: 1.55 }],
]) {
  fs.mkdirSync(path.join(here, dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(here, dir, 'index.html'), page(cfg));
}
console.log('ok');
