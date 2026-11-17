---
title: Bin or Deal
summary: Aggregatore di offerte sui marketplace europei per collezionisti, con scoring automatico "bin vs deal" basato sui prezzi di riferimento dei cataloghi specializzati.
role: Marketplace
cover: /covers/bin-or-deal.jpg
url: https://www.binordeal.com
logo: /covers/bin-or-deal-wordmark.svg
tags:
  - web app
  - SaaS
  - marketplace
featured: true
order: 2
status: pending
team:
  - william
  - alessandro
scope: Design e sviluppo full-stack
stack: Next.js 15, Hono, PostgreSQL, Playwright
lede: Gli annunci dei marketplace europei, ognuno con il suo verdetto. Deal, Fair o Bin contro il prezzo del catalogo.
hero:
  src: /covers/bin-or-deal-hero.mp4
  poster: /covers/bin-or-deal-hero-poster.webp
  srcMobile: /covers/bin-or-deal-hero-mobile.mp4
  posterMobile: /covers/bin-or-deal-hero-mobile-poster.webp
  alt: "Il titolo Bin. or Deal? su carta da giornale, con il nastro degli ultimi verdetti che scorre in alto e in basso e un timbro che diventa Deal, Fair e poi Bin"
intro: "Bin or Deal cerca una carta o una moneta su eBay, Vinted, Wallapop e Subito insieme. Ogni annuncio diventa Deal, Fair o Bin contro il prezzo del catalogo: invece di 200 annunci si guardano i 5 verdi."
challenge:
  title: Il prezzo giusto non è scritto sull’annuncio.
  body: "Il riferimento del catalogo scende con la condizione dichiarata: una carta giocata vale il 62% di una near-mint. I mercati rispondono in tempi diversi, così i risultati arrivano mentre la lista si riordina."
features:
  title: Una ricerca, quattro mercati, un verdetto.
  items:
    - name: Ricerca aggregata
      desc: eBay, Vinted, Wallapop e Subito in una sola query, in parallelo.
    - name: Prezzo di riferimento
      desc: "Cardmarket per le carte, Numista per le monete."
    - name: Deal, Fair o Bin
      desc: Almeno il 18% sotto il riferimento è Deal, oltre l’8% sopra è Bin.
    - name: Condizione nel conto
      desc: Il riferimento scende per una carta giocata o rovinata.
    - name: Soglie personali
      desc: Per ogni prodotto si fissano i propri prezzi di Deal e di Bin.
    - name: Filtri da collezionista
      desc: "Score, mercato e prezzo. Le lotterie restano fuori."
model: "Due piani previsti. Free con 10 ricerche al giorno, Pro a 4,99 € al mese con ricerche illimitate, alert ed export CSV."
next: cruciverba-lab
media:
  pair:
    - src: /covers/bin-or-deal-logo.svg
      alt: Il logo di Bin or Deal
    - src: /covers/bin-or-deal-verdetto-telefono.mp4
      poster: /covers/bin-or-deal-verdetto-telefono-poster.webp
      alt: "Il sito di Bin or Deal su un telefono: tre annunci di Charizard uno dopo l’altro, il prezzo entra nella formula contro il riferimento Cardmarket, si accende la soglia giusta e il timbro del verdetto passa da Deal a Fair a Bin"
  wide:
    src: /covers/bin-or-deal-ricerca.mp4
    poster: /covers/bin-or-deal-ricerca-poster.webp
    srcMobile: /covers/bin-or-deal-ricerca-mobile.mp4
    posterMobile: /covers/bin-or-deal-ricerca-mobile-poster.webp
    alt: "Una ricerca di charizard base set: gli annunci arrivano da Subito, Vinted, eBay e infine Wallapop, i contatori Deal, Fair e Bin salgono e i Deal salgono in cima alla lista"
  feature:
    - src: /covers/bin-or-deal-verdi.mp4
      poster: /covers/bin-or-deal-verdi-poster.webp
      srcMobile: /covers/bin-or-deal-verdi-mobile.mp4
      posterMobile: /covers/bin-or-deal-verdi-mobile-poster.webp
      alt: "Il filtro Score: un clic su Deal spegne Fair e Bin, gli altri annunci spariscono e restano solo i verdi, poi la lista torna intera"
    - src: /covers/bin-or-deal-soglie-telefono.mp4
      poster: /covers/bin-or-deal-soglie-telefono-poster.webp
      alt: "Personalizza Scoring su un telefono, sotto il riferimento di 185 €: con la tastiera la soglia Deal diventa 170 €, Applica Soglie la salva e un annuncio da Fair passa a Deal, poi Ripristina Default lo riporta a Fair"
  triple:
    - src: /covers/bin-or-deal-condizione.mp4
      poster: /covers/bin-or-deal-condizione-poster.webp
      alt: "Lo stesso Charizard in condizioni diverse: da near-mint a giocato il riferimento scende e il verdetto cambia"
    - src: /covers/bin-or-deal-lotteria.mp4
      poster: /covers/bin-or-deal-lotteria-poster.webp
      alt: "Un annuncio da 5 € che è una lotteria: al posto del prezzo compare prezzo fake e con Escludi lotterie l’annuncio sparisce dalla lista"
    - src: /covers/bin-or-deal-riferimento.mp4
      poster: /covers/bin-or-deal-riferimento-poster.webp
      alt: "Il riferimento sbagliato si cambia: da Charizard Base Set a Shadowless il prezzo di riferimento sale e tutti i verdetti si ricalcolano"
---

## Il prodotto

Bin or Deal è la domanda che ogni collezionista si pone davanti a un
annuncio: è un affare o lo stanno tirando? Il prodotto risponde, in
automatico, per ogni listing trovato.

Aggreghiamo le offerte dei principali marketplace europei e confrontiamo
ogni prezzo con il riferimento del catalogo verticale (Cardmarket per le
carte, Numista per la numismatica). Ogni annuncio diventa **🟢 Deal**,
**🟡 Fair** o **🔴 Bin** - così la ricerca smette di essere "scorri 200
annunci" e diventa "guardami solo i 5 verdi".

## Cosa fa

- **Ricerca aggregata** su eBay, Vinted, Wallapop e Subito in una sola
  query.
- **Deal scoring** - ogni listing viene confrontato in tempo reale con il
  prezzo di mercato del catalogo di riferimento.
- **Verticali iniziali** - carte Pokémon (riferimento Cardmarket) e monete
  da collezione (riferimento Numista). Più verticali in roadmap.
- **Filtri pensati per chi colleziona** - prezzo, paese, freschezza,
  punteggio, condizione.
- **Alert automatici** sulle ricerche salvate, via email e Telegram.
- **Privacy by design** - nessuno storico di annunci sui nostri server,
  nessun dato personale dei venditori, ricerche eseguite *per conto*
  dell'utente solo quando le richiede.

## Stack

Next.js 15 (App Router) per il frontend, Hono su Fly.io per il layer
API, PostgreSQL su Neon e Redis su Upstash per cache e job queue
(BullMQ), Clerk per l'autenticazione, Stripe per gli abbonamenti.
Adapter pattern per ciascun marketplace e ciascun catalogo: aggiungere
una piattaforma è un file in più, non una rifattorizzazione.

## Stato

In sviluppo. Beta privata in arrivo per i primi tester.
