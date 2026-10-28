<script setup lang="ts">
import type { FileKind } from '~/composables/useGrantFiles'

// Icona di una riga della cartella del bando: cartella o tipo di file
defineProps<{ kind: FileKind }>()

const COLOR: Record<FileKind, string> = {
  folder: 'text-banana',
  pdf: 'text-red',
  image: 'text-green',
  doc: 'text-ink/70',
  sheet: 'text-green',
  other: 'text-ink/50',
}
</script>

<template>
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    aria-hidden="true"
    class="shrink-0"
    :class="COLOR[kind]"
  >
    <path
      v-if="kind === 'folder'"
      d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"
      fill="currentColor"
      fill-opacity="0.25"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linejoin="round"
    />
    <template v-else>
      <!-- Foglio con l'angolo piegato, e dentro il segno del tipo -->
      <path
        d="M5 2.5h6.5l3.5 3.5v11a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-14a.5.5 0 0 1 .5-.5zM11.5 2.5V6H15"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <text
        v-if="kind === 'pdf'"
        x="10"
        y="14.6"
        text-anchor="middle"
        font-size="5"
        font-weight="700"
        fill="currentColor"
      >PDF</text>
      <path
        v-else-if="kind === 'image'"
        d="M6.5 15l2.5-3 1.8 2 1.4-1.5 1.8 2.5z"
        fill="currentColor"
      />
      <path
        v-else-if="kind === 'doc'"
        d="M7 9.5h6M7 12h6M7 14.5h4"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <path
        v-else-if="kind === 'sheet'"
        d="M7 9h6v6H7zM7 12h6M10 9v6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.1"
      />
    </template>
  </svg>
</template>
