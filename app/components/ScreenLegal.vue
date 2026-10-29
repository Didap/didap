<script setup lang="ts">
import { CONTACT_EMAIL } from '#shared/contact'

// La riga legale in fondo all'ultima schermata delle pagine a schermate,
// che non hanno il footer
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()
</script>

<template>
  <div
    class="
      absolute inset-x-0 bottom-0 page-x flex flex-wrap gap-x-6 gap-y-2
      pb-[max(24px,env(safe-area-inset-bottom))] text-label opacity-75
    "
  >
    <span>© {{ year }} Didap srl</span>
    <a
      :href="`mailto:${CONTACT_EMAIL}`"
      class="
        normal-case
        hover:underline
      "
    >{{ CONTACT_EMAIL }}</a>
    <NuxtLink
      :to="localePath('/privacy')"
      class="hover:underline"
    >
      {{ t('footer.privacy') }}
    </NuxtLink>
    <NuxtLink
      :to="localePath('/cookies')"
      class="hover:underline"
    >
      {{ t('footer.cookies') }}
    </NuxtLink>
  </div>
</template>
