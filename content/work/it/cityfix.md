---
title: CityFix
summary: Piattaforma di rigenerazione urbana che mette in contatto cittadini, comuni e fornitori per segnalare, gestire e risolvere gli interventi sul territorio.
role: Città
cover: /covers/cityfix.jpg
url: https://cityfix.io
logo: /covers/cityfix-wordmark.svg
tags:
  - PA
  - app
  - web app
  - SaaS
  - civic tech
featured: true
order: 3
status: pilot
scope: Design e sviluppo full-stack
stack: Expo, Vue 3, NestJS, PostgreSQL
lede: Il cittadino segnala, il Comune affida il lavoro, la ditta ripara. E chi ha segnalato vede ogni passaggio.
hero:
  src: /covers/cityfix-hero.mp4
  poster: /covers/cityfix-hero-poster.webp
  srcMobile: /covers/cityfix-hero-mobile.mp4
  posterMobile: /covers/cityfix-hero-mobile-poster.webp
  alt: La mappa di Brindisi disegnata in blu come una tavola tecnica, con i pin delle segnalazioni che compaiono uno dopo l'altro sulle strade del centro
intro: "CityFix è la manutenzione della città in un'app. Bastano una foto e la posizione per segnalare una buca, un lampione spento o una panchina rotta."
challenge:
  title: Ottomila Comuni, un solo sistema.
  body: Per partire in una nuova città non si installa niente. Ogni Comune vede solo le sue segnalazioni, i suoi uffici e le sue ditte.
model: Per i cittadini l'app è gratuita. Il Comune paga una licenza annuale in base agli abitanti, senza limiti di operatori, ditte e segnalazioni.
next: bin-or-deal
media:
  pair:
    - src: /covers/cityfix-strada.svg
      alt: "Una strada disegnata in blu con i suoi problemi, ognuno con un pin rosso: un lampione spento, una panchina rotta, un cestino che trabocca e una buca. Un passante guarda il telefono"
    - src: /covers/cityfix-scatta.mp4
      poster: /covers/cityfix-scatta-poster.webp
      alt: "Un telefono inquadra la buca e scatta. La segnalazione si compila con la foto, la posizione e il tipo, parte e diventa un pin che accende il primo pixel dello stato"
  wide:
    src: /covers/cityfix-giro.mp4
    poster: /covers/cityfix-giro-poster.webp
    alt: "Il giro di una segnalazione: il cittadino fotografa la buca, la segnalazione vola al Comune, il Comune la passa alla ditta, il furgone arriva e ripara, il pin diventa verde e la notizia torna al cittadino. In alto i quattro pixel dello stato si accendono uno a uno"
  feature:
    - src: /covers/cityfix-comuni.mp4
      poster: /covers/cityfix-comuni-poster.webp
      alt: "CityFix al centro, collegato a tanti Comuni intorno. Ogni Comune ha il suo lucchetto e le sue segnalazioni, che compaiono e diventano verdi solo dentro il suo riquadro"
    - src: /covers/cityfix-passaggi.svg
      alt: "I quattro stati di una segnalazione uno sotto l'altro: inviata dal telefono, presa in carico dal Comune, affidata al furgone della ditta, completata con l'asfalto nuovo e il pin verde"
  triple:
    - src: /covers/cityfix-insieme.svg
      alt: "Tre persone intorno alla stessa buca, ognuna con un pollice in su: la segnalazione resta una sola, con le persone che la sostengono"
    - src: /covers/cityfix-rione.svg
      alt: "Il Comune manda un avviso: le onde partono dal municipio e la campanella arriva solo alle case del rione cerchiato"
    - src: /covers/cityfix-riparata.mp4
      poster: /covers/cityfix-riparata-poster.webp
      alt: "Un operaio della ditta fotografa la buca, la riempie con la pala e la fotografa di nuovo. Le due foto, prima e dopo, e il timbro verde"
team:
  - barbara
  - william
  - cristiano
  - alessandro
  - vitantonio
---

## Il prodotto

CityFix è la nostra piattaforma per la cura della città: il cittadino segnala
una buca, una panchina rotta, un palo della luce spento; il Comune riceve,
classifica e assegna; il fornitore esegue e chiude l'intervento. Tutto in
un unico flusso, tracciato dall'inizio alla fine.

Pensata per scalare a tutti i ~8.000 Comuni italiani: ogni ente è un
*tenant* isolato - i suoi operatori, i suoi fornitori, i suoi dati - con
isolamento garantito sia a livello applicativo sia a livello database.

## Cosa fa

- **App per il cittadino** - segnalazioni con foto e geolocalizzazione,
  stato in tempo reale, comunicazione diretta con il Comune.
- **Backoffice comunale** - triage delle segnalazioni, assegnazione ai
  fornitori, gestione di operatori e team, statistiche territoriali.
- **Workflow per il fornitore** - riceve gli incarichi, aggiorna lo stato,
  chiude gli interventi con prove fotografiche.
- **Ruoli e permessi** - `super_admin`, `admin_comunale`, `operator`,
  `supplier`, `citizen`, ognuno con scope e capacità diverse.
- **Multi-tenancy reale** - ~8.000 Comuni potenziali, dataset ISTAT
  precaricato, isolamento via `comune_id` + Row Level Security su
  PostgreSQL.

## Stack

Backend NestJS modulare con Drizzle ORM su PostgreSQL (RLS attivo per
l'isolamento tra Comuni). Backoffice in Vue 3 con vue-i18n. App cittadino
in Expo + NativeWind, internazionalizzata con i18next. Auth JWT con
refresh token, email transazionali via Resend, media su Cloudflare R2.
API versionata `/api/v1/` dal day-one, deploy via Docker, cloud-agnostico.

## Modello

Licenza annuale ai Comuni con quota per abitante. Un solo strumento per
tutto il ciclo di vita della segnalazione, condiviso tra ente, operatori
e fornitori - niente moduli paralleli, niente email, niente fogli di
calcolo.

## Stato

In sviluppo avanzato - backend completo, backoffice operativo, app
cittadino in fase MVP. Pilota previsto con il primo Comune partner.
