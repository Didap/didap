<script setup lang="ts">
import { NuxtLink } from '#components'

// Button/Primary del Figma: pillola verde, label Semibold 13 maiuscola.
// `to` per le rotte interne, `href` per i link esterni (i siti in una
// scheda nuova, mailto: no), senza nessuno dei due è un <button> (type e
// disabled passano come attributi).
// `medium`: variante della Nav, label Medium invece che Semibold.
const props = defineProps<{
  to?: string
  href?: string
  medium?: boolean
}>()

const link = computed(() => props.href ?? props.to)
</script>

<template>
  <component
    :is="link ? NuxtLink : 'button'"
    :to="link"
    :external="link ? !!href : undefined"
    :target="href?.startsWith('http') ? '_blank' : undefined"
    :class="medium ? 'text-label' : 'text-button'"
    class="
      inline-flex items-center justify-center rounded-full bg-green px-[26px]
      py-4 text-paper-light transition-colors duration-200
      hover:bg-ink
      focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-ink
      disabled:opacity-50
    "
  >
    <slot />
  </component>
</template>
