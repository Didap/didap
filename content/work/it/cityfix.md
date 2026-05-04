---
title: CityFix
summary: Piattaforma di rigenerazione urbana che mette in contatto cittadini, comuni e fornitori per segnalare, gestire e risolvere gli interventi sul territorio.
year: 2026
role: Città
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

## Il prodotto

CityFix è la nostra piattaforma per la cura della città: il cittadino segnala
una buca, una panchina rotta, un palo della luce spento; il Comune riceve,
classifica e assegna; il fornitore esegue e chiude l'intervento. Tutto in
un unico flusso, tracciato dall'inizio alla fine.

Pensata per scalare a tutti i ~8.000 Comuni italiani: ogni ente è un
*tenant* isolato — i suoi operatori, i suoi fornitori, i suoi dati — con
isolamento garantito sia a livello applicativo sia a livello database.

## Cosa fa

- **App per il cittadino** — segnalazioni con foto e geolocalizzazione,
  stato in tempo reale, comunicazione diretta con il Comune.
- **Backoffice comunale** — triage delle segnalazioni, assegnazione ai
  fornitori, gestione di operatori e team, statistiche territoriali.
- **Workflow per il fornitore** — riceve gli incarichi, aggiorna lo stato,
  chiude gli interventi con prove fotografiche.
- **Ruoli e permessi** — `super_admin`, `admin_comunale`, `operator`,
  `supplier`, `citizen`, ognuno con scope e capacità diverse.
- **Multi-tenancy reale** — ~8.000 Comuni potenziali, dataset ISTAT
  precaricato, isolamento via `comune_id` + Row Level Security su
  PostgreSQL.

## Stack

Backend NestJS modulare con Drizzle ORM su PostgreSQL (RLS attivo per
l'isolamento tra Comuni). Backoffice in Vue 3 con vue-i18n. App cittadino
in Expo + NativeWind, internazionalizzata con i18next. Auth JWT con
refresh token, email transazionali via Resend, media su Cloudflare R2.
API versionata `/api/v1/` dal day-one, deploy via Docker, cloud-agnostico.

## Modello

Licenza annuale ai Comuni con quota per abitante. Un solo strumento per
tutto il ciclo di vita della segnalazione, condiviso tra ente, operatori
e fornitori — niente moduli paralleli, niente email, niente fogli di
calcolo.

## Stato

In sviluppo avanzato — backend completo, backoffice operativo, app
cittadino in fase MVP. Pilota previsto con il primo Comune partner.
