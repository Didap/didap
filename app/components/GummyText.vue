<script setup lang="ts">
const props = defineProps<{
  text: string
}>()

/*
  Pseudo-random deterministico (sin-hash) — server e client devono
  produrre gli stessi valori, altrimenti si rompe l'hydration.
*/
function pr(seed: number) {
  const v = Math.sin(seed * 12.9898 + 4.1414) * 43758.5453
  return Math.abs(v - Math.floor(v))
}

const chars = computed(() =>
  [...props.text].map((char, i) => {
    const isSpace = char === ' '
    if (isSpace) return { char, isLetter: false }

    // Solo ~30% delle lettere si muove in idle. Le altre stanno ferme
    // ma hanno comunque l'hover. Risultato: il claim sembra "respirare"
    // qua e là invece di ondeggiare in blocco.
    const animate = pr(i + 7) < 0.32
    const dur = 4.5 + pr(i + 13) * 3 // 4.5..7.5s, lento e poco marcato
    const delay = -pr(i + 23) * dur

    return {
      char,
      isLetter: true,
      animate,
      style: {
        '--gd': `${delay.toFixed(2)}s`,
        '--gdur': `${dur.toFixed(2)}s`,
      },
    }
  }),
)
</script>

<template>
  <span class="gummy-text" :aria-label="text">
    <template v-for="(c, i) in chars" :key="i">
      <span
        v-if="c.isLetter"
        class="gummy-letter"
        :class="{ 'is-animated': c.animate }"
        :style="c.style"
        aria-hidden="true"
      >
        <span class="gummy-letter__inner">{{ c.char }}</span>
      </span>
      <span v-else aria-hidden="true" class="gummy-space">{{ c.char }}</span>
    </template>
  </span>
</template>
