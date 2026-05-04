<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: `${t('cookies.title')} — Didap`,
  description: t('cookies.intro'),
})
</script>

<template>
  <section class="mx-auto max-w-3xl px-6 py-20">
    <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
      {{ t('cookies.kicker') }}
    </p>
    <h1 class="mt-4 font-display text-5xl">{{ t('cookies.title') }}</h1>
    <p class="mt-6 text-lg text-ink-soft">{{ t('cookies.intro') }}</p>
    <p class="mt-2 text-xs uppercase tracking-widest text-ink-soft/70">
      {{ t('cookies.updated') }}
    </p>

    <div class="prose prose-stone mt-12 max-w-none">
      <p>{{ t('cookies.placeholder') }}</p>
    </div>
  </section>
</template>
