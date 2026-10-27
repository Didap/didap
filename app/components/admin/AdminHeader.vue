<script setup lang="ts">
import { firstAllowedPath } from '#shared/admin-access'
import { ADMIN_PAGES, ADMIN_PAGE_INFO } from '#shared/users'

// Barra di /admin: logo e, con una sessione, sezioni della persona, link al
// sito, account e uscita. "Esci": chi passa @logout decide lui (Prodotti
// chiede prima delle modifiche non salvate), altrimenti si esce qui
const props = defineProps<{ onLogout?: () => unknown }>()
const { notify } = useAdminToast()

async function logout() {
  if (props.onLogout) return props.onLogout()
  try {
    await adminLogout()
  }
  catch {
    notify('error', 'Uscita non riuscita')
  }
}

const session = useAdminSessionState()
const user = computed(() => (session.value?.authenticated ? session.value.user : null))

// Solo le sezioni che la persona può aprire, nell'ordine del menu
const links = computed(() =>
  ADMIN_PAGES.filter((p) => user.value?.pages.includes(p)).map((p) => ({
    to: ADMIN_PAGE_INFO[p].path,
    label: ADMIN_PAGE_INFO[p].label,
  })),
)
const home = computed(() => firstAllowedPath(user.value?.pages ?? []) ?? '/admin')

const route = useRoute()
const isActive = (to: string) => (to === '/admin' ? route.path === '/admin' : route.path.startsWith(to))
</script>

<template>
  <header class="
    flex h-14 shrink-0 items-center gap-4 border-b border-ink/10
    bg-paper-light px-5
  ">
    <NuxtLink
      :to="home"
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
      v-if="user"
      class="flex min-w-0 flex-1 gap-1 overflow-x-auto"
      aria-label="Sezioni admin"
    >
      <NuxtLink
        v-for="l in links"
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
      v-if="user"
      class="ml-auto flex shrink-0 items-center gap-4 text-sm"
    >
      <a
        href="/"
        target="_blank"
        class="
          hidden opacity-60
          hover:opacity-100
          lg:inline
        "
      >Vai al sito ↗</a>
      <NuxtLink
        to="/admin/account"
        class="max-w-40 truncate rounded-full px-3 py-1.5 transition"
        :class="isActive('/admin/account') ? 'bg-ink text-paper-light' : `
          hover:bg-ink/5
        `"
        :aria-current="isActive('/admin/account') ? 'page' : undefined"
        :title="`Il tuo account (${user.email})`"
      >
        {{ user.name }}
      </NuxtLink>
      <button
        type="button"
        class="
          rounded-full border border-ink/20 px-3 py-1
          hover:border-ink
        "
        @click="logout"
      >
        Esci
      </button>
    </div>
  </header>
</template>
