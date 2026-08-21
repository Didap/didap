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
