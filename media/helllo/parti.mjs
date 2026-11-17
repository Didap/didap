// Fills the generated parts of the Helllo clips that are not hero and splash (those come
// from build.mjs), and copies into each project what it needs at render time.
// Run: node media/helllo/parti.mjs
//
// In each index.html listed in PROGETTI, a block between
//   <!-- helllo:NAME {json} -->  and  <!-- /helllo:NAME -->
// (or /* helllo:NAME {json} */ ... /* /helllo:NAME */ inside <style> and <script>) is
// rewritten from the part NAME below; everything else in the file is written by hand.
// The json holds the part's options and can be left out. Parts:
//   fonts     @font-face of Hanken Grotesk (roman and italic) and Pacifico, files in fonts/
//   wordmark  the helllo wordmark: the letters of the sticker of the key illustration,
//             turned 6 degrees so they sit on one line; it takes the colour of the text
//   lllmark   the three l of the wordmark alone (the match badge)
//   sticker   "È un helllo!" from the key illustration: pill and letters that fall, lll that
//             write themselves (set id, prefix of the ids)
//   lll       the three l of the cord, written by the pen (set id, fill)
//   persone   the two people of the key illustration with phones and cord, no panel, no
//             sticker, the eyes open in .eye groups; the cord in #<id>-filo
//   ritratto  one of the two people alone, head and shoulders (who: sx or dx), eyes open in
//             .occhi, closed in .chiusi (hidden)
//   pen       the script that lays the pens (sets), the brand ease and two helpers:
//             write(tl, set, at, duration, back) and fall(tl, sel, at, turn)
//   file      the content of parti/<src>, which may hold parts itself
//
// Fonts (OFL, licences in fonts/) and parti/luca.webp go to assets/ of each project:
// assets/fonts/ and the rendered screens are not kept in git (media/helllo/.gitignore).
// The screens render into their phone, the phone renders last (media/README.md).
import fs from 'node:fs';
import path from 'node:path';
import { here, P, CORD, LEFT_HAND, LEFT_BODY, RIGHT_HAND, RIGHT_BODY, PILL, LETTERS, STICKER_L, EYES, lines, path_, group, curve, joined, written, closed, stickerLines, penScript } from './disegno.mjs';

const PROGETTI = [
  'scopri-schermo', 'match-schermo', 'conversazione', 'conversazione-mobile',
  'profilo', 'profilo-mobile', 'palette', 'social', 'store',
];

const opt = (o, k, d) => (o && o[k] !== undefined ? o[k] : d);
const RED = P[1][1]; // the red of the cord and of the sticker letters in the export

