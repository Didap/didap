---
title: CityFix
summary: An urban regeneration platform that connects citizens, municipalities and suppliers to report, manage and resolve interventions across the city.
role: Cities
cover: /covers/cityfix.jpg
url: https://cityfix.io
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
lede: The citizen reports, the municipality assigns, the supplier fixes. Every step stays on record.
hero:
  src: /covers/cityfix-hero.mp4
  poster: /covers/cityfix-hero-poster.webp
  srcMobile: /covers/cityfix-hero-mobile.mp4
  posterMobile: /covers/cityfix-hero-mobile-poster.webp
  alt: The map of Brindisi drawn in blue like a technical drawing, with report pins appearing one after another on the streets of the centre
intro: "CityFix is the platform for looking after a city. The citizen opens the app, answers a few questions and sends the location and a photo of a pothole, a dead street light or a broken bench. The municipality receives it in the back office, acknowledges it and assigns it to a supplier. The supplier does the work and closes it. Every status change reaches the phone of the person who reported it."
challenge:
  title: Eight thousand municipalities, one database.
  body: "Every municipality is a separate authority: its own operators, its own suppliers, its own reports. One deployment has to serve all of them without a single record crossing from one to another. Every row carries its municipality and PostgreSQL enforces the isolation with Row Level Security, underneath the application code. The ISTAT registry of every Italian municipality is already loaded."
features:
  title: From the pothole in the street to the closed job.
  items:
    - name: Guided reporting
      desc: A short conversation. Location, photo, type of problem and send, in under a minute.
    - name: No duplicates
      desc: "Before sending, the app shows nearby reports: you can back the one that is already there."
    - name: Status always visible
      desc: Sent, acknowledged, assigned, completed. The citizen sees every step.
    - name: Municipal back office
      desc: Open and overdue reports, grouped by place, on the map and in a table.
    - name: Suppliers
      desc: Applications, job assignment, documents and reviews.
    - name: Neighbourhoods and notices
      desc: The municipality's zones from OpenStreetMap and notices for one zone or the whole city.
model: The app is free for citizens. The municipality pays an annual licence based on its population, covering operators, suppliers and reports with no limits. One tool for the whole life of a report, instead of emails, forms and spreadsheets.
next: bin-or-deal
media:
  pair:
    - src: /covers/cityfix-logo.svg
      alt: The CityFix logo
    - src: /covers/cityfix-segnala.mp4
      poster: /covers/cityfix-segnala-poster.webp
      alt: "Guided reporting in the CityFix app: the bot asks where the problem is, the location, the photo and the type come in, then Invia sends the report to the municipality"
  wide:
    src: /covers/cityfix-backoffice.mp4
    poster: /covers/cityfix-backoffice-poster.webp
    alt: "The back office of the Comune di Brindisi: a new report lands at the top of the open list, the operator acknowledges it, assigns it to a supplier and the In corso count goes up"
  feature:
    - src: /covers/cityfix-mappa.mp4
      poster: /covers/cityfix-mappa-poster.webp
      srcMobile: /covers/cityfix-mappa-mobile.mp4
      posterMobile: /covers/cityfix-mappa-mobile-poster.webp
      alt: "The report map in the CityFix app: blue pins on the streets of Brindisi, one lifts and opens its card, and the bar button turns from Segnala ora to Sostieni"
    - src: /covers/cityfix-stato.mp4
      poster: /covers/cityfix-stato-poster.webp
      alt: "A report in detail: the four status pixels fill one at a time, from Inviata to Completata, while the history grows"
  triple:
    - src: /covers/cityfix-chiusura.mp4
      poster: /covers/cityfix-chiusura-poster.webp
      alt: "The supplier closes the job: the photo of the pothole wipes into the photo of the new asphalt and a Completata stamp lands"
    - src: /covers/cityfix-sostieni.mp4
      poster: /covers/cityfix-sostieni-poster.webp
      alt: "Backing a report: someone who sees the same pothole taps Sostieni, the button turns to Sostenuta, one more avatar joins and the count goes to 7 people"
    - src: /covers/cityfix-avviso.mp4
      poster: /covers/cityfix-avviso-poster.webp
      alt: "A notice from the municipality for the Centro neighbourhood: the zone draws itself on the map of Brindisi and the notice about water main works comes in, valid until 31 October"
team:
  - barbara
  - william
  - cristiano
  - alessandro
  - vitantonio
screens:
  why:
    title: A pothole doesn't fix itself.
    body: "Whoever spots it often doesn't know who to tell. If they do, the report passes from hand to hand between offices and contractors, and nobody gets back to them. So problems stay where they are and people stop reporting them."
  made:
    title: An app that takes your report all the way to the repair.
    body: "We designed and built CityFix ourselves, from scratch. It works in three steps:"
    steps:
      - You see a problem, open the app and take a photo. Your phone adds the location.
      - The municipality gets the report and hands it to the right contractor.
      - The contractor fixes it and closes the job with a photo. You get a notice at every step.
  challenge:
    title: Ready for all eight thousand Italian municipalities.
    body: "Each municipality sees only its own reports, offices and contractors, but there is a single system for everyone: starting in a new city needs no new installation. Each municipality's data stays separate from everyone else's."
  backdrop: '#2a1ce7'
  media:
    - src: /covers/cityfix-segnala.mp4
      poster: /covers/cityfix-segnala-poster.webp
      ratio: 1256/1520
      alt: "Guided reporting in the CityFix app: the bot asks where the problem is, the location, the photo and the type come in, then Invia sends the report to the municipality"
    - src: /covers/cityfix-mappa.mp4
      poster: /covers/cityfix-mappa-poster.webp
      ratio: 1696/1520
      alt: "The report map in the CityFix app: blue pins on the streets of Brindisi, one lifts and opens its card, and the bar button turns from Segnala ora to Sostieni"
    - src: /covers/cityfix-stato.mp4
      poster: /covers/cityfix-stato-poster.webp
      ratio: 816/1520
      backdrop: '#efedfd'
      alt: "A report in detail: the four status pixels fill one at a time, from Inviata to Completata, while the history grows"
    - src: /covers/cityfix-backoffice.mp4
      poster: /covers/cityfix-backoffice-poster.webp
      ratio: 1920/1080
      alt: "The back office of the Comune di Brindisi: a new report lands at the top of the open list, the operator acknowledges it, assigns it to a supplier and the In corso count goes up"
    - src: /covers/cityfix-chiusura.mp4
      poster: /covers/cityfix-chiusura-poster.webp
      ratio: 822/1080
      alt: "The supplier closes the job: the photo of the pothole wipes into the photo of the new asphalt and a Completata stamp lands"
    - src: /covers/cityfix-avviso.mp4
      poster: /covers/cityfix-avviso-poster.webp
      ratio: 822/1080
      alt: "A notice from the municipality for the Centro neighbourhood: the zone draws itself on the map of Brindisi and the notice about water main works comes in, valid until 31 October"
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
