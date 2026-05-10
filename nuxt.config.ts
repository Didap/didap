import tailwindcss from '@tailwindcss/vite'

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
    bundle: {
      optimizeTranslationDirective: false,
    },
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'didap_lang',
      redirectOn: 'root',
    },
  },

  content: {
    build: {
      markdown: {
        toc: { depth: 3 },
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'it' },
      title: 'Didap',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Didap — landing aziendale.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=Inter:opsz,wght@14..32,400..500&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap',
        },
        // Preload entrambi i loghi per evitare flash quando il header si
        // contrae allo scroll e fa swap del src.
        {
          rel: 'preload',
          as: 'image',
          href: '/logo_esteso.svg',
          type: 'image/svg+xml',
        },
        {
          rel: 'preload',
          as: 'image',
          href: '/logo_contratto.svg',
          type: 'image/svg+xml',
        },
      ],
    },
  },
})
