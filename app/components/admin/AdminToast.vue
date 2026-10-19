<script setup lang="ts">
// Messaggio breve in basso (Toast di Reka UI; lo stato sta in useAdminToast).
// Si chiude da solo, ma resta aperto finché ci si passa sopra col mouse.
const { toast } = useAdminToast()

// Chiuso: si toglie dallo stato dopo l'animazione d'uscita, così non
// ricompare nella pagina successiva
function onOpenChange(open: boolean) {
  const id = toast.value?.id
  if (!open) setTimeout(() => toast.value?.id === id && (toast.value = null), 200)
}
</script>

<template>
  <ToastProvider
    label="Avviso"
    swipe-direction="down"
  >
    <ToastRoot
      v-if="toast"
      :key="toast.id"
      :duration="toast.kind === 'ok' ? 2500 : 6000"
      :type="toast.kind === 'error' ? 'foreground' : 'background'"
      class="
        rounded-full px-5 py-3 text-sm font-medium shadow-lg
        data-[state=closed]:animate-toast-out
        data-[state=open]:animate-toast-in
      "
      :class="toast.kind === 'ok' ? 'bg-ink text-paper-light' : `
        bg-red text-white
      `"
      @update:open="onOpenChange"
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
