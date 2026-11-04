// Il kit delle illustrazioni di CityFix: i pezzi della città disegnati
// come una tavola tecnica (tratto blu, fondi bianchi e lavanda, rosso per
// i problemi e verde per i lavori finiti), le icone a pixel dell'app.
// Lo usano build-illustrazioni.mjs per le tavole ferme (SVG in
// public/covers) e per i clip HyperFrames (SVG in linea, animato per id).
// Ogni pezzo è disegnato attorno al suo punto d'appoggio (0,0), di solito
// il centro della base; `at()` lo mette in scena.
import fs from 'node:fs'

const ICONS = JSON.parse(fs.readFileSync(new URL('./pixel-icons.json', import.meta.url), 'utf8'))

export const C = {
  blue: '#2B1CE8',
  deep: '#1C1199',
  lav: '#E7E4FD',
  lav2: '#CFC9FB',
  paper: '#F7F6FF',
  white: '#FFFFFF',
  red: '#EE4B4B',
  green: '#479B3E',
}

// Il tratto non cresce con la scala dei pezzi: tutto ha lo stesso
// spessore, 6 unità della tavola larga `w` (4 per il tratto sottile `t`).
// In vw perché `non-scaling-stroke` misura in pixel dello schermo: così
// segue la tavola quando la pagina la mostra più piccola. Gli arti invece
// scalano (`limb`), sono pieni e non linee
const style = w => `
.o{stroke:${C.blue};stroke-width:calc(600vw / ${w});stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.t{stroke-width:calc(400vw / ${w})}
.w{fill:${C.white}}.l{fill:${C.lav}}.l2{fill:${C.lav2}}.b{fill:${C.blue}}.d{fill:${C.deep}}.r{fill:${C.red}}.g{fill:${C.green}}.n{fill:none}
.limb{fill:none;stroke-linecap:round;stroke-linejoin:round}
`

// In scena: la posizione sul gruppo esterno, l'id (quello che anima
// GSAP) sul gruppo interno, che parte senza trasformazioni
export const at = (x, y, s, inner, id = '', attrs = '') =>
  `<g transform="translate(${x} ${y})${s === 1 ? '' : ` scale(${s})`}"><g${id ? ` id="${id}"` : ''}${attrs ? ` ${attrs}` : ''}>${inner}</g></g>`

export const flip = inner => `<g transform="scale(-1 1)">${inner}</g>`

// Un'icona a pixel dell'app, centrata, larga `size`
export const icon = (name, size, fill = C.white) =>
  `<path d="${ICONS[name]}" transform="translate(${-size / 2} ${-size / 2}) scale(${size / 24})" fill="${fill}" shape-rendering="crispEdges"/>`

// Fondo: chiaro (carta con la griglia lavanda) o blu (griglia bianca),
// come i clip dell'app
export const ground = (w, h, kind) => {
  const dark = kind === 'blue'
  const line = dark ? 'rgba(255,255,255,0.10)' : 'rgba(43,28,232,0.07)'
  return `<rect width="${w}" height="${h}" fill="${dark ? C.blue : C.paper}"/>
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse" x="19" y="19"><path d="M0 0H40M0 0V40" stroke="${line}" stroke-width="2" fill="none"/></pattern>
<rect width="${w}" height="${h}" fill="url(#grid)"/>`
}

