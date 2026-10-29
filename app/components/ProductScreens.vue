<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'
import HomeBar from '~/components/HomeBar.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import ScreenHero from '~/components/ScreenHero.vue'
import ScreenLegal from '~/components/ScreenLegal.vue'
import ScreenVeil from '~/components/ScreenVeil.vue'
import { TEAM } from '#shared/team'
import { typeset } from '#shared/typeset'

// La scheda prodotto a slide, come la home: schermate a tutto schermo,
// scritte per chi non è del mestiere. Apertura sul video di testata
// (nome, frase e l'invito a scorrere), poi il motivo (`screens.why`),
// cosa abbiamo fatto con i passi di come funziona (`screens.made`), una
// schermata per ogni voce di `features.items` con il suo video
// (`screens.media`, stesso ordine), la cosa difficile (`screens.challenge`,
// se no `challenge`), il modello, chi ci ha lavorato e la chiusura rossa
// col prodotto dopo. La pagina che la usa chiede
// definePageMeta({ layout: 'screens' }): niente nav né footer.
//
// Il video di una voce sta intero, alto quanto lo schermo, accanto al
// testo (`ratio` del video). Se è largo (oltre 1.3) copre lo schermo e
// il testo gli sta sopra, sul velo. In verticale il video sta in alto e
// il testo sotto.
const props = defineProps<{ slug: string }>()

const { t, te } = useI18n()
const localePath = useLocalePath()
const ctaPath = useCtaPath()

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

