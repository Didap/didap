<script setup lang="ts">
const { locale } = useI18n()
// Il modulo di contatto si carica alla prima apertura, non con ogni pagina
const { mounted: contactMounted } = useContactDialog()

useHead({
  htmlAttrs: { lang: locale.value },
})

watch(locale, (l) => {
  useHead({ htmlAttrs: { lang: l } })
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LazyContactDialog v-if="contactMounted" />
</template>
