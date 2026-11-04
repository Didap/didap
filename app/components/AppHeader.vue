<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'

// Componente "Nav" del Figma: Didi (la testa tonda, senza la D) a
// sinistra, link Semibold 13 maiuscoli a 45 di distanza, CTA a destra.
// Niente selettore di lingua: la sceglie il browser. Alto 97. Variante
// `product` (scheda prodotto): al posto della CTA il logo del prodotto
// (o il suo nome), che porta al prodotto e compare quando la testata
// della scheda esce dallo schermo.
// Didi lascia la nav per DidiGuide e ci ricade dall'alto quando torna.
const props = defineProps<{ cream?: boolean; product?: boolean }>()

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const links = useHomeSections()
const ctaPath = useCtaPath()

// Via con DidiGuide, il link sparisce con lei
const didiAway = useDidiAway()

// Prodotto aperto (stessi dati della scheda, condivisi per chiave)
const productSlug = computed(() =>
  props.product ? String(route.params.slug ?? '') : '',
)
const { project: productNav } = await useProductPage(productSlug)
const showProduct = computed(() => props.product && productNav.value?.url)
// Il logo arriva quando la testata della scheda esce dallo schermo
const heroPassed = useProductHeroPassed()
const productAway = computed(() => !!productNav.value?.hero && !heroPassed.value)

const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
// Anche con un link che non cambia pagina (il modulo di contatto)
function closeMenuOnLink(e: MouseEvent) {
  if ((e.target as Element).closest('a')) menuOpen.value = false
}
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
        class="block"
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
          class="
            h-10 w-auto
            lg:h-12
          "
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
          :key="l.id"
          :to="l.to"
          aria-current="false"
          class="
            text-button transition-colors
            hover:text-green
          "
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center justify-end gap-6">
        <div
          v-if="showProduct"
          class="transition-[opacity,visibility] duration-300"
          :class="{ 'invisible opacity-0': productAway }"
        >
          <a
            v-if="productNav!.logo"
            :href="productNav!.url"
            target="_blank"
            rel="noopener"
            class="block"
            :aria-label="t('nav.open_product', { name: productNav!.title })"
          >
            <img
              :src="productNav!.logo"
              :alt="productNav!.title"
              class="
                h-8 w-auto max-w-[180px] object-contain
                lg:h-10
              "
            >
          </a>
          <DidapButton
            v-else
            :href="productNav!.url"
            medium
          >
            {{ productNav!.title }}
          </DidapButton>
        </div>
        <span
          v-else
          class="
            hidden
            sm:block
          "
        >
          <DidapButton
            :to="ctaPath"
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
      <nav
        class="page-x flex flex-col gap-5 py-8"
        @click="closeMenuOnLink"
      >
        <NuxtLink
          v-for="l in links"
          :key="l.id"
          :to="l.to"
          aria-current="false"
          class="text-title"
        >
          {{ l.label }}
        </NuxtLink>
        <div class="flex items-center gap-6 pt-4">
          <DidapButton :to="ctaPath">
            {{ t('nav.cta') }}
          </DidapButton>
        </div>
      </nav>
    </div>
  </header>
</template>
