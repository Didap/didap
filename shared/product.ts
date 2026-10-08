import { z } from 'zod'

// Campi della scheda prodotto modificabili da /admin.
// Le modifiche salvate nel database si sovrappongono al frontmatter
// markdown: una chiave presente vince sul markdown, anche se vuota
// (stringa vuota o null nascondono il blocco).

export const PRODUCT_COLORS = ['ink', 'red', 'green', 'banana'] as const
export const PRODUCT_STATUSES = ['live', 'pilot', 'pending'] as const

const text = (max: number) => z.string().trim().max(max)

// Link esterni solo http(s); immagini solo percorsi del sito o https
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((v) => /^https?:\/\//i.test(v), 'Solo link http o https')
const imageSrc = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || /^\/(?!\/)/.test(v) || /^https:\/\//i.test(v),
    'Immagine non valida',
  )

export const mediaSlotSchema = z
  .object({
    src: imageSrc.optional(),
    alt: text(300).optional(),
    color: z.enum(PRODUCT_COLORS).optional(),
    label: z.boolean().optional(),
  })
  .strict()

export const productOverrideSchema = z
  .object({
    title: text(120).min(1),
    role: text(120),
    status: z.enum(PRODUCT_STATUSES).nullable(),
    scope: text(200),
    stack: text(300),
    lede: text(600),
    url: z.union([z.literal(''), httpUrl]),
    logo: imageSrc,
    hero: mediaSlotSchema.nullable(),
    intro: text(3000),
    challenge: z.object({ title: text(200), body: text(3000) }).nullable(),
    features: z
      .object({
        title: text(200),
        items: z
          .array(z.object({ name: text(120), desc: text(600) }))
          .max(30),
      })
      .nullable(),
    model: text(3000),
    next: text(120),
    media: z.object({
      pair: z.array(mediaSlotSchema).max(2),
      wide: mediaSlotSchema.nullable(),
      feature: z.array(mediaSlotSchema).max(2),
      triple: z.array(mediaSlotSchema).max(3),
    }),
  })
  .partial()
  .strict()

export type MediaSlot = z.infer<typeof mediaSlotSchema>
export type ProductOverride = z.infer<typeof productOverrideSchema>

export const PRODUCT_LOCALES = ['it', 'en'] as const
export type ProductLocale = (typeof PRODUCT_LOCALES)[number]

export const isProductLocale = (v: unknown): v is ProductLocale =>
  typeof v === 'string' && (PRODUCT_LOCALES as readonly string[]).includes(v)

export const isProductSlug = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-z0-9-]{1,80}$/.test(v)
