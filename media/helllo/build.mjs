// Builds hero/index.html and splash/index.html from the key illustration of the Helllo
// brand («Il logo è il cavo», Brand Guidelines 18), at twice the slot size (3840x2304,
// 3840x1920): render at 24 fps and scale down to 1920 wide when encoding (media/README.md).
// Run: node media/helllo/build.mjs
//
// figma/illustrazione-chiave.svg is the Figma SVG export of that illustration.
// figma/linee-lll.json holds the centre lines of the filled lll of the cord, measured
// inside the shapes: the glyphs write themselves along them. The sticker takes the
// cord's own line (see anchors and affine below).
//
// Motion follows Brand Guidelines 20: the stroke writes itself (ease 55% out, 85% in,
// lll in 1.4 s), the letters fall (30°, 20% higher, 5 frames at 24 fps, no bounce),
// the cord is a spring (damped, 2.5 Hz, 8° at most, the ends stay put, once).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const svg = fs.readFileSync(path.join(here, 'figma/illustrazione-chiave.svg'), 'utf8');
const lines = JSON.parse(fs.readFileSync(path.join(here, 'figma/linee-lll.json'), 'utf8'));

// Every path of the export, in paint order: [d, fill]
const P = [...svg.matchAll(/<path id="[^"]*" d="([^"]+)" fill="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]);
if (P.length !== 78) throw new Error(`expected 78 paths, found ${P.length}`);

// Indices in the export
const PANEL = [0];
const CORD = [4, 1, 2, 3]; // tail from the left phone, then the three l
const LEFT_HAND = [5, 6, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 39, 40];
const LEFT_BODY = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20];
const RIGHT_HAND = [41, 42, 43, 44, 45, 54, 55, 56];
const RIGHT_BODY = [31, 32, 33, 34, 35, 36, 37, 38, 46, 47, 48, 49, 50, 51, 52, 53, 67, 68, 69, 70, 71, 72, 73, 74, 77];
const PILL = [65, 66]; // 64 is the pill's own mask
const LETTERS = { h: 57, e: 58, l1: 59, l2: 60, l3: 61, o: 62, x: 63 };
const STICKER_L = [LETTERS.l1, LETTERS.l2, LETTERS.l3];
// The four open eyes, with the centre of each one
const EYES = { 17: [119, 330], 18: [176, 330.5], 75: [979, 326], 76: [918, 326] };

// The three l of the sticker are the l of the cord, smaller and turned: the same outline
// under an affine map. The map comes from the first 20 points of the two outlines, and
// carries the centre line of the cord's middle l onto each of them.
const anchors = (d) => [...d.matchAll(/[MC]([^A-Za-z]+)/g)].slice(0, 20).map((m) => m[1].match(/-?\d*\.?\d+/g).map(Number).slice(-2));
const affine = (from, to) => {
  // least squares for x' = a x + b y + c (and the same for y')
  const n = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], rx = [0, 0, 0], ry = [0, 0, 0];
  from.forEach(([x, y], i) => {
    const v = [x, y, 1];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) n[r][c] += v[r] * v[c];
      rx[r] += v[r] * to[i][0]; ry[r] += v[r] * to[i][1];
    }
  });
  const solve = (b) => {
    const m = n.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const f = m[j][i] / m[i][i];
        for (let k = i; k < 4; k++) m[j][k] -= f * m[i][k];
      }
    }
    const x = [0, 0, 0];
    for (let i = 2; i >= 0; i--) {
      let t = m[i][3];
      for (let k = i + 1; k < 3; k++) t -= m[i][k] * x[k];
      x[i] = t / m[i][i];
    }
    return x;
  };
  const [a, b, c] = solve(rx), [d, e, f] = solve(ry);
  return ([x, y]) => [+(a * x + b * y + c).toFixed(2), +(d * x + e * y + f).toFixed(2)];
};

// Where one l runs into the next, the measured lines end in the round end of the stroke
// and start with a wobble at the bottom of the next l, both hidden in the drawing. The pen
// leaves them out (3 points each) and goes from one to the other in a smooth curve.
const joined = (centres, first) => centres.map((c, i) => c.slice(i ? 3 : first, i < centres.length - 1 ? -3 : undefined));
const path_ = (i, attrs = '') => `<path d="${P[i][0]}" fill="${P[i][1]}"${attrs}/>`;
const group = (id, idx) => `<g id="${id}">${idx.map((i) => path_(i)).join('')}</g>`;

// Catmull-Rom through the measured points
const curve = (pts) => {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c = (v) => +v.toFixed(1);
    d += `C${c(p1[0] + (p2[0] - p0[0]) / 6)} ${c(p1[1] + (p2[1] - p0[1]) / 6)} ${c(p2[0] - (p3[0] - p1[0]) / 6)} ${c(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`;
  }
  return d;
};

