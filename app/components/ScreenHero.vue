<script setup lang="ts">
import type { MediaSlotData } from '~/components/MediaSlot.vue'
import MediaSlot from '~/components/MediaSlot.vue'
import ScreenVeil from '~/components/ScreenVeil.vue'

// Una schermata con il video di testata a tutto schermo (la home, la
// scheda a slide): in basso, sul velo, il nome e la frase a sinistra e
// le azioni (slot) a destra. In verticale il video sta in alto, dietro
// il suo poster sfocato. `shade`: un'ombra in alto per la barra, sui
// video chiari in cima. Va dentro una <section class="screen">.
defineProps<{
  media: MediaSlotData
  title: string
  text: string
  titleId: string
  as?: 'h1' | 'h2'
  shade?: boolean
}>()
</script>

<template>
  <div class="screen-inner h-full">
    <!-- Lazy: dove il poster sfocato non serve (in orizzontale) non si scarica -->
    <img
      :src="media.posterMobile ?? media.poster"
      alt=""
      loading="lazy"
      class="screen-backdrop"
    >
    <MediaSlot
      :media="media"
      class="screen-video screen-hero absolute inset-0 size-full"
    />
    <div
      v-if="shade"
      class="
        pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b
        from-ink/55 to-transparent
      "
    />
    <ScreenVeil />
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
        <component
          :is="as ?? 'h2'"
          :id="titleId"
          class="
            reveal font-wide text-[clamp(2.25rem,1.4rem+2.6vw,4rem)]
            leading-[0.92] font-bold tracking-[-0.03em]
          "
          style="--i: 0"
        >
          {{ title }}
        </component>
        <p
          class="reveal text-base/normal text-paper-light/88"
          style="--i: 1"
        >
          {{ text }}
        </p>
      </div>
      <div
        class="
          reveal flex flex-wrap items-center gap-x-[22px] gap-y-3.5
          min-[860px]:justify-end
        "
        style="--i: 2"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
