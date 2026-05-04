<script setup lang="ts">
const route = useRoute()
const { t, locale } = useI18n()
const collection = useProjectCollection('clients')
const slug = computed(() => String(route.params.slug))

const { data: project } = await useAsyncData(
  () => `client-${locale.value}-${slug.value}`,
  () =>
    queryCollection(collection.value)
      .where('stem', 'LIKE', `%/${slug.value}`)
      .first(),
  { watch: [collection, slug] },
)

if (!project.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Project not found',
    fatal: true,
  })
}

useSeoMeta({
  title: `${project.value.title} — Didap`,
  description: project.value.summary,
})
</script>

<template>
  <article v-if="project" class="mx-auto max-w-3xl px-6 py-20">
    <NuxtLink
      :to="useLocalePath()('/clients')"
      class="text-xs uppercase tracking-widest text-ink-soft hover:text-accent"
    >
      ← {{ t('nav.clients') }}
    </NuxtLink>

    <header class="mt-6 space-y-4">
      <div
        v-if="project.role || project.year"
        class="flex flex-wrap gap-2 text-xs uppercase tracking-widest text-ink-soft"
      >
        <span v-if="project.role">{{ project.role }}</span>
        <span v-if="project.role && project.year">·</span>
        <span v-if="project.year">{{ project.year }}</span>
      </div>
      <h1 class="font-display text-5xl leading-tight">{{ project.title }}</h1>
      <p class="text-xl text-ink-soft">{{ project.summary }}</p>
    </header>

    <div
      v-if="project.cover"
      class="mt-10 overflow-hidden rounded-lg border border-ink/10"
    >
      <img :src="project.cover" :alt="project.title" class="w-full" />
    </div>

    <div class="prose prose-stone mt-10 max-w-none">
      <ContentRenderer :value="project" />
    </div>

    <div
      v-if="project.gallery?.length"
      class="mt-10 grid gap-4 md:grid-cols-2"
    >
      <img
        v-for="(src, i) in project.gallery"
        :key="i"
        :src="src"
        :alt="`${project.title} — ${i + 1}`"
        class="w-full rounded-lg border border-ink/10"
      />
    </div>

    <div v-if="project.url" class="mt-10">
      <a
        :href="project.url"
        target="_blank"
        rel="noopener"
        class="rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-widest text-paper hover:bg-accent"
      >
        {{ t('common.visit') }} ↗
      </a>
    </div>
  </article>
</template>
