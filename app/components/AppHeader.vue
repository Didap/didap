<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'

// Componente "Nav" del Figma: logo esteso 105x30, link Semibold 13
// maiuscoli a 45 di distanza, lingua + CTA a destra. Alto 97.
defineProps<{ cream?: boolean }>()

const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()
const route = useRoute()

type LocaleCode = 'it' | 'en'

const allLocales = computed(
  () => locales.value as { code: LocaleCode; name: string }[],
)

const links = computed(() => [
  { to: localePath('/work'), label: t('nav.work') },
  { to: localePath('/clients'), label: t('nav.clients') },
  { to: localePath('/about'), label: t('nav.about') },
  { to: localePath('/contact'), label: t('nav.contact') },
])

const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <header
    class="sticky top-0 z-40"
    :class="cream ? 'bg-cream' : 'bg-paper-light'"
  >
    <div
      class="
        page-x grid h-[72px] grid-cols-[auto_1fr_auto] items-center gap-6
        lg:h-[97px] lg:grid-cols-[1fr_auto_1fr]
      "
    >
      <NuxtLink
        :to="localePath('/')"
        class="block w-[105px]"
        aria-label="Didap - home"
      >
        <img
          src="/brand/logo-esteso.svg"
          alt=""
          width="105"
          height="30"
          class="h-[30px] w-[105px]"
        >
      </NuxtLink>

      <nav
        class="
          hidden items-center gap-[45px]
          lg:flex
        "
        :aria-label="t('nav.main')"
      >
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="
            text-button transition-colors
            hover:text-green
          "
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center justify-end gap-6">
        <p class="
          hidden text-[13px] leading-[1.3] tracking-[0.08em] uppercase
          sm:block
        ">
          <template
            v-for="(l, i) in allLocales"
            :key="l.code"
          >
            <span
              v-if="i > 0"
              class="opacity-60"
              aria-hidden="true"
            > / </span>
            <NuxtLink
              :to="switchLocalePath(l.code)"
              class="
                opacity-60 transition-opacity
                hover:opacity-100
              "
              :aria-current="l.code === locale ? 'true' : undefined"
              :lang="l.code"
            >
              {{ l.code }}
            </NuxtLink>
          </template>
        </p>
        <span class="
          hidden
          sm:block
        ">
          <DidapButton
            :to="localePath('/contact')"
            medium
          >
            {{ t('nav.cta') }}
          </DidapButton>
        </span>
        <button
          type="button"
          class="
            -mr-2 flex size-10 items-center justify-center
            lg:hidden
          "
          :aria-expanded="menuOpen"
          aria-controls="mobile-menu"
          :aria-label="menuOpen ? t('nav.close_menu') : t('nav.open_menu')"
          @click="menuOpen = !menuOpen"
        >
          <span class="relative block h-3 w-6">
            <span
              class="
                absolute left-0 h-[1.5px] w-6 bg-ink transition-transform
                duration-300
              "
              :class="menuOpen ? 'top-1.5 rotate-45' : 'top-0'"
            />
            <span
              class="
                absolute left-0 h-[1.5px] w-6 bg-ink transition-transform
                duration-300
              "
              :class="menuOpen ? 'top-1.5 -rotate-45' : 'top-3'"
            />
          </span>
        </button>
      </div>
    </div>

    <div
      v-show="menuOpen"
      id="mobile-menu"
      class="
        border-t-[1.5px] border-ink bg-inherit
        lg:hidden
      "
    >
      <nav class="page-x flex flex-col gap-5 py-8">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="text-title"
        >
          {{ l.label }}
        </NuxtLink>
        <div class="flex items-center gap-6 pt-4">
          <DidapButton :to="localePath('/contact')">
            {{ t('nav.cta') }}
          </DidapButton>
          <NuxtLink
            v-for="l in allLocales.filter((x) => x.code !== locale)"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            class="text-label opacity-60"
            :lang="l.code"
          >
            {{ l.code }}
          </NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
