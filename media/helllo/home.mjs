// Scrive home/index.html e home-mobile/index.html: lo sfondo della schermata di Helllo
// nella home del sito. Gemello di build.mjs (che resta com'è per hero e splash).
// Racconta come funziona, senza parole da tradurre: le due persone dell'illustrazione chiave
// (chi cerca lavoro a sinistra, chi assume a destra) ricevono ciascuna la scheda dell'altra
// sul telefono, tutte e due dicono helllo, è un match (il cavo rosso le unisce sotto il
// marchio) e la chat si apre subito con le bolle. Il marchio non c'è: lo mette il sito in
// SVG (`.screen-logo` in app/assets/css/main.css), al centro, dove il video resta vuoto.
// Esegui: node media/helllo/home.mjs
//
// Zone della home (vedi media/README.md):
// - desktop 1920x1152, object-fit cover: barra nel primo 12% in alto, velo nell'ultimo
//   40%, indice a capsula a destra (x 90-100%, y 30-70%), marchio centrato a y 38% e largo
//   circa il 30%. Le schede stanno in alto ai lati del marchio, le persone sotto le loro
//   schede, il cavo passa sotto il marchio.
// - telefono 1080x2340 (9:19.5) a tutto schermo, object-fit cover: barra del browser nel
//   primo 6%, marchio centrato a y 30% nel riquadro x 20-80%, y 22-38%, nell'ultimo 45%
//   la nuvoletta di Didi. Contenuti fra x 8-92% e y 8-55%: le schede sopra il marchio, le
//   persone fianco a fianco sotto, i corpi sfumano nel fondo.
//
// Il giro (10 s a 24 fps, in loop):
//   0.35 le schede arrivano ai telefoni (il telefono vibra)
//   1.5  chi cerca dice helllo (un cuore sulla scheda), 2.6 chi assume dice helllo
//   3.3  match: il bollino lll sulle due schede, il cavo si disegna, sorrisi
//   4.4  la chat si apre: quattro bolle, l'ultima un cuore; ogni messaggio fa vibrare
//        il telefono di chi lo riceve
//   8.9  le schede tornano nei telefoni e il cavo sparisce: dal 9.4 tutto è come al primo
//        fotogramma, e le persone (che respirano e dondolano piano) sono di nuovo ferme.
// Il desktop è a misura doppia come le altre di Helllo, il telefono a 1.5 volte: render a
// 24 fps e nella codifica `-vf scale=1920:-2:flags=area` (`scale=720:1560:flags=area` per
// il telefono).
import fs from 'node:fs';
import path from 'node:path';
import { here, P, LEFT_HAND, LEFT_BODY, RIGHT_HAND, RIGHT_BODY, EYES, STICKER_L, WORDMARK, WORDMARK_VB, TURN, group, closedEye, path_ } from './disegno.mjs';

const BG = P[0][1]; // il colore del pannello dell'illustrazione, a tutto fotogramma
const BLUE = '#225AD6';
const RED = '#E93D29';
const PAPER = '#F9F7F8';

// Gli occhi di ciascuno (nell'export: 17, 18 a sinistra, 75, 76 a destra)
const eyeIdx = (who) => Object.keys(EYES).map(Number).filter((i) => (who === 'l' ? i < 70 : i > 70));
const eyes = (who) => `<g id="${who}-closed">${eyeIdx(who).map((i) => closedEye(EYES[i])).join('')}</g>
          <g id="${who}-open">${eyeIdx(who).map((i) => `<g class="eye">${path_(i)}</g>`).join('')}</g>`;

