import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { PRODUCT_COLORS, PRODUCT_STATUSES } from './shared/product'
import { TEAM_MEMBERS } from './shared/team'

// Slot immagine della scheda prodotto: con `src` mostra l'immagine,
// senza resta il segnaposto colorato del Figma. Un `src` .mp4/.webm
// diventa un video in loop muto, con `poster` come fotogramma fermo.
// `srcMobile` e `posterMobile` sono la versione da telefono del video,
// in verticale, sotto il breakpoint sm. `ratio` ("larghezza/altezza")
// è la proporzione del video, per chi lo mostra intero (le slide);
// `backdrop` il colore del suo fondo, se diverso da quello delle slide.
const mediaSlot = z.object({
  src: z.string().optional(),
  poster: z.string().optional(),
  srcMobile: z.string().optional(),
  posterMobile: z.string().optional(),
  alt: z.string().optional(),
  color: z.enum(PRODUCT_COLORS).default('ink'),
  label: z.boolean().default(true),
  ratio: z.string().optional(),
  backdrop: z.string().optional(),
})

const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  client: z.string().optional(),
  role: z.string().optional(),
  year: z.number().int().optional(),
  date: z.string().optional(),
  cover: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  tags: z.array(z.string()).default([]),
  url: z.string().url().optional(),
  featured: z.boolean().default(false),
  strategic: z.boolean().default(false),
  order: z.number().int().default(0),
  // Scheda prodotto (Figma "Scheda prodotto · Desktop 1440")
  status: z.enum(PRODUCT_STATUSES).optional(),
  scope: z.string().optional(),
  stack: z.string().optional(),
  platform: z.string().optional(),
  // Senza `url`, il bottone "Avvisami quando esce" porta ai contatti
  notify: z.boolean().default(false),
  lede: z.string().optional(),
  hero: mediaSlot.optional(),
  intro: z.string().optional(),
  challenge: z.object({ title: z.string(), body: z.string() }).optional(),
  features: z
    .object({
      title: z.string(),
      items: z.array(z.object({ name: z.string(), desc: z.string() })),
    })
    .optional(),
  model: z.string().optional(),
  next: z.string().optional(),
  logo: z.string().optional(),
  // Ci hanno messo le mani: chiavi di shared/team.ts
  team: z.array(z.enum(TEAM_MEMBERS)).default([]),
  // Scheda a slide (components/ProductScreens.vue), scritta per chi non
  // è del mestiere: il motivo, cosa abbiamo fatto (con i passi di come
  // funziona), la cosa difficile detta semplice (se manca vale
  // `challenge`) e un video per ogni voce di `features.items`, nello
  // stesso ordine. Il resto viene dai campi della scheda
  screens: z
    .object({
      why: z.object({ title: z.string(), body: z.string() }),
      made: z.object({ title: z.string(), body: z.string(), steps: z.array(z.string()).default([]) }),
      challenge: z.object({ title: z.string(), body: z.string() }).optional(),
      media: z.array(mediaSlot).default([]),
      // Il colore di fondo dei video, intorno a loro sulle slide
      backdrop: z.string().optional(),
    })
    .optional(),
  media: z
    .object({
      pair: z.array(mediaSlot).optional(),
      wide: mediaSlot.optional(),
      feature: z.array(mediaSlot).optional(),
      triple: z.array(mediaSlot).optional(),
    })
    .optional(),
})

export default defineContentConfig({
  collections: {
    clients_it: defineCollection({
      type: 'page',
      source: 'clients/it/**/*.md',
      schema: projectSchema,
    }),
    clients_en: defineCollection({
      type: 'page',
      source: 'clients/en/**/*.md',
      schema: projectSchema,
    }),
    work_it: defineCollection({
      type: 'page',
      source: 'work/it/**/*.md',
      schema: projectSchema,
    }),
    work_en: defineCollection({
      type: 'page',
      source: 'work/en/**/*.md',
      schema: projectSchema,
    }),
  },
})
