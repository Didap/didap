<script setup lang="ts">
import PageIntro from '~/components/PageIntro.vue'
import DidapButton from '~/components/DidapButton.vue'

// Safe Mobility Hack: la pagina del QR proiettato all'evento. Un solo
// bottone che scarica il template delle slide per le squadre (il file
// sta in public/download, servito come allegato da nuxt.config).
// Niente splash: chi arriva dal QR vuole il file subito.
definePageMeta({ splash: false })

const { t } = useI18n()
useSeoMeta({
  title: `${t('safe_mobility.kicker')} - Didap`,
  description: t('safe_mobility.intro').replace(/\s+/g, ' '),
  robots: 'noindex',
})

const FILE = '/download/safe-mobility-hack-template.pptx'
</script>

<template>
  <div class="
    pb-24
    lg:pb-30
  ">
    <PageIntro
      :kicker="t('safe_mobility.kicker')"
      :title="t('safe_mobility.title')"
      :intro="t('safe_mobility.intro')"
    >
      <div class="flex flex-col items-start gap-4">
        <DidapButton
          :href="FILE"
          download
        >
          {{ t('safe_mobility.download') }}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M8 2v9M4 7.5 8 11.5l4-4M3 14h10" />
          </svg>
        </DidapButton>
        <p class="text-label text-ink/60">
          {{ t('safe_mobility.file') }}
        </p>
      </div>
    </PageIntro>
  </div>
</template>
