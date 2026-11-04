<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import StatusPill from '~/components/StatusPill.vue'
import { useIntersectionObserver } from '@vueuse/core'
import { TEAM } from '#shared/team'
import { typeset } from '#shared/typeset'

// Scheda prodotto - Figma "Scheda prodotto · Fanta Rainbow · Desktop 1440".
// Le sezioni compaiono solo se il frontmatter ha i dati; i prodotti senza
// scheda strutturata mostrano il corpo markdown al posto dei blocchi testo.
// Sopra al markdown si applicano le modifiche fatte da /admin.
// Con `screens` (CityFix) il corpo è quello scritto per chi non è del
// mestiere: il motivo, cosa abbiamo fatto, una voce per riga col suo
// video, la cosa difficile e il modello.
definePageMeta({ surface: 'cream', nav: 'product' })

const route = useRoute()
const { t, te } = useI18n()
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

const host = computed(() => {
  if (!project.value?.url) return ''
  try {
    return new URL(project.value.url).hostname.replace(/^www\./, '')
  }
  catch {
    return ''
  }
})

// Quando la testata esce da sotto la nav, nella nav arriva il logo
const hero = useTemplateRef('hero')
const heroPassed = useProductHeroPassed()
useIntersectionObserver(
  hero,
  ([entry]) => { heroPassed.value = !entry?.isIntersecting },
  { rootMargin: '-97px 0px 0px 0px' },
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
const storyEndsOnImages = computed(() => hasStory.value && !project.value?.model && !project.value?.screens)

// Con `screens` sotto il nome c'è il ruolo (product.roles.<chiave>)
const team = computed(() => (project.value?.team ?? []).map((key) => ({
  key,
  ...TEAM[key],
  role: project.value?.screens && te(`product.roles.${key}`) ? t(`product.roles.${key}`) : '',
})))

const pad = (n: number) => String(n).padStart(2, '0')

// I gruppi di `screens.offers` (cittadino, Comune, ditta) col fondo dei
// loro video. Più video stanno affiancati alla stessa altezza: ogni
// colonna è larga quanto la proporzione del suo video
const ratio = (r?: string) => {
  const [w, h] = (r ?? '').split('/').map(Number)
  return w && h ? w / h : 1
}
const groups = computed(() => (project.value?.screens?.offers?.groups ?? []).map(g => ({
  ...g,
  media: (g.media ?? []).map(m => ({ ...m, backdrop: m.backdrop ?? project.value?.screens?.backdrop })),
  cols: (g.media ?? []).map(m => `${ratio(m.ratio)}fr`).join(' '),
})))
const challenge = computed(() => project.value?.screens?.challenge ?? project.value?.challenge)

useSeoMeta({
  title: () => `${project.value?.title} - Didap`,
  description: () => project.value?.lede || project.value?.summary,
})
</script>

<template>
  <article v-if="project">
    <!-- Immagine di testata, a tutta larghezza 1440x864. Con `screens`
         più bassa: nome e frase si vedono già all'apertura -->
    <MediaSlot
      ref="hero"
      data-preview-section="testata"
      v-if="project.hero"
      :media="{ alt: project.title, ...project.hero }"
      class="aspect-1440/864 w-full"
      :class="project.screens ? 'max-h-[72vh]' : 'max-h-[90vh]'"
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
      v-if="project.media?.pair?.length && !project.screens"
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

    <!-- Scheda scritta semplice: un blocco per tema, ognuno sotto un filo -->
    <template v-if="project.screens">
      <!-- Il problema -->
      <section
        data-preview-section="prodotto"
        class="page-x"
        aria-labelledby="why-title"
      >
        <div class="
          grid gap-8 border-t-[1.5px] border-ink pt-8 pb-16
          lg:grid-cols-[302fr_954fr] lg:gap-6 lg:pb-28
        ">
          <p class="text-label text-green">
            {{ t('product.why') }}
          </p>
          <div class="flex flex-col gap-7">
            <h2
              id="why-title"
              class="text-hero"
            >
              {{ typeset(project.screens.why.title) }}
            </h2>
            <p class="text-body-medium">
              {{ typeset(project.screens.why.body) }}
            </p>
          </div>
        </div>
      </section>

      <!-- Cosa abbiamo fatto: i passi, accanto il video che li riassume -->
      <section
        data-preview-section="prodotto"
        class="page-x"
        aria-labelledby="made-title"
      >
        <div class="
          grid gap-8 border-t-[1.5px] border-ink pt-8 pb-16
          lg:grid-cols-[302fr_954fr] lg:gap-6 lg:pb-28
        ">
          <p class="text-label text-green">
            {{ t('product.made') }}
          </p>
          <div class="flex flex-col gap-7">
            <h2
              id="made-title"
              class="text-hero"
            >
              {{ typeset(project.screens.made.title) }}
            </h2>
            <p class="text-body-medium">
              {{ typeset(project.screens.made.body) }}
            </p>
            <div
              class="grid items-start gap-6"
              :class="{ 'md:grid-cols-2': project.screens.made.media }"
            >
              <ol
                v-if="project.screens.made.steps?.length"
                class="grid gap-x-6 gap-y-5"
                :class="{ 'sm:grid-cols-3': !project.screens.made.media }"
              >
                <li
                  v-for="(step, n) in project.screens.made.steps"
                  :key="n"
                  class="grid content-start gap-2 border-t border-ink pt-4"
                >
                  <span class="font-mono text-xs tracking-[0.04em] opacity-60">{{ pad(n + 1) }}</span>
                  <span class="text-base/normal">{{ typeset(step) }}</span>
                </li>
              </ol>
              <MediaSlot
                v-if="project.screens.made.media"
                :media="project.screens.made.media"
                class="aspect-square w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- Cosa offre: un gruppo per chi lo usa, con le sue voci e i suoi
           video. Più video stanno in una fascia sotto il testo, uno solo
           accanto -->
      <section
        v-if="project.screens.offers"
        data-preview-section="cosafa"
        class="page-x"
        aria-labelledby="offers-title"
      >
        <div class="
          border-t-[1.5px] border-ink pt-8 pb-16
          lg:pb-28
        ">
          <div class="
            grid gap-8
            lg:grid-cols-[302fr_954fr] lg:gap-6
          ">
            <p class="text-label text-green">
              {{ t('product.offers') }}
            </p>
            <h2
              id="offers-title"
              class="text-hero"
            >
              {{ typeset(project.screens.offers.title) }}
            </h2>
          </div>
          <div
            v-for="g in groups"
            :key="g.label"
            class="
              mt-12 border-t border-ink pt-8
              lg:mt-20
            "
          >
            <div class="
              grid gap-6
              lg:grid-cols-[302fr_954fr]
            ">
              <p class="text-label opacity-70">
                {{ g.label }}
              </p>
              <div
                class="grid items-start gap-8"
                :class="{ 'md:grid-cols-2': g.media.length === 1 }"
              >
                <div class="flex flex-col gap-6">
                  <h3 class="text-title">
                    {{ typeset(g.title) }}
                  </h3>
                  <ul
                    class="offer-items grid gap-x-6 gap-y-5"
                    :class="{ 'offer-items-row': g.media.length !== 1 }"
                    :style="{ '--n': g.items.length }"
                  >
                    <li
                      v-for="item in g.items"
                      :key="item.name"
                      class="grid content-start gap-1.5 border-t border-ink/30 pt-4"
                    >
                      <span class="text-body-medium">{{ typeset(item.name) }}</span>
                      <span class="text-base/normal opacity-70">{{ typeset(item.desc) }}</span>
                    </li>
                  </ul>
                </div>
                <div
                  v-if="g.media.length === 1"
                  class="offer-tile"
                  :style="{ '--backdrop': g.media[0]!.backdrop, '--ratio': g.media[0]!.ratio }"
                >
                  <MediaSlot
                    :media="g.media[0]"
                    class="offer-video"
                  />
                </div>
              </div>
            </div>
            <div
              v-if="g.media.length > 1"
              class="
                offer-band mt-10
                lg:mt-12
              "
              :style="{ '--cols': g.cols }"
            >
              <div
                v-for="m in g.media"
                :key="m.src"
                class="offer-tile"
                :style="{ '--backdrop': m.backdrop, '--ratio': m.ratio }"
              >
                <MediaSlot
                  :media="m"
                  class="offer-video"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Per il Comune: cosa ci guadagna chi decide -->
      <section
        v-if="project.screens.payoff"
        data-preview-section="cosafa"
        class="page-x"
        aria-labelledby="payoff-title"
      >
        <div class="
          grid gap-8 border-t-[1.5px] border-ink pt-8 pb-16
          lg:grid-cols-[302fr_954fr] lg:gap-6 lg:pb-28
        ">
          <p class="text-label text-green">
            {{ t('product.payoff') }}
          </p>
          <div class="flex flex-col gap-7">
            <h2
              id="payoff-title"
              class="text-hero"
            >
              {{ typeset(project.screens.payoff.title) }}
            </h2>
            <div
              class="grid items-start gap-6"
              :class="{ 'md:grid-cols-2': project.screens.payoff.media }"
            >
              <p class="text-body-medium">
                {{ typeset(project.screens.payoff.body) }}
              </p>
              <MediaSlot
                v-if="project.screens.payoff.media"
                :media="project.screens.payoff.media"
                class="aspect-square w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- In fondo, più piccoli: la cosa difficile, quanto costa e come
           si parte, una riga ciascuno -->
      <section
        v-if="challenge || project.model || project.screens.start?.length"
        data-preview-section="chiusura"
        class="page-x"
      >
        <div class="
          flex flex-col divide-y divide-ink border-t-[1.5px] border-ink pb-16
          lg:pb-28
        ">
          <div
            v-if="challenge"
            class="
              grid gap-8 py-8
              lg:grid-cols-[302fr_954fr] lg:gap-6
            "
          >
            <p class="text-label text-green">
              {{ t('product.challenge') }}
            </p>
            <div class="flex flex-col gap-5">
              <h2 class="text-title">
                {{ typeset(challenge.title) }}
              </h2>
              <p class="text-body-medium">
                {{ typeset(challenge.body) }}
              </p>
            </div>
          </div>
          <div
            v-if="project.model"
            class="
              grid gap-8 py-8
              lg:grid-cols-[302fr_954fr] lg:gap-6
            "
          >
            <p class="text-label text-green">
              {{ t('product.model') }}
            </p>
            <p class="text-body-medium">
              {{ typeset(project.model) }}
            </p>
          </div>
          <div
            v-if="project.screens.start?.length"
            class="
              grid gap-8 py-8
              lg:grid-cols-[302fr_954fr] lg:gap-6
            "
          >
            <p class="text-label text-green">
              {{ t('product.start') }}
            </p>
            <div class="flex flex-col items-start gap-8">
              <ol class="
                grid w-full gap-x-6 gap-y-5
                sm:grid-cols-3
              ">
                <li
                  v-for="(step, n) in project.screens.start"
                  :key="n"
                  class="grid content-start gap-2 border-t border-ink/30 pt-4"
                >
                  <span class="font-mono text-xs tracking-[0.04em] opacity-60">{{ pad(n + 1) }}</span>
                  <span class="text-base/normal">{{ typeset(step) }}</span>
                </li>
              </ol>
              <DidapButton
                v-if="project.url"
                :href="project.url"
              >
                {{ t('product.open', { host }) }}
              </DidapButton>
            </div>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="hasStory">
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

      <!-- Testo · Cosa fa -->
      <section
        data-preview-section="cosafa"
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
        <div class="
          flex flex-col gap-7 py-16
          lg:py-28
        ">
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
      <div class="
        product-body pb-16
        lg:pb-28
      ">
        <ContentRenderer :value="project" />
      </div>
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
              <p class="grid gap-0.5">
                <span class="text-body">{{ m.name }}</span>
                <span
                  v-if="m.role"
                  class="text-label opacity-60"
                >{{ m.role }}</span>
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

<style scoped>
/* Le voci di un gruppo di `screens.offers`: in fila (`offer-items-row`,
   una colonna per voce) quando i video stanno nella fascia sotto */
@media (min-width: 40rem) {
  .offer-items-row {
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  }
}

/* Un video intero nel suo riquadro 4:5, del colore di fondo del video
   (`backdrop`): alto quanto il riquadro, se è più largo esce dai lati,
   se è più stretto i lati sfumano nel fondo */
.offer-tile {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--backdrop, var(--color-ink));
}

.offer-tile :deep(.offer-video) {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  width: auto;
  max-width: none;
  aspect-ratio: var(--ratio, 1);
  translate: -50% 0;
  mask-image:
    linear-gradient(to right, transparent, #000 7%, #000 93%, transparent),
    linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent);
  mask-composite: intersect;
}

/* La fascia: i video affiancati alla stessa altezza, ognuno con le sue
   proporzioni (`--cols` dalla pagina). Su telefono uno sotto l'altro,
   nel riquadro 4:5 */
.offer-band {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 48rem) {
  .offer-band {
    grid-template-columns: var(--cols);
  }

  .offer-band .offer-tile {
    aspect-ratio: var(--ratio);
  }

  .offer-band .offer-tile :deep(.offer-video) {
    left: 0;
    width: 100%;
    translate: none;
    mask-image: none;
  }
}

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
