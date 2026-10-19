<script setup lang="ts">
import AdminToast from '~/components/admin/AdminToast.vue'

// Layout di /admin: niente nav e footer del sito, mai indicizzato.
// Gli avvisi stanno qui: restano montati da una pagina admin all'altra.
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <slot />
    <AdminToast />
  </div>
</template>
