---
title: Cruciverba Lab
summary: "The home of Italian crosswords online. Seven new word games every day in the browser. Today's is free for everyone, the full archive comes with a subscription."
role: Games
cover: /covers/cruciverba-lab.svg
url: https://cruciverba-lab.it
logo: /covers/cruciverba-lab-wordmark.svg
tags:
  - web app
  - SaaS
featured: true
order: 4
status: pending
scope: Design, development and editorial
stack: Nuxt 4, Vue 3, PostgreSQL, Stripe
lede: Ten new word games every morning, in Italian and in the browser. Today's is free for everyone, with no account and no ads.
hero:
  src: /covers/cruciverba-lab-hero.mp4
  poster: /covers/cruciverba-lab-hero-poster.webp
  srcMobile: /covers/cruciverba-lab-hero-mobile.mp4
  posterMobile: /covers/cruciverba-lab-hero-mobile-poster.webp
  alt: "The crossword of the day under the Cruciverba Lab masthead: the active clue lights up in the Across list and its answer goes into the grid letter by letter, one row after another"
intro: "Cruciverba Lab is our Italian puzzle publication online. Every morning a new crossword and nine short games, on Mondays the Maxi, a 17×17 grid that lasts the whole week."
challenge:
  title: One grid a day, written in Italian.
  body: "A program crosses the grid. We write the clues with a language model schooled on the Italian crossword and reread them one by one before they go out."
features:
  title: Ten minutes a day, every day.
  items:
    - name: Ten games a day
      desc: "They change at midnight and are the same for everyone."
    - name: Difficulty stated up front
      desc: "Easy, medium or hard, alternating through the week."
    - name: Free account
      desc: "Saves your times, opens the leaderboard and the streak."
    - name: Daily and monthly leaderboard
      desc: "Every game of the day adds points to the same leaderboard."
    - name: The archive
      desc: "With Premium, every past day and every Maxi."
    - name: More hints, the streak holds
      desc: "From four to ten hints a day on the crossword. One day off does not reset the streak."
model: "Freemium, with no ads. Premium opens the archive at 4.99 € a month or 39.99 € a year, with 7 days free. Leaderboard points are the same for everyone."
next: helllo
media:
  pair:
    - src: /covers/cruciverba-lab-logo.svg
      alt: "The Cruciverba Lab mark, a tilted crossword grid with a red centre square"
    - src: /covers/cruciverba-lab-alveare-telefono.mp4
      poster: /covers/cruciverba-lab-alveare-telefono-poster.webp
      alt: "Alveare on a phone: letters are tapped in the hexagonal cells around the required L, OLIO, MOLLE, ZOLLE, MOBILE and BOZZOLO join the found words, the score climbs and the rank goes from Uovo to Larva and then Operaia"
  wide:
    src: /covers/cruciverba-lab-classifica.mp4
    poster: /covers/cruciverba-lab-classifica-poster.webp
    srcMobile: /covers/cruciverba-lab-classifica-mobile.mp4
    posterMobile: /covers/cruciverba-lab-classifica-mobile-poster.webp
    alt: "Today's crossword leaderboard: two new times come in, solvers climb and the places reorder"
  feature:
    - src: /covers/cruciverba-lab-oggi.mp4
      poster: /covers/cruciverba-lab-oggi-poster.webp
      srcMobile: /covers/cruciverba-lab-oggi-mobile.mp4
      posterMobile: /covers/cruciverba-lab-oggi-mobile-poster.webp
      alt: "The ten games of the day, each in its own colour: they get done one after another and the Fatti oggi counter climbs to 10 out of 10"
    - src: /covers/cruciverba-lab-ghigliottina-telefono.mp4
      poster: /covers/cruciverba-lab-ghigliottina-telefono-poster.webp
      alt: "Ghigliottina on a phone: five pairs of words are uncovered one at a time and one word is picked from each, the wrong pick gets struck through, then TENERE, the word that links them all, is typed in and the links appear below"
  triple:
    - src: /covers/cruciverba-lab-chiave.mp4
      poster: /covers/cruciverba-lab-chiave-poster.webp
      alt: "Chiave: a five-letter word in six tries, the tiles turn green and yellow row by row until PRESA comes out"
    - src: /covers/cruciverba-lab-nessi.mp4
      poster: /covers/cruciverba-lab-nessi-poster.webp
      alt: "Nessi: sixteen words split into four groups, from yellow to purple, and every group found moves up into a coloured row"
    - src: /covers/cruciverba-lab-rulli.mp4
      poster: /covers/cruciverba-lab-rulli-poster.webp
      alt: "Rulli: five reels of letters turning until the middle row makes a word"
team:
  - william
  - cristiano
---

## The product

Cruciverba Lab is our Italian word games publication: a new crossword every
day plus a handful of other games, in the browser, with no app to download
and no ads. Today's puzzle is free for everyone and does not even ask you
to sign up.

The rest is archive. A free account brings back the last seven days across
every device; Premium opens everything we have published, sorted by
difficulty.

## What it does

- **Seven games a day** - Cruciverba, Mosaico, Alveare, Nessi, Chiave,
  Setaccio, Ghigliottina.
- **Difficulty stated up front** - every crossword is labelled easy, medium
  or hard, and the levels alternate through the week.
- **Free account** - saves your times, syncs games across phone, tablet and
  desktop, unlocks the last seven days.
- **Premium** - the full archive, curated sets by level (easy, intermediate,
  hard), past Mega editions, and ten hints a day instead of four.
- **Daily and monthly leaderboards** - with public solver profiles and
  subscriptions awarded to whoever ends up on top.
- **The solvers' circle** - a Discord community where the clues get argued
  over and the corrections come in.

## How the puzzles are made

The grid comes from a solver, because crossing words is geometry. The clues
are drafted by a language model schooled on the conventions of the Italian
crossword, then we go over them by hand: we fix them, and sometimes throw
them out and start again. The tool is new, the craft is not.

## Stack

Nuxt 4 and Vue 3, PostgreSQL, Stripe for subscriptions, PostHog for
analytics. Data hosted in Europe, a strict Content Security Policy, and
today's game playable with no account and no tracking cookies.

## Model

Freemium. The daily game stays free for everyone; a free account unlocks
the week; Premium opens the archive at 4.99 € a month or 39.99 € a year,
with a launch discount on the first seats.

## Status

Live in production at [cruciverba-lab.it](https://cruciverba-lab.it).
