---
title: Ditto
summary: Estrai un design system completo da qualsiasi sito in 30 secondi ed esportalo per Claude, Cursor, ChatGPT, Stitch, Figma, WordPress ed Elementor.
year: 2026
role: Design
cover: /covers/ditto.jpg
url: https://dittodesign.dev/it
tags:
  - web app
  - SaaS
  - AI tooling
  - design system
featured: true
order: 1
---

## Il prodotto

Ditto è il nostro strumento per estrarre il design system di qualsiasi sito web
e trasformarlo, in pochi secondi, nel formato richiesto dall'IDE o dalla
piattaforma con cui stai lavorando — `DESIGN.md` per Claude, Cursor, ChatGPT
o Lovable, la spec ufficiale di Google Stitch, variabili Figma, tema FSE
WordPress, tema Elementor, configurazione Tailwind, Storybook, componenti
React.

Niente token AI per l'estrazione: usiamo Puppeteer e analisi CSS pura. Quello
che vedi è quello che ottieni — colori, tipografia, spaziature, ombre,
border-radius — fedele al sito di partenza.

## Cosa fa Ditto

- **Estrazione da URL** — incolli un link, in 30 secondi hai i token e una
  copertura completa di colori, font, scale, motion.
- **Sei pagine di anteprima** — Landing, Dashboard, Auth, Pricing, Blog,
  Components. Si ridipingono al volo con il tuo design system.
- **Generazione ibrida** — pesca da più siti contemporaneamente e mescola
  le ispirazioni in un design coerente.
- **Export multi-piattaforma** — `DESIGN.md` per gli agenti AI di coding,
  variabili Figma sincronizzabili, temi WordPress FSE ed Elementor pronti
  da installare, Tailwind config, Storybook, componenti React.
- **Catalogo + Devkit** — design system già pronti da sbloccare a credito,
  con devkit completo per chi sviluppa.
- **CLI & MCP server** — usabile da terminale e direttamente da Claude
  Code via Model Context Protocol.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Puppeteer per
l'estrazione, PostgreSQL + Drizzle ORM, NextAuth v5 per l'autenticazione,
Stripe per i pagamenti, Resend per le email transazionali, PostHog per
l'analytics. Multi-utente, multi-lingua (IT/EN/FR/ES), tutto isolato per
account.

## Stato

In produzione su [dittodesign.dev](https://dittodesign.dev/it).
