<script setup lang="ts">
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminLogin from '~/components/admin/AdminLogin.vue'

// Guscio delle pagine admin (i prodotti hanno il loro): barra, accesso
// e messaggi. Il contenuto compare solo da autenticati.
const session = useAdminSessionState()
const { toast, notify } = useAdminToast()

async function logout() {
  try {
    await adminLogout()
  }
  catch {
    notify('error', 'Uscita non riuscita')
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <AdminHeader
      :authenticated="!!session?.authenticated"
      @logout="logout"
    />
    <AdminLogin v-if="!session?.authenticated" />
    <slot v-else />

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
  </div>
</template>
