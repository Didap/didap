# Midjourney — Prompt per il sito Didap

Tutti i prompt sono **già completi**: copia il blocco intero e incolla in Midjourney.
Lo stile è coerente in tutto il documento — basta non cambiare le frasi tra `[ ]`
finché non sai cosa stai facendo.

**Palette del sito (definita in [main.css](app/assets/css/main.css)):**
`paper #f4ecdb` · `ink #1a1614` · `accent #b8423b` · `gold #c8a14a`

---

## 0 · Brief (incollalo solo la prima volta in chat con MJ)

> Stiamo costruendo le immagini per **Didap**, studio creativo digitale italiano.
> Landing aziendale bilingue (IT/EN) realizzata in Nuxt. Stile visivo: animazione
> cartoon americana **1928–1935**, era *Steamboat Willie* / primi Mickey /
> Fleischer Studios / Cuphead. Palette del sito: paper #f4ecdb (avorio caldo),
> ink #1a1614 (nero seppia), accent #b8423b (rosso vermiglio spento),
> gold #c8a14a. Le illustrazioni devono integrarsi su sfondo *paper*, quindi mai
> retini bianco-puro né bordi neri rigidi: preferire *off-black inchiostrato* e
> texture vissuta.

---

## 1 · Hero della landing

**Uso:** banner in alto su `pages/index.vue`. C'è un titolo grosso che si
sovrappone, quindi serve **spazio negativo a destra**.
**Export:** 2400×1028 jpg → `public/hero.jpg`

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs, bouncy expressive poses, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, heavy film grain, archival celluloid feel circa 1930, Fleischer Studios meets early Walt Disney, Cuphead reference, slightly off-register printing, a wide cinematic scene of a vintage city skyline at dawn with art deco buildings, a small smiling character holding a paintbrush like a baton, swirling ink ribbons forming abstract shapes in the sky, generous negative space on the right side for headline text overlay, vignetted edges, no text rendered --ar 21:9 --style raw --v 7
```

---

## 2 · Cover progetto (formato card)

**Uso:** copertina di ogni progetto in `content/work/` e `content/clients/`.
Visualizzata in `ProjectCard.vue` con `aspect-[4/3]`.
**Export:** 1200×900 jpg → `public/covers/<slug>.jpg`
**Frontmatter:** `cover: /covers/<slug>.jpg`

**Template generico** (sostituisci la frase tra `[ ]`):

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs, bouncy expressive poses, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, heavy film grain, archival celluloid feel circa 1930, Fleischer Studios meets early Walt Disney, Cuphead reference, slightly off-register printing, a symbolic illustration representing [DESCRIVI IL PROGETTO IN 5-10 PAROLE], single central composition, clear silhouette, decorative art deco border frame, no text --ar 4:3 --style raw --v 7
```

**Esempio compilato — Nexus Core (nostro progetto interno):**

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs, bouncy expressive poses, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, heavy film grain, archival celluloid feel circa 1930, Fleischer Studios meets early Walt Disney, Cuphead reference, slightly off-register printing, a symbolic illustration representing a network of interconnected gears and pipes orchestrated by a friendly conductor character, single central composition, clear silhouette, decorative art deco border frame, no text --ar 4:3 --style raw --v 7
```

**Esempio compilato — Booster Pack (cliente, e-commerce di carte da gioco):**

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs, bouncy expressive poses, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, heavy film grain, archival celluloid feel circa 1930, Fleischer Studios meets early Walt Disney, Cuphead reference, slightly off-register printing, a symbolic illustration representing a fanned hand of vintage trading cards spilling out of a wrapped paper booster pack, magic dust trailing, single central composition, clear silhouette, decorative art deco border frame, no text --ar 4:3 --style raw --v 7
```

---

## 3 · Placeholder "coming soon"

**Uso:** quando un progetto non ha ancora la cover, sostituisce il fallback
con la lettera grossa.
**Export:** 1200×900 jpg → `public/covers/_placeholder.jpg`

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs, bouncy expressive poses, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, heavy film grain, archival celluloid feel circa 1930, Fleischer Studios meets early Walt Disney, Cuphead reference, slightly off-register printing, a tiny mascot character peeking from behind a large blank picture frame, shrugging gesture, "coming soon" mood, isolated on flat cream #f4ecdb background, no text --ar 4:3 --style raw --v 7
```

---

## 4 · Divisori art deco (PNG trasparente)

**Uso:** ornamenti tra sezioni della landing e nelle pagine `[slug].vue`.
**Export:** 1500×300 PNG con sfondo trasparente → `public/ornaments/divider-1.png`
> Per togliere lo sfondo: in MJ usa "Vary (Region)" oppure passa il PNG su
> [remove.bg](https://www.remove.bg).

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, slightly off-register printing, a horizontal art deco ornamental divider, symmetric, geometric sunburst with two small stars at the ends, ink line art only in sepia #1a1614, isolated on pure white background, no fill, no characters, no text, vector-like clarity --ar 5:1 --style raw --v 7
```

