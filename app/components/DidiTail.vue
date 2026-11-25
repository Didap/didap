<script setup lang="ts">
// La coda da fumetto della nuvoletta di Didi su telefono, sotto il bordo
// in basso a sinistra (HomeDock, chiusura della home). La forma segue le
// linee del design, nel sistema della coda: origine in basso a sinistra
// della nuvoletta, 4px più su, così la coda entra nella nuvoletta e chiude
// la giunzione. Il bordo sinistro parte quasi sopra Didi, scende
// gonfiandosi appena verso destra e rientra nella punta, staccata davanti
// alla bocca; il destro dalla punta sale prima piano, poi ripido, poi di
// nuovo piano, e si raccorda tangente al fondo della nuvoletta. Le misure
// seguono Didi: 62px di altezza, 12px sotto la nuvoletta
const TAIL = 'M60 0V4C72 4 80 7 85 14C92 24 93 38 76 54C92 48 110 34 122 22C132 12 150 4 190 4V0Z'
</script>

<template>
  <svg
    width="200"
    height="60"
    viewBox="0 0 200 60"
    class="pointer-events-none absolute top-full left-0 -mt-1 overflow-visible"
    aria-hidden="true"
  >
    <path
      :d="TAIL"
      class="fill-paper-light"
    />
  </svg>
</template>