// Fondo chiaro: la barra sopra va in ink
const light = (hex?: string) => {
  const [r = 0, g = 0, b = 0] = (hex?.match(/[\da-f]{2}/gi) ?? []).map(h => parseInt(h, 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

// Ogni voce col suo video e il fondo intorno. `flow`: la voce dopo ha lo
// stesso fondo, quindi tra le due scorre solo il contenuto
const offers = computed(() => {
  const list = (project.value?.features?.items ?? []).map((f, i) => {
    const media = project.value?.screens?.media?.[i]
    return { ...f, media, wide: wide(media?.ratio), backdrop: media?.backdrop ?? project.value?.screens?.backdrop }
  })
  return list.map((f, i) => {
    const next = list[i + 1]
    return { ...f, flow: !!f.media && !f.wide && !!next?.media && !next.wide && next.backdrop === f.backdrop }
  })
})

const challenge = computed(() => project.value?.screens?.challenge ?? project.value?.challenge)

// Chi ci ha lavorato: illustrazione, nome e ruolo (product.roles.<chiave>)
const team = computed(() => (project.value?.team ?? []).map(key => ({
  key,
  ...TEAM[key],
  role: te(`product.roles.${key}`) ? t(`product.roles.${key}`) : '',
})))

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
      light: !f.media || f.wide || light(f.backdrop),
    })),
    ...(challenge.value ? [{ id: 'challenge', light: false }] : []),
    ...(p.model ? [{ id: 'model', light: true }] : []),
    ...(team.value.length ? [{ id: 'team', light: true }] : []),
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
      <ScreenHero
        :media="{ alt: project.title, ...project.hero }"
        :title="project.title"
        :text="typeset(project.lede || project.summary)"
        title-id="product-title"
        as="h1"
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
      </ScreenHero>
    </section>

    <!-- Il motivo, cosa abbiamo fatto -->
    <template v-if="project.screens">
      <section
        v-for="(s, i) in [
          { id: 'why', kicker: t('product.why'), ...project.screens.why, tone: 'bg-paper text-ink' },
          { id: 'made', kicker: t('product.made'), ...project.screens.made, tone: 'enter-wipe bg-ink text-paper-light' },
        ]"
        :id="s.id"
        :key="s.id"
        data-screen
        class="screen"
        :class="[s.tone, { 'is-active': active === at(s.id) }]"
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
            <ol
              v-if="'steps' in s && s.steps?.length"
              class="
                reveal grid gap-x-6 gap-y-5
                sm:grid-cols-3
              "
              style="--i: 3"
            >
              <li
                v-for="(step, n) in s.steps"
                :key="n"
                class="grid content-start gap-2 border-t border-current/30 pt-4"
              >
                <span class="font-mono text-xs tracking-[0.04em] opacity-60">{{ pad(n + 1) }}</span>
                <span class="text-base/normal">{{ typeset(step) }}</span>
              </li>
            </ol>
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
      :class="{
        'is-active': active === at(`offer-${i + 1}`),
        'offer-wide': f.wide,
        'offer-flow': f.flow,
        'offer-flow-in': offers[i - 1]?.flow,
      }"
      :style="{ '--backdrop': f.backdrop }"
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
            class="screen-video"
          />
        </div>
        <ScreenVeil
          v-if="f.wide"
          class="offer-veil"
        />
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
      v-if="challenge"
      id="challenge"
      data-screen
      class="enter-window screen bg-green text-paper-light"
      :class="{ 'is-active': active === at('challenge') }"
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
            {{ typeset(challenge.title) }}
          </h2>
          <p
            class="reveal text-body-medium"
            style="--i: 2"
          >
            {{ typeset(challenge.body) }}
          </p>
        </div>
      </div>
    </section>

    <section
      v-if="project.model"
      id="model"
      data-screen
      class="enter-doors screen bg-banana text-ink"
      :class="{ 'is-active': active === at('model') }"
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

    <!-- Chi ci ha lavorato -->
    <section
      v-if="team.length"
      id="team"
      data-screen
      class="enter-cards screen bg-paper text-ink"
      :class="{ 'is-active': active === at('team') }"
      aria-labelledby="team-title"
    >
      <div class="
        screen-inner page-x grid h-full content-center
        gap-[clamp(24px,5vh,56px)] py-24
      ">
        <h2
          id="team-title"
          class="
            reveal font-wide text-[clamp(1.875rem,1rem+3.2vw,4.5rem)]
            leading-[0.95] font-bold tracking-[-0.03em]
          "
          style="--i: 0"
        >
          {{ t('product.team') }}
        </h2>
        <ul class="
          grid grid-cols-3 gap-x-4 gap-y-6
          sm:grid-cols-5 sm:gap-x-6
        ">
          <li
            v-for="(m, n) in team"
            :key="m.key"
            class="team-card reveal flex min-w-0 flex-col gap-3"
            :style="{ '--i': n + 1, '--n': n }"
          >
            <div
              class="
                flex aspect-[193.3/250] max-h-[42svh] w-full items-center
                justify-center
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
              <span class="text-body-medium">{{ m.name }}</span>
              <span
                v-if="m.role"
                class="text-label opacity-60"
              >{{ m.role }}</span>
            </p>
          </li>
        </ul>
      </div>
    </section>

    <!-- Chiusura: il prodotto dopo -->
    <section
      id="next"
      data-screen
      class="screen bg-red text-paper-light"
      :class="{ 'is-active': active === screens.length - 1 }"
      :aria-label="t('product.next')"
    >
      <div class="screen-inner page-x grid h-full content-center gap-10 py-24">
        <NuxtLink
          v-if="nextProject"
          :to="localePath(`/work/${productSlug(nextProject)}`)"
          class="group grid justify-items-start gap-5"
        >
          <span class="next-kicker text-label opacity-75">{{ t('product.next') }}</span>
          <span
            class="
              next-title flex items-center gap-[0.25em] font-wide
              text-[clamp(2.75rem,1.4rem+6vw,8rem)] leading-[0.9] font-bold
              tracking-[-0.035em]
            "
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
            :to="ctaPath"
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
/* La voce: testo a sinistra, a destra un riquadro largo uguale per
   tutte, del colore di fondo del video (`backdrop`), col video intero al
   centro e i bordi che sfumano nel fondo. Due voci di fila con lo stesso
   fondo (`offer-flow` sulla prima) non si coprono: scorre solo il
   contenuto */
