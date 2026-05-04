<script setup lang="ts">
import ProjectCard from '~/components/ProjectCard.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const collection = useProjectCollection('work')

const { data: items } = await useAsyncData(
  () => `work-list-${collection.value}`,
  () =>
    queryCollection(collection.value)
      .order('order', 'ASC')
      .order('year', 'DESC')
      .all(),
  { watch: [collection] },
)

useSeoMeta({
  title: `${t('nav.work')} — Didap`,
  description: t('work.intro'),
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 py-20">
    <header class="mb-12 max-w-2xl space-y-4">
      <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
        {{ t('work.kicker') }}
      </p>
      <h1 class="font-display text-5xl">{{ t('work.title') }}</h1>
      <p class="text-lg text-ink-soft">{{ t('work.intro') }}</p>
    </header>

    <div v-if="items?.length" class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <ProjectCard
        v-for="p in items"
        :key="p.path"
        :to="localePath(`/work/${p.stem.split('/').pop()}`)"
        :title="p.title"
        :summary="p.summary"
        :cover="p.cover"
        :year="p.year"
        :tags="p.tags"
      />
    </div>
    <p v-else class="text-ink-soft">{{ t('common.no_items') }}</p>
  </section>
</template>
