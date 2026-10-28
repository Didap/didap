// Builds the three 822x1080 closing clips: chiusura, sostieni, avviso.
// Run: node media/cityfix/build-triple.mjs
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const icons = fs.readFileSync('C:/Users/aless/Documents/GitHub/cityfix/app/src/components/pixel-icons.ts', 'utf8');
const glyph = (n) => {
  const i = icons.indexOf('\n  ' + (n.includes('-') ? `'${n}'` : n) + ': {');
  return icons.slice(i, i + 3000).match(/pixels:\s*'([^']+)'/)[1];
};
const px = (n, size, fill) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" shape-rendering="crispEdges"><path d="${glyph(n)}"/></svg>`;

const head = (id, extra) => `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=822, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: 'Urbanist'; src: url('assets/Urbanist_500Medium.ttf'); font-weight: 500; }
      @font-face { font-family: 'Urbanist'; src: url('assets/Urbanist_700Bold.ttf'); font-weight: 700; }
      @font-face { font-family: 'Bitcount'; src: url('assets/BitcountGridSingle_600SemiBold.ttf'); font-weight: 600; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 822px; height: 1080px; overflow: hidden; background: #2B1CE8; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Urbanist', sans-serif; background-color: #2B1CE8;
        background-image: linear-gradient(rgba(255,255,255,0.10) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.10) 2px, transparent 2px);
        background-size: 40px 40px; background-position: 19px 19px; }
      .card { position: absolute; left: 61px; right: 61px; background: #fff; border-radius: 40px; padding: 32px; border: 2px solid #E4E3EE; box-shadow: 0 16px 48px rgba(14, 11, 46, 0.25); }
      .lab { font-family: 'Bitcount'; font-weight: 600; font-size: 22px; letter-spacing: 0.88px; text-transform: uppercase; color: #5B5B70; }
      .h { font-weight: 700; font-size: 36px; line-height: 44px; color: #000; margin: 8px 0 4px; }
      .m { font-weight: 500; font-size: 26px; line-height: 34px; color: #5B5B70; }
      .tag { display: inline-flex; align-items: center; gap: 12px; height: 52px; padding: 0 22px; border-radius: 26px; font-weight: 700; font-size: 26px; }
      ${extra}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="12" data-width="822" data-height="1080">
      <div id="stage" class="clip" data-start="0" data-duration="12" data-track-index="0" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-occlusion>`;