// Le lineette del telefono che vibra, sopra il telefono e verso l'esterno
const BUZZ = {
  l: [[[286, 378], [270, 360]], [[300, 371], [296, 348]]],
  r: [[[790, 378], [806, 360]], [[776, 371], [780, 348]]],
};
const buzzLines = (who) => `<g id="${who}-buzz" stroke="${BLUE}" stroke-width="6.4" stroke-linecap="round" fill="none">${BUZZ[who]
  .map(([[x1, y1], [x2, y2]]) => `<path d="M${x1} ${y1}L${x2} ${y2}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`)
  .join('')}</g>`;

// Una persona: corpo, occhi, mano col telefono. Il gruppo esterno la mette in scena (fisso),
// quello interno si muove; la maschera sfuma il fondo del disegno.
const person = (who, [tx, ty], s) => `
        <g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s})" mask="url(#fade)">
          <g id="${who}">
            ${group(who + '-body', who === 'l' ? LEFT_BODY : RIGHT_BODY)}
            ${eyes(who)}
            <g id="${who}-hand">${(who === 'l' ? LEFT_HAND : RIGHT_HAND).map((i) => path_(i)).join('')}${buzzLines(who)}</g>
          </g>
        </g>`;

// Il ritratto di una persona (testa e spalle, occhi aperti) in un cerchio della scheda
const HEAD = { l: [160, 300, 0.42], r: [960, 300, 0.4] };
const portrait = (id, who, cx, cy, r) => {
  const [hx, hy, k] = HEAD[who];
  const z = (k * r) / 62;
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="#DCE4F7"/>
            <g clip-path="url(#${id})"><g transform="translate(${cx} ${cy + r * 0.13}) scale(${z.toFixed(3)}) translate(${-hx} ${-hy})">${(who === 'l' ? LEFT_BODY : RIGHT_BODY).map((i) => path_(i)).join('')}${eyeIdx(who).map((i) => path_(i)).join('')}</g></g>`;
};

// Il marchio (solo il nome del prodotto) e le lll del bollino del match
const wordmark = (x, y, w, fill) => `<svg x="${x}" y="${y}" width="${w}" height="${(w * WORDMARK_VB[3] / WORDMARK_VB[2]).toFixed(1)}" viewBox="${WORDMARK_VB.join(' ')}" fill="${fill}" overflow="visible"><g transform="${TURN}">${WORDMARK.map((i) => `<path d="${P[i][0]}"/>`).join('')}</g></svg>`;
const lllmark = (x, y, w, fill) => `<svg x="${x}" y="${y}" width="${w}" height="${(w * 116 / 128).toFixed(1)}" viewBox="116 30 128 116" fill="${fill}" overflow="visible"><g transform="${TURN}">${STICKER_L.map((i) => `<path d="${P[i][0]}"/>`).join('')}</g></svg>`;
const heart = (cx, cy, k, fill) => `<path transform="translate(${cx} ${cy}) scale(${k})" d="M0 -4C-3 -11 -15 -10 -15 -1C-15 6 -6 11 0 16C6 11 15 6 15 -1C15 -10 3 -11 0 -4Z" fill="${fill}"/>`;

