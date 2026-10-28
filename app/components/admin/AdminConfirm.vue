<script setup lang="ts">
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'

// Conferma di un'azione che non si annulla (eliminare): titolo, cosa
// succede, Annulla e il bottone rosso. Chi la usa la chiude quando ha finito.
const open = defineModel<boolean>('open', { required: true })
withDefaults(defineProps<{
  title: string
  description: string
  confirmLabel?: string
  busy?: boolean
}>(), { confirmLabel: 'Sì, elimina', busy: false })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-ink/40" />
      <AlertDialogContent
        class="
          fixed top-1/2 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md
          -translate-1/2 rounded-2xl bg-white p-6
        "
      >
        <AlertDialogTitle class="text-xl font-bold">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription class="mt-2 wrap-break-word opacity-70">
          {{ description }}
        </AlertDialogDescription>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <AlertDialogCancel
            class="
              rounded-full px-4 py-2 text-sm
              hover:bg-ink/5
            "
          >
            Annulla
          </AlertDialogCancel>
          <button
            type="button"
            class="
              rounded-full bg-red px-4 py-2 text-sm font-medium text-white
              disabled:opacity-50
            "
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
