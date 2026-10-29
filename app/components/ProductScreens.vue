<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import HomeBar from '~/components/HomeBar.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import ScreenLegal from '~/components/ScreenLegal.vue'
import { TEAM } from '#shared/team'
import { typeset } from '#shared/typeset'

// La scheda prodotto a slide, come la home: schermate a tutto schermo.
// Apertura sul video di testata (nome, frase e l'invito a scorrere), poi il motivo (`screens.why`), cosa
// abbiamo fatto (`screens.made`, con ruolo, stack e squadra), una
// schermata per ogni voce di `features.items` con il suo video
// (`screens.media`, stesso ordine), la cosa difficile, il modello e la
// chiusura rossa col prodotto dopo. La pagina che la usa chiede
// definePageMeta({ nav: 'screens' }): niente nav né footer.
//
// Il video di una voce sta intero, alto quanto lo schermo, accanto al
// testo (`ratio` del video). Se è largo (oltre 1.3) copre lo schermo e
// il testo gli sta sopra, sul velo. In verticale il video sta in alto e
// il testo sotto.
const props = defineProps<{ slug: string }>()

const { t } = useI18n()
const localePath = useLocalePath()

const { base, overrides, project } = await useProductPage(() => props.slug)
if (!base.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
}
const nextProject = await useNextProduct(project, overrides)

useSeoMeta({
  title: () => `${project.value?.title} - Didap`,
  description: () => project.value?.lede || project.value?.summary,
})

const pad = (n: number) => String(n).padStart(2, '0')
const wide = (ratio?: string) => {
  const [w, h] = (ratio ?? '').split('/').map(Number)
  return !!w && !!h && w / h > 1.3
}

const offers = computed(() =>
  (project.value?.features?.items ?? []).map((f, i) => {
    const media = project.value?.screens?.media?.[i]
    return { ...f, media, wide: wide(media?.ratio) }
  }),
)

const team = computed(() => (project.value?.team ?? []).map(key => TEAM[key].name).join(', '))
const facts = computed(() => [
  { label: t('product.scope'), value: project.value?.scope },
  { label: t('product.stack'), value: project.value?.stack },
  { label: t('product.team'), value: team.value },
].filter(f => f.value))

// Le schermate, per il colore della barra. Sulle voci col video
// accanto "Lavoriamo insieme" sta sul video: testo carta. Niente indice
// a destra: starebbe sopra i video
const screens = computed(() => {
  const p = project.value
  if (!p) return []
  return [
    { id: 'top', light: true },
    ...(p.screens ? [
      { id: 'why', light: true },
      { id: 'made', light: false },
    ] : []),
    ...offers.value.map((f, i) => ({
      id: `offer-${i + 1}`,
      light: !f.media || f.wide,
    })),
    ...(p.challenge ? [{ id: 'challenge', light: false }] : []),
    ...(p.model ? [{ id: 'model', light: true }] : []),
    { id: 'next', light: false },
  ]
})
const at = (id: string) => screens.value.findIndex(s => s.id === id)

const root = ref<HTMLElement>()
const { active, motion } = useScreens(root)
</script>

