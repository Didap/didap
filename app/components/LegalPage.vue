<script setup lang="ts">
import PageIntro from '~/components/PageIntro.vue'
import RichText from '~/components/RichText.vue'

// Pagina legale (privacy, cookie): apertura con la data dell'ultimo
// aggiornamento, poi il testo nella colonna larga con gli stili del
// markdown, pronto per un'informativa lunga con titoli ed elenchi.
// Per ora c'è il segnaposto.
const props = defineProps<{
  page: 'privacy' | 'cookies'
}>()

const { t } = useI18n()

useSeoMeta({
  title: () => `${t(`${props.page}.title`)} - Didap`,
  description: () => t(`${props.page}.intro`),
})
</script>

<template>
  <div>
    <PageIntro
      :kicker="t(`${page}.kicker`)"
      :title="t(`${page}.title`)"
      :intro="t(`${page}.intro`)"
    >
      <p class="text-label opacity-70">
        {{ t(`${page}.updated`) }}
      </p>
    </PageIntro>

    <section class="page-x">
      <div class="
        page-grid pb-24
        lg:pb-30
      ">
        <RichText class="lg:col-start-2">
          <p>{{ t(`${page}.placeholder`) }}</p>
        </RichText>
      </div>
    </section>
  </div>
</template>
