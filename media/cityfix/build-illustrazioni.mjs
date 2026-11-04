// Le tavole ferme della scheda di CityFix, disegnate col kit: un SVG per
// slot in public/covers. I clip animati stanno in build-clip.mjs.
// Run: node media/cityfix/build-illustrazioni.mjs
import fs from 'node:fs'
import { C, at, bell, bench, bin, bubble, building, flip, house, icon, lamp, municipio, patch, person, phone, pin, pothole, statusPixels, street, svgDoc, van } from './kit.mjs'

const out = new URL('../../public/covers/', import.meta.url)

const TAVOLE = {
  // pair[0], 1256x1520: una strada coi suoi problemi, ognuno col suo pin
  // rosso, e chi passa e tira fuori il telefono
  strada: svgDoc(1256, 1520, 'light', `
${at(300, 1110, 1, building({ w: 470, h: 900, cols: 3, rows: 6 }))}
${at(950, 1110, 1, building({ w: 560, h: 720, cols: 4, rows: 4, fill: 'l' }))}
${street(0, 1110, 1256, 100, 310)}
${at(560, 1160, 1, lamp(560))}
${at(860, 1160, 0.95, bench({ broken: true }))}
${at(1110, 1160, 0.9, bin({ full: true }))}
${at(700, 1360, 1, pothole(300))}
${at(260, 1188, 1.2, person({ pose: 'phone', jacket: C.lav }))}
${at(608, 520, 1, pin(C.red, 'bulb'))}
${at(830, 920, 1, pin(C.red, 'building'))}
${at(1110, 905, 1, pin(C.red, 'trash'))}
${at(700, 1300, 1, pin(C.red, 'road'))}
`),

  // feature[1], 816x1520: i quattro stati uno sotto l'altro, ognuno col
  // suo disegno: inviata, presa in carico dal Comune, affidata alla
  // ditta, completata
  passaggi: svgDoc(816, 1520, 'light', `
<line x1="150" y1="300" x2="150" y2="1300" stroke="${C.blue}" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round"/>
${[1, 2, 3, 4].map((n, i) => at(123, 273 + i * 333, 1, `<rect x="-14" y="-14" width="82" height="82" rx="12" fill="#fff" stroke="${C.blue}" stroke-width="6"/>${statusPixels(n, 24, 6, n === 4 ? C.green : C.blue)}`)).join('')}
${at(500, 420, 1, phone({ w: 140, h: 250, screen: `<rect width="120" height="210" rx="14" fill="${C.lav}"/><path d="M0 60 H120 M0 150 H120 M50 0 V210" stroke="#fff" stroke-width="9"/>${at(60, 136, 1, pin(C.red, 'road', 2))}` }))}
${at(500, 775, 0.5, municipio())}
${at(500, 1060, 0.62, van())}
<rect class="l2 o" x="250" y="1250" width="500" height="150" rx="20"/>
<rect x="282" y="1319" width="70" height="12" rx="4" fill="#fff"/><rect x="648" y="1319" width="70" height="12" rx="4" fill="#fff"/>
${at(500, 1325, 1, patch(220))}
${at(500, 1300, 1, pin(C.green, 'check'))}
`),

  // triple[0], 822x1080: tanti per la stessa buca. Una segnalazione
  // sola, chi passa la sostiene invece di rifarla
  insieme: svgDoc(822, 1080, 'light', `
${at(150, 720, 1, building({ w: 300, h: 560, cols: 2, rows: 3, fill: 'l' }))}
${at(560, 720, 1, building({ w: 420, h: 470, cols: 3, rows: 2 }))}
${street(0, 720, 822, 80, 300)}
${at(430, 935, 1, pothole(260))}
${at(120, 790, 0.82, person({ pose: 'phone', jacket: C.white }))}
${at(700, 790, 0.82, flip(person({ pose: 'cheer', jacket: C.lav, hair: C.deep })))}
${at(275, 760, 0.68, person({ pose: 'shoot', jacket: C.lav2 }))}
${at(140, 440, 1, bubble(40, icon('thumbs-up', 40, C.blue)))}
${at(700, 400, 1, bubble(40, icon('thumbs-up', 40, C.blue)))}
${at(300, 470, 0.85, bubble(40, icon('thumbs-up', 40, C.blue)))}
${at(430, 890, 1.15, pin(C.red, 'road'))}
${at(530, 846, 1, `<rect x="-50" y="-34" width="196" height="68" rx="34" fill="#fff" stroke="${C.blue}" stroke-width="6"/>
${[C.blue, C.lav2, C.red, C.lav].map((c, i) => `<circle cx="${-16 + i * 34}" cy="0" r="22" fill="${c}" stroke="#fff" stroke-width="5"/>`).join('')}
<circle cx="120" cy="0" r="16" fill="${C.blue}"/>${at(120, 0, 1, icon('plus', 24))}`)}
`),

  // triple[1], 822x1080: il Comune manda un avviso a un rione solo
  rione: svgDoc(822, 1080, 'blue', `
${at(411, 440, 0.62, municipio())}
${[1, 2, 3].map(i => `<path d="M${411 - 210 - i * 38} ${170 - i * 30} q${-i * 22} ${60 + i * 30} 0 ${120 + i * 60}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="${1 - i * 0.22}"/>
<path d="M${411 + 210 + i * 38} ${170 - i * 30} q${i * 22} ${60 + i * 30} 0 ${120 + i * 60}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="${1 - i * 0.22}"/>`).join('')}
<rect x="170" y="560" width="482" height="420" rx="36" fill="rgba(255,255,255,0.12)" stroke="#fff" stroke-width="5" stroke-dasharray="18 14"/>
<line x1="0" y1="940" x2="822" y2="940" stroke="#fff" stroke-width="6"/>
${at(85, 940, 0.8, house('l2'), '', 'opacity="0.55"')}
${at(737, 940, 0.8, house('l2'), '', 'opacity="0.55"')}
${[260, 411, 562].map((x, i) => at(x, 940, 0.9, house()) + at(x, 680 - (i === 1 ? 30 : 0), 1, bubble(40, bell())) ).join('')}
`),
}

for (const [name, svg] of Object.entries(TAVOLE)) {
  fs.writeFileSync(new URL(`cityfix-${name}.svg`, out), svg)
  console.log(`public/covers/cityfix-${name}.svg`)
}
