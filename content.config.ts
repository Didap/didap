import { defineCollection, defineContentConfig, z } from '@nuxt/content'

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
