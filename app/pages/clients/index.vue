<script setup lang="ts">
import PageIntro from '~/components/PageIntro.vue'
import ProjectCard from '~/components/ProjectCard.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const collection = useProjectCollection('clients')

const { data: items } = await useAsyncData(
  () => `clients-list-${collection.value}`,
  () =>
    queryCollection(collection.value)
      .order('order', 'ASC')
      .order('year', 'DESC')
      .all(),
  { watch: [collection] },
)

useSeoMeta({
  title: `${t('nav.clients')} - Didap`,
  description: t('clients.intro'),
})
</script>

<template>
  <div>
    <PageIntro
      :kicker="t('clients.kicker')"
      :title="t('clients.title')"
      :intro="t('clients.intro')"
    />

    <section class="
      page-x pb-24
      lg:pb-30
    ">
      <div
        v-if="items?.length"
        class="
          grid gap-x-6 gap-y-16
          md:grid-cols-2
          lg:grid-cols-3
        "
      >
        <ProjectCard
          v-for="p in items"
          :key="p.path"
          :to="localePath(`/clients/${p.stem.split('/').pop()}`)"
          :title="p.title"
          :summary="p.summary"
          :cover="p.cover"
          :role="p.role"
          :year="p.year"
          :tags="p.tags"
        />
      </div>
      <p
        v-else
        class="text-body"
      >
        {{ t('common.no_items') }}
      </p>
    </section>
  </div>
</template>
