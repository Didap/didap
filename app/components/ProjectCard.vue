<script setup lang="ts">
import type { MediaSlotData } from '~/components/MediaSlot.vue'
import { compareTags, TAG_TITLES, tagTone } from '#shared/product'
import { typeset } from '#shared/typeset'

// Una voce degli elenchi prodotti e partner, come "Prossimo prodotto"
// della scheda: filetto ink, label verde, immagine, titolo che diventa
// verde al passaggio. I tag sono pillole come gli stati: PA su banana,
// finanza agevolata su verde, gli altri a contorno ink.
// `media`: la testata della scheda (i prodotti). Nella card basta il suo
// fotogramma da telefono (960): un elenco di video in loop pesa troppo
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

const image = computed(() => props.media?.posterMobile ?? props.media?.poster ?? props.cover)
const meta = computed(() => [props.role, props.year].filter(Boolean).join(' · '))
const sortedTags = computed(() => [...(props.tags ?? [])].sort(compareTags))

const TAG_CLASSES = {
  pa: 'border-banana bg-banana text-ink',
  finance: 'border-green bg-green text-paper',
  plain: 'border-ink text-ink',
} as const
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
      v-if="meta"
      class="text-label text-green"
    >
      {{ typeset(meta) }}
    </p>

    <img
      v-if="image"
      :src="image"
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
        :title="TAG_TITLES[tagTone(tag)]"
        class="rounded-full border-[1.5px] px-3 py-1 text-label"
        :class="TAG_CLASSES[tagTone(tag)]"
      >
        {{ tag }}
      </li>
    </ul>
  </NuxtLink>
</template>
