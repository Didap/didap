---
title: Cruciverba Lab
summary: "La casa dei cruciverba online. Sette giochi di parole nuovi ogni giorno, in italiano e nel browser. Quello di oggi è gratis per tutti, l'archivio completo è in abbonamento."
role: Giochi
cover: /covers/cruciverba-lab.svg
url: https://cruciverba-lab.it
tags:
  - web app
  - SaaS
featured: true
order: 4
---

## Il prodotto

Cruciverba Lab è la nostra testata di giochi di parole in italiano: ogni
giorno un cruciverba nuovo e una manciata di altri giochi, nel browser,
senza app da scaricare e senza pubblicità. Quello di oggi è gratis per
tutti e non chiede nemmeno la registrazione.

Il resto è archivio. Con un account gratuito si ritrovano gli ultimi sette
giorni su tutti i dispositivi, con Premium si apre tutto quello che abbiamo
pubblicato, ordinato per livello.

## Cosa fa

- **Sette giochi al giorno** - Cruciverba, Mosaico, Alveare, Nessi, Chiave,
  Setaccio, Ghigliottina.
- **Difficoltà dichiarata** - ogni cruciverba è etichettato facile, medio o
  difficile, e le difficoltà si alternano nella settimana.
- **Account gratuito** - salva i tempi, sincronizza le partite fra telefono,
  tablet e desktop, sblocca gli ultimi sette giorni.
- **Premium** - archivio completo, trittici curati per livello (Facili,
  Intermedi, Difficili), edizioni Mega passate, dieci aiuti al giorno
  invece di quattro.
- **Classifiche giornaliere e mensili** - con i profili pubblici dei
  solutori e abbonamenti in premio a chi arriva in cima.
- **Il circolo dei solutori** - una community su Discord dove si discutono
  le definizioni e arrivano le segnalazioni.

## Come si fanno i giochi

La griglia la incrocia un solver, perché incrociare parole è geometria. Le
definizioni le imposta un modello linguistico istruito sulle convenzioni del
cruciverba italiano, poi le rivediamo a mano: si correggono, a volte si
buttano e si ricomincia. Lo strumento è nuovo, il mestiere no.

## Stack

Nuxt 4 e Vue 3, PostgreSQL, Stripe per gli abbonamenti, PostHog per
l'analytics. Dati ospitati in Europa, Content Security Policy stretta, il
gioco di oggi giocabile senza account e senza cookie di profilazione.

## Modello

Freemium. Il gioco del giorno resta gratis per tutti; l'account gratuito
sblocca la settimana; Premium apre l'archivio a 4,99 € al mese o 39,99 €
all'anno, con uno sconto di lancio sui primi posti.

## Stato

In produzione su [cruciverba-lab.it](https://cruciverba-lab.it).
