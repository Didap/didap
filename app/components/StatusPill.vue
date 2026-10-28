<script setup lang="ts">
import type { ProductStatus } from '#shared/product'

// Status/* del Figma
// - live         pieno verde, testo e pallino paper
// - development  come live (Status/In sviluppo)
// - pilot        contorno verde 1.5, testo e pallino verdi
// - pending      contorno ink tratteggiato 1.5, testo e pallino ink
const FILLED = { pill: 'bg-green text-paper-light', dot: 'bg-paper-light' }
const STYLES: Record<ProductStatus, { pill: string, dot: string }> = {
  live: FILLED,
  development: FILLED,
  pilot: { pill: 'border-[1.5px] border-green text-green', dot: 'bg-green' },
  pending: { pill: 'border-[1.5px] border-dashed border-ink text-ink', dot: 'bg-ink' },
}

defineProps<{
  status: ProductStatus
}>()
</script>

<template>
  <span
    class="
      inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5
      text-label
    "
    :class="STYLES[status].pill"
  >
    <span
      class="size-2 rounded-full"
      :class="STYLES[status].dot"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
