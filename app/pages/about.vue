<script setup lang="ts">
import PageIntro from '~/components/PageIntro.vue'
import RichText from '~/components/RichText.vue'

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
        page-grid pb-24
        lg:pb-30
      ">
        <RichText class="lg:col-start-2">
          <p>{{ t('about.body_1') }}</p>
          <p>{{ t('about.body_2') }}</p>
        </RichText>
      </div>
    </section>
  </div>
</template>
