<script setup lang="ts">
import PageIntro from '~/components/PageIntro.vue'

// Chi siamo: l'apertura delle pagine interne e due paragrafi nella
// colonna larga.
const { t } = useI18n()
useSeoMeta({
  title: `${t('nav.about')} - Didap`,
  description: t('about.intro').replace(/\s+/g, ' '),
})
</script>

<template>
  <div>
    <PageIntro
      :kicker="t('about.kicker')"
      :title="t('about.title')"
      :intro="t('about.intro')"
    />

    <section class="page-x">
      <div class="
        grid gap-x-6 pb-24
        lg:grid-cols-[302fr_954fr] lg:pb-30
      ">
        <div class="
          flex min-w-0 flex-col gap-7 text-body
          lg:col-start-2
        ">
          <p>{{ t('about.body_1') }}</p>
          <p>{{ t('about.body_2') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
