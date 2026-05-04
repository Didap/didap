---
title: Bin or Deal
summary: An aggregator of European marketplace listings for collectors, with automatic "bin vs deal" scoring against the reference prices of specialised catalogs.
role: Marketplace
cover: /covers/bin-or-deal.jpg
url: https://www.binordeal.com
tags:
  - web app
  - SaaS
  - marketplace
featured: true
order: 2
---

## The product

Bin or Deal is the question every collector asks when they see a listing:
is this a steal, or are they trying it on? The product answers, automatically,
for every result.

We aggregate listings from the main European marketplaces and compare each
price against the reference of the vertical's catalog (Cardmarket for cards,
Numista for numismatics). Every listing gets a tag — **🟢 Deal**,
**🟡 Fair** or **🔴 Bin** — so search stops being "scroll through 200 ads"
and becomes "show me the 5 green ones".

## What it does

- **Aggregated search** across eBay, Vinted, Wallapop and Subito in one
  query.
- **Deal scoring** — every listing is matched in real time against the
  reference catalog price.
- **Starting verticals** — Pokémon cards (Cardmarket reference) and
  collectible coins (Numista reference). More verticals on the roadmap.
- **Filters built for collectors** — price, country, freshness, score,
  condition.
- **Automatic alerts** on saved searches, by email and Telegram.
- **Privacy by design** — no listing history stored on our servers, no
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
