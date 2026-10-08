<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import StatusPill from '~/components/StatusPill.vue'

// Scheda prodotto - Figma "Scheda prodotto · Fanta Rainbow · Desktop 1440".
// Le sezioni compaiono solo se il frontmatter ha i dati; i prodotti senza
// scheda strutturata mostrano il corpo markdown al posto dei blocchi testo.
definePageMeta({ surface: 'cream' })

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const collection = useProjectCollection('work')
const slug = computed(() => String(route.params.slug))

const { data: project } = await useAsyncData(
  () => `work-${locale.value}-${slug.value}`,
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

// Prossimo prodotto: `next` dal frontmatter, altrimenti il successivo per `order`
const { data: allProjects } = await useAsyncData(
  () => `work-all-${locale.value}`,
  () => queryCollection(collection.value).order('order', 'ASC').all(),
  { watch: [collection] },
)

const slugOf = (p: { stem: string }) => p.stem.split('/').pop() ?? ''

const nextProject = computed(() => {
  const list = allProjects.value ?? []
  if (!project.value || list.length < 2) return null
  const wanted = project.value.next
  if (wanted) {
    const found = list.find((p) => slugOf(p) === wanted)
    if (found) return found
  }
  const i = list.findIndex((p) => p.stem === project.value?.stem)
  return list[(i + 1) % list.length] ?? null
})

const host = computed(() =>
  project.value?.url
    ? new URL(project.value.url).hostname.replace(/^www\./, '')
    : '',
)

const hasStory = computed(
  () =>
    !!(
      project.value?.intro ||
      project.value?.challenge ||
      project.value?.features ||
      project.value?.model
    ),
)

useSeoMeta({
  title: `${project.value.title} - Didap`,
  description: project.value.lede ?? project.value.summary,
})
</script>

<template>
  <article v-if="project">
    <!-- Immagine di testata, a tutta larghezza 1440x864 -->
    <MediaSlot
      v-if="project.hero"
      :media="{ alt: project.title, ...project.hero }"
      class="aspect-1440/864 max-h-[90vh] w-full"
    />

    <!-- Header -->
    <header class="page-x">
      <div class="
        flex flex-col gap-6 pt-10 pb-16
        lg:pb-20
      ">
        <p class="text-label opacity-60">
          <NuxtLink
            :to="localePath('/work')"
            class="hover:text-green"
          >{{ t('nav.work') }}</NuxtLink>
          <span
            class="whitespace-pre"
            aria-hidden="true"
          >  /  </span>
          <span>{{ project.title }}</span>
        </p>

        <h1 class="
          text-center text-display
          lg:pb-12
        ">
          {{ project.title }}
        </h1>

        <div class="
          grid gap-12
          lg:grid-cols-[412fr_844fr] lg:gap-6
        ">
          <dl class="flex flex-col gap-5">
            <div
              v-if="project.role"
              class="flex flex-col gap-1.5"
            >
              <dt class="text-label opacity-60">
                {{ t('product.category') }}
              </dt>
              <dd class="text-body">
                {{ project.role }}
              </dd>
            </div>
            <div
              v-if="project.status"
              class="flex flex-col items-start gap-1.5"
            >
              <dt class="text-label opacity-60">
                {{ t('product.status') }}
              </dt>
              <dd>
                <StatusPill :status="project.status">
                  {{ t(`home.status_${project.status}`) }}
                </StatusPill>
              </dd>
            </div>
            <div
              v-if="project.scope"
              class="flex flex-col gap-1.5"
            >
              <dt class="text-label opacity-60">
                {{ t('product.scope') }}
              </dt>
              <dd class="text-body">
                {{ project.scope }}
              </dd>
            </div>
            <div
              v-if="project.stack"
              class="flex flex-col gap-1.5"
            >
              <dt class="text-label opacity-60">
                {{ t('product.stack') }}
              </dt>
              <dd class="text-body">
                {{ project.stack }}
              </dd>
            </div>
          </dl>

          <div class="flex flex-col items-start gap-8">
            <p class="text-title">
              {{ project.lede ?? project.summary }}
            </p>
            <DidapButton
              v-if="project.url"
              :href="project.url"
            >
              {{ t('product.open', { host }) }}
            </DidapButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Immagini · due affiancate -->
    <section
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
        v-if="project.intro"
        class="page-x"
      >
        <p class="max-w-[1245px] pb-10 text-intro">
          {{ project.intro }}
        </p>
      </section>

      <!-- Immagine · larga -->
      <section
        v-if="project.media?.wide"
        class="page-x"
      >
        <MediaSlot
          :media="project.media.wide"
          class="aspect-video w-full"
        />
      </section>

      <!-- Testo · La cosa difficile -->
      <section
        v-if="project.challenge"
        class="page-x"
      >
        <div class="
          flex flex-col gap-7 py-16
          lg:pt-[69px] lg:pb-20
        ">
          <h2 class="max-w-[898px] text-hero">
            {{ project.challenge.title }}
          </h2>
          <p class="max-w-[845px] text-body-medium">
            {{ project.challenge.body }}
          </p>
        </div>
      </section>

      <!-- Testo · Cosa fa -->
      <section
        v-if="project.features"
        class="page-x"
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
            class="aspect-848/760 w-full"
          />
          <MediaSlot
            v-if="project.media.feature[1]"
            :media="project.media.feature[1]"
            class="aspect-408/385 w-full"
          />
        </div>
        <div class="
          flex flex-col gap-7 py-16
          lg:py-28
        ">
          <h2 class="max-w-[932px] text-title">
            {{ project.features.title }}
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
              <span class="text-body">{{ f.name }}</span>
              <span class="
                text-base/normal opacity-70
                md:pt-px
              ">
                {{ f.desc }}
              </span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Immagini · tre affiancate -->
      <section
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
        v-if="project.model"
        class="page-x"
      >
        <p class="
          py-16 text-body
          lg:py-28
        ">
          {{ project.model }}
        </p>
      </section>
    </template>

    <!-- Prodotti senza scheda strutturata: corpo markdown -->
    <section
      v-else
      class="page-x"
    >
      <div class="
        product-body max-w-[954px] pb-16
        lg:pb-28
      ">
        <ContentRenderer :value="project" />
      </div>
    </section>

    <!-- Prossimo prodotto -->
    <section
      v-if="nextProject"
      class="page-x"
    >
      <NuxtLink
        :to="localePath(`/work/${slugOf(nextProject)}`)"
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
  </article>
</template>

<style scoped>
/* Corpo markdown per i prodotti senza scheda strutturata,
   con gli stili di testo del Figma */
.product-body :deep(h2) {
  margin-top: 3.5rem;
  font-size: clamp(1.75rem, 1.1rem + 2vw, 2.5rem);
  line-height: 1.08;
  letter-spacing: -0.01em;
}

.product-body :deep(h2:first-child) {
  margin-top: 0;
}

.product-body :deep(p),
.product-body :deep(ul) {
  margin-top: 1.75rem;
  font-size: clamp(1.0625rem, 0.95rem + 0.4vw, 1.25rem);
  line-height: 1.5;
}

.product-body :deep(ul) {
  border-bottom: 1px solid var(--color-ink);
}

.product-body :deep(li) {
  border-top: 1px solid var(--color-ink);
  padding-block: 1.25rem;
}

.product-body :deep(a) {
  text-decoration: underline;
}

/* Nuxt Content avvolge i titoli in un link ancora */
.product-body :deep(h2 a) {
  text-decoration: none;
}

.product-body :deep(strong) {
  font-weight: 700;
}
</style>
