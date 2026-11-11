<script setup lang="ts">
import PageIntro from '~/components/PageIntro.vue'
import RichText from '~/components/RichText.vue'

// Pagina legale (privacy, cookie): apertura con la data dell'ultimo
// aggiornamento, poi il testo nella colonna larga con gli stili del
// markdown, pronto per un'informativa lunga con titoli ed elenchi.
// Finché il testo vero non c'è, lo slot mostra il segnaposto.
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
        grid gap-x-6 pb-24
        lg:grid-cols-[302fr_954fr] lg:pb-30
      ">
        <RichText class="
          min-w-0
          lg:col-start-2
        ">
          <slot>
            <p>{{ t(`${page}.placeholder`) }}</p>
          </slot>
        </RichText>
      </div>
    </section>
  </div>
</template>
