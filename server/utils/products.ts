import type { H3Event } from 'h3'
import { queryCollection } from '@nuxt/content/nitro'

// Il prodotto deve esistere nei contenuti markdown (collezione italiana)
export async function requireProduct(event: H3Event, slug: string) {
  const found = await queryCollection(event, 'work_it')
    .where('stem', 'LIKE', `%/${slug}`)
    .first()
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Prodotto non trovato' })
}
