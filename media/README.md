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

## Gli sfondi della home

La home non usa i video `hero` delle schede: ha i suoi, `public/covers/<slug>-home.mp4`
(1920x1152, 5:3) e `<slug>-home-mobile.mp4` (verticale: composizione 1080x2340, 9:19.5,
codificata a 720x1560 con `-vf scale=720:1560:flags=lanczos`), con i poster
`<slug>-home-poster.webp` e `<slug>-home-mobile-poster.webp`. Non hanno il logo del prodotto:
lo mette il sito sopra il video in SVG (`.screen-logo` in `app/assets/css/main.css`, il file
in `featured` di `app/pages/index.vue`). I video lasciano libere le zone che la home copre:

- desktop (il video copre lo schermo, object-fit cover): la barra in alto (primo 12%), il velo
  con la didascalia in basso (ultimo 40%), l'indice a capsula a destra (x 90-100%, y 30-70%) e
  il logo, centrato a 50% x e 38% y, largo circa il 30%;
- telefono (sotto i 640px parte la versione verticale, che copre lo schermo): in alto lo stato
  del telefono e la barra del browser (primo 6%); il logo centrato a 50% x e 30% y, in un
  riquadro largo il 60% e alto il 16% (y 22-38%); l'ultimo 45% è coperto dalla nuvoletta di
  Didi (HomeDock), da Didi e dalla pillola "Scrivici", e con la chat aperta la nuvoletta sale
  ancora: lì solo fondo calmo. Per i tagli dei telefoni più corti o più lunghi le cose che
  contano stanno fra x 8% e 92% e fra y 8% e 55%.

Se ffmpeg non ha `libwebp` (quello di Homebrew di solito no), il poster si estrae in PNG e si
converte in WebP a parte (cwebp, sharp o Pillow, qualità 75).

I video raccontano come funziona il prodotto, con illustrazioni animate e senza parole da
tradurre (lo stesso video serve la home italiana e inglese): icone, numeri, lettere delle
soluzioni, nomi propri inventati. L'indice a destra, con l'etichetta della voce attiva, occupa
circa x 80-100% dello schermo fra y 28% e 72%: in quella fascia i contenuti stanno entro x 76%
del fotogramma.

- CityFix: il giro di una segnalazione sulla mappa dell'hero. Il cittadino manda foto e
  posizione dal telefono, il segnaposto cade rosso, il Comune affida all'impresa (giallo),
  l'impresa ripara, il segnaposto diventa verde, il contatore sale e il cittadino riceve la
  conferma. `node media/cityfix/build-home.mjs` scrive `home/index.html` e
  `home-mobile/index.html` (mappa girata di 90 gradi e ingrandita x1,13) e legge solo file del
  repo (`pixel-icons.json`, `osm/roads.json`). Colori e ombre della landing; un alone bianco
  largo e sfumato tiene calma la zona del logo (`cityfix-wordmark.svg`). Poster 9,9 s.
- Helllo: le due persone dell'illustrazione chiave ricevono ciascuna la scheda dell'altra,
  tutte e due dicono helllo, c'è il match (bollino lll e cavo rosso fra i telefoni) e la chat si
  apre con le bolle. `node media/helllo/home.mjs` (gemello di `build.mjs`) scrive
  `home/index.html` (3840x2304) e `home-mobile/index.html` (1080x2340). Render a `--fps 24`,
  codifica con `-vf scale=1920:-2:flags=area` (`scale=720:1560:flags=area` per `home-mobile`).
  Logo `helllo-wordmark.svg`, ricavato da `helllo-logo.svg`. Poster 8,3 s.
- Cruciverba Lab: i dieci giochi del giorno come carte, il cruciverba che si scrive e i rulli che
  girano fino a MORSO (spunte), la classifica dove la nostra riga sale al primo posto, il foglio
  del calendario che si strappa e le carte che si girano per il giorno dopo. Dietro, molto
  chiara, la griglia inclinata di -7 gradi come il marchio. `python media/cruciverba-lab/scripts/home.py media/cruciverba-lab/home/index.html 1920 1152`
  (e `home-mobile/index.html 1080 2340`); il font Caprasimo è in `assets/fonts/`. Logo
  `cruciverba-lab-wordmark.svg`. Poster 8,65 s.
- Fanta Rainbow: il giro di un'asta nello stile nuovo dell'app, su fondo nero. La carta del
  calciatore blu con la banda lime, tre telefoni che rilanciano col tasto arcobaleno, il
  countdown che riparte a ogni rilancio, il martello e la carta che vola nella rosa di chi
  vince. Tutto è in `assets/asta.js` e `asta.css`, uguali in `home` e `home-mobile` (se
  cambiano, si copiano nell'altro); `index.html` ha solo la disposizione
  (`window.__astaConfig`). Font Barlow Condensed corsivo (OFL, al posto di Thunder) e Archivo,
  licenze in `assets/fonts/`. Da telefono la carta sta in alto (y 5-19%) sopra il logo e i tre
  telefoni sotto, uno per colonna, da y 40% a y 66% (dal 68% c'è la nuvoletta di Didi). Logo
  `fanta-rainbow-wordmark.svg`, con un alone scuro dal sito. Poster a 0 s, il primo fotogramma.

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
Island) e scrive `media/telefono/telefono.png`, fuori dal repo come la cornice del mockup. Le
misure del telefono stanno in `media/telefono/misure.json`, le leggono tutti e due gli script.

Per ogni clip ci sono due progetti: `<clip>-schermo` (1080x2330, le proporzioni dello schermo,
con barra di stato e indicatore home come `punto1-schermo` di CityFix) e `<clip>-telefono`,
scritto da

    node media/telefono/monta.mjs media/<slug>/<clip>-telefono --slot pair|feature --ombra "<rgba>" --durata <s> [--sfondo "<colore>"] [--fps 24]

Lo schermo si renderizza in `<clip>-telefono/assets/schermo.mp4`, poi il telefono, poi la
codifica come sopra. Lo sfondo è #f4f4f4 come CityFix: Bin or Deal usa `--sfondo "#ebe4d3"`, la
carta del marchio. Helllo è a 24 fps: `--fps 24`, e lo stesso nel render.

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
`match-schermo`: la chat e il colloquio), triple `palette`, `social`, `store`. `profilo-mobile`
si codifica con `-crf 31`: scorre tutto lo schermo e a 28 pesava più del profilo largo.

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
