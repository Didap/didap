<script setup lang="ts">
import type { NuxtError } from '#app'
import DidapButton from '~/components/DidapButton.vue'

// La pagina d'errore (404 e il resto): nel layout di sempre, con la
// griglia di PageIntro. A sinistra il codice e Didi un po' perplessa, a
// destra il titolo, due righe e la strada di casa
const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()

const code = computed(() => props.error.status ?? props.error.statusCode ?? 500)
const copy = computed(() => (code.value === 404 ? 'not_found' : 'generic'))

useSeoMeta({
  title: () => `${t(`error.${copy.value}.title`)} - Didap`,
  robots: 'noindex',
})

function home() {
  clearError({ redirect: localePath('/') })
}
</script>

<template>
  <NuxtLayout name="default">
    <section class="page-x">
      <div class="
        page-grid gap-y-6 border-t-[1.5px] border-ink pt-8 pb-24
        lg:pb-[136px]
      ">
        <div class="
          flex items-start justify-between gap-6
          lg:flex-col lg:justify-start lg:gap-10
        ">
          <p class="text-label text-green">
            {{ t('error.code', { code }) }}
          </p>
          <img
            src="/brand/didi-testa.svg"
            alt=""
            width="218"
            height="200"
            class="
              w-20 -rotate-12
              lg:w-36
            "
          >
        </div>
        <div class="
          flex min-w-0 flex-col items-start gap-6
          lg:col-start-2
        ">
          <h1 class="text-hero">
            {{ t(`error.${copy}.title`) }}
          </h1>
          <p class="text-body-medium">
            {{ t(`error.${copy}.intro`) }}
          </p>
          <DidapButton
            type="button"
            class="mt-4"
            @click="home"
          >
            {{ t('error.home') }}
          </DidapButton>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>
