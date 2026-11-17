---
title: Bin or Deal
summary: An aggregator of European marketplace listings for collectors, with automatic "bin vs deal" scoring against the reference prices of specialised catalogs.
role: Marketplace
cover: /covers/bin-or-deal.jpg
url: https://www.binordeal.com
logo: /covers/bin-or-deal-wordmark.svg
tags:
  - web app
  - SaaS
  - marketplace
featured: true
order: 2
status: pending
team:
  - william
  - alessandro
scope: Full-stack design and development
stack: Next.js 15, Hono, PostgreSQL, Playwright
lede: Listings from the European marketplaces, each with its verdict. Deal, Fair or Bin against the catalogue price.
hero:
  src: /covers/bin-or-deal-hero.mp4
  poster: /covers/bin-or-deal-hero-poster.webp
  srcMobile: /covers/bin-or-deal-hero-mobile.mp4
  posterMobile: /covers/bin-or-deal-hero-mobile-poster.webp
  alt: "The Bin. or Deal? headline on newsprint, with the tape of the latest verdicts running along the top and bottom and a stamp that turns Deal, Fair and then Bin"
intro: "Bin or Deal searches for a card or a coin on eBay, Vinted, Wallapop and Subito at once. Every listing becomes Deal, Fair or Bin against the catalogue price: instead of 200 listings you look at the 5 green ones."
challenge:
  title: The right price is not written on the listing.
  body: "The catalogue reference drops with the stated condition: a played card is worth 62% of a near-mint one. The marketplaces answer at different speeds, so results arrive while the list re-sorts."
features:
  title: One search, four marketplaces, one verdict.
  items:
    - name: Aggregated search
      desc: eBay, Vinted, Wallapop and Subito in one query, in parallel.
    - name: Reference price
      desc: "Cardmarket for cards, Numista for coins."
    - name: Deal, Fair or Bin
      desc: At least 18% below the reference is a Deal, more than 8% above is a Bin.
    - name: Condition counts
      desc: The reference drops for a played or damaged card.
    - name: Your own thresholds
      desc: For each product you set your own Deal and Bin prices.
    - name: Filters for collectors
      desc: "Score, marketplace and price. Lotteries stay out."
model: "Two plans are planned. Free with 10 searches a day, Pro at 4.99 € a month with unlimited searches, alerts and CSV export."
next: cruciverba-lab
media:
  pair:
    - src: /covers/bin-or-deal-logo.svg
      alt: The Bin or Deal logo
    - src: /covers/bin-or-deal-verdetto.mp4
      poster: /covers/bin-or-deal-verdetto-poster.webp
      alt: "The verdict on a Charizard listing: the price goes into the formula against the Cardmarket reference, the score lights up on its threshold and the stamp goes from Deal to Fair to Bin"
  wide:
    src: /covers/bin-or-deal-ricerca.mp4
    poster: /covers/bin-or-deal-ricerca-poster.webp
    alt: "A search for charizard base set: listings arrive from Subito, Vinted, eBay and finally Wallapop, the Deal, Fair and Bin counters go up and the Deals rise to the top of the list"
  feature:
    - src: /covers/bin-or-deal-verdi.mp4
      poster: /covers/bin-or-deal-verdi-poster.webp
      alt: "The Score filter: one click on Deal switches off Fair and Bin, the other listings disappear and only the green ones are left, then the full list comes back"
    - src: /covers/bin-or-deal-soglie.mp4
      poster: /covers/bin-or-deal-soglie-poster.webp
      alt: "Personalizza Scoring under the 185 € reference: the Deal threshold becomes 170 €, Applica Soglie saves it and a listing goes from Fair to Deal"
  triple:
    - src: /covers/bin-or-deal-condizione.mp4
      poster: /covers/bin-or-deal-condizione-poster.webp
      alt: "The same Charizard in different conditions: from near-mint to played the reference drops and the verdict changes"
    - src: /covers/bin-or-deal-lotteria.mp4
      poster: /covers/bin-or-deal-lotteria-poster.webp
      alt: "A 5 € listing that is a lottery: a fake price label replaces the price and with Escludi lotterie the listing drops out of the list"
    - src: /covers/bin-or-deal-riferimento.mp4
      poster: /covers/bin-or-deal-riferimento-poster.webp
      alt: "A wrong reference gets changed: from Charizard Base Set to Shadowless the reference price goes up and every verdict is recalculated"
---

## The product

Bin or Deal is the question every collector asks when they see a listing:
is this a steal, or are they trying it on? The product answers, automatically,
for every result.

We aggregate listings from the main European marketplaces and compare each
price against the reference of the vertical's catalog (Cardmarket for cards,
Numista for numismatics). Every listing gets a tag - **🟢 Deal**,
**🟡 Fair** or **🔴 Bin** - so search stops being "scroll through 200 ads"
and becomes "show me the 5 green ones".

## What it does

- **Aggregated search** across eBay, Vinted, Wallapop and Subito in one
  query.
- **Deal scoring** - every listing is matched in real time against the
  reference catalog price.
- **Starting verticals** - Pokémon cards (Cardmarket reference) and
  collectible coins (Numista reference). More verticals on the roadmap.
- **Filters built for collectors** - price, country, freshness, score,
  condition.
- **Automatic alerts** on saved searches, by email and Telegram.
- **Privacy by design** - no listing history stored on our servers, no
  seller personal data, searches run *on behalf of* the user only when
  they ask for them.

## Stack

Next.js 15 (App Router) on the frontend, Hono on Fly.io for the API
layer, PostgreSQL on Neon and Redis on Upstash for cache and a BullMQ
job queue, Clerk for authentication, Stripe for subscriptions. Adapter
pattern for each marketplace and each catalog: adding a platform is a
new file, not a rewrite.

## Status

In development. Private beta opening soon for early testers.