**Variante con piccolo personaggio centrale:**

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, painted in sepia ink #1a1614 with vermilion #b8423b accents, slightly off-register printing, a horizontal art deco ornamental divider with a tiny rubber-hose character holding a banner in the middle, symmetric ornamental scrolls extending to both sides, line art only, isolated on pure white background, no text --ar 5:1 --style raw --v 7
```

---

## 5 · Mascotte / character marchio

**Uso:** generala UNA volta, poi riusa con `--cref <URL>` per favicon, footer,
OG image, varianti.
**Export:** 1024×1024 PNG trasparente → `public/mascot.png`

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs without joints, white gloves, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, slightly off-register printing, a character mascot for a creative studio called Didap: a friendly anthropomorphic ink-bottle with thin rubber-hose arms holding a tiny rolled blueprint, full body T-pose neutral, isolated on flat cream #f4ecdb background, character sheet style, no text --ar 1:1 --style raw --v 7
```

**Una volta scelta la mascotte definitiva**, salva l'URL Midjourney della
generazione preferita e usa questo template per pose nuove
(sostituisci `<URL_MASCOTTE>`):

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, slightly off-register printing, the Didap mascot [DESCRIVI POSA: waving hello / sleeping on a desk / running with rolled papers / etc.], isolated on flat cream #f4ecdb background, no text --cref <URL_MASCOTTE> --cw 80 --ar 1:1 --style raw --v 7
```

---

## 6 · Texture sfondo carta invecchiata

**Uso:** background CSS sotto le sezioni, o `background-image` su body.
**Export:** 1024×1024 jpg tileable → `public/textures/paper.jpg`

```
1930s archival aesthetic, slightly off-register printing, a seamless tileable background texture only, no characters, no figures, aged cream paper #f4ecdb with subtle stains, foxing spots, faint horizontal ink scratches, very minimal, intended to be tiled behind text on a website, no text --ar 1:1 --tile --style raw --v 7
```

---

## 7 · OG image / social share

**Uso:** anteprima quando il sito viene condiviso (WhatsApp, Slack, X, ecc.).
Va referenziata in `nuxt.config.ts` con `useSeoMeta({ ogImage: '/og.jpg' })`.
**Export:** 1200×630 jpg → `public/og.jpg`

```
1930s rubber hose cartoon style, hand-inked wobbly outlines, pie-cut eyes, noodle limbs, painted in cream paper #f4ecdb and sepia ink #1a1614 with vermilion #b8423b and gold #c8a14a accents, hand-painted watercolor texture, heavy film grain, archival celluloid feel circa 1930, slightly off-register printing, the word DIDAP rendered in large hand-painted 1930s display lettering centered horizontally, two small rubber-hose mascot characters peeking from the bottom-left and bottom-right corners, decorative art deco frame border, cream background, designed as a social media share card --ar 1200:630 --style raw --v 7
```

---

## 8 · Favicon

**Uso:** icona del browser. Mantieni semplicissimo, leggibile a 32×32.
**Export:** 1024×1024 PNG → ridimensiona a 64×64 e 32×32 → converti a `.ico`
con [favicon.io](https://favicon.io) → `public/favicon.ico`

```
1930s rubber hose cartoon style, hand-inked thick bold outline, painted in sepia ink #1a1614 on solid vermilion #b8423b background, a single ultra-simplified glyph: a stylized capital letter "D" with a tiny pie-cut eye inside the loop, centered, designed to remain readable at 32x32 pixels, no fine details, no text other than the D, isolated --ar 1:1 --style raw --v 7
```

---

## Coerenza tra le immagini — 3 regole

1. **Fissa il seed** dopo la prima generazione che ti piace.
   Aggiungi `--seed 1234567` (numero qualunque) a tutti i prompt successivi:
   stessa "mano" del disegno.

2. **Usa `--sref` (style reference)** puntando alla *migliore* immagine
   generata. È IL trucco per un sito coerente:
   ```
   <prompt completo>... --sref https://cdn.midjourney.com/<id>.png --sw 200
   ```

3. **`--cref` per i personaggi** ricorrenti. La mascotte va trattata così —
   stesso URL su ogni nuova posa, `--cw 80` come buon punto di partenza
   (più alto = più fedele, più basso = più libertà).

---

## Riepilogo destinazioni file

| Asset                    | Aspect    | Path                                  |
| ------------------------ | --------- | ------------------------------------- |
| Hero landing             | 21:9      | `public/hero.jpg`                     |
| Cover progetto           | 4:3       | `public/covers/<slug>.jpg`            |
| Placeholder coming-soon  | 4:3       | `public/covers/_placeholder.jpg`      |
| Divisori art deco        | 5:1 (PNG) | `public/ornaments/divider-<n>.png`    |
| Mascotte                 | 1:1 (PNG) | `public/mascot.png`                   |
| Texture carta            | 1:1 tile  | `public/textures/paper.jpg`           |
| OG / social card         | 1200×630  | `public/og.jpg`                       |
| Favicon                  | 1:1       | `public/favicon.ico`                  |

---

## Workflow consigliato

1. Genera **prima la mascotte** (sezione 5) — è la base stilistica.
2. Salvi l'URL della mascotte preferita e lo riusi come `--sref` in tutti
   gli altri prompt: il sito sarà visivamente coerente.
3. Genera **il divisore** (sezione 4) — ti serve subito tra le sezioni della
   landing.
4. Solo dopo passa a **hero** (sezione 1) e **cover progetti** (sezione 2):
   con `--sref` impostato verranno tutte allineate alla mascotte.
5. **OG image e favicon** alla fine, quando lo stile è stabilizzato.
