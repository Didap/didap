// The key illustration of the Helllo brand, read from the Figma export, and the pen that
// writes the lll: shared by build.mjs (hero, splash) and parti.mjs (the other clips of the page).
// Everything here comes out of build.mjs unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const svg = fs.readFileSync(path.join(here, 'figma/illustrazione-chiave.svg'), 'utf8');
export const lines = JSON.parse(fs.readFileSync(path.join(here, 'figma/linee-lll.json'), 'utf8'));

// Every path of the export, in paint order: [d, fill]
export const P = [...svg.matchAll(/<path id="[^"]*" d="([^"]+)" fill="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]);
if (P.length !== 78) throw new Error(`expected 78 paths, found ${P.length}`);

// Indices in the export
export const PANEL = [0];
export const CORD = [4, 1, 2, 3]; // tail from the left phone, then the three l
export const LEFT_HAND = [5, 6, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 39, 40];
export const LEFT_BODY = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20];
export const RIGHT_HAND = [41, 42, 43, 44, 45, 54, 55, 56];
export const RIGHT_BODY = [31, 32, 33, 34, 35, 36, 37, 38, 46, 47, 48, 49, 50, 51, 52, 53, 67, 68, 69, 70, 71, 72, 73, 74, 77];
export const PILL = [65, 66]; // 64 is the pill's own mask
export const LETTERS = { h: 57, e: 58, l1: 59, l2: 60, l3: 61, o: 62, x: 63 };
export const STICKER_L = [LETTERS.l1, LETTERS.l2, LETTERS.l3];
// The four open eyes, with the centre of each one
export const EYES = { 17: [119, 330], 18: [176, 330.5], 75: [979, 326], 76: [918, 326] };

// The three l of the sticker are the l of the cord, smaller and turned: the same outline
// under an affine map. The map comes from the first 20 points of the two outlines, and
// carries the centre line of the cord's middle l onto each of them.
export const anchors = (d) => [...d.matchAll(/[MC]([^A-Za-z]+)/g)].slice(0, 20).map((m) => m[1].match(/-?\d*\.?\d+/g).map(Number).slice(-2));
export const affine = (from, to) => {
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
export const joined = (centres, first) => centres.map((c, i) => c.slice(i ? 3 : first, i < centres.length - 1 ? -3 : undefined));
export const path_ = (i, attrs = '') => `<path d="${P[i][0]}" fill="${P[i][1]}"${attrs}/>`;
export const group = (id, idx) => `<g id="${id}">${idx.map((i) => path_(i)).join('')}</g>`;

// Catmull-Rom through the measured points
export const curve = (pts) => {
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
export const written = (id, glyphs, measured, first = 0) => {
  const centres = joined(measured, first);
  return `
      ${centres.map((c, i) => `<path class="line" data-set="${id}" data-joint="${measured[i][0].join(' ')}" d="${curve(i ? [centres[i - 1].at(-1), ...c] : c)}"/>`).join('')}
      <clipPath id="in-${id}">${glyphs.map((g) => `<path d="${P[g][0]}"/>`).join('')}</clipPath>
      <g id="${id}-pen" clip-path="url(#in-${id})" stroke="${P[glyphs[0]][1]}" stroke-linecap="round"></g>
      <g id="${id}">${glyphs.map((g) => path_(g)).join('')}</g>`;
};

// Closed eyes at rest: a small smiling arc in place of each open eye
export const closed = Object.values(EYES).map(([x, y]) =>
  `<path d="M${x - 8} ${y - 1}Q${x} ${y + 7} ${x + 8} ${y - 1}" stroke="#225AD6" stroke-width="6.4" stroke-linecap="round" fill="none"/>`).join('');
// The sticker's l, each the cord's middle l carried over by its own affine map
export const cordL = anchors(P[2][0]);
export const stickerLines = STICKER_L.map((g) => lines.cord[2].map(affine(cordL, anchors(P[g][0]))));

// The script that lays the pen along each set of written glyphs (see written above). sets:
// { id: { px, step, reach, margin } }, one entry per set in the page.
const PEN = `      const NS = 'http://www.w3.org/2000/svg';
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
      }`;
export const penScript = (sets) => `const SETS = {
${Object.entries(sets).map(([id, o]) => `        ${id}: { px: ${o.px}, step: ${o.step}, reach: ${o.reach}, margin: ${o.margin} },`).join('\n')}
      };
${PEN}`;