const foot = (id, script) => `
      </div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${script}
      tl.set({}, {}, 12);
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

const pixels = (cls) => `<span class="pxs ${cls}"><i style="left:0;top:0"></i><i style="right:0;top:0"></i><i style="right:0;bottom:0"></i><i style="left:0;bottom:0"></i></span>`;

const CLIPS = {
  // The supplier closes the job with the photo of the finished work
  chiusura: head('chiusura', `
      .ph { position: relative; height: 470px; border-radius: 28px; overflow: hidden; margin-bottom: 24px; }
      .ph div { position: absolute; inset: 0; }
      .before { background: radial-gradient(ellipse 34% 20% at 50% 58%, #262323 0 55%, #4b4744 72%, transparent 80%), radial-gradient(circle at 22% 30%, #8e8a85 0 5px, transparent 6px), radial-gradient(circle at 78% 72%, #8e8a85 0 4px, transparent 5px), linear-gradient(165deg, #a7a29c, #7a756f); }
      .after { background: radial-gradient(ellipse 40% 26% at 50% 58%, #3a3a3e 0 70%, transparent 72%), radial-gradient(circle at 22% 30%, #8e8a85 0 5px, transparent 6px), linear-gradient(165deg, #a7a29c, #7a756f); }
      .seam { position: absolute; top: 0; bottom: 0; width: 6px; background: #fff; }
      .pl { position: absolute; top: 20px; padding: 8px 16px; border-radius: 18px; background: rgba(0,0,0,0.55); color: #fff; font-family: 'Bitcount'; font-weight: 600; font-size: 20px; letter-spacing: 0.8px; text-transform: uppercase; }
      .pxs { position: relative; display: inline-block; width: 28px; height: 28px; }
      .pxs i { position: absolute; width: 12px; height: 12px; background: #479B3E; }
      #stamp { position: absolute; right: 40px; top: 420px; height: 64px; padding: 0 26px; border-radius: 32px; background: #fff; color: #166534; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
    `) + `
        <div class="card" style="top:150px">
          <div class="ph"><div class="before"></div><div class="after" id="after"></div><span class="seam" id="seam"></span>
            <span class="pl" style="left:20px" id="lb">Prima</span><span class="pl" style="right:20px;opacity:0" id="la">Dopo</span></div>
          <div class="lab">Asfalti Messapia srl</div>
          <div class="h">Buca in Via Ostuni</div>
          <div class="m">Intervento chiuso con foto. 28 ott, 16:30</div>
        </div>
        <div class="tag" id="stamp">${pixels('')}Completata</div>` + foot('chiusura', `
      tl.set('#after', { clipPath: 'inset(0 0 0 100%)' }, 0);
      tl.set('#seam', { left: '100%', opacity: 0 }, 0);
      tl.set(['#stamp', '#la'], { opacity: 0 }, 0);
      tl.to('#seam', { opacity: 1, duration: 0.15 }, 1.8);
      tl.to('#after', { clipPath: 'inset(0 0 0 0%)', duration: 1.6, ease: 'power2.inOut' }, 2.0);
      tl.to('#seam', { left: '0%', duration: 1.6, ease: 'power2.inOut' }, 2.0);
      tl.to('#seam', { opacity: 0, duration: 0.15 }, 3.6);
      tl.to('#lb', { opacity: 0, duration: 0.2 }, 3.0);
      tl.to('#la', { opacity: 1, duration: 0.2 }, 3.4);
      tl.fromTo('#stamp', { opacity: 0, scale: 1.4, rotation: -6 }, { opacity: 1, scale: 1, rotation: -6, duration: 0.35, ease: 'expo.out' }, 4.1);
      tl.to(['#stamp', '#la'], { opacity: 0, duration: 0.3, ease: 'power3.in' }, 10.9);
      tl.to('#after', { clipPath: 'inset(0 0 0 100%)', duration: 0.6, ease: 'power3.inOut' }, 11.1);
      tl.to('#lb', { opacity: 1, duration: 0.2 }, 11.6);`),

  // Other citizens back the same report
  sostieni: head('sostieni', `
      .ph { height: 330px; border-radius: 28px; margin-bottom: 24px; background: radial-gradient(ellipse 34% 20% at 50% 58%, #262323 0 55%, #4b4744 72%, transparent 80%), linear-gradient(165deg, #a7a29c, #7a756f); }
      .row { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; }
      .avs { position: relative; width: 260px; height: 64px; }
      .av { position: absolute; top: 0; width: 64px; height: 64px; border-radius: 32px; border: 4px solid #fff; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 22px; }
      .cnt { position: relative; height: 34px; overflow: hidden; width: 420px; margin-top: 12px; }
      .cnt span { position: absolute; left: 0; top: 0; white-space: nowrap; }
      .btn { position: relative; width: 250px; height: 72px; }
      .btn div { position: absolute; inset: 0; border-radius: 36px; display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 700; font-size: 28px; }
      #b1 { background: #2B1CE8; color: #fff; }
      #b2 { background: #EEEDFD; color: #2B1CE8; }
    `) + `
        <div class="card" style="top:170px">
          <div class="ph"></div>
          <div class="lab">Presa in carico</div>
          <div class="h">Buca in Via Ostuni</div>
          <div class="m">Lo vedi anche tu?</div>
          <div class="row">
            <div class="avs">
              <div class="av" style="left:0;background:#1A05A2">GR</div><div class="av" style="left:44px;background:#8077F1">MT</div>
              <div class="av" style="left:88px;background:#4141FD">AL</div><div class="av" id="av4" style="left:132px;background:linear-gradient(135deg,#FB923C,#D63636)">TU</div>
            </div>
            <div class="btn"><div id="b1">${px('thumbs-up', 30, '#fff')}Sostieni</div><div id="b2">${px('thumbs-up', 30, '#2B1CE8')}Sostenuta</div></div>
          </div>
          <div class="m cnt"><span id="c1">6 persone la sostengono</span><span id="c2">7 persone la sostengono</span></div>
        </div>` + foot('sostieni', `
      tl.set(['#b2', '#c2', '#av4'], { opacity: 0 }, 0);
      tl.fromTo('#b1', { scale: 1 }, { scale: 0.96, duration: 0.1 }, 3.0);
      tl.to('#b1', { scale: 1, duration: 0.15 }, 3.1);
      tl.to('#b1', { opacity: 0, duration: 0.2 }, 3.2);
      tl.fromTo('#b2', { opacity: 0 }, { opacity: 1, duration: 0.25 }, 3.25);
      tl.fromTo('#av4', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' }, 3.35);
      tl.fromTo('#c1', { yPercent: 0, opacity: 1 }, { yPercent: -100, opacity: 0, duration: 0.35, ease: 'power3.inOut' }, 3.4);
      tl.fromTo('#c2', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.inOut' }, 3.4);
      tl.to(['#b2', '#av4', '#c2'], { opacity: 0, duration: 0.3, ease: 'power3.in' }, 11.0);
      tl.to(['#b1', '#c1'], { opacity: 1, yPercent: 0, duration: 0.3 }, 11.3);`),

  // A notice from the Comune, pinned to a zone of the map
  avviso: head('avviso', `
      #mapw { position: absolute; left: 61px; right: 61px; top: 120px; height: 520px; border-radius: 40px; overflow: hidden; background: #fff; border: 2px solid #E4E3EE; }
      #mapw img { position: absolute; left: -800px; top: -330px; width: 2112px; height: 1268px; }
      #zone { position: absolute; left: 0; top: 0; }
      #notice { top: 600px; }
      .w { background: #FEF3C7; color: #92400E; height: 44px; font-size: 22px; padding: 0 18px; }
    `) + `
        <div id="mapw"><img src="assets/brindisi.svg" alt="" />
          <svg id="zone" width="700" height="520" viewBox="0 0 700 520"><path id="zp" d="M170 120 L430 70 L560 190 L520 380 L300 450 L150 330 Z" fill="rgba(245,158,11,0.18)" stroke="#F59E0B" stroke-width="5" stroke-dasharray="1400" stroke-linejoin="round"/></svg>
        </div>
        <div class="card" id="notice">
          <span class="tag w">${px('alert', 26, '#B45309')}Avviso · Centro</span>
          <div class="h" style="margin-top:16px">Lavori sulla rete idrica</div>
          <div class="m">Strade chiuse a tratti tra Corso Garibaldi e il porto. Valido fino al 31 ottobre.</div>
        </div>` + foot('avviso', `
      tl.fromTo('#zp', { strokeDashoffset: 1400, fillOpacity: 0 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0.6);
      tl.fromTo('#zp', { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.5 }, 1.8);
      tl.fromTo('#notice', { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }, 2.2);
      tl.to('#notice', { y: 120, opacity: 0, duration: 0.35, ease: 'power3.in' }, 10.9);
      tl.to('#zp', { strokeDashoffset: 1400, fillOpacity: 0, duration: 0.6, ease: 'power3.in' }, 11.2);`),
};

for (const [name, html] of Object.entries(CLIPS)) {
  fs.mkdirSync(path.join(here, name, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(here, name, 'index.html'), html);
}
console.log('ok');
