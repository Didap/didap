<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import RichText from '~/components/RichText.vue'
import StatusPill from '~/components/StatusPill.vue'
import { useIntersectionObserver, useMediaQuery } from '@vueuse/core'
import { hostOf } from '#shared/product'
import { TEAM } from '#shared/team'
import { typeset } from '#shared/typeset'

// Scheda prodotto - Figma "Scheda prodotto · Fanta Rainbow · Desktop 1440".
// Le sezioni compaiono solo se il frontmatter ha i dati; i prodotti senza
// scheda strutturata mostrano il corpo markdown al posto dei blocchi testo.
// Sopra al markdown si applicano le modifiche fatte da /admin.
definePageMeta({ surface: 'cream', nav: 'product' })

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug))

const { base: baseProject, overrides, project } = await useProductPage(slug)

if (!baseProject.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Project not found',
    fatal: true,
  })
}

const nextProject = await useNextProduct(project, overrides)

const host = computed(() => hostOf(project.value?.url))

// Quando la testata esce da sotto la nav (alta 72, 97 da lg), nella nav
// arriva il logo
const hero = useTemplateRef('hero')
const heroPassed = useProductHeroPassed()
const lg = useMediaQuery('(min-width: 64rem)')
useIntersectionObserver(
  hero,
  ([entry]) => { heroPassed.value = !entry?.isIntersecting },
  { rootMargin: () => `-${lg.value ? 97 : 72}px 0px 0px 0px` },
)
onBeforeUnmount(() => { heroPassed.value = false })

const hasStory = computed(
  () =>
    !!(
      project.value?.intro ||
      project.value?.challenge ||
      project.value?.features ||
      project.value?.model
    ),
)

// Le immagini finiscono a filo: il blocco dopo stacca
const storyEndsOnImages = computed(() => hasStory.value && !project.value?.model)

const team = computed(() => (project.value?.team ?? []).map(key => ({ key, ...TEAM[key] })))

useSeoMeta({
  title: () => `${project.value?.title} - Didap`,
  description: () => project.value?.lede || project.value?.summary,
})
</script>

