<script setup lang="ts">
// Messaggio breve in basso (lo stato sta in useAdminToast)
const { toast } = useAdminToast()
</script>

<template>
  <Transition
    enter-from-class="translate-y-4 opacity-0"
    leave-to-class="translate-y-4 opacity-0"
    enter-active-class="transition"
    leave-active-class="transition"
  >
    <div
      v-if="toast"
      class="
        fixed bottom-6 left-1/2 z-50 w-max max-w-[calc(100vw-2rem)]
        -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium shadow-lg
      "
      :class="toast.kind === 'ok' ? 'bg-ink text-paper-light' : `
        bg-red text-white
      `"
      role="status"
    >
      {{ toast.text }}
    </div>
  </Transition>
</template>
