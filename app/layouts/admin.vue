<script setup lang="ts">
// Layout di /admin: niente nav e footer del sito, mai indicizzato
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <slot />
  </div>
</template>
