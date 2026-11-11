<script setup lang="ts">
import { CONTACT_EMAIL } from '#shared/contact'

// La riga legale in fondo all'ultima schermata delle pagine a schermate,
// che non hanno il footer. Carta piena sul rosso (sbiadita non regge il
// contrasto); col dito i link hanno un'area alta, senza allargare la riga
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

const link = `
  hover:underline
  pointer-coarse:-my-3 pointer-coarse:py-3
`
</script>

<template>
  <div
    class="
      absolute inset-x-0 bottom-0 page-x flex flex-wrap gap-x-6 gap-y-2
      pb-[max(24px,env(safe-area-inset-bottom))] text-label
    "
  >
    <span>© {{ year }} Didap srl</span>
    <a
      :href="`mailto:${CONTACT_EMAIL}`"
      class="normal-case"
      :class="link"
    >{{ CONTACT_EMAIL }}</a>
    <NuxtLink
      :to="localePath('/privacy')"
      :class="link"
    >
      {{ t('footer.privacy') }}
    </NuxtLink>
    <NuxtLink
      :to="localePath('/cookies')"
      :class="link"
    >
      {{ t('footer.cookies') }}
    </NuxtLink>
  </div>
</template>
