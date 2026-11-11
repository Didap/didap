<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import RichText from '~/components/RichText.vue'
import { hostOf } from '#shared/product'
import { typeset } from '#shared/typeset'

// Caso cliente, sulla griglia della scheda prodotto: a sinistra il nome
// con ruolo e anno, a destra la frase e il link al sito. Sotto la
// copertina, il racconto in markdown nella colonna larga e la galleria.
const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
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

const host = computed(() => hostOf(project.value?.url))

const meta = computed(() =>
  typeset([project.value?.role, project.value?.year].filter(Boolean).join(' · ')),
)

useSeoMeta({
  title: `${project.value.title} - Didap`,
  description: project.value.summary,
})
</script>

<template>
  <article
    v-if="project"
    class="
      pb-24
      lg:pb-30
    "
  >
    <div class="page-x">
      <NuxtLink
        :to="localePath('/clients')"
        class="
          inline-flex min-h-11 items-center gap-2 text-label transition-colors
          hover:text-green
        "
      >
        <span aria-hidden="true">←</span>
        {{ t('nav.clients') }}
      </NuxtLink>
    </div>

    <!-- Header: a sinistra nome, ruolo e anno, a destra frase e link -->
    <header class="page-x">
      <div class="
        grid gap-x-6 gap-y-8 border-t-[1.5px] border-ink pt-8 pb-16
        lg:grid-cols-[302fr_954fr] lg:pb-20
      ">
        <div class="flex flex-col items-start gap-4">
          <h1 class="text-hero">
            {{ typeset(project.title) }}
          </h1>
          <p
            v-if="meta"
            class="text-label text-green"
          >
            {{ meta }}
          </p>
        </div>

        <div class="flex min-w-0 flex-col items-start gap-8">
          <p class="text-title">
            {{ typeset(project.summary) }}
          </p>
          <DidapButton
            v-if="project.url"
            :href="project.url"
          >
            {{ host ? t('product.open', { host }) : t('common.visit') }}
          </DidapButton>
        </div>
      </div>
    </header>

    <!-- Copertina, a tutta larghezza della griglia -->
    <div
      v-if="project.cover"
      class="page-x"
    >
      <MediaSlot
        :media="{ src: project.cover, alt: project.title }"
        class="aspect-video w-full"
      />
    </div>

    <!-- Il racconto, nella colonna larga -->
    <section class="page-x">
      <div class="
        page-grid pt-16
        lg:pt-28
      ">
        <RichText
          :value="project"
          class="lg:col-start-2"
        />
      </div>
    </section>

    <section
      v-if="project.gallery?.length"
      class="page-x"
    >
      <div class="
        grid gap-6 pt-16
        sm:grid-cols-2
        lg:pt-28
      ">
        <MediaSlot
          v-for="(src, i) in project.gallery"
          :key="i"
          :media="{ src, alt: `${project.title} - ${i + 1}` }"
          class="w-full"
        />
      </div>
    </section>
  </article>
</template>
