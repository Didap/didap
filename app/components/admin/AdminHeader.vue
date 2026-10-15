<script setup lang="ts">
// Barra di /admin: logo, sezioni, link al sito, uscita
defineProps<{ authenticated: boolean }>()
const emit = defineEmits<{ logout: [] }>()

const LINKS = [
  { to: '/admin', label: 'Prodotti' },
  { to: '/admin/preventivi', label: 'Preventivi' },
  { to: '/admin/clienti', label: 'Clienti' },
  { to: '/admin/impostazioni', label: 'Impostazioni' },
]
const route = useRoute()
const isActive = (to: string) => (to === '/admin' ? route.path === '/admin' : route.path.startsWith(to))
</script>

<template>
  <header class="
    flex h-14 shrink-0 items-center gap-4 border-b border-ink/10
    bg-paper-light px-5
  ">
    <NuxtLink
      to="/admin"
      class="flex shrink-0 items-center gap-3"
    >
      <img
        src="/brand/logo-contratto.svg"
        alt=""
        width="27"
        height="30"
        class="h-7 w-auto"
      >
      <span class="text-sm font-bold">Didap<span class="
        hidden
        sm:inline
      "> · Admin</span></span>
    </NuxtLink>
    <nav
      v-if="authenticated"
      class="flex min-w-0 flex-1 gap-1 overflow-x-auto"
      aria-label="Sezioni admin"
    >
      <NuxtLink
        v-for="l in LINKS"
        :key="l.to"
        :to="l.to"
        class="shrink-0 rounded-full px-3 py-1.5 text-sm transition"
        :class="isActive(l.to) ? 'bg-ink text-paper-light' : 'hover:bg-ink/5'"
        :aria-current="isActive(l.to) ? 'page' : undefined"
      >
        {{ l.label }}
      </NuxtLink>
    </nav>
    <div
      v-if="authenticated"
      class="ml-auto flex shrink-0 items-center gap-4 text-sm"
    >
      <a
        href="/"
        target="_blank"
        class="
          hidden opacity-60
          hover:opacity-100
          sm:inline
        "
      >Vai al sito ↗</a>
      <button
        type="button"
        class="
          rounded-full border border-ink/20 px-3 py-1
          hover:border-ink
        "
        @click="emit('logout')"
      >
        Esci
      </button>
    </div>
  </header>
</template>
