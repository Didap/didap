<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'

// La barra della home a schermate: Didi a sinistra, "Lavoriamo insieme"
// a destra. Sull'apertura non c'è (`shown` falso): sale via e torna con
// la prima schermata. `light` quando sotto c'è carta o un video chiaro
// (testo ink), altrimenti testo carta. `surface` sui video: una
// sfumatura corta dello stesso tono del velo in basso (carta sui video
// chiari, ink su quelli scuri) le dà un fondo suo; sui fondi pieni non
// serve. Didi è la versione adesivo, col contorno carta: regge su ogni
// fondo senza alone. È quella della nav: DidiGuide la porta via e la
// rimette qui. Su telefono la barra non c'è: Didi sta in basso a
// sinistra (HomeDock). "Lavoriamo insieme" porta alla chiusura
// rossa della home (con la corsa di useScreens) e sparisce quando la
// chiusura è in scena (`cta` falso). È verde sui video; sui fondi pieni
// (il verde e il giallo di Progetti) ink sul chiaro e carta sullo
// scuro, se no il verde sparirebbe sul verde.
withDefaults(
  defineProps<{
    shown: boolean
    light: boolean
    surface?: 'light' | 'dark'
    cta?: boolean
  }>(),
  { cta: true },
)

const { t } = useI18n()
const localePath = useLocalePath()
const ctaPath = useCtaPath()
const didiAway = useDidiAway()
</script>

<template>
  <header
    class="
      fixed inset-x-0 top-0 z-40 page-x flex h-[72px] max-w-none items-center
      justify-between
      transition-[color,background-color,opacity,translate,visibility]
      duration-500
      max-screens:hidden
      lg:h-[97px]
    "
    :class="[
      light ? 'text-ink' : 'text-paper-light',
      shown ? '' : 'invisible -translate-y-full opacity-0',
    ]"
  >
    <!-- Le due sfumature, una per tono: si incrociano con l'opacità -->
    <div
      class="
        pointer-events-none absolute inset-x-0 top-0 -bottom-12 -z-1
        bg-linear-to-b from-paper-light/94 via-paper-light/75 via-55%
        to-paper-light/0 transition-opacity duration-500
      "
      :class="surface === 'light' ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    />
    <div
      class="
        pointer-events-none absolute inset-x-0 top-0 -bottom-12 -z-1
        bg-linear-to-b from-ink/80 via-ink/50 via-55% to-ink/0
        transition-opacity duration-500
      "
      :class="surface === 'dark' ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    />

    <NuxtLink
      :to="localePath('/')"
      class="block"
      :class="{ invisible: didiAway }"
      aria-label="Didap - home"
      data-didi-link
    >
      <img
        src="/brand/didi-testa-sticker.svg"
        alt=""
        width="240"
        height="222"
        data-didi-home
        class="
          h-11 w-auto
          lg:h-[53px]
        "
      >
    </NuxtLink>

    <DidapButton
      :to="ctaPath"
      :ink="!surface && light"
      :paper="!surface && !light"
      :class="cta ? '' : 'invisible opacity-0'"
    >
      {{ t('nav.cta') }}
    </DidapButton>
  </header>
</template>