.offer {
  --panel-w: min(44vw, calc(100svh * 0.78));
}

.offer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--panel-w);
}

.offer-media {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
  background: var(--backdrop, var(--color-ink));
}

/* Alto quanto il riquadro: se è più largo esce dai lati, se è più
   stretto i lati sfumano nel fondo */
.offer-media :deep(.screen-video) {
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

.offer-text {
  grid-column: 1;
  grid-row: 1;
}

.offer-veil {
  display: none;
}

.offer-flow .screen-inner {
  animation: none;
}

@media (min-aspect-ratio: 1/1) {
  /* Video largo: copre lo schermo, il testo in basso sul velo */
  .offer-wide .offer-grid {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }

  /* Assoluto in una griglia: senza colonna intera starebbe nella sua */
  .offer-wide .offer-media {
    position: absolute;
    inset: 0;
    grid-column: 1 / -1;
  }

  .offer-wide .offer-media :deep(.screen-video) {
    left: 0;
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    translate: none;
    mask-image: none;
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

/* In verticale: il riquadro in alto per metà schermo, il testo sotto */
@media (max-aspect-ratio: 1/1) {
  .offer-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 50svh minmax(0, 1fr);
  }

  .offer-media {
    grid-column: 1;
  }

  .offer-text {
    grid-row: 2;
    align-content: start;
    padding-top: clamp(20px, 3.5vh, 36px);
  }
}

/* Ogni schermata entra a modo suo, legata allo scroll mentre sale: il
   riquadro del video arriva da destra e il testo da sotto (non tra due
   voci con lo stesso fondo, lì scorre solo il contenuto), il video largo
   si apre come una finestra, "Cosa abbiamo fatto" si scopre da sinistra,
   la cosa difficile cresce dal centro, il modello si apre come due
   ante, la squadra arriva una carta alla volta. Nella chiusura il nome
   del prodotto dopo arriva da destra, come chi entra in scena */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .offer:not(.offer-flow-in, .offer-wide) .offer-media,
    .offer:not(.offer-flow-in, .offer-wide) .offer-text,
    .enter-wipe,
    .enter-window,
    .enter-doors,
    .next-kicker,
    .next-title,
    .team-card {
      animation-timeline: --screen;
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-range: entry 0% entry 100%;
    }

    .offer:not(.offer-flow-in, .offer-wide) .offer-media {
      animation-name: from-right;
    }

    .offer:not(.offer-flow-in, .offer-wide) .offer-text {
      animation-name: from-below;
    }

    .enter-wipe { animation-name: wipe-right; }
    .enter-window { animation-name: window; }
    .enter-doors { animation-name: doors; }
    .next-kicker { animation-name: from-left; }

    .next-title {
      animation-name: from-far-right;
      animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
    }

    .team-card {
      animation-name: from-below;
      animation-range: entry 0% entry calc(55% + var(--n, 0) * 10%);
    }

    @media (min-aspect-ratio: 1/1) {
      .offer-wide {
        animation: window linear both;
        animation-timeline: --screen;
        animation-range: entry 0% entry 100%;
      }
    }
  }
}

@keyframes from-right {
  from { transform: translateX(70%); }
}

@keyframes from-below {
  from { transform: translateY(22vh); opacity: 0; }
}

@keyframes wipe-right {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0); }
}

@keyframes window {
  from { clip-path: inset(18% 14% round 48px); }
  to { clip-path: inset(0 round 0); }
}

@keyframes doors {
  from { clip-path: inset(0 50%); }
  to { clip-path: inset(0); }
}

@keyframes from-left {
  from { transform: translateX(-12vw); opacity: 0; }
}

@keyframes from-far-right {
  from { transform: translateX(75vw); }
}
</style>
