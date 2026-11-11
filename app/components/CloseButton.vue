<script setup lang="ts">
import { DialogClose } from 'reka-ui'

// La ✕ dei fogli di contatto (ContactDialog, ContactDrawer): tonda, si
// riempie di inchiostro al passaggio. Chiude il Dialog di reka che la
// contiene
const { t } = useI18n()
</script>

<template>
  <DialogClose
    class="
      -mr-2.5 flex size-10 shrink-0 items-center justify-center rounded-full
      transition-colors
      hover:bg-ink hover:text-paper-light
      focus-visible:outline-2 focus-visible:outline-ink
    "
    :aria-label="t('contact.close')"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
  </DialogClose>
</template>
