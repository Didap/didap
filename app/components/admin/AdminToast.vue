<script setup lang="ts">
// Messaggio breve in basso (Toast di Reka UI). Apertura, chiusura e
// timer li gestisce useAdminToast; qui restano l'animazione e la pausa
// col mouse sopra. Esc non lo chiude ma passa oltre: chiude menu e
// dialoghi aperti sotto.
const { toast, dismiss, pause, resume } = useAdminToast()

let fromEscape = false
function onOpenChange(open: boolean) {
  if (!open && !fromEscape) dismiss()
  fromEscape = false
}

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
      @escape-key-down="fromEscape = true"
      @update:open="onOpenChange"
      @pause="pause"
      @resume="resume"
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