const PARTI = {
  fonts: () => `
      @font-face { font-family: 'Hanken Grotesk'; font-style: normal; font-weight: 100 900; src: url('assets/fonts/hanken-grotesk-latin-wght-normal.woff2') format('woff2'); }
      @font-face { font-family: 'Hanken Grotesk'; font-style: italic; font-weight: 100 900; src: url('assets/fonts/hanken-grotesk-latin-wght-italic.woff2') format('woff2'); }
      @font-face { font-family: 'Pacifico'; font-style: normal; font-weight: 400; src: url('assets/fonts/pacifico-latin-400-normal.woff2') format('woff2'); }
      `,

  // with set, the letters are groups <id>-h, -e, -o that can fall and the lll write themselves
  // (the red of the export)
  wordmark: (o) => {
    if (!o?.set) return `<svg${o?.id ? ` id="${o.id}"` : ''} class="${opt(o, 'class', 'wordmark')}" viewBox="11.9 37.2 272 100.2" fill="currentColor" aria-label="helllo"><g transform="rotate(-6 150 95)">${[LETTERS.h, LETTERS.e, ...STICKER_L, LETTERS.o].map((i) => `<path d="${P[i][0]}"/>`).join('')}</g></svg>`;
    const id = opt(o, 'id', 'wm');
    return `<svg id="${id}" class="${opt(o, 'class', 'wordmark')}" viewBox="11.9 37.2 272 100.2" fill="none" overflow="visible" aria-label="helllo"><g transform="rotate(-6 150 95)">
          <g id="${id}-h">${path_(LETTERS.h)}</g><g id="${id}-e">${path_(LETTERS.e)}</g>${written(o.set, STICKER_L, stickerLines, 3)}
          <g id="${id}-o">${path_(LETTERS.o)}</g></g></svg>`;
  },

  // the three l of the wordmark alone, as in the match badge and the app icon
  lllmark: (o) => `<svg class="${opt(o, 'class', 'wordmark-lll')}" viewBox="116 30 128 116" fill="currentColor" aria-hidden="true"><g transform="rotate(-6 150 95)">${STICKER_L.map((i) => `<path d="${P[i][0]}"/>`).join('')}</g></svg>`,

  // viewBox around the pill and the letters, with room for the fall
  sticker: (o) => {
    const p = opt(o, 'prefix', 'st'), set = opt(o, 'set', 'sw');
    return `<svg id="${p}" class="${opt(o, 'class', 'sticker')}" viewBox="0 -10 330 165" fill="none" overflow="visible">
          <g id="${p}-pill">${PILL.map((i) => path_(i)).join('')}</g>
          <g id="${p}-h">${path_(LETTERS.h)}</g>
          <g id="${p}-e">${path_(LETTERS.e)}</g>
          <g id="${p}-lll">${written(set, STICKER_L, stickerLines, 3)}
          </g>
          <g id="${p}-o">${path_(LETTERS.o)}</g>
          <g id="${p}-x">${path_(LETTERS.x)}</g>
        </svg>`;
  },

  lll: (o) => {
    const set = opt(o, 'set', 'lw'), fill = opt(o, 'fill', RED);
    return `<svg id="${opt(o, 'id', set + '-svg')}" class="${opt(o, 'class', 'lll')}" viewBox="360 92 438 404" fill="none" overflow="visible">${written(set, CORD.slice(1), lines.cord.slice(1), 3).split(RED).join(fill)}
        </svg>`;
  },

  persone: (o) => {
    const id = opt(o, 'id', 'pp');
    const eyes = Object.keys(EYES).map((i) => `<g class="eye">${path_(+i)}</g>`).join('');
    // the centre line of the cord from the left phone to the right one, for what runs along it
    const via = curve(joined(lines.cord, 0).flat());
    return `<svg id="${id}" class="${opt(o, 'class', 'persone')}" viewBox="0 80 1118 490" fill="none" overflow="visible">
          <path id="${id}-via" class="line" d="${via}"/>
          <g id="${id}-filo">${CORD.map((i) => path_(i)).join('')}</g>
          ${group(id + '-sx', LEFT_BODY)}
          ${group(id + '-dx', RIGHT_BODY)}
          <g id="${id}-chiusi" opacity="0">${closed}</g>
          <g id="${id}-occhi">${eyes}</g>
          ${group(id + '-mano-sx', LEFT_HAND)}
          ${group(id + '-mano-dx', RIGHT_HAND)}
        </svg>`;
  },

  // one of the two people alone, head and shoulders, eyes open: who sx (left) or dx (right)
  ritratto: (o) => {
    const dx = opt(o, 'who', 'dx') === 'dx';
    const eyes = Object.keys(EYES).filter((i) => (+i > 70) === dx).map((i) => `<g class="eye">${path_(+i)}</g>`).join('');
    // the closed eyes, as in build.mjs, for the same person
    const chiusi = Object.entries(EYES).filter(([i]) => (+i > 70) === dx).map(([, [x, y]]) =>
      `<path d="M${x - 8} ${y - 1}Q${x} ${y + 7} ${x + 8} ${y - 1}" stroke="#225AD6" stroke-width="6.4" stroke-linecap="round" fill="none"/>`).join('');
    return `<svg${o?.id ? ` id="${o.id}"` : ''} class="${opt(o, 'class', 'ritratto')}" viewBox="${dx ? '830 176 280 400' : '-6 180 250 345'}" fill="none" overflow="visible">${group(opt(o, 'id', 'rt') + '-corpo', dx ? RIGHT_BODY : LEFT_BODY)}<g class="occhi">${eyes}</g><g class="chiusi" opacity="0">${chiusi}</g></svg>`;
  },

  pen: (o) => `
      ${penScript(opt(o, 'sets', {}))}
      // every pen starts with nothing written
      for (const id of Object.keys(SETS)) gsap.set('#' + id + '-pen', { ['--' + id]: 0 });
      // Ease 55% out, 85% in: cubic-bezier(0.55, 0, 0.15, 1) (Brand Guidelines 20)
      const bezier = (x1, y1, x2, y2) => (t) => {
        const f = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
        let lo = 0, hi = 1, s = t;
        for (let i = 0; i < 24; i++) { if (f(x1, x2, s) < t) lo = s; else hi = s; s = (lo + hi) / 2; }
        return f(y1, y2, s);
      };
      const pen = bezier(0.55, 0, 0.15, 1);
      const FRAME = 1 / 24;
      // A set written from 0 to 1 (or back), then the glyphs take over from the pen
      const write = (tl, id, at, duration, back = false) => {
        if (!back) tl.set('#' + id + '-pen', { opacity: 1 }, at);
        tl.fromTo('#' + id + '-pen', { ['--' + id]: back ? 1 : 0 }, { ['--' + id]: back ? 0 : 1, duration, ease: pen, immediateRender: false }, at);
        if (back) return;
        tl.to('#' + id, { opacity: 1, duration: 0.15, ease: 'none' }, at + duration);
        tl.set('#' + id + '-pen', { opacity: 0 }, at + duration + 0.2);
      };
      // The letters fall whole: 30 degrees and 20% higher, in 5 frames, no bounce. Works on
      // svg groups (turning on the bottom centre of the box) and on html elements.
      const fall = (tl, sel, at, turn) => {
        const el = document.querySelector(sel);
        const svg = el instanceof SVGElement;
        const box = svg ? el.getBBox() : { x: 0, y: 0, width: el.offsetWidth, height: el.offsetHeight };
        const pivot = svg ? { svgOrigin: (box.x + box.width / 2) + ' ' + (box.y + box.height) } : { transformOrigin: '50% 100%' };
        tl.set(sel, { opacity: 1 }, at);
        tl.fromTo(sel, { y: -0.2 * box.height, rotation: turn, ...pivot }, { y: 0, rotation: 0, duration: 5 * FRAME, ease: 'power3.in', immediateRender: false }, at);
      };
      `,
};

