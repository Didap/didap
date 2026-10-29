<script setup lang="ts">
// Il menu delle schede prodotto: un riquadro carta in alto a sinistra
// con Didi, il nome della pagina e un punto. Passandoci sopra (o col
// tocco, o con la tastiera) si allunga verso il basso e mostra le
// pagine del sito. Didi è quella della nav: DidiGuide la porta via e la
// rimette qui, il link sparisce con lei.
defineProps<{ label: string }>()

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const didiAway = useDidiAway()

const pages = computed(() => [
  { to: localePath('/'), label: t('nav.home') },
  { to: localePath('/work'), label: t('nav.work') },
  { to: localePath('/clients'), label: t('nav.clients') },
  { to: localePath('/about'), label: t('nav.about') },
  { to: localePath('/contact'), label: t('nav.contact') },
])

const open = ref(false)
const root = ref<HTMLElement>()

watch(() => route.fullPath, () => (open.value = false))

// Il puntatore che esce chiude; il fuoco che esce anche
function onFocusOut(e: FocusEvent) {
  if (!root.value?.contains(e.relatedTarget as Node | null)) open.value = false
}
</script>

<template>
  <div
    ref="root"
    class="
      w-[228px] overflow-hidden rounded-md bg-paper-light text-ink
      shadow-[0_10px_28px_-14px_rgb(22_20_18/0.45)]
    "
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focusout="onFocusOut"
    @keydown.esc="open = false"
  >
    <div class="flex h-[52px] items-center gap-3 pl-3">
      <NuxtLink
        :to="localePath('/')"
        class="block shrink-0"
        :class="{ invisible: didiAway }"
        aria-label="Didap - home"
        data-didi-link
      >
        <img
          src="/brand/didi-testa.svg"
          alt=""
          width="218"
          height="200"
          data-didi-home
          class="h-8 w-auto"
        >
      </NuxtLink>
      <button
        type="button"
        class="
          flex h-full min-w-0 flex-1 items-center justify-between gap-3 pr-4
          font-mono text-[11px] tracking-[0.06em] uppercase
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-ink
        "
        :aria-expanded="open"
        aria-controls="site-menu"
        :aria-label="open ? t('nav.close_menu') : t('nav.open_menu')"
        @click="open = !open"
      >
        <span class="truncate">{{ label }}</span>
        <span
          class="size-1 shrink-0 rounded-full bg-current transition-transform"
          :class="{ 'scale-150': open }"
          aria-hidden="true"
        />
      </button>
    </div>
    <div
      id="site-menu"
      class="grid transition-[grid-template-rows] duration-400 ease-vintage"
      :class="open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      :inert="!open"
    >
      <nav
        class="min-h-0"
        :aria-label="t('nav.main')"
      >
        <ul class="border-t border-ink/10 py-2">
          <li
            v-for="p in pages"
            :key="p.to"
          >
            <NuxtLink
              :to="p.to"
              class="
                group flex items-center justify-between px-4 py-2 font-mono
                text-[11px] tracking-[0.06em] uppercase opacity-60
                transition-opacity
                hover:opacity-100
                focus-visible:opacity-100
              "
            >
              {{ p.label }}
              <svg
                width="10"
                height="10"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
                class="
                  -translate-x-1 opacity-0 transition
                  group-hover:translate-x-0 group-hover:opacity-100
                  group-focus-visible:translate-x-0
                  group-focus-visible:opacity-100
                "
              ><path d="M3 11 11 3M4.5 3H11v6.5" /></svg>
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
