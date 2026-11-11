# Video delle schede prodotto

Sorgenti HyperFrames dei clip in `public/covers/<slug>-*.mp4`: un progetto per clip in
`media/<slug>/<clip>/` (`index.html`, `hyperframes.json`, `assets/`). I render non stanno
qui: si fanno in una cartella temporanea e in `public/covers/` va solo il file codificato.

## Rifare un clip

Dalla cartella del clip, con il plugin HyperFrames di Claude Code (la versione cambia col plugin):

    node "<plugin hyperframes>/skills/hyperframes/scripts/plugin-cli.mjs" check --json
    node "<plugin hyperframes>/skills/hyperframes/scripts/plugin-cli.mjs" render --quality looks --output <tmp>/clip.mp4

Poi la codifica per il sito e il poster:

    ffmpeg -i <tmp>/clip.mp4 -an -c:v libx264 -preset slow -crf 28 -g 9999 -pix_fmt yuv420p -movflags +faststart public/covers/<slug>-<clip>.mp4
    ffmpeg -ss 6 -i public/covers/<slug>-<clip>.mp4 -frames:v 1 -c:v libwebp public/covers/<slug>-<clip>-poster.webp

Misure degli slot (vedi `app/pages/work/[slug].vue`): hero 1920x1152 (telefono 960x576),
pair 1256x1520, wide 1920x1080 (telefono 810x1012), feature[0] 1696x1520 (telefono 810x1440),
feature[1] 816x1520, triple 822x1080, event.image 1920x1080. Clip da 10 a 14 secondi, in loop, senza audio: `-g 9999`
tiene un solo fotogramma chiave, quello iniziale, e basta al loop.

Alcuni `index.html` sono generati da script: `media/bin-or-deal/_generators/`,
`media/cruciverba-lab/scripts/`, `media/cityfix/build-hero.mjs` (le strade di Brindisi in
`media/cityfix/osm/roads.json`, dati OpenStreetMap con licenza ODbL),
`media/helllo/build.mjs` (dall'illustrazione esportata dal Figma in `media/helllo/figma/`).

## CityFix: le illustrazioni della landing

La scheda di CityFix usa le illustrazioni animate della landing (repo `cityfix-landing`,
cartella `motion/`), rifatte per gli slot della scheda. I progetti stanno in
`media/cityfix/landing/`:

- `punto1` (pair, 1256x1520) e `punto3` (feature[1], 816x1520): l'iPhone 17 Pro del mockup
  `9052-01-iphone-17-pro-mockup.psd` con dentro lo schermo, che è un progetto a parte alle
  proporzioni dello schermo (1080x2330) con barra di stato e indicatore home:
  `punto1-schermo` è la chat del cittadino, `punto3-schermo` la mappa della città, che continua
  sopra e sotto con quattro segnalazioni in più. `python media/cityfix/landing/telefono.py <psd>`
  ricava la cornice (`telefono.png`, fuori dal repo per la licenza del mockup) e dove sta lo
  schermo (`telefono.json`); serve `psd-tools[composite]`.
- `punto2` (wide, 2160x1215 ridotto a 1920x1080): il comune e l'impresa affiancati, la card
  dell'impresa aspetta finché il comune non affida. `punto2-mobile` (1080x1350 ridotto a
  810x1012): il passaggio dal comune all'impresa come nella landing.
- `resoconto` (feature[0], 1696x1520): i quattro numeri in fila e il grafico più alto.
  `resoconto-mobile` (1080x1920 ridotto a 810x1440): numeri due per due e grafico alto.

Prima del check, `node media/cityfix/landing/sync.mjs` porta nei progetti quello che il repo
non tiene (l'elenco è in testa allo script). Poi check e render come sopra, con due eccezioni:

- gli schermi si renderizzano dentro il loro telefono, prima del telefono:
  `render punto1-schermo --output <repo>/media/cityfix/landing/punto1/assets/schermo.mp4`,
  e lo stesso per `punto3`;
- nella codifica si aggiunge `-vf scale=<slot>:flags=lanczos` per i progetti fatti più grandi
  dello slot.

Il poster si prende quando la storia è chiusa: 7.5 s per `punto1`, 11.5 per `punto2`, 5.6 per
`punto2-mobile`, 4 per `punto3`, 9.5 per i due resoconti. Le altre modifiche delle
illustrazioni nella landing vanno riportate qui a mano. I post (`cityfix-post-*.webp`) vengono
da `public/social/` della landing, ritagliati alla misura del triple (822x1080).

## CityFix: i disegni del kit (ora fuori dalla scheda)

Prima delle illustrazioni della landing la scheda parlava coi disegni del kit: le sorgenti
restano in `media/cityfix/` (`kit.mjs`, `build-illustrazioni.mjs`, `build-clip.mjs`), ma
nessuno slot le usa.

## Da fare (28 ottobre 2026)

- Versioni da telefono mancanti: Bin or Deal `ricerca` (wide), `verdi` (feature[0]) e i tre
  triple. Senza, sul telefono parte il video da desktop.
- CityFix: i dati della mappa dell'hero vengono da OpenStreetMap ma nel clip non c'è il credito.
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
