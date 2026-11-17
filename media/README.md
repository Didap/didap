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
`media/helllo/build.mjs` (dall'illustrazione esportata dal Figma in `media/helllo/figma/`) e
`media/helllo/parti.mjs` (le parti generate degli altri clip di Helllo, vedi sotto).

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

## Il telefono delle schede

Come CityFix, ogni scheda mostra lo schermo dell'app dentro l'iPhone 17 Pro negli slot alti:
pair[1] (1256x1520) e feature[1] (816x1520), telefono alto 1320. La cornice viene dal clip di
CityFix, non dal PSD: `python media/telefono/telefono.py` la ricava da
`public/covers/cityfix-punto1.mp4` (toglie sfondo e ombra, buca lo schermo e lascia la Dynamic
Island) e scrive `media/telefono/telefono.png`, fuori dal repo come la cornice del mockup.

Per ogni clip ci sono due progetti: `<clip>-schermo` (1080x2330, le proporzioni dello schermo,
con barra di stato e indicatore home come `punto1-schermo` di CityFix) e `<clip>-telefono`,
scritto da

    node media/telefono/monta.mjs media/<slug>/<clip>-telefono --slot pair|feature --ombra "<rgba>" --durata <s>

Lo schermo si renderizza in `<clip>-telefono/assets/schermo.mp4`, poi il telefono, poi la
codifica come sopra. `monta.mjs` mette lo sfondo #f4f4f4 di CityFix: i telefoni di Bin or Deal
hanno a mano la carta del marchio (#ebe4d3), da rimettere se si rilancia.

## Bin or Deal

- `verdetto-telefono` (pair, schermo `verdetto-schermo`) e `soglie-telefono` (feature[1],
  schermo `soglie-schermo`): il sito da telefono, una colonna. Ombra rgba(166, 48, 42, 0.30).
  Poster 3.5 s e 5 s.
- `ricerca-mobile` (wide da telefono, 1080x1350 ridotto a 810x1012) e `verdi-mobile`
  (feature[0] da telefono, 1080x1920 ridotto a 810x1440), generati da
  `_generators/gen-ricerca-mobile.mjs` e `gen-verdi-mobile.mjs`. Poster 7.5 s e 4.5 s.
- `verdetto` e `soglie` restano come sorgenti, nessuno slot li usa.

## Cruciverba Lab

- `alveare-telefono` (pair, 13 s) e `ghigliottina-telefono` (feature[1], 12 s): la pagina
  da telefono del sito (misurata a 390 px e scalata x2.769). Gli schermi li scrivono
  `scripts/alveare_schermo.py` e `scripts/ghigliottina_schermo.py` (parti comuni in
  `scripts/schermo.py`):

      python media/cruciverba-lab/scripts/alveare_schermo.py media/cruciverba-lab/alveare-schermo/index.html

  Ombra rgba(233, 63, 41, 0.28). Poster 11.2 s e 10 s.
- `alveare` e `ghigliottina` restano come sorgenti, nessuno slot li usa.

## Fanta Rainbow

- `asta-telefono` (pair, 14 s): il telefono di chi rilancia durante l'asta, dal codice
  dell'app (repo Rainbow). `stagione-telefono` (feature[1], 12 s): la pagina Stagione.
  Poster 7.5 s e 8.8 s.
- Le sorgenti degli altri clip di Fanta Rainbow non sono nel repo.
- Thunder (Rajesh Rajput) è freeware ma non si può ridistribuire: fuori dal repo, si copia da
  `Rainbow/public/fonts/thunder-*.woff2` in `assets/fonts/` dei due schermi. Archivo ha
  licenza OFL ed è nel repo.

## Helllo

Lo splash della home e l'hero sono animati con l'illustrazione chiave del Figma del brand e le
regole di motion delle linee guida (`media/helllo/build.mjs`, a 24 fps). Le composizioni sono a
misura doppia (3840x2304 e 3840x1920): si renderizzano con `--fps 24` e nella codifica si
aggiunge `-vf scale=1920:-2:flags=area` (960 per l'hero da telefono), così i bordi delle lll
mentre si scrivono restano puliti.

Ora tutta la scheda è animata, sempre a 24 fps e con le stesse regole: pair[0] il logo
(`helllo-logo.svg`), pair[1] `scopri-telefono` (lo schermo `scopri-schermo`: Marta passa,
helllo! a Luca, il match), wide `conversazione` e `conversazione-mobile` (1080x1350 ridotto a
810x1012: le due persone si scrivono, i messaggi corrono nel filo), feature[0] `profilo` e
`profilo-mobile` (1080x1920 ridotto a 810x1440), feature[1] `match-telefono` (lo schermo
`match-schermo`: la chat e il colloquio), triple `palette`, `social`, `store`.

Prima del check `node media/helllo/parti.mjs` riscrive i blocchi `helllo:*` degli `index.html`
(marchio, sticker, lll che si scrivono, persone, parti comuni in `media/helllo/parti/`), copia i
font (Hanken Grotesk e Pacifico, licenza OFL in `media/helllo/fonts/`; Poligrapher Grotesk ha
una licenza commerciale e i titoli usano Hanken Grotesk corsivo) e scrive `helllo-logo.svg`. Gli
schermi si renderizzano nel loro telefono prima del telefono, e `store` usa gli stessi due
schermi: si rilancia `parti.mjs` dopo averli renderizzati. Poster: 8.5 s `scopri`, 8 `match`,
9.8 `conversazione`, 10 `conversazione-mobile`, 9.6 i due profili, 3.8 `palette`, 6.5
`social`, 8.5 `store`.

## Da fare

- CityFix: i dati della mappa dell'hero vengono da OpenStreetMap ma nel clip non c'è il credito.
- Bin or Deal: lo stack in pagina viene dal codice (Next.js, Hono, PostgreSQL, Playwright);
  il vecchio corpo markdown dice ancora Clerk, Neon e Upstash.
- Cruciverba Lab: i testi dicono dieci giochi al giorno (il sito ne ha dieci) e che l'account
  gratuito dà solo il gioco di oggi; da confermare con William e Cristiano. Le spiegazioni di
  «I cinque legami» nella Ghigliottina sono scritte da noi (il sito le mostra solo con
  l'account), e «Bella!» per le parole di 6 e 7 lettere è una supposizione.
- Helllo: Marta, i messaggi della chat e gli orari del colloquio sono inventati; la foto del
  progetto di Luca è la sua foto, il Figma aveva un segnaposto.
- Rivedere ogni clip sulla pagina (http://localhost:3000/work/<slug>) prima del merge.