<template>
  <article
    v-if="project"
    ref="root"
    :class="{ motion }"
  >
    <HomeBar
      shown
      :menu="project.title"
      :light="screens[active]?.light ?? true"
    />

    <!-- Apertura -->
    <section
      id="top"
      data-screen
      class="screen screen-dims bg-ink text-paper-light"
      :class="{ 'is-active': active === 0 }"
      aria-labelledby="product-title"
    >
      <div class="screen-inner h-full">
        <template v-if="project.hero">
          <img
            :src="project.hero.posterMobile ?? project.hero.poster"
            alt=""
            class="screen-backdrop"
          >
          <MediaSlot
            :media="{ alt: project.title, ...project.hero }"
            class="screen-video screen-hero absolute inset-0 size-full"
          />
        </template>
        <div
          class="screen-veil"
          aria-hidden="true"
        >
          <i
            v-for="n in 7"
            :key="n"
          />
        </div>
        <div
          class="
            absolute inset-x-0 bottom-0 z-2 page-x grid max-w-none items-end
            gap-x-12 gap-y-6
            pb-[max(clamp(28px,5vh,64px),env(safe-area-inset-bottom))]
            min-[860px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]
          "
        >
          <div class="
            grid min-w-0 gap-[18px] [text-shadow:0_1px_18px_rgb(22_20_18/0.4)]
          ">
            <h1
              id="product-title"
              class="
                reveal font-wide text-[clamp(2.25rem,1.4rem+2.6vw,4rem)]
                leading-[0.92] font-bold tracking-[-0.03em]
              "
              style="--i: 0"
            >
              {{ project.title }}
            </h1>
            <p
              class="reveal text-base/normal text-paper-light/88"
              style="--i: 1"
            >
              {{ typeset(project.lede || project.summary) }}
            </p>
          </div>
          <div
            class="
              reveal flex flex-wrap items-center gap-x-[22px] gap-y-3.5
              min-[860px]:justify-end
            "
            style="--i: 2"
          >
            <!-- Alla schermata dopo, con la stessa corsa delle altre -->
            <DidapButton
              :href="`#${screens[1]?.id}`"
              paper
            >
              {{ t('product.scroll', { name: project.title }) }}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              ><path d="M7 2v10M2.5 7.5 7 12l4.5-4.5" /></svg>
            </DidapButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Il motivo, cosa abbiamo fatto -->
    <template v-if="project.screens">
      <section
        v-for="(s, i) in [
          { id: 'why', kicker: t('product.why'), ...project.screens.why, tone: 'bg-paper text-ink' },
          { id: 'made', kicker: t('product.made'), ...project.screens.made, tone: 'bg-ink text-paper-light' },
        ]"
        :id="s.id"
        :key="s.id"
        data-screen
        class="screen"
        :class="[s.tone, { 'is-active': active === at(s.id) }]"
        :style="{ zIndex: i + 1 }"
        :aria-labelledby="`${s.id}-title`"
      >
        <div class="
          screen-inner page-x grid h-full content-center gap-x-6 gap-y-8 py-24
          lg:grid-cols-[minmax(0,302fr)_minmax(0,954fr)]
        ">
          <p
            class="reveal text-label opacity-70"
            style="--i: 0"
          >
            {{ s.kicker }}
          </p>
          <div class="grid gap-[clamp(20px,4vh,40px)]">
            <h2
              :id="`${s.id}-title`"
              class="
                reveal font-wide text-[clamp(1.875rem,1rem+3.2vw,4.5rem)]
                leading-[0.95] font-bold tracking-[-0.03em]
              "
              style="--i: 1"
            >
              {{ typeset(s.title) }}
            </h2>
            <p
              class="reveal text-body-medium"
              style="--i: 2"
            >
              {{ typeset(s.body) }}
            </p>
            <dl
              v-if="s.id === 'made' && facts.length"
              class="
                reveal grid gap-x-6 gap-y-4 border-t border-current/30 pt-6
                sm:grid-cols-3
              "
              style="--i: 3"
            >
              <div
                v-for="f in facts"
                :key="f.label"
                class="flex flex-col gap-1"
              >
                <dt class="text-label opacity-60">
                  {{ f.label }}
                </dt>
                <dd class="text-base/normal">
                  {{ typeset(f.value!) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </template>

    <!-- Cosa offre: una voce per schermata, col suo video -->
    <section
      v-for="(f, i) in offers"
      :id="`offer-${i + 1}`"
      :key="f.name"
      data-screen
      class="screen offer bg-paper text-ink"
      :class="{ 'is-active': active === at(`offer-${i + 1}`), 'offer-wide': f.wide }"
      :style="{ zIndex: at(`offer-${i + 1}`) }"
      :aria-labelledby="`offer-${i + 1}-title`"
    >
      <div
        class="screen-inner offer-grid h-full"
        :style="f.media?.ratio ? { '--ratio': f.media.ratio } : undefined"
      >
        <div
          v-if="f.media"
          class="offer-media"
        >
          <MediaSlot
            :media="f.media"
            class="screen-video size-full"
          />
        </div>
        <div
          v-if="f.wide"
          class="screen-veil offer-veil"
          aria-hidden="true"
        >
          <i
            v-for="n in 7"
            :key="n"
          />
        </div>
        <div class="
          offer-text z-2 grid content-center gap-[clamp(14px,2.6vh,28px)] px-5
          py-6
          md:px-10
          xl:px-20
        ">
          <p
            class="reveal text-label"
            style="--i: 0"
          >
            <span class="opacity-70">{{ t('product.offers') }}</span>
            <span class="ml-3 font-mono tracking-[0.04em] opacity-70">{{ pad(i + 1) }} / {{ pad(offers.length) }}</span>
          </p>
          <h2
            :id="`offer-${i + 1}-title`"
            class="
              reveal font-wide text-[clamp(2rem,1.3rem+3.6vw,5.5rem)]
              leading-[0.92] font-bold tracking-[-0.03em]
            "
            style="--i: 1"
          >
            {{ typeset(f.name) }}
          </h2>
          <p
            class="
              reveal text-body-medium
              md:text-intro
            "
            style="--i: 2"
          >
            {{ typeset(f.desc) }}
          </p>
        </div>
      </div>
    </section>

    <!-- La cosa difficile, il modello -->
    <section
      v-if="project.challenge"
      id="challenge"
      data-screen
      class="screen bg-green text-paper-light"
      :class="{ 'is-active': active === at('challenge') }"
      :style="{ zIndex: at('challenge') }"
      aria-labelledby="challenge-title"
    >
      <div class="
        screen-inner page-x grid h-full content-center gap-x-6 gap-y-8 py-24
        lg:grid-cols-[minmax(0,302fr)_minmax(0,954fr)]
      ">
        <p
          class="reveal text-label opacity-70"
          style="--i: 0"
        >
          {{ t('product.challenge') }}
        </p>
        <div class="grid gap-[clamp(20px,4vh,40px)]">
          <h2
            id="challenge-title"
            class="
              reveal font-wide text-[clamp(1.875rem,1rem+3.2vw,4.5rem)]
              leading-[0.95] font-bold tracking-[-0.03em]
            "
            style="--i: 1"
          >
            {{ typeset(project.challenge.title) }}
          </h2>
          <p
            class="reveal text-body-medium"
            style="--i: 2"
          >
            {{ typeset(project.challenge.body) }}
          </p>
        </div>
      </div>
    </section>

    <section
      v-if="project.model"
      id="model"
      data-screen
      class="screen bg-banana text-ink"
      :class="{ 'is-active': active === at('model') }"
      :style="{ zIndex: at('model') }"
      :aria-label="t('product.model')"
    >
      <div class="
        screen-inner page-x grid h-full content-center gap-x-6 gap-y-8 py-24
        lg:grid-cols-[minmax(0,302fr)_minmax(0,954fr)]
      ">
        <p
          class="reveal text-label opacity-70"
          style="--i: 0"
        >
          {{ t('product.model') }}
        </p>
        <p
          class="
            reveal font-wide text-[clamp(1.375rem,0.9rem+1.3vw,2.25rem)]
            leading-[1.2] font-bold tracking-[-0.015em]
          "
          style="--i: 1"
        >
          {{ typeset(project.model) }}
        </p>
      </div>
    </section>

    <!-- Chiusura: il prodotto dopo -->
    <section
      id="next"
      data-screen
      class="screen bg-red text-paper-light"
      :class="{ 'is-active': active === screens.length - 1 }"
      :style="{ zIndex: screens.length }"
      :aria-label="t('product.next')"
    >
      <div class="screen-inner page-x grid h-full content-center gap-10 py-24">
        <NuxtLink
          v-if="nextProject"
          :to="localePath(`/work/${productSlug(nextProject)}`)"
          class="group grid justify-items-start gap-5"
        >
          <span
            class="reveal text-label opacity-75"
            style="--i: 0"
          >{{ t('product.next') }}</span>
          <span
            class="
              reveal flex items-center gap-[0.25em] font-wide
              text-[clamp(2.75rem,1.4rem+6vw,8rem)] leading-[0.9] font-bold
              tracking-[-0.035em]
            "
            style="--i: 1"
          >
            {{ nextProject.title }}
            <svg
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              aria-hidden="true"
              class="
                size-[0.5em] transition-transform duration-300 ease-vintage
                group-hover:translate-x-1.5 group-hover:-translate-y-1.5
              "
            ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
          </span>
        </NuxtLink>
        <div
          class="reveal flex flex-wrap items-center gap-x-7 gap-y-[18px]"
          style="--i: 2"
        >
          <DidapButton
            :to="localePath('/contact')"
            paper
          >
            {{ t('nav.cta') }}
          </DidapButton>
          <NuxtLink
            :to="localePath('/work')"
            class="
              border-b-[1.5px] border-paper-light/45 py-2.5 text-button
              transition-colors
              hover:border-paper-light
            "
          >
            {{ t('product.all') }}
          </NuxtLink>
        </div>
        <ScreenLegal />
      </div>
    </section>
  </article>
</template>

<style scoped>
/* La voce: testo a sinistra, il video intero alto quanto lo schermo a
   destra, largo al massimo il 58% */
.offer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.offer-media {
  grid-column: 2;
  grid-row: 1;
  height: 100%;
  max-width: 58vw;
  aspect-ratio: var(--ratio, 1);
  overflow: hidden;
}

.offer-text {
  grid-column: 1;
  grid-row: 1;
}

.offer-veil {
  display: none;
}

/* Video largo: copre lo schermo, il testo in basso sul velo */
@media (min-aspect-ratio: 1/1) {
  .offer-wide .offer-grid {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }

  /* Assoluto in una griglia: senza colonna intera starebbe nella sua */
  .offer-wide .offer-media {
    position: absolute;
    inset: 0;
    grid-column: 1 / -1;
    width: 100%;
    max-width: none;
    aspect-ratio: auto;
  }

  .offer-wide .offer-veil {
    display: block;
  }

  .offer-wide .offer-text {
    align-content: end;
    padding-bottom: max(clamp(28px, 5vh, 64px), env(safe-area-inset-bottom));
    color: var(--color-paper-light);
    text-shadow: 0 1px 18px rgb(22 20 18 / 0.4);
  }
}

/* In verticale: il video in alto, intero, il testo sotto */
@media (max-aspect-ratio: 1/1) {
  .offer-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .offer-media {
    grid-column: 1;
    justify-self: center;
    width: min(100%, calc(50svh * var(--ratio, 1)));
    height: auto;
    max-width: none;
  }

  .offer-text {
    grid-row: 2;
    align-content: start;
    padding-top: clamp(20px, 3.5vh, 36px);
  }
}
</style>
