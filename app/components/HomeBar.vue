<script setup lang="ts">
// La barra della home a schermate: Didi a sinistra, lingua e "Lavoriamo
// insieme" a destra, senza fondo sopra le schermate. `light` quando
// sotto c'è carta o un video chiaro (testo ink), altrimenti testo carta
// e un alone di carta che stacca Didi dal video scuro. Didi è quella
// della nav: DidiGuide la porta via e la rimette qui. `solid` sopra le
// card, che su telefono scorrono sotto la barra: fondo carta.
defineProps<{ light: boolean, solid?: boolean }>()

const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()
const didiAway = useDidiAway()

const allLocales = computed(() => locales.value as { code: 'it' | 'en' }[])
</script>

<template>
  <header
    class="
      fixed inset-x-0 top-0 z-40 page-x flex h-[72px] max-w-none items-center
      justify-between transition-colors duration-500
      lg:h-[97px]
    "
    :class="[light ? 'text-ink' : 'text-paper-light', { 'bg-paper-light/92 backdrop-blur-sm': solid }]"
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
        :class="light ? '' : `
          filter-[drop-shadow(0_0_10px_rgb(255_251_242/0.55))_drop-shadow(0_0_22px_rgb(255_251_242/0.35))]
        `"
      >
    </NuxtLink>

    <div class="flex items-center gap-6">
      <p class="text-[13px] leading-[1.3] tracking-[0.08em] uppercase">
        <template
          v-for="(l, i) in allLocales"
          :key="l.code"
        >
          <span
            v-if="i > 0"
            class="opacity-60"
            aria-hidden="true"
          > / </span>
          <NuxtLink
            :to="switchLocalePath(l.code)"
            class="
              opacity-60 transition-opacity
              hover:opacity-100
            "
            :aria-current="l.code === locale ? 'true' : undefined"
            :lang="l.code"
          >
            {{ l.code }}
          </NuxtLink>
        </template>
      </p>
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
    </div>
  </header>
</template>
