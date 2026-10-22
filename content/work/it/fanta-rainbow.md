---
title: Fanta Rainbow
summary: L'asta di fantacalcio live. Il banco tiene i conti, i partecipanti aprono un link e buzzano dal telefono, il countdown decide. Poi restano il campionato, le rose e l'album.
role: Fantacalcio
cover: /covers/fanta-rainbow.svg
url: https://fantarainbow.com
tags:
  - web app
  - SaaS
featured: true
order: 1
status: live
scope: Design e sviluppo full-stack
stack: Nuxt 4, Vue 3, PostgreSQL, Stripe
lede: Aste live di fantacalcio. Il banco tiene i conti, i giocatori rilanciano dal telefono, il countdown decide.
hero:
  src: /covers/fanta-rainbow-hero.mp4
  poster: /covers/fanta-rainbow-hero-poster.webp
  srcMobile: /covers/fanta-rainbow-hero-mobile.mp4
  posterMobile: /covers/fanta-rainbow-hero-mobile-poster.webp
  alt: Il logo di Fanta Rainbow al centro di una porta da calcio illuminata di notte, con la rete mossa dal vento
intro: Fanta Rainbow è il banco di un’asta di fantacalcio. L’organizzatore crea l’asta, sceglie i nomi delle squadre e riceve un link personale per ciascuna. La sera dell’asta il tabellone gira sul grande schermo e tutti gli altri sono al telefono. Chi offre per ultimo prima che scada il countdown si prende il giocatore.
challenge:
  title: Nessun timer sul server.
  body: "Ogni offerta scrive la scadenza del lotto. La prima richiesta che la trova nel passato assegna il giocatore. Due offerte nello stesso istante non si sovrascrivono mai: la seconda viene rigiocata sull’offerta aggiornata. Tutti vedono lo stesso countdown sullo stesso secondo, anche chi non è nella stanza."
features:
  title: Dalla sera dell’asta a tutta la stagione.
  items:
    - name: Asta in due fasi
      desc: Urna per i big estratti a caso, chiamata per tutti gli altri.
    - name: Offerte dal telefono
      desc: "Nessuna app e nessuna registrazione: si apre il proprio link e si rilancia."
    - name: Countdown sincronizzato
      desc: Il client corregge lo scarto con l’orologio del server.
    - name: Regole di rosa garantite
      desc: Reparto pieno, offerta rifiutata. L’ultima vendita si può annullare.
    - name: Import del listone
      desc: Il CSV ufficiale di Fantacalcio.it così com’è.
    - name: La stagione intera
      desc: Lega, formazioni, obiettivi, crediti Rainbow e album di figurine.
model: "Un credito lega una tantum: 10 € per lega, squadre illimitate, paga solo l’organizzatore. Nessun abbonamento e nessun costo per partecipante. Le leghe concluse restano leggibili e si esportano in JSON."
next: cityfix
media:
  pair:
    - src: /covers/fanta-rainbow-logo.svg
      alt: Il logo di Fanta Rainbow
    - src: /covers/fanta-rainbow-asta.mp4
      poster: /covers/fanta-rainbow-asta-poster.webp
      alt: "L'asta live di Fanta Rainbow: le squadre rilanciano su Maignan, la barra del countdown si riempie e riparte a ogni offerta, finché il calciatore è aggiudicato a 64 crediti"
  wide:
    src: /covers/fanta-rainbow-gioca.mp4
    poster: /covers/fanta-rainbow-gioca-poster.webp
    srcMobile: /covers/fanta-rainbow-gioca-mobile.mp4
    posterMobile: /covers/fanta-rainbow-gioca-mobile-poster.webp
    alt: "La scelta della sfida di Fanta Rainbow: Ranked e Torneo divisi da un fulmine arcobaleno, che si illuminano a turno e spostano la cucitura, poi Entrambi al centro"
  feature:
    - src: /covers/fanta-rainbow-formazione.mp4
      poster: /covers/fanta-rainbow-formazione-poster.webp
      srcMobile: /covers/fanta-rainbow-formazione-mobile.mp4
      posterMobile: /covers/fanta-rainbow-formazione-mobile-poster.webp
      alt: "La formazione su Fanta Rainbow: quattro calciatori portati dai Disponibili ai posti liberi del campo, poi Schiera conferma la formazione della giornata"
    - src: /covers/fanta-rainbow-stagione.mp4
      poster: /covers/fanta-rainbow-stagione-poster.webp
      alt: "La pagina Stagione di Fanta Rainbow: il listino scorre in alto, le quotazioni salgono e scendono con il loro andamento, poi arrivano i risultati della giornata con una partita ancora in corso"
  triple:
    - src: /covers/fanta-rainbow-ultimora.mp4
      poster: /covers/fanta-rainbow-ultimora-poster.webp
      alt: "L'ultim'ora della Gazzetta Rainbow: due notizie di infortuni si danno il cambio sulla foto, il titolo entra parola per parola e un timbro corallo dice quanto resta fuori il giocatore"
    - src: /covers/fanta-rainbow-feed.mp4
      poster: /covers/fanta-rainbow-feed-poster.webp
      srcMobile: /covers/fanta-rainbow-feed-mobile.mp4
      posterMobile: /covers/fanta-rainbow-feed-mobile-poster.webp
      alt: "Le notizie della Gazzetta Rainbow in due colonne che scorrono, con i filtri Tutte, Mercato e Infortuni che accendono a turno le notizie della propria categoria"
    - src: /covers/fanta-rainbow-mercato.mp4
      poster: /covers/fanta-rainbow-mercato-poster.webp
      alt: "Una notizia di mercato della Gazzetta Rainbow: l'anno del contratto rotola da 2026 a 2030, una firma si disegna e arriva il timbro Ufficiale sul rinnovo di Rabiot con il Milan"
