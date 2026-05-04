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
    },
  },
})
