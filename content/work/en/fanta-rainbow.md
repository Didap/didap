---
title: Fanta Rainbow
summary: Live fantasy football auctions. The house keeps the books, players open a link and bid from their phone, the countdown decides. What is left afterwards is the league, the squads and the album.
role: Fantasy football
cover: /covers/fanta-rainbow.svg
url: https://fantarainbow.com
tags:
  - web app
  - SaaS
featured: true
order: 1
status: live
scope: Full-stack design and development
stack: Nuxt 4, Vue 3, PostgreSQL, Stripe
lede: Live fantasy football auctions. The bank keeps the score, players bid from their phone, the countdown decides.
hero:
  src: /covers/fanta-rainbow-hero.mp4
  poster: /covers/fanta-rainbow-hero-poster.webp
  srcMobile: /covers/fanta-rainbow-hero-mobile.mp4
  posterMobile: /covers/fanta-rainbow-hero-mobile-poster.webp
  alt: The Fanta Rainbow logo in the middle of a floodlit football goal at night, its net moving in the wind
intro: Fanta Rainbow is the bank of a fantasy football auction. The organiser creates the auction, picks the team names and gets a personal link for each one. On auction night the board runs on the big screen and everyone else is on their phone. Whoever bids last before the countdown runs out takes the player.
challenge:
  title: No timers on the server.
  body: "Every bid writes the lot’s deadline. The first request that finds it in the past assigns the player. Two bids in the same instant never overwrite each other: the second is replayed on the updated bid. Everyone sees the same countdown on the same second, even those who are not in the room."
features:
  title: From auction night to the whole season.
  items:
    - name: Two-phase auction
      desc: A draw for the big names picked at random, a call for everyone else.
    - name: Bids from the phone
      desc: "No app and no sign-up: open your own link and raise."
    - name: Synced countdown
      desc: The client corrects the drift against the server clock.
    - name: Squad rules enforced
      desc: Full position, bid rejected. The last sale can be undone.
    - name: List import
      desc: The official Fantacalcio.it CSV, as it is.
    - name: The whole season
      desc: League, line-ups, goals, Rainbow credits and a sticker album.
model: "One-off league credit: 10 € per league, unlimited teams, only the organiser pays. No subscription and no per-player cost. Finished leagues stay readable and export to JSON."
next: cityfix
media:
  pair:
    - src: /covers/fanta-rainbow-logo.svg
      alt: The Fanta Rainbow logo
    - src: /covers/fanta-rainbow-asta.mp4
      poster: /covers/fanta-rainbow-asta-poster.webp
      alt: "A Fanta Rainbow live auction: teams outbid each other on Maignan, the countdown bar fills and resets on every bid until the player goes for 64 credits"
  wide:
    src: /covers/fanta-rainbow-gioca.mp4
    poster: /covers/fanta-rainbow-gioca-poster.webp
    srcMobile: /covers/fanta-rainbow-gioca-mobile.mp4
    posterMobile: /covers/fanta-rainbow-gioca-mobile-poster.webp
    alt: "The Fanta Rainbow challenge picker: Ranked and Torneo split by a rainbow bolt, lighting up in turn and pushing the seam aside, then Entrambi in the middle"
  feature:
    - src: /covers/fanta-rainbow-formazione.mp4
      poster: /covers/fanta-rainbow-formazione-poster.webp
      srcMobile: /covers/fanta-rainbow-formazione-mobile.mp4
      posterMobile: /covers/fanta-rainbow-formazione-mobile-poster.webp
      alt: "Setting a lineup on Fanta Rainbow: four players moved from the available list to the open spots on the pitch, then Schiera confirms the lineup for the matchday"
    - src: /covers/fanta-rainbow-stagione.mp4
      poster: /covers/fanta-rainbow-stagione-poster.webp
      alt: "The Fanta Rainbow season page: the price ticker scrolls along the top, player prices move up and down with their trend lines, then the matchday results arrive with one game still live"
  triple:
    - src: /covers/fanta-rainbow-ultimora.mp4
      poster: /covers/fanta-rainbow-ultimora-poster.webp
      alt: "Breaking news on the Gazzetta Rainbow: two injury stories take turns over the photo, the headline lands word by word and a coral stamp says how long the player is out"
    - src: /covers/fanta-rainbow-feed.mp4
      poster: /covers/fanta-rainbow-feed-poster.webp
      srcMobile: /covers/fanta-rainbow-feed-mobile.mp4
      posterMobile: /covers/fanta-rainbow-feed-mobile-poster.webp
      alt: "Gazzetta Rainbow news in two scrolling columns, with the Tutte, Mercato and Infortuni filters lighting up the stories of their category in turn"
    - src: /covers/fanta-rainbow-mercato.mp4
      poster: /covers/fanta-rainbow-mercato-poster.webp
      alt: "A Gazzetta Rainbow transfer story: the contract year rolls from 2026 to 2030, a signature draws itself and an Ufficiale stamp lands on Rabiot's new deal with Milan"
team:
  - barbara
  - william
  - cristiano
  - alessandro
  - vitantonio
---

## The product

Fanta Rainbow is the house at a fantasy football auction. The organiser
creates the auction, picks the team names and gets a personal link for each
one; on auction night the board runs on a big screen and everyone else is on
their phone. Whoever bids last before the countdown runs out takes the
player.

No spreadsheets, no credits counted by hand, no "but I said 34 before you
did": the server keeps the books and everybody sees the same countdown on
the same second. Including whoever is not in the room.

## What it does

- **A two-stage auction** - *urna*, the pool the auctioneer draws from at
  random for the star players; *chiamata*, everyone else, put up for auction
  only when someone searches them by name to fill a slot.
- **Bidding from a phone** - no app to install and no sign-up for the people
  playing: they open their own link and raise.
- **Synchronised countdown** - the client corrects the drift between its own
  clock and the server's, so playing remotely does not hand anyone an extra
  second.
- **Squad rules enforced by the house** - a full position rejects the bid;
  a credit reserve is computed on the remaining slots so every squad can be
  finished; the auctioneer can undo the last sale, refund included.
- **Player list import** - the official Fantacalcio.it CSV as it comes,
  columns matched by header rather than by position, Mantra roles folded
  back into the four classic ones.
- **The season, not just the night** - head-to-head or total-points league,
  lineups gameweek by gameweek, achievements, Rainbow credits and a sticker
  album opened in packs.

## Stack

Nuxt 4 and Vue 3 with Tailwind CSS v4, PostgreSQL queried in hand-written
SQL, Stripe for the league credit, S3 storage for images, Docker deploys.

There is no timer running on the server: every bid writes the lot's expiry,
and the first request that finds it in the past awards the player. Writes
are compare-and-swap on the row version, so two bids in the same instant
never overwrite each other - the second one is replayed against the updated
bid. Invariants are checked on every mutation (credits consistent with the
squads, no player in two teams, ledger aligned): a write that violates them
is not persisted.

## Model

A one-off league credit: 10 € per league, unlimited teams, paid by the
organiser only. No subscription, no per-participant cost, no features
locked halfway through the season. Finished leagues stay readable and
export to JSON.

## Status

Live in production at [fantarainbow.com](https://fantarainbow.com).
