<script setup lang="ts">
import type { MediaSlotData } from '~/components/MediaSlot.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import { typeset } from '#shared/typeset'

// Una voce degli elenchi prodotti e partner, come "Prossimo prodotto"
// della scheda: filetto ink, label verde, immagine, titolo che diventa
// verde al passaggio. I tag sono pillole come gli stati: PA su banana,
// finanza agevolata su verde, gli altri a contorno ink.
// `media`: la testata della scheda (i prodotti), al posto di `cover`
const props = defineProps<{
  to: string
  title: string
  summary: string
  cover?: string
  media?: MediaSlotData
  role?: string
  year?: number
  tags?: string[]
}>()

// Nella card basta la versione da telefono (960), anche su desktop.
// Senza alt: il titolo della card dice già cos'è
const cardMedia = computed<MediaSlotData | undefined>(() => {
  const m = props.media
  if (!m?.src && !m?.poster) return undefined
  return { src: m.srcMobile ?? m.src, poster: m.posterMobile ?? m.poster }
})

const isPa = (tag: string) => tag.trim().toUpperCase() === 'PA'
const isFinance = (tag: string) => {
  const t = tag.trim().toLowerCase()
  return t === 'finanza agevolata' || t === 'public funding'
}

const tagWeight = (tag: string) => (isPa(tag) ? 0 : isFinance(tag) ? 1 : 2)

const sortedTags = computed(() =>
  props.tags?.length
    ? [...props.tags].sort((a, b) => tagWeight(a) - tagWeight(b))
    : [],
)
</script>

<template>
  <NuxtLink
    :to="to"
    class="
      group flex flex-col gap-5 border-t-[1.5px] border-ink pt-6
      focus-visible:outline-2 focus-visible:outline-offset-4
      focus-visible:outline-ink
    "
  >
    <p
      v-if="role || year"
      class="text-label text-green"
    >
      <span v-if="role">{{ role }}</span>
      <span v-if="role && year"> · </span>
      <span v-if="year">{{ year }}</span>
    </p>

    <MediaSlot
      v-if="cardMedia"
      :media="cardMedia"
      class="aspect-5/3 w-full"
    />
    <img
      v-else-if="cover"
      :src="cover"
      :alt="title"
      loading="lazy"
      decoding="async"
      class="aspect-video w-full bg-ink/5 object-cover"
    >
    <!-- Senza copertina: riquadro ink con l'iniziale -->
    <div
      v-else
      class="
        flex aspect-video w-full items-center justify-center bg-ink text-display
        text-paper
      "
      aria-hidden="true"
    >
      {{ title?.[0] }}
    </div>

    <div class="flex flex-col gap-3">
      <h2 class="
        text-title transition-colors
        group-hover:text-green
      ">
        {{ typeset(title) }}
      </h2>
      <p class="text-body">
        {{ typeset(summary) }}
      </p>
    </div>

    <ul
      v-if="sortedTags.length"
      class="flex flex-wrap gap-2"
    >
      <li
        v-for="tag in sortedTags"
        :key="tag"
        :title="
          isPa(tag)
            ? 'Pubblica Amministrazione'
            : isFinance(tag)
              ? 'Finanza agevolata · partner strategico'
              : undefined
        "
        class="rounded-full border-[1.5px] px-3 py-1 text-label"
        :class="
          isPa(tag)
            ? 'border-banana bg-banana text-ink'
            : isFinance(tag)
              ? 'border-green bg-green text-paper'
              : 'border-ink text-ink'
        "
      >
        {{ tag }}
      </li>
    </ul>
  </NuxtLink>
</template>
