<script setup lang="ts">
// Componente "Footer" del Figma: filetto ink 1.5 in alto, tagline Title
// a sinistra, tre colonne (Sito, Legale, Contatto) a 80 di distanza.
defineProps<{ cream?: boolean }>()

const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

const siteLinks = useHomeSections()

const legalLinks = computed(() => [
  { to: localePath('/privacy'), label: t('footer.privacy') },
  { to: localePath('/cookies'), label: t('footer.cookies') },
])
</script>

<template>
  <footer
    :class="cream ? 'bg-cream' : 'bg-paper-light'"
  >
    <div class="page-x">
      <div class="flex flex-col gap-[72px] border-t-[1.5px] border-ink py-10">
        <div
          class="
            flex flex-col justify-between gap-12
            lg:flex-row lg:gap-6
          "
        >
          <p class="text-title">
            {{ t('footer.tagline') }}
          </p>

          <div class="flex flex-wrap gap-x-20 gap-y-10">
            <nav
              class="flex flex-col gap-3"
              :aria-label="t('footer.site')"
            >
              <p class="text-label opacity-60">
                {{ t('footer.site') }}
              </p>
              <NuxtLink
                v-for="l in siteLinks"
                :key="l.id"
                :to="l.to"
                aria-current="false"
                class="
                  text-body transition-colors
                  hover:text-green
                "
              >
                {{ l.label }}
              </NuxtLink>
            </nav>

            <nav
              class="flex flex-col gap-3"
              :aria-label="t('footer.legal')"
            >
              <p class="text-label opacity-60">
                {{ t('footer.legal') }}
              </p>
              <NuxtLink
                v-for="l in legalLinks"
                :key="l.to"
                :to="l.to"
                class="
                  text-body transition-colors
                  hover:text-green
                "
              >
                {{ l.label }}
              </NuxtLink>
            </nav>

            <div class="flex flex-col gap-3">
              <p class="text-label opacity-60">
                {{ t('footer.contact') }}
              </p>
              <a
                href="mailto:amministrazione@didap.it"
                class="
                  text-body transition-colors
                  hover:text-green
                "
              >
                amministrazione@didap.it
              </a>
            </div>
          </div>
        </div>

        <p class="text-label opacity-60">
          © {{ year }} Didap srl
        </p>
      </div>
    </div>
  </footer>
</template>
