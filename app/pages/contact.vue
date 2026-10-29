<script setup lang="ts">
import ContactForm from '~/components/ContactForm.vue'
import { productFromQuery, projectTypeFromQuery } from '#shared/contact'

// Lo stesso modulo che si apre sopra le pagine, qui da solo: per i link
// condivisi e per chi apre /contact in una nuova scheda.
const { t } = useI18n()
const route = useRoute()

useSeoMeta({
  title: `${t('nav.contact')} - Didap`,
  description: t('contact.intro').replace(/\s+/g, ' '),
})

// Da "Avvisami quando esce" di una scheda prodotto: ?product=Nome
const product = computed(() => productFromQuery(route.query.product))
// Dalla voce già scelta con Didi: ?type=grant
const projectType = computed(() => projectTypeFromQuery(route.query.type))
</script>

<template>
  <section class="page-x">
    <div class="
      border-t-[1.5px] border-ink pt-8 pb-24
      lg:pb-[136px]
    ">
      <ContactForm
        :key="`${product}${projectType}`"
        :product="product"
        :project-type="projectType"
      />
    </div>
  </section>
</template>
