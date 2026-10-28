<script setup lang="ts">
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminLogin from '~/components/admin/AdminLogin.vue'
import AdminNoAccess from '~/components/admin/AdminNoAccess.vue'

// Guscio delle pagine admin (i prodotti hanno il loro): barra e accesso.
// Il contenuto compare solo da autenticati e se la pagina è della persona;
// altrimenti si va alla sua prima pagina. Gli avvisi stanno nel layout.
// `fill`: da desktop la pagina è alta quanto lo schermo e non scorre; a
// scorrere sono le sue colonne.
defineProps<{ fill?: boolean }>()
const { state } = useAdminPageAccess()
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-paper"
    :class="fill ? `lg:h-dvh lg:min-h-0 lg:overflow-hidden` : ''"
  >
    <AdminHeader />
    <AdminLogin v-if="state === 'login'" />
    <AdminNoAccess v-else-if="state === 'none'" />
    <slot v-else-if="state === 'allowed'" />
  </div>
</template>