---

## Il prodotto

Fanta Rainbow fa il banco all'asta di fantacalcio. L'organizzatore crea
l'asta, sceglie i nomi delle squadre e riceve un link personale per
ciascuna; la sera dell'asta il tabellone gira su uno schermo grande e tutti
gli altri stanno sul telefono. Chi resta ultimo a rilanciare quando scade il
countdown si aggiudica il calciatore.

Niente fogli di calcolo, niente crediti contati a mano, niente "ma io avevo
detto 34 prima di te": i conti li tiene il server e tutti vedono lo stesso
countdown allo stesso secondo. Anche chi non è nella stessa stanza.

## Cosa fa

- **Asta in due fasi** - *urna* per i big, che escono a sorte; *chiamata*
  per tutti gli altri, messi all'asta solo cercandoli per nome quando serve
  completare un reparto.
- **Buzz dal telefono** - nessuna app da installare e nessuna registrazione
  per chi partecipa: si entra dal proprio link e si rilancia.
- **Countdown sincronizzato** - il client corregge lo scarto fra il proprio
  orologio e quello del server, così giocare a distanza non regala secondi
  a nessuno.
- **Vincoli di rosa applicati dal banco** - reparto pieno e il buzz viene
  rifiutato; riserva crediti calcolata sugli slot rimanenti, per arrivare
  in fondo alla rosa; annulla dell'ultima aggiudicazione con rimborso.
- **Import del listone** - il CSV ufficiale di Fantacalcio.it così com'è,
  colonne riconosciute per intestazione e non per posizione, ruoli Mantra
  ricondotti ai quattro classici.
- **La stagione, non solo la serata** - campionato a scontri diretti o a
  punti totali, formazioni giornata per giornata, traguardi, crediti
  Rainbow e album di figurine da aprire a pacchetti.

## Stack

Nuxt 4 e Vue 3 con Tailwind CSS v4, PostgreSQL interrogato in SQL scritto a
mano, Stripe per il credito lega, storage S3 per le immagini, deploy in
Docker.

Sul server non gira nessun timer: ogni buzz scrive la scadenza del lotto e
la prima richiesta che la trova superata aggiudica. Le scritture sono
compare-and-swap sulla versione della riga, quindi due buzz nello stesso
istante non si sovrascrivono mai - il secondo viene rigiocato sull'offerta
aggiornata. A ogni mutazione vengono verificate le invarianti (crediti
coerenti con le rose, nessun calciatore in due squadre, ledger allineato):
se una scrittura le viola, non viene persistita.

## Modello

Credito lega una tantum: 10 € per lega, squadre illimitate, paga solo chi
organizza. Niente abbonamento, niente costo a partecipante, niente funzioni
bloccate a metà stagione. Le leghe concluse restano consultabili e si
esportano in JSON.

## Stato

In produzione su [fantarainbow.com](https://fantarainbow.com).