const BLOCK = /(<!--|\/\*) helllo:(\w+)( \{.*?\})? (-->|\*\/)[\s\S]*?(<!--|\/\*) \/helllo:\2 (-->|\*\/)/g;
const fill = (text) => text.replace(BLOCK, (all, open, name, json, close, open2, close2) => {
  const o = json ? JSON.parse(json) : undefined;
  let body;
  if (name === 'file') body = fill(fs.readFileSync(path.join(here, 'parti', o.src), 'utf8'));
  else if (PARTI[name]) body = PARTI[name](o);
  else throw new Error(`parte sconosciuta: ${name}`);
  return `${open} helllo:${name}${json || ''} ${close}${body}${open2} /helllo:${name} ${close2}`;
});

const FONTS = path.join(here, 'fonts');
for (const p of PROGETTI) {
  const dir = path.join(here, p);
  const file = path.join(dir, 'index.html');
  if (!fs.existsSync(file)) { console.log(`${p}: manca index.html, salto`); continue; }
  fs.writeFileSync(file, fill(fs.readFileSync(file, 'utf8')));
  fs.mkdirSync(path.join(dir, 'assets/fonts'), { recursive: true });
  for (const f of fs.readdirSync(FONTS)) if (f.endsWith('.woff2')) fs.copyFileSync(path.join(FONTS, f), path.join(dir, 'assets/fonts', f));
  fs.copyFileSync(path.join(here, 'parti/luca.webp'), path.join(dir, 'assets/luca.webp'));
  // lo store fa girare gli schermi già renderizzati dentro i telefoni
  if (p === 'store') {
    for (const s of ['scopri', 'match']) {
      const from = path.join(here, `${s}-telefono/assets/schermo.mp4`);
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dir, `assets/${s}.mp4`));
      else console.log(`store: manca ${s}-telefono/assets/schermo.mp4, prima lo schermo`);
    }
  }
  console.log(`media/helllo/${p}`);
}

// La tessera del logo per la pair[0] della scheda (628x760, come le altre schede): il marchio
// in carta sul rosso
{
  const W = 440, vb = [11.9, 37.2, 272, 100.2], H = +(W * vb[3] / vb[2]).toFixed(2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 628 760">
  <rect width="628" height="760" fill="#E93D29"/>
  <svg x="94" y="${+((760 - H) / 2).toFixed(2)}" width="${W}" height="${H}" viewBox="${vb.join(' ')}" fill="#F9F7F8">
    <g transform="rotate(-6 150 95)">
${[LETTERS.h, LETTERS.e, ...STICKER_L, LETTERS.o].map((i) => `      <path d="${P[i][0]}"/>`).join('\n')}
    </g>
  </svg>
</svg>
`;
  fs.writeFileSync(path.join(here, '../../public/covers/helllo-logo.svg'), svg);
  console.log('public/covers/helllo-logo.svg');
}
