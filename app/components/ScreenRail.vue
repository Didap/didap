<script setup lang="ts">
// L'indice delle pagine a schermate, fisso a destra: una capsula con una
// tacca per schermata, il nome esce come linguetta su quella in scena e
// al passaggio la capsula si apre in un indice (stili .rail in
// main.css). `light` della schermata in scena decide il colore, come
// per i pulsanti: capsula ink sul chiaro, carta sullo scuro. Sulla
// prima schermata non c'è, come la barra. Sotto gli 860px nemmeno: lo
// schermo è del contenuto. Ogni voce dà uno scatto da ingranaggio
// (useGearTick) quando ci arriva il mouse o il tab, uno più pieno al
// click, e la tacca risponde con un piccolo rimbalzo.
defineProps<{
  label: string
  screens: { id: string, label: string, light?: boolean }[]
  active: number
}>()

const tick = useGearTick()

function onEnter(e: PointerEvent) {
  if (e.pointerType === 'mouse') tick('step')
}

function onFocus(e: FocusEvent) {
  if ((e.currentTarget as HTMLElement).matches(':focus-visible')) tick('step')
}
</script>

<template>
  <nav
    :aria-label="label"
    class="
      rail fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 font-mono
      tracking-[0.06em] uppercase transition-[opacity,visibility] duration-500
      md:right-10
      screens:block
      xl:right-20
    "
    :class="[
      screens[active]?.light ? '' : 'rail-dark',
      active > 0 ? '' : 'invisible opacity-0',
    ]"
  >
    <ol>
      <li
        v-for="(s, i) in screens"
        :key="s.id"
      >
        <a
          :href="`#${s.id}`"
          :aria-current="i === active ? 'true' : undefined"
          @pointerenter="onEnter"
          @focus="onFocus"
          @click="tick('press')"
        >
          <span class="rail-label">{{ s.label }}</span>
          <span
            class="rail-tick"
            aria-hidden="true"
          />
        </a>
      </li>
    </ol>
  </nav>
</template>
