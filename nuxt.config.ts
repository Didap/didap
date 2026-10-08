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
