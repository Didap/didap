# Video delle schede prodotto

Sorgenti HyperFrames dei clip in `public/covers/<slug>-*.mp4`: un progetto per clip in
`media/<slug>/<clip>/` (`index.html`, `hyperframes.json`, `assets/`). I render non stanno
qui: si fanno in una cartella temporanea e in `public/covers/` va solo il file codificato.

## Rifare un clip

Dalla cartella del clip, con il plugin HyperFrames di Claude Code (la versione cambia col plugin):

    node "<plugin hyperframes>/skills/hyperframes/scripts/plugin-cli.mjs" check --json
    node "<plugin hyperframes>/skills/hyperframes/scripts/plugin-cli.mjs" render --quality looks --output <tmp>/clip.mp4

Poi la codifica per il sito e il poster:

    ffmpeg -i <tmp>/clip.mp4 -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart public/covers/<slug>-<clip>.mp4
    ffmpeg -ss 6 -i public/covers/<slug>-<clip>.mp4 -frames:v 1 -c:v libwebp public/covers/<slug>-<clip>-poster.webp

Misure degli slot (vedi `app/pages/work/[slug].vue`): hero 1920x1152 (telefono 960x576),
pair 1256x1520, wide 1920x1080 (telefono 810x1012), feature[0] 1696x1520 (telefono 810x1440),
feature[1] 816x1520, triple 822x1080. Clip da 10 a 14 secondi, in loop, senza audio.

Alcuni `index.html` sono generati da script: `media/bin-or-deal/_generators/`,
`media/cruciverba-lab/scripts/`, `media/cityfix/build-hero.mjs` (le strade di Brindisi in
`media/cityfix/osm/roads.json`, dati OpenStreetMap con licenza ODbL),
`media/helllo/build.mjs` (dall'illustrazione esportata dal Figma in `media/helllo/figma/`).

## CityFix: le schermate della landing

La scheda di CityFix mostra la landing (repo `cityfix-landing`): il passo 1 e il passo 3 dal
telefono, il passo 2 e il resoconto dal computer, e i post Instagram della landing nel triple.
Le schermate stanno in una cornice sul blu di CityFix: per il telefono l'iPhone 17 Pro del
mockup `9052-01-iphone-17-pro-mockup.psd`, per il computer una finestra del browser.

- `python media/cityfix/schermate/telefono.py <psd>` ricava la cornice del telefono
  (`telefono.png`, fuori dal repo perché il mockup ha una licenza) e dove sta lo schermo
  (`telefono.json`). Serve `psd-tools[composite]`.
- Con la landing accesa in locale (`npm run dev` in `cityfix-landing`),
  `node media/cityfix/schermate/build.mjs` scrive `cityfix-punto1`, `cityfix-punto3`
  (pair e feature[1]), `cityfix-punto2` (wide) e `cityfix-resoconto` (feature[0]) in WebP.
- I post (`cityfix-post-*.webp`) sono copiati così come sono da `public/social/` della landing.

## CityFix: le illustrazioni (ora fuori dalla scheda)

Prima delle schermate la scheda parlava coi disegni. I pezzi della città (palazzi,
strada, buca, Comune, furgone, persone, pin e icone a pixel dell'app in `pixel-icons.json`)
stanno in `media/cityfix/kit.mjs` e servono sia alle tavole ferme sia ai clip:

- `node media/cityfix/build-illustrazioni.mjs` scrive gli SVG in `public/covers/`:
  `strada` (pair), `passaggi` (feature[1]), `insieme` e `rione` (triple).
- `node media/cityfix/build-clip.mjs [clip]` scrive i progetti HyperFrames `scatta` (pair),
  `giro` (wide, senza versione da telefono), `comuni` (feature[0]) e `riparata` (triple);
  poi check, render e codifica come sopra.

## Da fare (28 ottobre 2026)

- Versioni da telefono mancanti: Bin or Deal `ricerca` (wide), `verdi` (feature[0]) e i tre
  triple. Senza, sul telefono parte il video da desktop.
- CityFix: i dati della mappa dell'hero vengono da OpenStreetMap ma nel clip non c'è il credito.
- CityFix: sul telefono le schermate da computer (wide e feature[0]) restano piccole; MediaSlot
  non ha una versione da telefono per le immagini ferme.
- Bin or Deal: lo stack in pagina viene dal codice (Next.js, Hono, PostgreSQL, Playwright);
  il vecchio corpo markdown dice ancora Clerk, Neon e Upstash.
- Cruciverba Lab: i testi dicono dieci giochi al giorno (il sito ne ha dieci) e che l'account
  gratuito dà solo il gioco di oggi; da confermare con William e Cristiano.
- Helllo: splash della home e hero sono animati con l'illustrazione chiave del Figma del brand e
  le regole di motion delle linee guida (`media/helllo/build.mjs`, a 24 fps). Le composizioni sono
  a misura doppia (3840x2304 e 3840x1920): si renderizzano con `--fps 24` e nella codifica si
  aggiunge `-vf scale=1920:-2:flags=area` (960 per l'hero da telefono), così i bordi delle lll
  mentre si scrivono restano puliti. Gli altri slot della pagina sono ancora immagini ferme.
- Rivedere ogni clip sulla pagina (http://localhost:3000/work/<slug>) prima del merge.
