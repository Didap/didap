<script setup lang="ts">
const { locale } = useI18n()

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
</template>
