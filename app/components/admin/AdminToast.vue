<script setup lang="ts">
// Messaggio breve in basso (Toast di Reka UI). Apertura e chiusura le
// decide useAdminToast; qui restano l'animazione e lo swipe per chiudere.
// Esc non lo chiude: serve a chiudere menu e dialoghi sotto.
const { toast, dismiss } = useAdminToast()
</script>

<template>
  <ToastProvider
    label="Avviso"
    swipe-direction="down"
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
      @escape-key-down="(e: KeyboardEvent) => e.preventDefault()"
      @update:open="(open: boolean) => !open && dismiss()"
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
