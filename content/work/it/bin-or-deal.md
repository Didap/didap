---
title: Bin or Deal
summary: Aggregatore di offerte sui marketplace europei per collezionisti, con scoring automatico "bin vs deal" basato sui prezzi di riferimento dei cataloghi specializzati.
year: 2026
role: Marketplace
cover: /covers/bin-or-deal.jpg
url: https://www.binordeal.com
tags:
  - web app
  - SaaS
  - marketplace
featured: true
order: 2
---

## Il prodotto

Bin or Deal è la domanda che ogni collezionista si pone davanti a un
annuncio: è un affare o lo stanno tirando? Il prodotto risponde, in
automatico, per ogni listing trovato.

Aggreghiamo le offerte dei principali marketplace europei e confrontiamo
ogni prezzo con il riferimento del catalogo verticale (Cardmarket per le
carte, Numista per la numismatica). Ogni annuncio diventa **🟢 Deal**,
**🟡 Fair** o **🔴 Bin** — così la ricerca smette di essere "scorri 200
annunci" e diventa "guardami solo i 5 verdi".

## Cosa fa

- **Ricerca aggregata** su eBay, Vinted, Wallapop e Subito in una sola
  query.
- **Deal scoring** — ogni listing viene confrontato in tempo reale con il
  prezzo di mercato del catalogo di riferimento.
- **Verticali iniziali** — carte Pokémon (riferimento Cardmarket) e monete
  da collezione (riferimento Numista). Più verticali in roadmap.
- **Filtri pensati per chi colleziona** — prezzo, paese, freschezza,
  punteggio, condizione.
- **Alert automatici** sulle ricerche salvate, via email e Telegram.
- **Privacy by design** — nessuno storico di annunci sui nostri server,
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