export const svgDoc = (w, h, kind, inner, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${attrs ? ` ${attrs}` : ''}><style>${style(w)}</style>${ground(w, h, kind)}${inner}</svg>`

// Il pin della mappa, con la punta in (0,0). `k` è la scala del
// disegno da 24x34 (3 = 72x102)
const PIN = 'M12 1C6.2 1 1.5 5.7 1.5 11.5 1.5 19 12 33 12 33s10.5-14 10.5-21.5C22.5 5.7 17.8 1 12 1z'
export const pin = (fill, name, k = 3) =>
  `<ellipse cx="0" cy="0" rx="${5 * k}" ry="${1.4 * k}" fill="rgba(28,17,153,0.22)"/>
<g transform="translate(${-12 * k} ${-33 * k}) scale(${k})"><path d="${PIN}" fill="${fill}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
<path d="${ICONS[name]}" transform="translate(5.5 5) scale(0.54)" fill="#fff" shape-rendering="crispEdges"/></g>`

// I quattro pixel dello stato, come nell'app: `n` accesi. Largo 2*cell+gap
export const statusPixels = (n, cell = 24, gap = 6, on = C.green, off = C.lav2, ids = '') => {
  const pos = [[0, 0], [1, 0], [1, 1], [0, 1]]
  return pos.map(([cx, cy], i) =>
    `<rect${ids ? ` id="${ids}${i}"` : ''} x="${cx * (cell + gap)}" y="${cy * (cell + gap)}" width="${cell}" height="${cell}" fill="${i < n ? on : off}"/>`).join('')
}

// Un palazzo: base al centro, `cols` x `rows` finestre, il portone
export const building = ({ w = 420, h = 700, cols = 3, rows = 5, fill = 'w' } = {}) => {
  const x0 = -w / 2
  const top = -h
  const gx = w / cols
  const gy = (h - 260) / rows
  const winW = Math.min(gx * 0.42, 64)
  const winH = Math.min(winW * 1.5, gy * 0.62)
  let wins = ''
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x0 + gx * (c + 0.5)
      const y = top + 70 + r * gy
      wins += `<rect class="l o t" x="${cx - winW / 2}" y="${y}" width="${winW}" height="${winH}" rx="4"/>
<line class="o t" x1="${cx}" y1="${y}" x2="${cx}" y2="${y + winH}"/>
<rect class="w o t" x="${cx - winW / 2 - 8}" y="${y + winH}" width="${winW + 16}" height="10" rx="2"/>`
    }
  }
  const doorW = Math.min(110, w * 0.26)
  return `<rect class="${fill} o" x="${x0}" y="${top}" width="${w}" height="${h}"/>
<rect class="w o" x="${x0 - 14}" y="${top - 6}" width="${w + 28}" height="26" rx="3"/>
<line class="o t" x1="${x0}" y1="-200" x2="${x0 + w}" y2="-200"/>
${wins}
<path class="l2 o" d="M${-doorW / 2} 0 V-120 a${doorW / 2} ${doorW / 2} 0 0 1 ${doorW} 0 V0 z"/>
<line class="o t" x1="0" y1="0" x2="0" y2="-${120 + doorW / 2}"/>`
}

// Il Comune: scalinata, colonne, frontone con lo stemma, la bandiera
// (`flagId` per farla sventolare)
export const municipio = ({ flagId = '', windowId = '' } = {}) => {
  const cols = [-150, -75, 0, 75, 150]
  return `<rect class="l2 o" x="-260" y="-24" width="520" height="24"/>
<rect class="l o" x="-240" y="-48" width="480" height="24"/>
<rect class="w o" x="-220" y="-300" width="440" height="252"/>
${cols.map(cx => `<rect class="w o" x="${cx - 18}" y="-262" width="36" height="214"/><rect class="w o" x="${cx - 26}" y="-276" width="52" height="16" rx="2"/>`).join('')}
<path class="l2 o" d="M-38 -48 V-170 a38 38 0 0 1 76 0 V-48 z"/>
<rect class="w o" x="-240" y="-320" width="480" height="24" rx="3"/>
<path class="w o" d="M-250 -320 L0 -440 L250 -320 Z"/>
<circle class="${windowId ? 'w' : 'l'} o" cx="0" cy="-366" r="30"${windowId ? ` id="${windowId}"` : ''}/>
${at(0, -366, 1, icon('landmark', 36, C.blue))}
<rect class="w o" x="-6" y="-560" width="12" height="122"/>
<g${flagId ? ` id="${flagId}"` : ''}><path class="r o t" d="M6 -556 h93 l-14 30 l14 30 h-96 z"/></g>`
}

// Il lampione: acceso col cono di luce, spento con la testa scura
export const lamp = ({ h = 520, on = true, lightId = '', headId = '' } = {}) =>
  `${on ? `<path${lightId ? ` id="${lightId}"` : ''} d="M48 ${-h + 40} L-60 0 H170 Z" fill="${C.lav2}" opacity="0.7"/>` : ''}
<path class="w o" d="M-34 0 h68 l-10 -40 h-48 z"/>
<rect class="w o" x="-9" y="${-h}" width="18" height="${h - 40}"/>
<path class="n o" d="M0 ${-h + 10} C0 ${-h - 40} 40 ${-h - 50} 50 ${-h - 10}"/>
<path${headId ? ` id="${headId}"` : ''} class="${on ? 'w' : 'd'} o" d="M24 ${-h - 10} h52 l12 32 h-76 z"/>`

// La panchina: rotta con lo schienale caduto e una crepa
export const bench = ({ broken = false } = {}) =>
  `<rect class="w o" x="-150" y="-70" width="18" height="70"/><rect class="w o" x="132" y="-70" width="18" height="70"/>
<rect class="l o" x="-170" y="-92" width="340" height="24" rx="6"/>
${broken
    ? `<rect class="l o" x="-170" y="-150" width="190" height="22" rx="6"/>
<g transform="rotate(16 150 -90)"><rect class="l o" x="10" y="-150" width="160" height="22" rx="6"/></g>
<rect class="l o" x="-170" y="-196" width="340" height="22" rx="6"/>
<path class="n o t" d="M-10 -92 l12 10 l-8 8 l10 8"/>`
    : `<rect class="l o" x="-170" y="-150" width="340" height="22" rx="6"/><rect class="l o" x="-170" y="-196" width="340" height="22" rx="6"/>`}
<rect class="w o" x="-150" y="-196" width="16" height="104"/><rect class="w o" x="134" y="-196" width="16" height="104"/>`

// Il cestino, pieno che trabocca
export const bin = ({ full = false } = {}) =>
  `${full ? `<path class="w o" d="M-62 -196 q10 -54 50 -40 q30 -50 66 -4 q30 -10 20 44 z"/>
<rect class="l o" x="-30" y="-232" width="40" height="30" rx="4" transform="rotate(-14 -10 -217)"/>
<path class="l2 o" d="M70 -6 l40 -6 l6 -22 l-40 4 z"/>` : ''}
<path class="w o" d="M-70 -180 h140 l-14 180 h-112 z"/>
<line class="o t" x1="-30" y1="-150" x2="-26" y2="-30"/><line class="o t" x1="0" y1="-150" x2="0" y2="-30"/><line class="o t" x1="30" y1="-150" x2="26" y2="-30"/>
<rect class="b o" x="-82" y="-196" width="164" height="22" rx="6"/>`

export const tree = () =>
  `<rect class="w o" x="-14" y="-200" width="28" height="200"/>
<circle class="l o" cx="-60" cy="-230" r="70"/><circle class="l o" cx="60" cy="-240" r="74"/><circle class="l o" cx="0" cy="-310" r="86"/>
<path class="n o t" d="M0 -120 L-34 -170 M0 -150 L30 -196"/>`

export const cone = () =>
  `<path class="r o" d="M-34 0 L-12 -96 h24 L34 0 z"/>
<path class="w" d="M-24 -40 h48 l-5 -20 h-38 z M-17 -70 h34 l-4 -14 h-26 z"/>
<rect class="w o" x="-44" y="-10" width="88" height="14" rx="3"/>`

// La strada vista di fronte, da `x` per `w`: marciapiede alto `sw`,
// carreggiata alta `rh` con la mezzeria
export const street = (x, y, w, sw = 90, rh = 300) =>
  `<rect class="w o" x="${x - 10}" y="${y}" width="${w + 20}" height="${sw}"/>
${Array.from({ length: Math.floor(w / 120) }, (_, i) => `<line class="o t" x1="${x + 60 + i * 120}" y1="${y}" x2="${x + 60 + i * 120}" y2="${y + sw}" opacity="0.35"/>`).join('')}
<rect class="l2 o" x="${x - 10}" y="${y + sw}" width="${w + 20}" height="${rh}"/>
<rect class="w o" x="${x - 10}" y="${y + sw}" width="${w + 20}" height="14"/>
${Array.from({ length: Math.floor((w + 50) / 200) }, (_, i) => `<rect x="${x + 40 + i * 200}" y="${y + sw + rh / 2}" width="110" height="12" rx="4" fill="#fff"/>`).join('')}`

// La buca, centrata, larga `w`; la toppa d'asfalto nuovo al suo posto
export const pothole = (w = 240) =>
  `<ellipse class="d o" cx="0" cy="0" rx="${w / 2}" ry="${w / 5.5}"/>
<ellipse cx="${w * 0.06}" cy="${w * 0.03}" rx="${w * 0.3}" ry="${w / 12}" fill="${C.blue}"/>
<ellipse cx="${-w * 0.14}" cy="${-w * 0.03}" rx="${w * 0.12}" ry="${w / 40}" fill="${C.lav2}" opacity="0.8"/>
<path class="n o t" d="M${w / 2 - 6} -4 l${w * 0.12} -10 l${w * 0.06} 8 M${-w / 2 + 4} 6 l${-w * 0.1} 12 M${w * 0.1} ${w / 5.5 - 2} l6 ${w * 0.08}"/>`

export const patch = (w = 240) =>
  `<path class="w o" d="M${-w / 2 - 10} ${-w / 8} q${w / 2} ${-w / 14} ${w + 20} 0 l8 ${w / 4} q${-w / 2 - 14} ${w / 12} ${-w - 30} 0 z" stroke-dasharray="14 10"/>
<path d="M${-w / 2 + 14} 0 h${w * 0.3} M${w * 0.05} ${w * 0.05} h${w * 0.32}" stroke="${C.lav2}" stroke-width="6" stroke-linecap="round"/>`

// Il telefono: base al centro, il contenuto dello schermo in coordinate
// dello schermo (0,0 in alto a sinistra, `w-2p` x `h-2p`)
export const phone = ({ w = 120, h = 220, screen = '', fill = 'b', screenId = '' } = {}) => {
  const p = Math.max(6, w * 0.06)
  return `<rect class="${fill} o" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="${w * 0.16}"/>
<g${screenId ? ` id="${screenId}"` : ''} transform="translate(${-w / 2 + p} ${-h + p * 1.6})"><rect class="w" width="${w - 2 * p}" height="${h - p * 3.2}" rx="${w * 0.1}"/>${screen}</g>`
}

// Una persona, di profilo verso destra. `pose`: 'phone' guarda il
// telefono, 'shoot' lo alza per la foto, 'cheer' alza il braccio,
// 'stand' braccia giù, 'shovel' tiene la pala. `hat` il caschetto
// della ditta. `armId` per animare il braccio che lavora: ruota attorno
// alla spalla, va animato con attr transform 'rotate(<gradi> 10 -230)'
export const person = ({ pose = 'stand', jacket = C.white, hat = false, hair = C.blue, armId = '', tool = '' } = {}) => {
  const limb = (d, color = jacket) =>
    `<path class="limb" d="${d}" stroke="${C.blue}" stroke-width="34"/><path class="limb" d="${d}" stroke="${color}" stroke-width="22"/>`
  const phoneAt = (x, y, r = 0) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-15" y="-26" width="30" height="52" rx="6" fill="${C.blue}"/><rect x="-10" y="-20" width="20" height="38" rx="3" fill="${C.lav}"/></g>`
  const back = limb('M-24 -232 L-40 -170 L-34 -118')
  let front = ''
  if (pose === 'phone') front = `${limb('M24 -232 L40 -168 L58 -206')}${phoneAt(62, -214, 20)}<circle class="w o" cx="58" cy="-202" r="12"/>`
  else if (pose === 'shoot') front = `${phoneAt(118, -268, 0)}${limb('M24 -232 L74 -236 L104 -252')}<circle class="w o" cx="106" cy="-254" r="12"/>`
  else if (pose === 'cheer') front = `${limb('M24 -232 L52 -290 L46 -350')}<circle class="w o" cx="46" cy="-356" r="13"/>`
  else if (pose === 'shovel') front = `<g${armId ? ` id="${armId}"` : ''} transform="rotate(0 10 -230)">${tool}${limb('M20 -232 L70 -190 L110 -170')}<circle class="w o" cx="112" cy="-168" r="12"/></g>`
  else front = limb('M24 -232 L36 -170 L32 -118')
  return `<ellipse cx="0" cy="0" rx="62" ry="8" fill="rgba(28,17,153,0.16)"/>
${back}
<rect class="d o" x="-30" y="-140" width="26" height="136" rx="11"/><rect class="d o" x="4" y="-140" width="26" height="136" rx="11"/>
<path class="b o" d="M-36 -2 q-2 -16 18 -16 h8 v18 z M10 -2 v-16 h14 q22 0 24 16 z"/>
<path class="o" fill="${jacket}" d="M-48 -126 L-44 -226 Q-42 -254 -16 -258 L18 -258 Q44 -254 46 -226 L50 -126 Z"/>
<line class="o t" x1="0" y1="-246" x2="0" y2="-130" opacity="0.5"/>
${front}
<circle class="w o" cx="0" cy="-298" r="38"/>
<circle cx="18" cy="-300" r="5" fill="${C.blue}"/>
${hat
    ? `<path class="b o" d="M-44 -306 a44 44 0 0 1 88 0 z"/><rect class="b o" x="-48" y="-310" width="110" height="12" rx="6"/><rect x="-6" y="-346" width="12" height="36" fill="#fff" opacity="0.5"/>`
    : `<path class="o" fill="${hair}" d="M-38 -294 A38 38 0 0 1 32 -318 Q8 -316 -6 -304 Q-18 -298 -22 -280 Q-36 -282 -38 -294 Z"/>`}`
}

