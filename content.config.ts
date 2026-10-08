import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// Slot immagine della scheda prodotto: con `src` mostra l'immagine,
// senza resta il segnaposto colorato del Figma.
const mediaSlot = z.object({
  src: z.string().optional(),
  alt: z.string().optional(),
  color: z.enum(['ink', 'red', 'green', 'banana']).default('ink'),
  label: z.boolean().default(true),
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
  status: z.enum(['live', 'pilot', 'pending']).optional(),
  scope: z.string().optional(),
  stack: z.string().optional(),
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
