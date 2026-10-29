<script setup lang="ts">
// La barra della home a schermate: Didi a sinistra, "Lavoriamo insieme"
// a destra, senza fondo sopra le schermate. Sull'apertura non c'è
// (`shown` falso): sale via e torna con la prima schermata. `light` quando
// sotto c'è carta o un video chiaro (testo ink), altrimenti testo carta
// e un alone di carta che stacca Didi dal video scuro. Didi è quella
// della nav: DidiGuide la porta via e la rimette qui. `glow` tiene
// l'alone anche col testo ink, se Didi e il testo stanno su fondi diversi.
const props = defineProps<{ shown: boolean, light: boolean, glow?: boolean }>()
const halo = computed(() => props.glow ?? !props.light)

const { t } = useI18n()
const localePath = useLocalePath()
const didiAway = useDidiAway()
</script>

<template>
  <header
    class="
      fixed inset-x-0 top-0 z-40 page-x flex h-[72px] max-w-none items-center
      justify-between
      transition-[color,background-color,opacity,translate,visibility]
      duration-500
      lg:h-[97px]
    "
    :class="[
      light ? 'text-ink' : 'text-paper-light',
      shown ? '' : 'invisible -translate-y-full opacity-0',
    ]"
  >
    <NuxtLink
      :to="localePath('/')"
      class="block"
      :class="{ invisible: didiAway }"
      aria-label="Didap - home"
      data-didi-link
    >
      <img
        src="/brand/didi-testa.svg"
        alt=""
        width="218"
        height="200"
        data-didi-home
        class="
          h-10 w-auto transition-[filter] duration-500
          lg:h-12
        "
        :class="halo ? `
          filter-[drop-shadow(0_0_10px_rgb(255_251_242/0.55))_drop-shadow(0_0_22px_rgb(255_251_242/0.35))]
        ` : ''"
      >
    </NuxtLink>

    <NuxtLink
        :to="localePath('/contact')"
        class="
          border-b-[1.5px] border-current py-2.5 text-button leading-none
          focus-visible:outline-2 focus-visible:outline-offset-4
          focus-visible:outline-current
        "
      >
        {{ t('nav.cta') }}
      </NuxtLink>
  </header>
</template>
