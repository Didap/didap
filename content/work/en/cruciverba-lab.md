---
title: Cruciverba Lab
summary: "The home of Italian crosswords online. Seven new word games every day in the browser. Today's is free for everyone, the full archive comes with a subscription."
role: Games
cover: /covers/cruciverba-lab.svg
url: https://cruciverba-lab.it
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
intro: "Cruciverba Lab is our Italian puzzle publication online. Every morning there is a new crossword and nine other short games: Setaccio, Catena, Crittografato, Rulli, Chiave, Nessi, Ghigliottina, Alveare and Mosaico. On Mondays the Maxi arrives too, a 17×17 grid that lasts the whole week. You play from your phone or your computer, with no app and no sign-up."
challenge:
  title: One grid a day, written in Italian.
  body: "A program crosses the grid, because crossing words is geometry. We write the clues together with a language model schooled on the conventions of the Italian crossword, then we reread them before they go out: we fix them, and sometimes throw them out and start again. No games translated from another language."
features:
  title: Ten minutes a day, every day.
  items:
    - name: Ten games a day
      desc: They change at midnight, Italian time. The day's game is the same for everyone.
    - name: Difficulty stated up front
      desc: Every crossword is easy, medium or hard, and the levels alternate through the week.
    - name: Free account
      desc: Checks and closes your games, saves your times, opens the leaderboard and the streak.
    - name: Daily and monthly leaderboard
      desc: Every game adds points to the same leaderboard. Only the day's games count.
    - name: The archive
      desc: "With Premium, every past day of every game, and every Maxi already out."
    - name: More hints, the streak holds
      desc: On the crossword hints go from four to ten a day. One day off does not reset the streak.
model: "Freemium, with no ads. Today's games stay free for everyone. Premium opens the archive at 4.99 € a month or 39.99 € a year, with the first 7 days free. Leaderboard points are the same for everyone: Premium is worth nothing extra."
next: helllo
media:
  pair:
    - src: /covers/cruciverba-lab-logo.svg
      alt: "The Cruciverba Lab mark, a tilted crossword grid with a red centre square"
    - src: /covers/cruciverba-lab-alveare.mp4
      poster: /covers/cruciverba-lab-alveare-poster.webp
      alt: "Alveare: letters are tapped in the hexagonal cells around the required L, words come in one after another and the found-words counter climbs"
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
    - src: /covers/cruciverba-lab-ghigliottina.mp4
      poster: /covers/cruciverba-lab-ghigliottina-poster.webp
      alt: "Ghigliottina: five pairs of words, for each one the right word is picked, then the word that links them all arrives, TENERE"
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