// La scheda sul telefono di `who` (l: chi cerca, vede chi assume; r: il contrario).
// Misure in unità della scheda, 420x240. Strati: il profilo (ritratto, righe senza testo,
// competenze, rifiuta e helllo), il cuore di chi ha detto helllo, il bollino del match, la chat.
const MESSAGES = [
  { from: 'l', w: 210 },
  { from: 'r', w: 170 },
  { from: 'l', w: 140 },
  { from: 'r', w: 76, heart: true },
];
const card = (who, [x, y], cs, tailX) => {
  const id = 'c' + who, other = who === 'l' ? 'r' : 'l';
  const bubble = (m, i) => {
    const out = m.from === who, by = 86 + i * 38, bx = out ? 400 - m.w : 20;
    const inner = m.heart
      ? heart(bx + m.w / 2, by + 16, 0.78, RED)
      : `<rect x="${bx + 16}" y="${by + 11}" width="${m.w - 32}" height="10" rx="5" fill="${out ? '#FFFFFF' : '#9DB0DD'}" opacity="${out ? 0.75 : 1}"/>`;
    return `<g id="${id}-m${i}" class="msg" data-out="${out ? 1 : 0}"><rect x="${bx}" y="${by}" width="${m.w}" height="32" rx="16" fill="${out ? BLUE : '#E6ECFA'}"/>${inner}</g>`;
  };
  return `
        <g transform="translate(${x} ${y}) scale(${cs})">
          <g id="${id}" class="card">
            <rect x="0" y="10" width="420" height="240" rx="34" fill="${BLUE}" opacity="0.1"/>
            <path d="M${tailX - 20} 230L${tailX} 262L${tailX + 20} 230Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="6" stroke-linejoin="round"/>
            <rect width="420" height="240" rx="34" fill="#FFFFFF"/>
            <g id="${id}-prof">
              ${portrait(id + '-av', other, 96, 96, 62)}
              <rect x="182" y="46" width="150" height="22" rx="11" fill="${BLUE}"/>
              <rect x="182" y="84" width="200" height="12" rx="6" fill="#CBD5EC"/>
              <rect x="182" y="106" width="150" height="12" rx="6" fill="#CBD5EC"/>
              <rect x="182" y="132" width="64" height="24" rx="12" fill="#E3E9F8"/>
              <rect x="252" y="132" width="56" height="24" rx="12" fill="#E3E9F8"/>
              <rect x="314" y="132" width="70" height="24" rx="12" fill="#E3E9F8"/>
              <g stroke="${BLUE}" stroke-width="4" stroke-linecap="round" fill="none"><circle cx="96" cy="200" r="22"/><path d="M89 193L103 207M103 193L89 207"/></g>
              <g id="${id}-btn"><rect x="182" y="176" width="206" height="48" rx="24" fill="${RED}"/>${wordmark(237, 182.5, 96, PAPER)}</g>
            </g>
            <g id="${id}-like"><circle cx="142" cy="50" r="22" fill="#FFFFFF"/>${heart(142, 49, 0.95, RED)}</g>
            <g id="${id}-match">
              <g id="${id}-burst">${[[110, 160, 0.7], [312, 156, 0.6], [338, 74, 0.8]].map(([hx, hy, k]) => `<g class="b">${heart(hx, hy, k, RED)}</g>`).join('')}</g>
              <g id="${id}-badge"><circle cx="210" cy="124" r="64" fill="${RED}"/>${lllmark(166, 84, 88, PAPER)}</g>
            </g>
            <g id="${id}-chat">
              ${portrait(id + '-av2', other, 46, 40, 24)}
              <rect x="84" y="30" width="120" height="18" rx="9" fill="${BLUE}"/>
              <circle cx="378" cy="40" r="20" fill="${RED}"/>${lllmark(364, 27, 28, PAPER)}
              <path d="M20 74H400" stroke="#E6EAF4" stroke-width="2"/>
              ${MESSAGES.map(bubble).join('')}
            </g>
          </g>
        </g>`;
};

// Dove stanno le persone: bordo interno dei due telefoni (x 349 a sinistra, 737 a destra
// nell'export) e cima dei telefoni (y 385), in pixel del fotogramma
const PHONE_C = { l: [310, 427], r: [765, 420] }; // centro di ciascun telefono, nell'export
const layout = ({ s, xL, xR, yTop }) => {
  const at = { l: [xL - 349 * s, yTop - 385 * s], r: [xR - 737 * s, yTop - 385 * s] };
  const phone = (w) => [at[w][0] + PHONE_C[w][0] * s, at[w][1] + PHONE_C[w][1] * s];
  return { at, phone };
};

