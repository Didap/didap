<script setup lang="ts">
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminLogin from '~/components/admin/AdminLogin.vue'

// Guscio delle pagine admin (i prodotti hanno il loro): barra e accesso.
// Il contenuto compare solo da autenticati. Gli avvisi stanno nel layout.
// `fill`: da desktop la pagina è alta quanto lo schermo e non scorre; a
// scorrere sono le sue colonne.
defineProps<{ fill?: boolean }>()
const session = useAdminSessionState()
const { notify } = useAdminToast()

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
  <div
    class="flex min-h-screen flex-col bg-paper"
    :class="fill ? `lg:h-dvh lg:min-h-0 lg:overflow-hidden` : ''"
  >
    <AdminHeader
      :authenticated="!!session?.authenticated"
      @logout="logout"
    />
    <AdminLogin v-if="!session?.authenticated" />
    <slot v-else />
  </div>
</template>