// Il furgone della ditta, rivolto a destra, ruote con id per girare
export const van = ({ wheelIds = ['', ''], beaconId = '' } = {}) => {
  const wheel = (cx, id) =>
    `<g transform="translate(${cx} -34)"><g${id ? ` id="${id}"` : ''}><circle class="d o" r="40"/><circle class="w o" r="16"/><path d="M-30 0 H30 M0 -30 V30" stroke="${C.lav2}" stroke-width="5"/><circle class="w o" r="16"/></g></g>`
  return `<ellipse cx="10" cy="4" rx="230" ry="10" fill="rgba(28,17,153,0.16)"/>
<path class="w o" d="M-210 -50 V-230 Q-210 -250 -190 -250 H90 Q110 -250 120 -232 L172 -150 Q200 -140 206 -110 V-50 Q206 -36 192 -36 H-196 Q-210 -36 -210 -50 Z"/>
<path class="l o" d="M100 -228 L148 -150 H96 Q90 -150 90 -158 V-220 Q90 -228 100 -228 Z"/>
<rect class="b" x="-208" y="-120" width="412" height="26"/>
<line class="o t" x1="80" y1="-240" x2="80" y2="-50"/>
<circle class="b o" cx="-60" cy="-180" r="42"/>${at(-60, -180, 1, icon('wrench', 48))}
<rect class="w o" x="-150" y="-268" width="170" height="20" rx="4"/>
<rect${beaconId ? ` id="${beaconId}"` : ''} class="r o" x="-30" y="-290" width="44" height="22" rx="8"/>
${wheel(-130, wheelIds[0])}${wheel(130, wheelIds[1])}`
}

