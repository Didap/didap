// Porta nei progetti quello che usano ma che il repo non tiene (media/README.md):
// - dalla landing di CityFix (repo cityfix-landing accanto a didap): font (Dunbar Tall ha una
//   licenza), foto e logo, e le scene che la versione da telefono di punto2 usa così come sono;
// - da qui: la card del resoconto per resoconto-mobile (cambiano solo le variabili sul mount) e
//   la cornice del telefono, telefono.png, che telefono.py ricava dal mockup con licenza.
//   node media/cityfix/landing/sync.mjs
import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MOTION = process.env.CITYFIX_LANDING
  ? path.join(process.env.CITYFIX_LANDING, 'motion')
  : path.resolve(HERE, '../../../../cityfix-landing/motion')
if (!existsSync(MOTION)) throw new Error(`Non trovo la landing in ${MOTION} (CITYFIX_LANDING)`)
const FRAME = path.join(HERE, 'telefono.png')
if (!existsSync(FRAME)) throw new Error('Manca telefono.png: prima python media/cityfix/landing/telefono.py <psd>')

// [sorgente, ...destinazioni nei progetti]
const COPIES = [
  [path.join(MOTION, 'view-cittadino/assets'), 'punto1-schermo/assets'],
  [path.join(MOTION, 'view-affido/assets'), 'punto2/assets', 'punto2-mobile/assets'],
  [path.join(MOTION, 'view-affido/compositions'), 'punto2-mobile/compositions'],
  [path.join(MOTION, 'view-chiuso/assets'), 'punto3-schermo/assets'],
  [path.join(MOTION, 'mayor-report/assets'), 'resoconto/assets', 'resoconto-mobile/assets'],
  [path.join(HERE, 'resoconto/compositions'), 'resoconto-mobile/compositions'],
  [FRAME, 'punto1/assets/telefono.png', 'punto3/assets/telefono.png'],
]

for (const [from, ...dests] of COPIES) {
  for (const to of dests) {
    const dest = path.join(HERE, to)
    rmSync(dest, { recursive: true, force: true })
    cpSync(from, dest, { recursive: true })
    console.log(`media/cityfix/landing/${to}`)
  }
}