// Filled glyphs that write themselves, together. Their centre lines sit hidden in the
// svg, one after the other, each one starting where the previous one ends. The script
// below lays a pen along them (pen): short round strokes as wide as the glyph at that
// point, each one showing when the writing gets there, all kept inside the glyphs. Once
// written, the glyphs themselves (id) take over.
const written = (id, glyphs, measured, first = 0) => {
  const centres = joined(measured, first);
  return `
      ${centres.map((c, i) => `<path class="line" data-set="${id}" data-joint="${measured[i][0].join(' ')}" d="${curve(i ? [centres[i - 1].at(-1), ...c] : c)}"/>`).join('')}
      <clipPath id="in-${id}">${glyphs.map((g) => `<path d="${P[g][0]}"/>`).join('')}</clipPath>
      <g id="${id}-pen" clip-path="url(#in-${id})" stroke="${P[glyphs[0]][1]}" stroke-linecap="round"></g>
      <g id="${id}">${glyphs.map((g) => path_(g)).join('')}</g>`;
};

// Closed eyes at rest: a small smiling arc in place of each open eye
const closed = Object.values(EYES).map(([x, y]) =>
  `<path d="M${x - 8} ${y - 1}Q${x} ${y + 7} ${x + 8} ${y - 1}" stroke="#225AD6" stroke-width="6.4" stroke-linecap="round" fill="none"/>`).join('');
// The sticker's l, each the cord's middle l carried over by its own affine map
const cordL = anchors(P[2][0]);
const stickerLines = STICKER_L.map((g) => lines.cord[2].map(affine(cordL, anchors(P[g][0]))));

const illustration = `
    <svg id="ill" viewBox="0 0 1118 570" fill="none">
      <defs><clipPath id="frame"><rect width="1117.47" height="570"/></clipPath></defs>
      <g clip-path="url(#frame)">
        ${group('panel', PANEL)}
        <g id="cord">${written('cw', CORD, lines.cord)}
        </g>
        ${group('left-body', LEFT_BODY)}
        ${group('right-body', RIGHT_BODY)}
        <g id="eyes-closed">${closed}</g>
        <g id="eyes-open">${Object.keys(EYES).map((i) => `<g class="eye">${path_(+i)}</g>`).join('')}</g>
        ${group('left-hand', LEFT_HAND)}
        ${group('right-hand', RIGHT_HAND)}
        <g id="sticker">
          ${group('pill', PILL)}
          <g class="fall" id="s-h">${path_(LETTERS.h)}</g>
          <g class="fall" id="s-e">${path_(LETTERS.e)}</g>
          ${written('sw', STICKER_L, stickerLines, 3)}
          <g class="fall" id="s-o">${path_(LETTERS.o)}</g>
          <g class="fall" id="s-x">${path_(LETTERS.x)}</g>
        </g>
      </g>
    </svg>`;