// Una casa bassa, base al centro
export const house = ({ w = 150, h = 130, fill = 'w' } = {}) =>
  `<rect class="${fill} o" x="${-w / 2}" y="${-h}" width="${w}" height="${h}"/>
<path class="l2 o" d="M${-w / 2 - 16} ${-h} L0 ${-h - w * 0.5} L${w / 2 + 16} ${-h} Z"/>
<rect class="l o t" x="${-w / 2 + 18}" y="${-h + 26}" width="${w * 0.26}" height="${w * 0.26}" rx="3"/>
<rect class="l2 o t" x="${w / 2 - 18 - w * 0.24}" y="${-h * 0.62}" width="${w * 0.24}" height="${h * 0.62}"/>`

// La campanella degli avvisi, centrata
export const bell = (fill = C.blue) =>
  `<path d="M-15 8 V-4 a15 15 0 0 1 30 0 V8 l5 6 h-40 z" fill="${fill}"/><circle cx="0" cy="18" r="5" fill="${fill}"/><rect x="-3" y="-24" width="6" height="7" rx="2" fill="${fill}"/>`

// Un fumetto tondo con la punta in basso, centrato sul tondo
export const bubble = (r = 44, inner = '', fill = 'w') =>
  `<path class="${fill} o" d="M${-r * 0.3} ${r * 0.92} L0 ${r * 1.4} L${r * 0.3} ${r * 0.92} A${r} ${r} 0 1 0 ${-r * 0.3} ${r * 0.92} Z"/>${inner}`
