<script setup lang="ts">
import { ToastDescription, ToastProvider, ToastRoot, ToastViewport } from 'reka-ui'

// Messaggio breve in basso (Toast di Reka UI), montato una volta nel
// layout di /admin. Il Toast è controllato da :open, così Reka non lo
// chiude da solo (nemmeno con Esc, che resta a menu e dialoghi): lo
// chiude il timer qui sotto, fermo finché il mouse è sopra, anche se
// intanto arriva un avviso nuovo. Non si usa la pausa di Reka, che
// scatta anche cliccando nell'iframe dell'anteprima.
const { toast } = useAdminToast()

const DURATION = { ok: 2500, error: 6000 }
let timer: ReturnType<typeof setTimeout> | undefined
let deadline = 0
let remaining = 0
let hovered = false

function stop() {
  clearTimeout(timer)
  timer = undefined
}
function start() {
  stop()
  if (hovered || !toast.value?.open) return
  deadline = Date.now() + remaining
  timer = setTimeout(() => {
    timer = undefined
    if (toast.value?.open) toast.value = { ...toast.value, open: false }
  }, remaining)
}
function pause() {
  hovered = true
  if (!timer) return
  stop()
  remaining = Math.max(0, deadline - Date.now())
}
function resume() {
  hovered = false
  start()
}

watch(
  () => toast.value?.id,
  () => {
    if (!toast.value) return
    remaining = DURATION[toast.value.kind]
    start()
  },
  { immediate: true },
)
onBeforeUnmount(stop)
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
