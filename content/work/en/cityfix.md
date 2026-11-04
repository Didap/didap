---
title: CityFix
summary: An urban regeneration platform that connects citizens, municipalities and suppliers to report, manage and resolve interventions across the city.
role: Cities
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
scope: Full-stack design and development
stack: Expo, Vue 3, NestJS, PostgreSQL
lede: The citizen reports, the municipality assigns the job, the contractor fixes it. And whoever reported it sees every step.
hero:
  src: /covers/cityfix-hero.mp4
  poster: /covers/cityfix-hero-poster.webp
  srcMobile: /covers/cityfix-hero-mobile.mp4
  posterMobile: /covers/cityfix-hero-mobile-poster.webp
  alt: The map of Brindisi drawn in blue like a technical drawing, with report pins appearing one after another on the streets of the centre
intro: CityFix is city maintenance in an app. A photo and a location are all it takes to report a pothole, a dead street light or a broken bench.
challenge:
  title: Eight thousand municipalities, one system.
  body: Starting in a new city needs no installation. Each municipality sees only its own reports, its own offices and its own contractors.
model: The app is free for citizens. The municipality pays an annual licence based on its population, with no limits on operators, contractors or reports.
next: bin-or-deal
media:
  pair:
    - src: /covers/cityfix-strada.svg
      alt: "A street drawn in blue with its problems, each with a red pin: a dead street light, a broken bench, an overflowing bin and a pothole. A passer-by looks at their phone"
    - src: /covers/cityfix-scatta.mp4
      poster: /covers/cityfix-scatta-poster.webp
      alt: "A phone frames the pothole and takes the photo. The report fills in with the photo, the location and the type, then it is sent and becomes a pin that lights the first status pixel"
  wide:
    src: /covers/cityfix-giro.mp4
    poster: /covers/cityfix-giro-poster.webp
    alt: "The life of a report: the citizen photographs the pothole, the report flies to the town hall, the town hall passes it to the contractor, the van arrives and fixes it, the pin turns green and the news goes back to the citizen. At the top the four status pixels light up one by one"
  feature:
    - src: /covers/cityfix-comuni.mp4
      poster: /covers/cityfix-comuni-poster.webp
      alt: "CityFix in the middle, connected to many municipalities around it. Each one has its own padlock and its own reports, which appear and turn green only inside its tile"
    - src: /covers/cityfix-passaggi.svg
      alt: "The four states of a report, one under the other: sent from the phone, taken on by the town hall, assigned to the contractor's van, completed with fresh asphalt and a green pin"
  triple:
    - src: /covers/cityfix-insieme.svg
      alt: "Three people around the same pothole, each with a thumbs up: the report stays one, with the people who back it"
    - src: /covers/cityfix-rione.svg
      alt: "The town hall sends a notice: the waves leave the town hall and the bell reaches only the houses of the circled neighbourhood"
    - src: /covers/cityfix-riparata.mp4
      poster: /covers/cityfix-riparata-poster.webp
      alt: "A contractor's worker photographs the pothole, fills it with a shovel and photographs it again. The two photos, before and after, and the green stamp"
team:
  - barbara
  - william
  - cristiano
  - alessandro
  - vitantonio
---

## The product

CityFix is our platform for taking care of the city: a citizen reports a
pothole, a broken bench, a dead street light; the municipality receives,
triages and assigns; the supplier carries out the work and closes the
intervention. One flow, end to end, traced from start to finish.

Built to scale to all of Italy's ~8,000 municipalities: every authority
is an isolated tenant - its operators, its suppliers, its data - with
isolation enforced at both the application and the database layer.

## What it does

- **Citizen app** - reports with photos and geolocation, real-time status,
  direct communication with the municipality.
- **Municipal backoffice** - report triage, supplier assignment, team and
  operator management, territorial analytics.
- **Supplier workflow** - receives work orders, updates status, closes
  interventions with photographic evidence.
- **Roles and permissions** - `super_admin`, `admin_comunale`, `operator`,
  `supplier`, `citizen`, each with their own scope and capabilities.
- **Real multi-tenancy** - ~8,000 potential municipalities, full ISTAT
  dataset preloaded, isolation via `comune_id` + PostgreSQL Row Level
  Security.

## Stack

Modular NestJS backend with Drizzle ORM on PostgreSQL (RLS active for
inter-tenant isolation). Vue 3 backoffice with vue-i18n. Expo + NativeWind
citizen app, localised with i18next. JWT auth with refresh tokens,
transactional email via Resend, media on Cloudflare R2. Versioned API
under `/api/v1/` from day one, Docker-based deployment, cloud-agnostic.

## Model

Annual license sold to municipalities with a per-capita fee. One tool
for the entire lifecycle of a citizen report, shared between authority,
operators and suppliers - no parallel modules, no email threads, no
spreadsheets.

## Status

In advanced development - backend complete, backoffice operative, citizen
app in MVP. Pilot scheduled with the first partner municipality.
