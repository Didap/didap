---
title: CityFix
summary: Piattaforma di rigenerazione urbana che mette in contatto cittadini, comuni e fornitori per segnalare, gestire e risolvere gli interventi sul territorio.
role: Città
cover: /covers/cityfix.jpg
url: https://cityfix.io
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
lede: Il cittadino segnala, il Comune assegna, il fornitore ripara. Ogni passaggio resta tracciato.
hero:
  src: /covers/cityfix-hero.mp4
  poster: /covers/cityfix-hero-poster.webp
  srcMobile: /covers/cityfix-hero-mobile.mp4
  posterMobile: /covers/cityfix-hero-mobile-poster.webp
  alt: La mappa di Brindisi disegnata in blu come una tavola tecnica, con i pin delle segnalazioni che compaiono uno dopo l'altro sulle strade del centro
intro: "CityFix è la piattaforma per la manutenzione della città. Il cittadino apre l'app, risponde a poche domande e manda posizione e foto di una buca, di un lampione spento o di una panchina rotta. Il Comune la riceve nel backoffice, la prende in carico e la assegna a un fornitore. Il fornitore interviene e la chiude. Ogni cambio di stato arriva sul telefono di chi ha segnalato."
challenge:
  title: Ottomila Comuni, un solo database.
  body: "Ogni Comune è un ente separato: i suoi operatori, i suoi fornitori, le sue segnalazioni. Una sola installazione deve servirli tutti senza che un dato passi da un Comune all'altro. Ogni riga porta il codice del suo Comune e PostgreSQL applica l'isolamento con la Row Level Security, sotto il codice dell'applicazione. L'anagrafica ISTAT di tutti i Comuni è già caricata."
features:
  title: Dalla buca in strada all'intervento chiuso.
  items:
    - name: Segnalazione guidata
      desc: Una conversazione a domande. Posizione, foto, tipo di problema e invio in meno di un minuto.
    - name: Niente doppioni
      desc: "Prima dell'invio l'app mostra le segnalazioni vicine: si può sostenere quella che c'è già."
    - name: Stato sempre visibile
      desc: Inviata, presa in carico, assegnata, completata. Il cittadino vede ogni passaggio.
    - name: Backoffice del Comune
      desc: Segnalazioni aperte, in ritardo, raggruppate per luogo, sulla mappa e in tabella.
    - name: Fornitori
      desc: Candidature, assegnazione degli interventi, documenti e recensioni.
    - name: Rioni e avvisi
      desc: Le zone del Comune da OpenStreetMap e gli avvisi per una zona o per tutta la città.
model: L'app è gratuita per i cittadini. Il Comune paga una licenza annuale in base al numero di abitanti, che copre operatori, fornitori e segnalazioni senza limiti. Un solo strumento per tutto il percorso della segnalazione, al posto di email, moduli e fogli di calcolo.
next: bin-or-deal
media:
  pair:
    - src: /covers/cityfix-logo.svg
      alt: Il logo di CityFix
    - src: /covers/cityfix-segnala.mp4
      poster: /covers/cityfix-segnala-poster.webp
      alt: "La segnalazione guidata nell'app CityFix: il bot chiede dove si trova il problema, arrivano la posizione, la foto e il tipo, poi Invia e la segnalazione parte verso il Comune"
  wide:
    src: /covers/cityfix-backoffice.mp4
    poster: /covers/cityfix-backoffice-poster.webp
    alt: "Il backoffice del Comune di Brindisi: arriva una nuova segnalazione in cima alle aperte, l'operatore la prende in carico, la assegna a un fornitore e il contatore In corso sale"
  feature:
    - src: /covers/cityfix-mappa.mp4
      poster: /covers/cityfix-mappa-poster.webp
      srcMobile: /covers/cityfix-mappa-mobile.mp4
      posterMobile: /covers/cityfix-mappa-mobile-poster.webp
      alt: "La mappa delle segnalazioni nell'app CityFix: i pin blu sulle strade di Brindisi, uno si alza e apre la sua scheda, e il bottone della barra passa da Segnala ora a Sostieni"
    - src: /covers/cityfix-stato.mp4
      poster: /covers/cityfix-stato-poster.webp
      alt: "Il dettaglio di una segnalazione: i quattro pixel dello stato si riempiono uno alla volta, da Inviata a Completata, mentre la cronologia si allunga"
  triple:
    - src: /covers/cityfix-chiusura.mp4
      poster: /covers/cityfix-chiusura-poster.webp
      alt: "Il fornitore chiude l'intervento: la foto della buca scorre sulla foto dell'asfalto rifatto e arriva il timbro Completata"
    - src: /covers/cityfix-sostieni.mp4
      poster: /covers/cityfix-sostieni-poster.webp
      alt: "Sostieni: chi vede la stessa buca tocca Sostieni, il bottone diventa Sostenuta, arriva un altro avatar e il contatore passa a 7 persone"
    - src: /covers/cityfix-avviso.mp4
      poster: /covers/cityfix-avviso-poster.webp
      alt: "Un avviso del Comune per il rione Centro: la zona si disegna sulla mappa di Brindisi e arriva l'avviso dei lavori sulla rete idrica, valido fino al 31 ottobre"
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
