<script setup lang="ts">
// Etichetta + campo + suggerimento e contatore caratteri opzionali
// `group`: il contenuto non è un singolo campo (bottoni, caricamento):
// niente <label>, che passerebbe i clic al primo bottone.
const props = defineProps<{
  label: string
  hint?: string
  value?: string
  max?: number
  group?: boolean
}>()

const count = computed(() => props.value?.length ?? 0)
</script>

<template>
  <component
    :is="group ? 'div' : 'label'"
    class="flex flex-col gap-1.5"
    :role="group ? 'group' : undefined"
    :aria-label="group ? label : undefined"
  >
    <span class="flex items-baseline justify-between gap-3">
      <span class="text-sm font-medium">{{ label }}</span>
      <span
        v-if="max"
        class="text-xs tabular-nums"
        :class="count > max * 0.9 ? 'text-red' : 'opacity-40'"
      >{{ count }}/{{ max }}</span>
    </span>
    <slot />
    <span
      v-if="hint"
      class="text-xs opacity-55"
    >{{ hint }}</span>
  </component>
</template>
