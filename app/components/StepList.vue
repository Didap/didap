<script setup lang="ts">
import { typeset } from '#shared/typeset'

// Passi numerati (01, 02, ...), ognuno sotto un filo. Con `row` da sm
// stanno in fila, una colonna per passo
defineProps<{ steps: string[], row?: boolean }>()

const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <ol
    class="grid gap-x-6 gap-y-5"
    :class="{ 'step-row': row }"
    :style="{ '--n': steps.length }"
  >
    <li
      v-for="(step, n) in steps"
      :key="n"
      class="grid content-start gap-2 border-t border-ink pt-4"
    >
      <span class="font-mono text-xs tracking-[0.04em] opacity-60">{{ pad(n + 1) }}</span>
      <span class="text-base/normal">{{ typeset(step) }}</span>
    </li>
  </ol>
</template>

<style scoped>
@media (min-width: 40rem) {
  .step-row {
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  }
}
</style>
