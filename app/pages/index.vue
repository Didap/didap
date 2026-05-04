<script setup lang="ts">
import ProjectCard from '~/components/ProjectCard.vue'

const { t } = useI18n()
const localePath = useLocalePath()

const workCollection = useProjectCollection('work')
const clientsCollection = useProjectCollection('clients')

const { data: featuredWork } = await useAsyncData(
  () => `home-work-${workCollection.value}`,
  () =>
    queryCollection(workCollection.value)
      .where('featured', '=', true)
      .order('order', 'ASC')
      .limit(3)
      .all(),
  { watch: [workCollection] },
)

const { data: featuredClients } = await useAsyncData(
  () => `home-clients-${clientsCollection.value}`,
  () =>
    queryCollection(clientsCollection.value)
      .where('featured', '=', true)
      .order('order', 'ASC')
      .limit(3)
      .all(),
  { watch: [clientsCollection] },
)

useSeoMeta({
  title: 'Didap',
  description: t('home.intro'),
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section
      class="relative overflow-hidden border-b border-ink/10"
    >
      <div
        class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-24 md:py-32"
      >
        <p
          class="text-xs uppercase tracking-[0.3em] text-ink-soft"
        >
          {{ t('home.kicker') }}
        </p>
        <h1
          class="font-display text-5xl leading-[0.95] md:text-7xl"
        >
          {{ t('home.title') }}
        </h1>
        <p class="max-w-2xl text-lg text-ink-soft">
          {{ t('home.intro') }}
        </p>
        <div class="flex flex-wrap gap-3 pt-2">
          <NuxtLink
            :to="localePath('/work')"
            class="rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-widest text-paper hover:bg-accent"
          >
            {{ t('home.cta_work') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/contact')"
            class="rounded-full border border-ink/30 px-6 py-3 text-sm uppercase tracking-widest hover:border-accent hover:text-accent"
          >
            {{ t('home.cta_contact') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Our work -->
    <section
      v-if="featuredWork?.length"
      class="border-b border-ink/10"
    >
      <div class="mx-auto max-w-6xl px-6 py-20">
        <div class="mb-10 flex items-end justify-between">
          <h2 class="font-display text-3xl md:text-4xl">
            {{ t('home.work_heading') }}
          </h2>
          <NuxtLink
            :to="localePath('/work')"
            class="text-sm uppercase tracking-widest hover:text-accent"
          >
            {{ t('home.see_all') }} →
          </NuxtLink>
        </div>
        <div class="grid gap-8 md:grid-cols-3">
          <ProjectCard
            v-for="p in featuredWork"
            :key="p.path"
            :to="localePath(`/work/${p.stem.split('/').pop()}`)"
            :title="p.title"
            :summary="p.summary"
            :cover="p.cover"
            :year="p.year"
            :tags="p.tags"
          />
        </div>
      </div>
    </section>

    <!-- Clients -->
    <section v-if="featuredClients?.length">
      <div class="mx-auto max-w-6xl px-6 py-20">
        <div class="mb-10 flex items-end justify-between">
          <h2 class="font-display text-3xl md:text-4xl">
            {{ t('home.clients_heading') }}
          </h2>
          <NuxtLink
            :to="localePath('/clients')"
            class="text-sm uppercase tracking-widest hover:text-accent"
          >
            {{ t('home.see_all') }} →
          </NuxtLink>
        </div>
        <div class="grid gap-8 md:grid-cols-3">
          <ProjectCard
            v-for="p in featuredClients"
            :key="p.path"
            :to="localePath(`/clients/${p.stem.split('/').pop()}`)"
            :title="p.title"
            :summary="p.summary"
            :cover="p.cover"
            :client="p.client"
            :year="p.year"
            :tags="p.tags"
          />
        </div>
      </div>
    </section>
  </div>
</template>