const page = ({ id, W, H, X, s, xL, xR, yTop, fade, cards, cable }) => {
  const { at, phone } = layout({ s, xL, xR, yTop });
  const [A, B] = [phone('l'), phone('r')];
  const tail = (w) => Math.round(Math.min(360, Math.max(60, (phone(w)[0] - cards[w][0]) / cards.cs)));
  const cord = `M${A[0].toFixed(1)} ${A[1].toFixed(1)}C${(A[0] + (B[0] - A[0]) * 0.3).toFixed(1)} ${(A[1] + cable).toFixed(1)} ${(B[0] - (B[0] - A[0]) * 0.3).toFixed(1)} ${(B[1] + cable).toFixed(1)} ${B[0].toFixed(1)} ${B[1].toFixed(1)}`;
  return `<!doctype html>
<!-- Generato da media/helllo/home.mjs: modifica quello, non questo file. -->
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W * X}, height=${H * X}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W * X}px; height: ${H * X}px; overflow: hidden; background: ${BG}; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: ${BG}; }
      #scene { position: absolute; left: 0; top: 0; width: ${W * X}px; height: ${H * X}px; }
      #l-closed, #r-closed, #cord, .card, #cl-like, #cr-like, #cl-match, #cr-match, #cl-chat, #cr-chat, .msg { opacity: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="10" data-fps="24" data-width="${W * X}" data-height="${H * X}">
      <div id="stage" class="clip" data-start="0" data-duration="10" data-track-index="0" data-layout-allow-overflow>
        <svg id="scene" viewBox="0 0 ${W} ${H}" fill="none">
          <defs>
            <!-- In unità dell'export: pieno fino a ${fade[0]}, trasparente a ${fade[1]} -->
            <linearGradient id="fade-g" gradientUnits="userSpaceOnUse" x1="0" y1="${fade[0]}" x2="0" y2="${fade[1]}">
              <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
            <mask id="fade" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1600" height="1000">
              <rect x="-200" y="-200" width="1600" height="1000" fill="url(#fade-g)"/>
            </mask>
          </defs>
          <!-- Il cavo del match, da un telefono all'altro sotto il marchio: le punte stanno sotto i telefoni -->
          <path id="cord" d="${cord}" stroke="${RED}" stroke-width="${(11 * s).toFixed(1)}" stroke-linecap="round" fill="none" pathLength="1" stroke-dasharray="1 1.2" stroke-dashoffset="1.1"/>${person('l', at.l, s)}${person('r', at.r, s)}${card('l', cards.l, cards.cs, tail('l'))}${card('r', cards.r, cards.cs, tail('r'))}
        </svg>
      </div>
    </div>
    <script>
      const FRAME = 1 / 24;
      const tl = gsap.timeline({ paused: true });
      // Ease 55% out, 85% in (linee guida del brand, 20): il cavo si scrive come le lll
      const bezier = (x1, y1, x2, y2) => (t) => {
        const f = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
        let lo = 0, hi = 1, s = t;
        for (let i = 0; i < 24; i++) { if (f(x1, x2, s) < t) lo = s; else hi = s; s = (lo + hi) / 2; }
        return f(y1, y2, s);
      };
      const pen = bezier(0.55, 0, 0.15, 1);

      // Respiro e dondolio: da fermo a un estremo e ritorno, un numero pari di mezzi periodi
      // in 10 s, così al decimo secondo ogni persona è di nuovo ferma dove era
      const sway = (sel, half, vars) =>
        tl.to(sel, { ...vars, duration: half, ease: 'sine.inOut', yoyo: true, repeat: Math.round(10 / half) - 1 }, 0);
      sway('#l', 2.5, { rotation: -1.6, y: -5, transformOrigin: '50% 100%' });
      sway('#r', 10 / 6, { rotation: 1.4, y: -4, transformOrigin: '50% 100%' });
      tl.set('#l-hand', { transformOrigin: '20% 100%' }, 0);
      tl.set('#r-hand', { transformOrigin: '80% 100%' }, 0);

      // Il telefono vibra (arriva qualcosa): tre scatti e due lineette che si disegnano
      const buzz = (who, at) => {
        const sign = who === 'l' ? 1 : -1;
        [3, -3, 2.5, -2, 0].forEach((a, i) => tl.to('#' + who + '-hand', { rotation: sign * a, duration: 2 * FRAME, ease: 'sine.inOut' }, at + i * 2 * FRAME));
        tl.fromTo('#' + who + '-buzz path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 4 * FRAME, ease: 'power2.out', stagger: FRAME, immediateRender: false }, at);
        tl.to('#' + who + '-buzz path', { strokeDashoffset: -1, duration: 5 * FRAME, ease: 'power2.in', stagger: FRAME }, at + 0.5);
      };
      // Un tocco sullo schermo: il telefono scende un poco e torna
      const tap = (who, at) => {
        tl.to('#' + who + '-hand', { y: 7, duration: 2 * FRAME, ease: 'power2.in' }, at);
        tl.to('#' + who + '-hand', { y: 0, duration: 4 * FRAME, ease: 'power2.out' }, at + 2 * FRAME);
      };
      // Sorriso a occhi chiusi
      const smile = (who, from, to) => {
        tl.set('#' + who + '-open', { opacity: 0 }, from);
        tl.set('#' + who + '-closed', { opacity: 1 }, from);
        tl.set('#' + who + '-closed', { opacity: 0 }, to);
        tl.set('#' + who + '-open', { opacity: 1 }, to);
      };
      const blink = (who, at) => {
        tl.to('#' + who + '-open .eye', { scaleY: 0.1, transformOrigin: '50% 50%', duration: 2 * FRAME, ease: 'power2.in' }, at);
        tl.to('#' + who + '-open .eye', { scaleY: 1, transformOrigin: '50% 50%', duration: 3 * FRAME, ease: 'power2.out' }, at + 2 * FRAME);
      };

      // 1. Le schede arrivano: escono dal basso, verso il loro telefono
      const arrive = (who, at) => {
        tl.fromTo('#c' + who, { opacity: 0, y: 30, scale: 0.9, transformOrigin: '50% 100%' }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }, at);
        buzz(who, at);
      };
      arrive('l', 0.35);
      arrive('r', 0.55);

      // 2. Helllo: il pulsante si preme, il cuore si posa sul ritratto, il pulsante si spegne
      const hello = (who, at) => {
        const c = '#c' + who;
        tap(who, at);
        tl.to(c + '-btn', { scale: 0.92, transformOrigin: '50% 50%', duration: 2 * FRAME, ease: 'power2.in' }, at);
        tl.to(c + '-btn', { scale: 1, duration: 4 * FRAME, ease: 'power2.out' }, at + 2 * FRAME);
        tl.fromTo(c + '-like', { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 6 * FRAME, ease: 'back.out(2)', immediateRender: false }, at + 0.1);
        tl.to(c + '-btn', { opacity: 0.35, duration: 0.3, ease: 'power1.out' }, at + 0.35);
      };
      hello('l', 1.5);
      smile('l', 1.6, 2.3);
      hello('r', 2.6);
      smile('r', 2.7, 4.4);

      // 3. Match: il bollino lll sulle due schede, tre cuori, il cavo si disegna
      const match = (who, at) => {
        const c = '#c' + who;
        tl.to(c + '-prof', { opacity: 0.12, duration: 0.2, ease: 'power1.out' }, at);
        tl.to(c + '-like', { opacity: 0, duration: 0.2, ease: 'power1.out' }, at);
        tl.set(c + '-match', { opacity: 1 }, at);
        tl.fromTo(c + '-badge', { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 8 * FRAME, ease: 'back.out(1.8)', immediateRender: false }, at);
        tl.fromTo(c + '-burst .b', { opacity: 0, y: 10 }, { opacity: 1, y: -16, duration: 0.35, ease: 'power2.out', stagger: 2 * FRAME, immediateRender: false }, at + 0.1);
        tl.to(c + '-burst .b', { opacity: 0, y: -34, duration: 0.35, ease: 'power1.in', stagger: 2 * FRAME }, at + 0.55);
        buzz(who, at);
      };
      match('l', 3.3);
      match('r', 3.3);
      smile('l', 3.4, 4.4);
      tl.set('#cord', { opacity: 1 }, 3.3);
      tl.to('#cord', { strokeDashoffset: 0, duration: 0.8, ease: pen }, 3.3);

      // 4. La chat si apre subito: le bolle arrivano a chi scrive e a chi riceve
      ['l', 'r'].forEach((w) => {
        const c = '#c' + w;
        tl.to([c + '-prof', c + '-match'], { opacity: 0, duration: 0.25, ease: 'power1.in' }, 4.4);
        tl.to(c + '-chat', { opacity: 1, duration: 0.25, ease: 'power1.out' }, 4.55);
      });
      const send = (i, from, at) => {
        const to = from === 'l' ? 'r' : 'l';
        tap(from, at - 0.1);
        [[from, at], [to, at + 0.15]].forEach(([w, t]) => {
          const m = '#c' + w + '-m' + i, out = w === from;
          tl.fromTo(m, { opacity: 0, scale: 0.6, transformOrigin: out ? '100% 100%' : '0% 100%' }, { opacity: 1, scale: 1, duration: 6 * FRAME, ease: 'power3.out', immediateRender: false }, t);
        });
        buzz(to, at + 0.15);
      };
      send(0, 'l', 4.9);
      smile('r', 5.1, 5.6);
      send(1, 'r', 5.9);
      smile('l', 6.1, 6.6);
      send(2, 'l', 6.9);
      smile('r', 7.1, 7.5);
      send(3, 'r', 7.8);
      smile('l', 8.0, 8.7);

      // 5. Le schede tornano nei telefoni, il cavo sparisce; poi, a schede nascoste, tutto
      // torna com'era al primo fotogramma
      ['l', 'r'].forEach((w, k) => {
        tl.to('#c' + w, { opacity: 0, y: 24, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 8.9 + k * 0.1);
      });
      tl.to('#cord', { opacity: 0, duration: 0.4, ease: 'power1.in' }, 8.95);
      tl.set('#cord', { strokeDashoffset: 1.1 }, 9.45);
      ['l', 'r'].forEach((w) => {
        const c = '#c' + w;
        tl.set([c + '-chat', c + '-match', c + '-like', c + ' .msg'], { opacity: 0 }, 9.45);
        tl.set(c + '-prof', { opacity: 1 }, 9.45);
        tl.set(c + '-btn', { opacity: 1 }, 9.45);
      });

      blink('r', 1.2);
      blink('l', 5.3);
      blink('r', 8.3);
      blink('l', 9.2);
      tl.set({}, {}, 10);

      window.__timelines = window.__timelines || {};
      window.__timelines['${id}'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
};

// Desktop: persone a 1.0 volte l'export, telefoni con il bordo interno a x 31% e 69%, teste da
// y 34%, telefoni fino a y 60%; schede a 0.95 (399x228) in alto, x 12-33% e 67-88%,
// y 13-33%; il cavo scende di 50 px sotto i telefoni, sotto il marchio e sopra il velo.
// Telefono: persone a 1.0, dal bordo sinistro all'8% al destro al 92%, i telefoni finiscono
// a y 55%; schede a 1.05 (441x252) sopra il marchio, y 8.5-19.3%.
const HOME = { id: 'home', W: 1920, H: 1152, X: 2, s: 1.0, xL: 600, xR: 1320, yTop: 603, fade: [480, 540], cable: 50, cards: { cs: 0.95, l: [232, 150], r: [1289, 150] } };
const MOBILE = { id: 'home-mobile', W: 1080, H: 2340, X: 1, s: 1.0, xL: 437, xR: 627, yTop: 1204, fade: [480, 540], cable: 40, cards: { cs: 1.05, l: [86, 200], r: [553, 200] } };
for (const p of [HOME, MOBILE]) {
  fs.writeFileSync(path.join(here, p.id, 'index.html'), page(p));
}
console.log('home/index.html, home-mobile/index.html');
