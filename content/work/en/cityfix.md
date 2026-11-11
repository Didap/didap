---
title: CityFix
summary: The system a municipality uses to collect citizens' reports, set priorities and assign the work to local contractors. Every job tracked, from the photo to the finished work.
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
lede: From the pothole reported to the pothole fixed. The citizen reports, the municipality assigns the job to a local contractor, and whoever reported it sees every step.
hero:
  src: /covers/cityfix-hero.mp4
  poster: /covers/cityfix-hero-poster.webp
  srcMobile: /covers/cityfix-hero-mobile.mp4
  posterMobile: /covers/cityfix-hero-mobile-poster.webp
  alt: The map of Brindisi drawn in blue like a technical drawing, with report pins appearing one after another on the streets of the centre
intro: "CityFix puts every citizen report on one map: potholes, street lights, litter, public green spaces. The technical office decides what to fix first and assigns the job to a local contractor, with an amount and a deadline."
challenge:
  title: Eight thousand municipalities, one system.
  body: "Starting in a new municipality needs no installation: the municipality and the contractors work in the browser, citizens in the app. Each municipality sees only its own reports, its own users and its own contractors, isolated row by row in the database."
features:
  title: From the report to the finished job.
  items:
    - name: Reports in a chat
      desc: "A few questions, one at a time: where, what, how serious. A photo and the exact location in every report."
    - name: Fewer duplicates
      desc: If someone nearby has already reported it, the app suggests it and citizens just back it.
    - name: Jobs assigned to contractors
      desc: Priority, amount and deadline. Nearby jobs are assigned in one go, late ones stand out straight away.
    - name: Photos of the finished work
      desc: The contractor closes the job with photos and the pin on the map turns green.
    - name: Points and notices
      desc: Whoever reports and whoever backs a report earns points. The municipality sends notices even to a single neighbourhood.
    - name: The year in numbers
      desc: Spending, problems solved, deadlines met and active citizens, ready for the council.
    - name: A post for every finished job
      desc: We tell it together with the municipality on its social channels, with the photos and the street of the job.
model: "The app is free for citizens. The municipality pays an annual licence based on its population, with no limits on operators, contractors or reports, and the posts about finished jobs are included. The Bandi module, with the grants the municipality can apply for, is activated separately."
event:
  label: Hackathon
  title: Join the hackathons, become part of the project.
  body: "CityFix also grows through hackathons. The first is the Safe Mobility Hack, on 16 and 17 November 2026, with fourth- and fifth-year high-school students. Their ideas feed into Safe Mobility, a new CityFix module. Students, schools and partners can take part in this one and the ones to come: write to us."
  items:
    - name: Road safety
      desc: Report a hazard and alert the people nearby.
    - name: Local services and tourism
      desc: Monuments, shuttles and services on a map, to explore as a game.
    - name: Social impact
      desc: Problems citizens solve themselves, and neighbourhood proposals funded together.
  cta: Take part
  # Placeholder photo until the real ones exist: Vitaly Gariev on Unsplash,
  # https://unsplash.com/photos/diverse-group-of-students-gathered-around-a-laptop-8gAbl776pc0
  # (Unsplash License: free commercial use, no attribution required)
  image:
    src: /covers/cityfix-hackathon-placeholder.webp
    alt: A group of students sitting at a lecture hall desk around a laptop, looking at the screen and laughing
next: bin-or-deal
media:
  pair:
    - src: /covers/cityfix-logo.svg
      alt: The CityFix logo
    - src: /covers/cityfix-punto1.mp4
      poster: /covers/cityfix-punto1-poster.webp
      alt: "A phone showing the CityFix app chat: Giulia types via Appia 42, takes a photo of the pothole, the app suggests a similar report 30 metres away and she backs it"
  wide:
    src: /covers/cityfix-punto2.mp4
    poster: /covers/cityfix-punto2-poster.webp
    srcMobile: /covers/cityfix-punto2-mobile.mp4
    posterMobile: /covers/cityfix-punto2-mobile-poster.webp
    alt: "The municipality's backoffice assigns the pothole in via Appia 42 to Edilstrade Rossi, high priority, 480 euros and 3 days. The contractor gets the job, uploads three photos of the finished work and the job is completed"
  feature:
    - src: /covers/cityfix-resoconto.mp4
      poster: /covers/cityfix-resoconto-poster.webp
      srcMobile: /covers/cityfix-resoconto-mobile.mp4
      posterMobile: /covers/cityfix-resoconto-mobile-poster.webp
      alt: "The year in numbers: the figures climb to 412 problems solved, 87% on time, 6 days on average and 1,240 active citizens, then the monthly bars grow. Sample data"
    - src: /covers/cityfix-punto3.mp4
      poster: /covers/cityfix-punto3-poster.webp
      alt: "A phone showing the city map: the pothole in via Appia turns green, the solved counter goes up, whoever reported it earns 25 points, then the other reports close one after another"
  triple:
    - src: /covers/cityfix-post-buca.webp
      alt: "Instagram post: 'A city is never finished.' Photo of a pothole in via Fulvia, reported on CityFix"
    - src: /covers/cityfix-post-risolte.webp
      alt: "Instagram post: 128 reports solved in Brindisi this month"
    - src: /covers/cityfix-post-si-ripara.webp
      alt: "Instagram post: 'See it. Report it. It gets fixed.' Photo of damaged paving in an urban park"
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
