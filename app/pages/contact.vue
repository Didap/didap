<script setup lang="ts">
import ContactForm from '~/components/ContactForm.vue'
import { productFromQuery } from '#shared/contact'

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
</script>

<template>
  <section class="bg-ink text-paper-light">
    <div class="
      page-x pt-8 pb-24
      lg:pb-[136px]
    ">
      <ContactForm
        :key="product"
        :product="product"
      />
    </div>
  </section>
</template>
