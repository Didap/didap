<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: `${t('nav.about')} — Didap`,
  description: t('about.intro'),
})
</script>

<template>
  <section class="mx-auto max-w-3xl px-6 py-20">
    <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
      {{ t('about.kicker') }}
    </p>
    <h1 class="mt-4 font-display text-5xl">{{ t('about.title') }}</h1>
    <p class="mt-6 text-lg text-ink-soft">{{ t('about.intro') }}</p>
    <div class="mt-10 space-y-4 text-ink-soft">
      <p>{{ t('about.body_1') }}</p>
      <p>{{ t('about.body_2') }}</p>
    </div>
  </section>
</template>
