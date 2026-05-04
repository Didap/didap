<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: `${t('nav.contact')} — Didap`,
  description: t('contact.intro'),
})
</script>

<template>
  <section class="mx-auto max-w-2xl px-6 py-20">
    <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
      {{ t('contact.kicker') }}
    </p>
    <h1 class="mt-4 font-display text-5xl">{{ t('contact.title') }}</h1>
    <p class="mt-6 text-lg text-ink-soft">{{ t('contact.intro') }}</p>

    <div class="mt-10 space-y-4 text-lg">
      <a
        href="mailto:amministrazione@didap.it"
        class="block hover:text-accent"
      >
        amministrazione@didap.it
      </a>
    </div>
  </section>
</template>