const page = ({ id, width, height, scale }) => {
  const w = 1118 * scale, h = 570 * scale;
  return `<!doctype html>
<!-- Generated by media/helllo/build.mjs: edit that file, not this one. -->
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: #F9F7F8; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      #ill { position: absolute; left: ${((width - w) / 2).toFixed(1)}px; top: ${((height - h) / 2).toFixed(1)}px; width: ${w.toFixed(1)}px; height: ${h.toFixed(1)}px; overflow: visible; }
      .line { display: none; }
      #eyes-open, #sticker > g, #cw { opacity: 0; }
      #cw-pen { --cw: 0; }
      #sw-pen { --sw: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="10" data-fps="24" data-width="${width}" data-height="${height}">
      <div id="stage" class="clip" data-start="0" data-duration="10" data-track-index="0" data-layout-allow-overflow>${illustration}
      </div>
    </div>
    <script>
      // The pen of each set of written glyphs (cw: the cord, sw: the lll of the sticker).
      // One CSS variable of the same name on the pen, from 0 to 1, writes the whole set.
      const SETS = {
        cw: { px: 4, step: 0.75, reach: 34, margin: 4 },
        sw: { px: 8, step: 0.25, reach: 9, margin: 1 },
      };
      const NS = 'http://www.w3.org/2000/svg';
      for (const [id, o] of Object.entries(SETS)) {
        // [x, y, arc length, line], and where each l starts (joints)
        const pts = [];
        const joints = [];
        let total = 0;
        [...document.querySelectorAll('.line[data-set="' + id + '"]')].forEach((line, n) => {
          const L = line.getTotalLength();
          for (let a = 0; a <= L; a += o.step) { const q = line.getPointAtLength(a); pts.push([q.x, q.y, total + a, n]); }
          if (n) joints.push(line.dataset.joint.split(' ').map(Number));
          total += L;
        });
        // The glyphs, to measure them
        const g = document.getElementById(id);
        const b = g.getBBox();
        const x0 = b.x - 2, y0 = b.y - 2, W = Math.ceil((b.width + 4) * o.px), H = Math.ceil((b.height + 4) * o.px);
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(o.px, 0, 0, o.px, -x0 * o.px, -y0 * o.px);
        for (const glyph of g.children) ctx.fill(new Path2D(glyph.getAttribute('d')));
        const fill = ctx.getImageData(0, 0, W, H).data;
        const inside = (x, y) => {
          const px = Math.floor((x - x0) * o.px), py = Math.floor((y - y0) * o.px);
          return px >= 0 && py >= 0 && px < W && py < H && fill[4 * (py * W + px) + 3] > 127;
        };
        // Half width of the stroke on each side of the line, at each point: [left, right,
        // normal x, normal y], the smallest one nearby, so where strokes touch it keeps
        // its own width
        const side = pts.map((q, i) => {
          const a = pts[Math.max(0, i - 2)], c = pts[Math.min(pts.length - 1, i + 2)];
          const n = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = (a[1] - c[1]) / n, ny = (c[0] - a[0]) / n;
          let l = 0, r = 0;
          while (l < o.reach && inside(q[0] - nx * l, q[1] - ny * l)) l += 0.25;
          while (r < o.reach && inside(q[0] + nx * r, q[1] + ny * r)) r += 0.25;
          return [l, r, nx, ny];
        });
        const near = Math.round(o.reach * 0.6 / o.step);
        const around = (w, i) => w.slice(Math.max(0, i - near), i + near + 1);
        const nib = [0, 1].map((h) => side.map((_, i) => Math.min(...around(side, i).map((q) => q[h]))));
        // Where one l runs into the next the strokes cross and the measure is wrong: there
        // the stroke arriving keeps the width it had up to the next line, which narrows
        // evenly, across the bottom of the l and up, to the width it has after the crossing
        const joint = (q) => joints.some(([jx, jy]) => Math.hypot(q[0] - jx, q[1] - jy) < o.reach * 2);
        for (let i = 0; i < pts.length; i++) {
          if (!joint(pts[i])) continue;
          let j = i;
          while (j + 1 < pts.length && joint(pts[j + 1])) j++;
          const after = pts[Math.min(pts.length - 1, j + 1)];
          let up = i;
          while (up <= j && pts[up][3] !== after[3]) up++;
          for (const w of nib) {
            const a = w[Math.max(0, i - 1)], c = w[Math.min(pts.length - 1, j + 1)];
            for (let k = i; k <= j; k++) w[k] = k < up ? a : a + (c - a) * (k - up + 1) / (j - up + 2);
          }
          i = j;
        }
        // eased along the line, so the pen does not change size in steps
        const size = nib.map((w) => w.map((_, i) => {
          const span = around(w, i);
          return span.reduce((t, v) => t + v, 0) / span.length;
        }));
        // The pen: from each point to the next, a round stroke centred between the two
        // edges, a little wider than the glyph (the glyphs clip it). It shows once the
        // writing passes its point, fading in over one unit, which softens the tip.
        const at = (i) => {
          const [x, y] = pts[i], [l, r] = [size[0][i], size[1][i]], [, , nx, ny] = side[i];
          return [x + nx * (r - l) / 2, y + ny * (r - l) / 2, (l + r) / 2];
        };
        const penGroup = document.getElementById(id + '-pen');
        const T = (total + o.margin).toFixed(2);
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1, h1] = at(i), [x2, y2, h2] = at(i + 1);
          const seg = document.createElementNS(NS, 'line');
          seg.setAttribute('x1', x1.toFixed(2)); seg.setAttribute('y1', y1.toFixed(2));
          seg.setAttribute('x2', x2.toFixed(2)); seg.setAttribute('y2', y2.toFixed(2));
          seg.setAttribute('stroke-width', (h1 + h2 + 2).toFixed(2));
          seg.style.opacity = 'clamp(0, var(--' + id + ') * ' + T + ' - ' + pts[i][2].toFixed(2) + ', 1)';
          penGroup.appendChild(seg);
        }
      }

      // Ease 55% out, 85% in: cubic-bezier(0.55, 0, 0.15, 1)
      const bezier = (x1, y1, x2, y2) => (t) => {
        const f = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
        let lo = 0, hi = 1, s = t;
        for (let i = 0; i < 24; i++) { if (f(x1, x2, s) < t) lo = s; else hi = s; s = (lo + hi) / 2; }
        return f(y1, y2, s);
      };
      const pen = bezier(0.55, 0, 0.15, 1);
      const FRAME = 1 / 24;

      const tl = gsap.timeline({ paused: true });

      // A set written from 0 to 1, or back
      const write = (id, at, duration, back = false) =>
        tl.fromTo('#' + id + '-pen', { ['--' + id]: back ? 1 : 0 }, { ['--' + id]: back ? 0 : 1, duration, ease: pen, immediateRender: false }, at);

      // 0.3: the phones come up, the people still have their eyes closed
      tl.fromTo('#left-hand', { y: 210, rotation: 14, svgOrigin: '250 570' }, { y: 0, rotation: 0, duration: 0.6, ease: 'power3.out' }, 0.3);
      tl.fromTo('#right-hand', { y: 210, rotation: -14, svgOrigin: '800 570' }, { y: 0, rotation: 0, duration: 0.6, ease: 'power3.out' }, 0.45);

      // 1.0: the lll write themselves from one phone to the other in 1.4 s
      write('cw', 1.0, 1.4);
      // Once written the glyphs take over from the pen, over it
      tl.to('#cw', { opacity: 1, duration: 0.15, ease: 'none' }, 2.4);
      tl.set('#cw-pen', { opacity: 0 }, 2.6);

      // 2.4: the cord is a spring, it swings once and stops; the baseline holds
      const swing = [-8, 4.2, -2.1, 1.1, -0.5, 0];
      swing.forEach((a, i) => tl.to('#cord', { skewX: a, svgOrigin: '560 440', duration: i ? 0.2 : 0.1, ease: i ? 'sine.inOut' : 'sine.out' }, i ? '>' : 2.4));

      // 2.45: it's a match, eyes open
      tl.set('#eyes-closed', { opacity: 0 }, 2.45);
      tl.set('#eyes-open', { opacity: 1 }, 2.45);
      tl.fromTo('#eyes-open .eye', { scaleY: 0, transformOrigin: '50% 50%' }, { scaleY: 1, duration: 3 * FRAME, ease: 'power2.out' }, 2.45);

      // 2.6: È un helllo! The letters fall whole, 30° and 20% higher, in 5 frames
      const fall = (sel, at, turn) => {
        const box = document.querySelector(sel).getBBox();
        tl.set(sel, { opacity: 1 }, at);
        tl.fromTo(sel, { y: -0.2 * box.height, rotation: turn, svgOrigin: (box.x + box.width / 2) + ' ' + (box.y + box.height) },
          { y: 0, rotation: 0, duration: 5 * FRAME, ease: 'power3.in' }, at);
      };
      fall('#pill', 2.6, -30);
      fall('#s-h', 2.8, 30);
      fall('#s-e', 2.9, -30);
      tl.set('#sw-pen', { opacity: 1 }, 3.05);
      write('sw', 3.05, 1.4);
      tl.to('#sw', { opacity: 1, duration: 0.15, ease: 'none' }, 4.45);
      tl.set('#sw-pen', { opacity: 0 }, 4.65);
      fall('#s-o', 4.35, 30);
      fall('#s-x', 4.5, -30);

      // 6.6: a blink
      tl.to('#eyes-open .eye', { scaleY: 0.1, duration: 2 * FRAME, ease: 'power2.in' }, 6.6);
      tl.to('#eyes-open .eye', { scaleY: 1, duration: 3 * FRAME, ease: 'power2.out' }, 6.6 + 2 * FRAME);

      // 8.4: back to rest, so the loop closes on the first frame
      tl.to('#sticker', { opacity: 0, duration: 0.3, ease: 'power1.in' }, 8.4);
      // the cord winds back into the left phone
      tl.set('#cw-pen', { opacity: 1 }, 8.4);
      tl.to('#cw', { opacity: 0, duration: 0.1, ease: 'none' }, 8.4);
      write('cw', 8.5, 0.8, true);
      tl.set('#eyes-open', { opacity: 0 }, 9.0);
      tl.set('#eyes-closed', { opacity: 1 }, 9.0);
      tl.to('#left-hand', { y: 210, rotation: 14, duration: 0.45, ease: 'power2.in' }, 9.15);
      tl.to('#right-hand', { y: 210, rotation: -14, duration: 0.45, ease: 'power2.in' }, 9.25);
      tl.set({}, {}, 10);

      window.__timelines = window.__timelines || {};
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
};

// Hero: the full slot, 1440x864 on the page. Splash: the home card shows only the
// centre 1314x960 of the 2:1 frame, so the illustration stays inside it. Both are drawn
// at twice the size and scaled down when encoded (see media/README.md), for smoother
// edges while the lll are being written.
const X2 = 2;
fs.writeFileSync(path.join(here, 'hero/index.html'), page({ id: 'hero', width: 1920 * X2, height: 1152 * X2, scale: 1.45 * X2 }));
fs.writeFileSync(path.join(here, 'splash/index.html'), page({ id: 'splash', width: 1920 * X2, height: 960 * X2, scale: 1.1 * X2 }));
console.log('hero/index.html, splash/index.html');
