---
title: CityFix
summary: Il sistema con cui il Comune raccoglie le segnalazioni dei cittadini, decide le priorità e affida i lavori alle imprese del territorio. Ogni intervento tracciato, dalla foto al lavoro finito.
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
lede: Dalla buca segnalata alla buca chiusa. Il cittadino segnala, il Comune affida il lavoro a un'impresa del territorio, e chi ha segnalato vede ogni passaggio.
hero:
  src: /covers/cityfix-hero.mp4
  poster: /covers/cityfix-hero-poster.webp
  srcMobile: /covers/cityfix-hero-mobile.mp4
  posterMobile: /covers/cityfix-hero-mobile-poster.webp
  alt: La mappa di Brindisi disegnata in blu come una tavola tecnica, con i pin delle segnalazioni che compaiono uno dopo l'altro sulle strade del centro
intro: "CityFix mette su un'unica mappa le segnalazioni dei cittadini: buche, lampioni, rifiuti, verde pubblico. L'ufficio tecnico decide cosa sistemare prima e affida il lavoro a un'impresa del territorio, con importo e scadenza."
challenge:
  title: Ottomila Comuni, un solo sistema.
  body: "Per partire in un nuovo Comune non si installa niente: il Comune e le imprese lavorano dal browser, i cittadini dall'app. Ogni Comune vede solo le sue segnalazioni, i suoi utenti e le sue imprese, isolati riga per riga nel database."
features:
  title: Dalla segnalazione al lavoro fatto.
  items:
    - name: Segnalazione in chat
      desc: "Poche domande, una alla volta: dove, cosa, quanto è grave. Foto e posizione esatta in ogni segnalazione."
    - name: Meno doppioni
      desc: Se qualcuno ha già segnalato lì vicino, l'app lo propone e basta sostenerlo.
    - name: Lavori affidati alle imprese
      desc: Priorità, importo e scadenza. Gli interventi vicini si affidano in una volta, quelli in ritardo si vedono subito.
    - name: Foto del lavoro finito
      desc: L'impresa chiude l'intervento con le foto e sulla mappa il punto diventa verde.
    - name: Punti e avvisi
      desc: Chi segnala e chi sostiene guadagna punti. Il Comune manda avvisi anche a un solo quartiere.
    - name: Resoconto dell'anno
      desc: Spesa, problemi risolti, tempi rispettati e cittadini attivi, pronti per la giunta o il consiglio comunale.
    - name: Un post per ogni lavoro finito
      desc: Lo raccontiamo insieme al Comune sui suoi social, con le foto e la via dell'intervento.
model: "Per i cittadini l'app è gratuita. Il Comune paga una licenza annuale in base agli abitanti, senza limiti di operatori, imprese e segnalazioni, e i post sui lavori finiti sono compresi. Il modulo Bandi, con i finanziamenti a cui il Comune può partecipare, si attiva a parte."
next: bin-or-deal
media:
  pair:
    - src: /covers/cityfix-logo.svg
      alt: Il logo di CityFix
    - src: /covers/cityfix-punto1.webp
      alt: "La landing di CityFix sul telefono, al passo del cittadino: in chat invia la foto della buca e sostiene una segnalazione simile a 30 metri"
  wide:
    src: /covers/cityfix-punto2.webp
    alt: "La landing di CityFix sul computer, al passo del Comune e dell'impresa: l'ufficio tecnico affida la buca di via Appia 42 a Edilstrade Rossi, con priorità alta, 480 euro e 3 giorni"
  feature:
    - src: /covers/cityfix-resoconto.webp
      alt: "Il resoconto dell'anno sulla landing di CityFix, dal computer: 412 problemi risolti, 87% nei tempi, 6 giorni in media, 1.240 cittadini attivi e i problemi risolti mese per mese. Dati di esempio"
    - src: /covers/cityfix-punto3.webp
      alt: "La landing di CityFix sul telefono, al passo della città: sulla mappa la buca di via Appia diventa verde e chi l'ha segnalata riceve 25 punti"
  triple:
    - src: /covers/cityfix-post-buca.webp
      alt: "Post Instagram: «Una città non è mai finita.» Foto di una buca in via Fulvia, segnalata su CityFix"
    - src: /covers/cityfix-post-risolte.webp
      alt: "Post Instagram: 128 segnalazioni risolte a Brindisi questo mese"
    - src: /covers/cityfix-post-si-ripara.webp
      alt: "Post Instagram: «Vedi. Segnali. Si ripara.» Foto della pavimentazione rovinata in un parco urbano"
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
