<script setup lang="ts">
import { NuxtLink } from '#components'

// Button/Primary del Figma: pillola verde, label Semibold 13 maiuscola.
// `to` per le rotte interne, `href` per i link esterni (in una scheda
// nuova, tranne mailto: e tel:), senza nessuno dei due è un <button>
// (type e disabled passano come attributi).
// `medium`: variante della Nav, label Medium invece che Semibold.
// `paper`: pillola carta con testo ink, sopra i video e il rosso della
// home a schermate.
const props = defineProps<{
  to?: string
  href?: string
  medium?: boolean
  paper?: boolean
}>()

const link = computed(() => props.href ?? props.to)
</script>

<template>
  <component
    :is="link ? NuxtLink : 'button'"
    :to="link"
    :external="link ? !!href : undefined"
    :target="href && !/^(mailto|tel):/.test(href) ? '_blank' : undefined"
    :class="[
      medium ? 'text-label' : 'text-button',
      paper ? `
        bg-paper-light text-ink
        hover:bg-ink hover:text-paper-light
        focus-visible:outline-paper-light
      ` : `
        bg-green text-paper-light
        hover:bg-ink
        focus-visible:outline-ink
      `,
    ]"
    class="
      inline-flex items-center justify-center gap-3 rounded-full px-[26px] py-4
      transition-colors duration-200
      focus-visible:outline-2 focus-visible:outline-offset-2
      disabled:opacity-50
    "
  >
    <slot />
  </component>
</template>
