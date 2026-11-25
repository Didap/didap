<script setup lang="ts">
import type { MediaSlotData } from '~/components/MediaSlot.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import ScreenVeil from '~/components/ScreenVeil.vue'

// Una schermata con il video di testata a tutto schermo (la home): in
// basso, sul velo, il nome e la frase a sinistra e le azioni (slot) a
// destra. Il video copre lo schermo anche in verticale: da telefono è la
// sua versione verticale. `light`: il video è chiaro, il velo diventa carta e il testo
// ink (`data-tone` in main.css); altrimenti velo ink e testo carta.
// Su telefono nome, frase e azioni non si vedono: il nome sta nel logo
// del video, la frase e il link li dice Didi nella barra in basso
// (HomeDock). Nome e frase restano per gli screen reader. `logo`: il
// marchio del prodotto, sopra il video.
// Va dentro una <section class="screen">.
defineProps<{
  media: MediaSlotData
  title: string
  text: string
  titleId: string
  as?: 'h1' | 'h2'
  light?: boolean
  logo?: string
}>()
</script>

<template>
  <div
    class="screen-inner h-full"
    :data-tone="light ? 'light' : 'dark'"
  >
    <MediaSlot
      :media="media"
      class="screen-video screen-hero absolute inset-0 size-full"
    />
    <!-- Il marchio del prodotto sopra il video, dove il video gli lascia
         il posto (`.screen-logo` in main.css). Decorativo: il nome c'è
         già nel titolo -->
    <div
      v-if="logo"
      class="screen-logo"
      aria-hidden="true"
    >
      <img
        :src="logo"
        alt=""
        class="reveal"
        style="--i: 0"
      >
    </div>
    <ScreenVeil />
    <div
      class="
        screen-hero-caption absolute inset-x-0 bottom-0 z-2 page-x grid
        max-w-none items-end gap-x-12 gap-y-6
        pb-[max(clamp(28px,5vh,64px),env(safe-area-inset-bottom))]
        transition-colors duration-500
        min-[860px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]
      "
      :class="light ? 'text-ink' : 'text-paper-light'"
    >
      <div
        class="grid min-w-0 gap-[18px]"
        :class="light ? '' : '[text-shadow:0_1px_18px_rgb(22_20_18/0.4)]'"
      >
        <component
          :is="as ?? 'h2'"
          :id="titleId"
          class="
            reveal font-wide text-[clamp(2.25rem,1.4rem+2.6vw,4rem)]
            leading-[0.92] font-bold tracking-[-0.03em]
            max-[859px]:sr-only
          "
          style="--i: 0"
        >
          {{ title }}
        </component>
        <p
          class="
            reveal text-[17px]/normal
            max-[859px]:sr-only
          "
          style="--i: 1"
        >
          {{ text }}
        </p>
      </div>
      <div
        class="
          reveal flex flex-wrap items-center gap-x-[22px] gap-y-3.5
          max-[859px]:hidden
          min-[860px]:justify-end
        "
        style="--i: 2"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
