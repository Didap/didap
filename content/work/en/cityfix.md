---
title: CityFix
summary: An urban regeneration platform that connects citizens, municipalities and suppliers to report, manage and resolve interventions across the city.
role: Cities
cover: /covers/cityfix.jpg
tags:
  - PA
  - app
  - web app
  - SaaS
  - civic tech
featured: true
order: 3
---

## The product

CityFix is our platform for taking care of the city: a citizen reports a
pothole, a broken bench, a dead street light; the municipality receives,
triages and assigns; the supplier carries out the work and closes the
intervention. One flow, end to end, traced from start to finish.

Built to scale to all of Italy's ~8,000 municipalities: every authority
is an isolated tenant — its operators, its suppliers, its data — with
isolation enforced at both the application and the database layer.

## What it does

- **Citizen app** — reports with photos and geolocation, real-time status,
  direct communication with the municipality.
- **Municipal backoffice** — report triage, supplier assignment, team and
  operator management, territorial analytics.
- **Supplier workflow** — receives work orders, updates status, closes
  interventions with photographic evidence.
- **Roles and permissions** — `super_admin`, `admin_comunale`, `operator`,
  `supplier`, `citizen`, each with their own scope and capabilities.
- **Real multi-tenancy** — ~8,000 potential municipalities, full ISTAT
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
operators and suppliers — no parallel modules, no email threads, no
spreadsheets.

## Status

In advanced development — backend complete, backoffice operative, citizen
app in MVP. Pilot scheduled with the first partner municipality.