<template>
  <article v-if="project">
    <!-- Immagine di testata, a tutta larghezza 1440x864 -->
    <MediaSlot
      ref="hero"
      data-preview-section="testata"
      v-if="project.hero"
      :media="{ alt: project.title, ...project.hero }"
      class="aspect-1440/864 max-h-[90vh] w-full"
    />

    <!-- Header: sulla stessa griglia dei blocchi sotto. A sinistra il
         nome e lo stato, a destra la frase e il link -->
    <header class="page-x" data-preview-section="scheda">
      <div class="
        grid gap-x-6 gap-y-8 pt-12 pb-16
        lg:grid-cols-[302fr_954fr] lg:pt-16 lg:pb-20
      ">
        <div class="flex flex-col items-start gap-4">
          <h1 class="text-hero">
            {{ project.title }}
          </h1>
          <StatusPill
            v-if="project.status"
            :status="project.status"
          >
            {{ t(`home.status_${project.status}`) }}
          </StatusPill>
        </div>

        <div class="flex flex-col items-start gap-8">
          <p class="text-title">
            {{ typeset(project.lede || project.summary) }}
          </p>
          <DidapButton
            v-if="project.url"
            :href="project.url"
          >
            {{ t('product.open', { host }) }}
          </DidapButton>
          <!-- Prodotto non ancora uscito: la richiesta passa dai contatti -->
          <DidapButton
            v-else-if="project.notify"
            :to="localePath({ path: '/contact', query: { product: project.title } })"
          >
            {{ t('product.notify') }}
          </DidapButton>
        </div>
      </div>
    </header>

    <!-- Immagini · due affiancate -->
    <section
      data-preview-section="prodotto"
      v-if="project.media?.pair?.length"
      class="page-x"
    >
      <div class="
        grid gap-6 pb-[35px]
        sm:grid-cols-2
      ">
        <MediaSlot
          v-for="(m, i) in project.media.pair"
          :key="i"
          :media="m"
          class="aspect-628/760 w-full"
        />
      </div>
    </section>

    <template v-if="hasStory">
      <!-- Testo · Il prodotto -->
      <section
        data-preview-section="prodotto"
        v-if="project.intro"
        class="page-x"
      >
        <p class="pb-10 text-intro">
          {{ typeset(project.intro) }}
        </p>
      </section>

      <!-- Immagine · larga -->
      <section
        v-if="project.media?.wide"
        class="page-x"
      >
        <!-- Con la versione da telefono lo slot è verticale sotto sm -->
        <MediaSlot
          :media="project.media.wide"
          class="w-full"
          :class="project.media.wide.srcMobile ? `
            aspect-4/5
            sm:aspect-video
          ` : 'aspect-video'"
        />
      </section>

      <!-- Testo · La cosa difficile -->
      <section
        data-preview-section="difficile"
        v-if="project.challenge"
        class="page-x"
      >
        <div class="
          flex flex-col gap-7 py-16
          lg:pt-[69px] lg:pb-20
        ">
          <h2 class="text-hero">
            {{ typeset(project.challenge.title) }}
          </h2>
          <p class="text-body-medium">
            {{ typeset(project.challenge.body) }}
          </p>
        </div>
      </section>

      <!-- Testo · Cosa fa. Le immagini possono stare anche senza le voci:
           allora stacca il blocco dopo -->
      <section
        data-preview-section="cosafa"
        v-if="project.features || project.media?.feature?.length"
        class="page-x"
        :class="{ 'pb-6': !project.features }"
      >
        <div
          v-if="project.media?.feature?.length"
          class="
            grid items-start gap-6
            sm:grid-cols-[848fr_408fr]
          "
        >
          <MediaSlot
            :media="project.media.feature[0]"
            class="w-full"
            :class="project.media.feature[0]?.srcMobile ? `
              aspect-9/16
              sm:aspect-848/760
            ` : 'aspect-848/760'"
          />
          <MediaSlot
            v-if="project.media.feature[1]"
            :media="project.media.feature[1]"
            class="aspect-408/760 w-full"
          />
        </div>
        <div
          v-if="project.features"
          class="
            flex flex-col gap-7 py-16
            lg:py-28
          "
        >
          <h2 class="text-title">
            {{ typeset(project.features.title) }}
          </h2>
          <ul>
            <li
              v-for="f in project.features.items"
              :key="f.name"
              class="
                grid gap-1 border-t border-ink py-5
                md:grid-cols-[302fr_954fr] md:gap-6
              "
            >
              <span class="text-body">{{ typeset(f.name) }}</span>
              <span class="
                text-base/normal opacity-70
                md:pt-px
              ">
                {{ typeset(f.desc) }}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Immagini · tre affiancate -->
      <section
        data-preview-section="chiusura"
        v-if="project.media?.triple?.length"
        class="page-x"
      >
        <div class="
          grid gap-6
          sm:grid-cols-3
        ">
          <MediaSlot
            v-for="(m, i) in project.media.triple"
            :key="i"
            :media="m"
            class="aspect-[410.7/540] w-full"
          />
        </div>
      </section>

      <!-- Testo · Modello -->
      <section
        data-preview-section="chiusura"
        v-if="project.model"
        class="page-x"
      >
        <p class="
          py-16 text-body
          lg:py-28
        ">
          {{ typeset(project.model) }}
        </p>
      </section>
    </template>

    <!-- Prodotti senza scheda strutturata: corpo markdown -->
    <section
      v-else
      class="page-x"
    >
      <RichText
        :value="project"
        class="
          pb-16
          lg:pb-28
        "
      />
    </section>

    <!-- Chiusura: stacca dalle immagini se manca il Modello -->
    <div :class="storyEndsOnImages ? `
      mt-16
      lg:mt-28
    ` : ''">
      <!-- Ci hanno messo le mani -->
      <section
        v-if="team.length"
        class="page-x"
      >
        <div class="
          grid gap-8 border-t-[1.5px] border-ink pt-8 pb-24
          lg:grid-cols-[302fr_954fr] lg:gap-6 lg:pb-30
        ">
          <h2 class="text-label text-green">
            {{ t('product.team') }}
          </h2>
          <ul class="
            grid grid-cols-3 gap-x-6 gap-y-8
            sm:grid-cols-5
          ">
            <li
              v-for="m in team"
              :key="m.key"
              class="flex min-w-0 flex-col gap-3"
            >
              <div
                class="
                  flex aspect-[193.3/250] w-full items-center justify-center
                "
                :class="m.bg"
              >
                <img
                  :src="`/team/illustrations/${m.key}.svg`"
                  alt=""
                  class="h-auto"
                  :class="m.width"
                >
              </div>
              <p class="text-body">
                {{ m.name }}
              </p>
            </li>
          </ul>
        </div>
      </section>

      <!-- Prossimo prodotto -->
      <section
        data-preview-section="chiusura"
        v-if="nextProject"
        class="page-x"
      >
        <NuxtLink
          :to="localePath(`/work/${productSlug(nextProject)}`)"
          class="
            group flex flex-col gap-12 border-t-[1.5px] border-ink pt-8 pb-24
            lg:pb-30
          "
        >
          <span class="text-label text-green">
            {{ t('product.next') }}
          </span>
          <span class="
            text-display transition-colors
            group-hover:text-green
          ">
            {{ nextProject.title }}
          </span>
          <MediaSlot
            :media="nextProject.hero ?? { color: 'ink' }"
            class="aspect-1280/480 w-full"
          />
        </NuxtLink>
      </section>
    </div>
  </article>
</template>
