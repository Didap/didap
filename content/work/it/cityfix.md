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
lede: I cittadini segnalano i problemi della città, il Comune li affida alle ditte, le ditte li riparano. Chi ha fatto la segnalazione la segue fino alla fine.
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
  title: Un modo nuovo di gestire i problemi della città.
  items:
    - name: Segnalazione guidata
      desc: L'app chiede dove si trova il problema, una foto e di che tipo è, una domanda alla volta. Si invia in meno di un minuto.
    - name: Niente doppioni
      desc: Sulla mappa si vedono le segnalazioni vicine. Se qualcuno ha già segnalato lo stesso problema, basta toccare Sostieni invece di farne un'altra.
    - name: Stato sempre visibile
      desc: Inviata, presa in carico, assegnata, completata. Chi ha segnalato vede ogni passaggio e riceve un avviso sul telefono.
    - name: Pannello del Comune
      desc: Il Comune vede arrivare le segnalazioni, le prende in carico e le affida a una ditta. Aperte, in corso e in ritardo, sulla mappa e in tabella.
    - name: Chiusura con foto
      desc: La ditta ripara e chiude il lavoro con una foto. Confrontata con la foto del problema, mostra cosa è cambiato.
    - name: Rioni e avvisi
      desc: Il Comune pubblica avvisi per un solo rione o per tutta la città, per esempio sui lavori alla rete idrica. I rioni sono già disegnati sulla mappa.
model: Per i cittadini l'app è gratuita. Il Comune paga una licenza annuale in base al numero di abitanti, con operatori, ditte e segnalazioni senza limiti.
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
screens:
  why:
    title: Le segnalazioni dei cittadini si perdono per strada.
    body: "Chi vede una buca o un lampione spento spesso non sa a chi dirlo. Se lo dice, la segnalazione passa da un ufficio all'altro e da una ditta all'altra, e nessuno gli fa più sapere niente. Il Comune, tra email, moduli e fogli di calcolo, non sa quante sono, chi ci sta lavorando e quanto costano. Così i problemi restano dove sono e la gente smette di segnalarli."
  made:
    title: Una piattaforma che collega cittadini, Comune e ditte.
    body: "CityFix l'abbiamo pensata e costruita noi, da zero. Funziona in tre passi:"
    steps:
      - Vedi un problema, apri l'app e scatti una foto. La posizione la mette il telefono.
      - Il Comune riceve la segnalazione, la prende in carico e la affida alla ditta giusta.
      - La ditta ripara e chiude il lavoro con una foto. Tu ricevi un avviso a ogni passaggio.
    media:
      src: /covers/cityfix-ciclo.mp4
      poster: /covers/cityfix-ciclo-poster.webp
      alt: "La vita di una segnalazione su una scheda: arriva la foto della buca, salgono i cittadini che la sostengono e i quattro stati si accendono uno dopo l'altro, da Inviata a Completata"
  offers:
    title: Un modo nuovo di gestire i problemi della città.
    groups:
      - label: Il cittadino
        title: Segnala in un minuto e segue ogni passaggio.
        items:
          - name: Segnalazione guidata
            desc: L'app chiede dove si trova il problema, una foto e di che tipo è, una domanda alla volta.
          - name: Niente doppioni
            desc: Se qualcuno ha già segnalato lo stesso problema, basta toccare Sostieni invece di farne un'altra.
          - name: Stato sempre visibile
            desc: Inviata, presa in carico, assegnata, completata. A ogni passaggio arriva un avviso sul telefono.
        media:
          - src: /covers/cityfix-segnala.mp4
            poster: /covers/cityfix-segnala-poster.webp
            ratio: 1256/1520
            alt: "La segnalazione guidata nell'app CityFix: il bot chiede dove si trova il problema, arrivano la posizione, la foto e il tipo, poi Invia e la segnalazione parte verso il Comune"
          - src: /covers/cityfix-mappa.mp4
            poster: /covers/cityfix-mappa-poster.webp
            ratio: 1696/1520
            alt: "La mappa delle segnalazioni nell'app CityFix: i pin blu sulle strade di Brindisi, uno si alza e apre la sua scheda, e il bottone della barra passa da Segnala ora a Sostieni"
          - src: /covers/cityfix-stato.mp4
            poster: /covers/cityfix-stato-poster.webp
            ratio: 816/1520
            backdrop: '#efedfd'
            alt: "Il dettaglio di una segnalazione: i quattro pixel dello stato si riempiono uno alla volta, da Inviata a Completata, mentre la cronologia si allunga"
      - label: Il Comune
        title: Vede tutto in un posto e affida il lavoro.
        items:
          - name: Pannello del Comune
            desc: Le segnalazioni arrivano in ordine, sulla mappa e in tabella. Il Comune le prende in carico e le affida a una ditta.
          - name: Rioni e avvisi
            desc: Il Comune pubblica avvisi per un solo rione o per tutta la città, per esempio sui lavori alla rete idrica.
        media:
          - src: /covers/cityfix-backoffice.mp4
            poster: /covers/cityfix-backoffice-poster.webp
            ratio: 1920/1080
            alt: "Il backoffice del Comune di Brindisi: arriva una nuova segnalazione in cima alle aperte, l'operatore la prende in carico, la assegna a un fornitore e il contatore In corso sale"
          - src: /covers/cityfix-avviso.mp4
            poster: /covers/cityfix-avviso-poster.webp
            ratio: 822/1080
            alt: "Un avviso del Comune per il rione Centro: la zona si disegna sulla mappa di Brindisi e arriva l'avviso dei lavori sulla rete idrica, valido fino al 31 ottobre"
      - label: La ditta
        title: Ripara e lo dimostra con una foto.
        items:
          - name: Chiusura con foto
            desc: La ditta chiude il lavoro con una foto. Accanto alla foto del problema, mostra cosa è cambiato.
        media:
          - src: /covers/cityfix-chiusura.mp4
            poster: /covers/cityfix-chiusura-poster.webp
            ratio: 822/1080
            alt: "Il fornitore chiude l'intervento: la foto della buca scorre sulla foto dell'asfalto rifatto e arriva il timbro Completata"
  payoff:
    title: Il quadro intero, con i numeri pronti.
    body: "Il Comune sa cosa è aperto, chi ci sta lavorando, cosa è in ritardo e quanto ha speso, al posto di email, moduli e fogli di calcolo. A fine anno il resoconto si compila da solo, con i numeri pronti per la giunta e il consiglio."
    media:
      src: /covers/cityfix-resoconto.mp4
      poster: /covers/cityfix-resoconto-poster.webp
      alt: "Il resoconto annuale del Comune, con dati di esempio: i numeri dei problemi risolti salgono e le barre dei dodici mesi crescono una dopo l'altra"
  challenge:
    title: Servire ottomila Comuni con un solo sistema.
    body: "Il sistema è uno solo per tutti, quindi per partire in una nuova città non serve installare niente. Ma ogni Comune vede soltanto le sue segnalazioni, i suoi uffici e le sue ditte: nessun dato passa da un Comune all'altro."
  start:
    - Ci scrivi e ti mostriamo CityFix sulla mappa del tuo Comune.
    - Creiamo lo spazio del Comune e il primo account per l'ufficio.
    - Inviti l'ufficio tecnico e le ditte. I cittadini scaricano l'app e iniziano a segnalare.
  backdrop: '#2a1ce7'
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
