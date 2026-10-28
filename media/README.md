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
`media/cruciverba-lab/scripts/`, `media/cityfix/build-*.mjs` (le strade di Brindisi in
`media/cityfix/osm/roads.json`, dati OpenStreetMap con licenza ODbL).

## Da fare (28 ottobre 2026)

- Versioni da telefono mancanti: Bin or Deal `ricerca` (wide), `verdi` (feature[0]) e i tre
  triple; CityFix `backoffice` (wide). Senza, sul telefono parte il video da desktop.
- CityFix: i dati della mappa vengono da OpenStreetMap ma nei clip non c'è il credito.
- Bin or Deal: lo stack in pagina viene dal codice (Next.js, Hono, PostgreSQL, Playwright);
  il vecchio corpo markdown dice ancora Clerk, Neon e Upstash.
- Cruciverba Lab: i testi dicono dieci giochi al giorno (il sito ne ha dieci) e che l'account
  gratuito dà solo il gioco di oggi; da confermare con William e Cristiano.
- Helllo ha ancora immagini ferme: niente app da cui ricostruire le schermate.
- Rivedere ogni clip sulla pagina (http://localhost:3000/work/<slug>) prima del merge.
