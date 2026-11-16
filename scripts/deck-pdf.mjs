// Rigenera il PDF scaricabile di un deck di slide (es. Safe Mobility Hack).
// Le slide sono frammenti HTML 1920x1080 in app/assets/decks/<deck>/, gli
// stessi che mostra la pagina /hackaton/<deck>: una sola fonte per tutti e due.
//
//   node scripts/deck-pdf.mjs safemobilityhack
//
// Serve Chrome o Edge installato (stampa in headless). Il PDF finisce in
// public/decks/<deck>/<deck>.pdf, una pagina 1920x1080 per slide.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const deck = process.argv[2]
if (!deck) {
  console.error('Uso: node scripts/deck-pdf.mjs <deck>')
  process.exit(1)
}

const root = resolve(import.meta.dirname, '..')
const slidesDir = join(root, 'app/assets/decks', deck)
const publicDir = join(root, 'public')
const out = join(publicDir, 'decks', deck, `${deck}.pdf`)

const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const browser = browsers.find(p => existsSync(p))
if (!browser) {
  console.error('Nessun Chrome/Edge trovato: imposta CHROME_PATH')
  process.exit(1)
}

// Le immagini delle slide puntano a /decks/...: in stampa le leggiamo da public/
const publicUrl = pathToFileURL(publicDir).href
const slides = readdirSync(slidesDir)
  .filter(f => f.endsWith('.html'))
  .sort()
  .map(f => readFileSync(join(slidesDir, f), 'utf8').replaceAll('src="/', `src="${publicUrl}/`))

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700&family=Archivo+Black&display=block">
<style>
  @page { size: 1920px 1080px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fffdf8; }
  section {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    box-sizing: border-box; line-height: normal; break-after: page;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  section:last-child { break-after: auto; }
  section *, section *::before, section *::after { box-sizing: border-box; margin: 0; }
  section img, section svg { display: block; }
  section a { color: inherit; text-decoration: none; }
  section p, section h1, section h2, section h3 { text-wrap: pretty; }
</style>
</head>
<body>
${slides.join('\n')}
</body>
</html>`

const tmp = mkdtempSync(join(tmpdir(), 'deck-pdf-'))
try {
  const page = join(tmp, 'deck.html')
  writeFileSync(page, html)
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--allow-file-access-from-files',
    '--virtual-time-budget=15000',
    `--user-data-dir=${join(tmp, 'profile')}`,
    `--print-to-pdf=${out}`,
    pathToFileURL(page).href,
  ], { stdio: 'inherit' })
  console.log(`${slides.length} slide -> ${out}`)
}
finally {
  rmSync(tmp, { recursive: true, force: true })
}
