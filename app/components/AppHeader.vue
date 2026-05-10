<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'
import DidapLogo from '~/components/DidapLogo.vue'

const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

const { y } = useWindowScroll()
// Soglia bassa per evitare jitter, più alta del bordo del header iniziale
const scrolled = computed(() => y.value > 32)

type LocaleCode = 'it' | 'en'

const otherLocales = computed(() =>
  (locales.value as { code: LocaleCode; name: string }[]).filter(
    (l) => l.code !== locale.value,
  ),
)
</script>

<template>
  <header
    class="sticky top-0 z-40 bg-paper/85 backdrop-blur transition-[padding,box-shadow,border-color] duration-300 ease-out"
    :class="
      scrolled
        ? 'border-b border-ink/10 py-2 shadow-sm shadow-ink/5'
        : 'border-b border-transparent py-5'
    "
  >
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6">
      <NuxtLink
        :to="localePath('/')"
        class="-ml-2 block text-ink"
        aria-label="Didap — home"
      >
        <DidapLogo :compact="scrolled" />
      </NuxtLink>

      <nav class="hidden items-center gap-8 md:flex">
        <NuxtLink :to="localePath('/work')" class="text-sm hover:text-accent">
          {{ t('nav.work') }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/clients')"
          class="text-sm hover:text-accent"
        >
          {{ t('nav.clients') }}
        </NuxtLink>
        <NuxtLink :to="localePath('/about')" class="text-sm hover:text-accent">
          {{ t('nav.about') }}
        </NuxtLink>
        <NuxtLink
          :to="localePath('/contact')"
          class="text-sm hover:text-accent"
        >
          {{ t('nav.contact') }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-2 text-xs uppercase tracking-widest">
        <NuxtLink
          v-for="l in otherLocales"
          :key="l.code"
          :to="switchLocalePath(l.code)"
          class="rounded border border-ink/20 px-2 py-1 hover:bg-ink hover:text-paper"
        >
          {{ l.code }}
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
