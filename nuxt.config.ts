import { readFileSync } from 'node:fs'
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
    // Niente selettore: la lingua la sceglie il browser alla prima visita,
    // su qualsiasi pagina, e il cookie la ricorda
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'didap_lang',
      redirectOn: 'all',
    },
  },

  // Il radar bandi non ha giri automatici: gli scan si avviano dal pannello
  nitro: {
    // I file in public partono già compressi (gzip e brotli): il Lottie della
    // splash, per esempio, da 1 MB scende a circa 230 KB
    compressPublicAssets: true,
    // Il profilo di Didap per il radar, da server/radar/didap.md. Non con un
    // import del .md: il plugin raw di Nitro marca il chunk con
    // ROLLUP_NO_REPLACE, import.meta.url resta quello del chunk e tutti i
    // file di /_nuxt rispondono 404
    virtual: {
      '#didap-profile': () =>
        `export default ${JSON.stringify(readFileSync(new URL('./server/radar/didap.md', import.meta.url), 'utf8'))}`,
    },
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
    // Connettore MCP: login OAuth e metadati, mai in cache
    '/oauth/**': {
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    },
    '/.well-known/**': {
      headers: { 'Cache-Control': 'no-store' },
    },
    // Consenso: la query (state, challenge) non esce nel Referer e la pagina
    // non si apre dentro un frame altrui, dove un clic su Consenti si ruba
    '/oauth/authorize': {
      headers: {
        'Referrer-Policy': 'no-referrer',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': 'frame-ancestors \'none\'',
      },
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
