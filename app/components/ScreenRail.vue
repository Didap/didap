<script setup lang="ts">
// L'indice delle pagine a schermate, fisso a destra: una tacca per
// schermata, il nome compare su quella in scena e al passaggio. `light`
// della schermata in scena decide il colore (ink sul chiaro). Sotto gli
// 860px non c'è: lo schermo è del contenuto.
defineProps<{
  label: string
  screens: { id: string, label: string, light?: boolean }[]
  active: number
}>()
</script>

<template>
  <nav
    :aria-label="label"
    class="
      fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 transition-colors
      duration-500
      min-[860px]:block
      md:right-10
      xl:right-20
    "
    :class="screens[active]?.light ? 'text-ink' : 'text-paper-light'"
  >
    <ol class="flex flex-col gap-1">
      <li
        v-for="(s, i) in screens"
        :key="s.id"
      >
        <a
          :href="`#${s.id}`"
          class="
            group flex items-center justify-end gap-3 py-1.5 font-mono
            text-[11px] tracking-[0.06em] uppercase
          "
          :aria-current="i === active ? 'true' : undefined"
        >
          <span
            class="
              translate-x-1.5 whitespace-nowrap opacity-0 transition
              duration-300
              group-hover:translate-x-0 group-hover:opacity-100
              group-focus-visible:translate-x-0 group-focus-visible:opacity-100
              group-aria-current:translate-x-0 group-aria-current:opacity-100
            "
          >{{ s.label }}</span>
          <span
            class="
              h-[1.5px] w-3.5 bg-current opacity-45 transition-all duration-400
              group-aria-current:w-8 group-aria-current:opacity-100
            "
            aria-hidden="true"
          />
        </a>
      </li>
    </ol>
  </nav>
</template>
