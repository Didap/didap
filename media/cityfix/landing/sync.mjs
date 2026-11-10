// Porta qui dalla landing di CityFix (repo cityfix-landing accanto a didap) quello che i
// progetti usano ma che il repo non tiene: font (Dunbar Tall ha una licenza), foto e logo,
// le scene della landing che la versione da telefono di punto2 usa così come sono, e la
// card del resoconto, uguale su computer e telefono (cambiano solo le variabili sul mount).
//   node media/cityfix/landing/sync.mjs
import { cpSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MOTION = process.env.CITYFIX_LANDING
  ? path.join(process.env.CITYFIX_LANDING, 'motion')
  : path.resolve(HERE, '../../../../cityfix-landing/motion')
if (!existsSync(MOTION)) throw new Error(`Non trovo la landing in ${MOTION} (CITYFIX_LANDING)`)

const COPIES = [
  [path.join(MOTION, 'view-cittadino/assets'), 'punto1/assets'],
  [path.join(MOTION, 'view-affido/assets'), 'punto2/assets'],
  [path.join(MOTION, 'view-affido/assets'), 'punto2-mobile/assets'],
  [path.join(MOTION, 'view-affido/compositions'), 'punto2-mobile/compositions'],
  [path.join(MOTION, 'view-chiuso/assets'), 'punto3/assets'],
  [path.join(MOTION, 'mayor-report/assets'), 'resoconto/assets'],
  [path.join(MOTION, 'mayor-report/assets'), 'resoconto-mobile/assets'],
  [path.join(HERE, 'resoconto/compositions'), 'resoconto-mobile/compositions'],
]

for (const [from, to] of COPIES) {
  const dest = path.join(HERE, to)
  rmSync(dest, { recursive: true, force: true })
  cpSync(from, dest, { recursive: true })
  console.log(`media/cityfix/landing/${to}`)
}
