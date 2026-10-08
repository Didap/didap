<script setup lang="ts">
// Status/* del Figma
// - live     pieno verde, testo e pallino paper
// - pilot    contorno verde 1.5, testo e pallino verdi
// - pending  contorno ink tratteggiato 1.5, testo e pallino ink
export type ProductStatus = 'live' | 'pilot' | 'pending'

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
    :class="{
      'bg-green text-paper-light': status === 'live',
      'border-[1.5px] border-green text-green': status === 'pilot',
      'border-[1.5px] border-dashed border-ink text-ink': status === 'pending',
    }"
  >
    <span
      class="size-2 rounded-full"
      :class="{
        'bg-paper-light': status === 'live',
        'bg-green': status === 'pilot',
        'bg-ink': status === 'pending',
      }"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
