<script setup lang="ts">
// Messaggio breve in basso (Toast di Reka UI). Apertura, chiusura e
// timer li gestisce useAdminToast: il Toast è controllato da :open, così
// Reka non lo chiude da solo (nemmeno con Esc, che resta a menu e
// dialoghi). Qui restano l'animazione e la pausa col mouse sopra (non
// quella di Reka, che scatta anche cliccando nell'iframe dell'anteprima).
const { toast, pause, resume } = useAdminToast()

// Pagina cambiata col mouse sopra: il timer riparte
onBeforeUnmount(resume)
</script>

<template>
  <ToastProvider
    label="Avviso"
    disable-swipe
  >
    <ToastRoot
      v-if="toast"
      :key="toast.id"
      :open="toast.open"
      :duration="Infinity"
      :type="toast.kind === 'error' ? 'foreground' : 'background'"
      class="
        rounded-full px-5 py-3 text-sm font-medium shadow-lg
        data-[state=closed]:animate-toast-out
        data-[state=open]:animate-toast-in
      "
      :class="toast.kind === 'ok' ? 'bg-ink text-paper-light' : `
        bg-red text-white
      `"
      @pointerenter="pause"
      @pointerleave="resume"
    >
      <ToastDescription>{{ toast.text }}</ToastDescription>
    </ToastRoot>
    <ToastViewport
      label="Avvisi ({hotkey})"
      class="
        fixed bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)]
        -translate-x-1/2 flex-col outline-none
      "
    />
  </ToastProvider>
</template>
