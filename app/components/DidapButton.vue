<script setup lang="ts">
// Button/Primary del Figma: pillola verde, label Semibold 13 maiuscola.
// `to` per le rotte interne, `href` per i link esterni.
// `medium`: variante della Nav, label Medium invece che Semibold.
defineProps<{
  to?: string
  href?: string
  medium?: boolean
}>()
</script>

<template>
  <NuxtLink
    :to="href ?? to"
    :external="!!href"
    :target="href ? '_blank' : undefined"
    :class="medium ? 'text-label' : 'text-button'"
    class="
      inline-flex items-center justify-center rounded-full bg-green px-[26px]
      py-4 text-paper-light transition-colors duration-200
      hover:bg-ink
      focus-visible:outline-2 focus-visible:outline-offset-2
      focus-visible:outline-ink
    "
  >
    <slot />
  </NuxtLink>
</template>
