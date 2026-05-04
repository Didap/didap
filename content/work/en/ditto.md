---
title: Ditto
summary: Extract a full design system from any website in 30 seconds and export it for Claude, Cursor, ChatGPT, Stitch, Figma, WordPress and Elementor.
role: Design
cover: /covers/ditto.jpg
url: https://dittodesign.dev/en
tags:
  - web app
  - SaaS
  - AI tooling
  - design system
featured: true
order: 1
---

## The product

Ditto is our tool for extracting the design system of any website and
turning it, in a few seconds, into the format your IDE or platform actually
needs — `DESIGN.md` for Claude, Cursor, ChatGPT or Lovable, Google Stitch's
strict spec, Figma variables, a WordPress FSE theme, an Elementor theme,
a Tailwind config, Storybook, React components.

Zero AI tokens spent on extraction: we use Puppeteer and pure CSS
reverse-engineering. What you see is what you get — colors, typography,
spacing, shadows, border-radii — faithful to the source site.

## What Ditto does

- **Extract from a URL** — paste a link, get tokens and full coverage of
  colors, fonts, scales and motion in 30 seconds.
- **Six preview pages** — Landing, Dashboard, Auth, Pricing, Blog,
  Components. They re-paint live with your design system.
- **Hybrid generation** — pull from multiple sites at once and blend the
  inspirations into a coherent design.
- **Multi-platform export** — `DESIGN.md` for AI coding agents, syncable
  Figma variables, install-ready WordPress FSE and Elementor themes,
  Tailwind config, Storybook, React components.
- **Catalog & Devkit** — ready-made design systems unlockable with credits,
  with a full developer kit for the engineering side.
- **CLI & MCP server** — usable from the terminal and directly inside
  Claude Code via the Model Context Protocol.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Puppeteer for
extraction, PostgreSQL + Drizzle ORM, NextAuth v5 for authentication,
Stripe for payments, Resend for transactional email, PostHog for analytics.
Multi-tenant, multi-language (EN/IT/FR/ES), each account fully isolated.

## Status

Live in production at [dittodesign.dev](https://dittodesign.dev/en).
