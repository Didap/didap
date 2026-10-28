import tailwindcss from '@tailwindcss/vite'
import { typesetBody } from './shared/typeset'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: true },

  modules: ['@nuxt/content', '@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    defaultLocale: 'it',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'it', language: 'it-IT', name: 'Italiano', file: 'it.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'didap_lang',
      redirectOn: 'root',
    },
  },

  // Radar bandi: un giro ogni 15 minuti, poi decide lui cosa fare
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: { '*/15 * * * *': ['radar:tick'] },
  },

  // Il corpo in markdown dei contenuti segue le regole di sbandieramento
  // (docs/copy/sbandieramento.md): a bandiera, parole brevi legate.
  hooks: {
    'content:file:afterParse'(ctx) {
      if (ctx.content.body) typesetBody(ctx.content.body)
    },
  },

  content: {
    build: {
      markdown: {
        toc: { depth: 3 },
      },
    },
  },

  // Preventivi per i clienti: link privati, mai in cache condivise né indicizzati
  routeRules: {
    '/p/**': {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
      },
    },
    // Il token del link d'invito o di reset non deve uscire nel Referer
    '/admin/password': {
      headers: { 'Referrer-Policy': 'no-referrer' },
    },
    // Dati dei preventivi: mai in cache né indicizzati
    '/api/quotes/**': {
      headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' },
    },
    '/api/admin/**': {
      headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'it' },
      title: 'Didap',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Didap - landing aziendale.' },
      ],
      link: [
        // Obviously via Adobe Fonts (kit ctd0ukv)
        { rel: 'preconnect', href: 'https://use.typekit.net', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://use.typekit.net/ctd0ukv.css' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
