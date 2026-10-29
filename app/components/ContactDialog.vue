<script setup lang="ts">
import { DialogClose, DialogContent, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import ContactForm from '~/components/ContactForm.vue'
import DidapButton from '~/components/DidapButton.vue'

// Il modulo di contatto a tutto schermo, sopra qualunque pagina: la
// barra in alto è alta come la nav, la ✕ sta dove c'era il bottone.
// Ogni apertura è un modulo nuovo, anche se si riapre mentre l'uscita
// è ancora in corso. Lo apre e lo chiude plugins/contact-dialog.client.ts.
const { t } = useI18n()
const { open, product, projectType } = useContactDialog()

const session = ref(0)
watch(open, (o) => {
  if (o) session.value++
}, { immediate: true })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogContent
        :aria-describedby="undefined"
        class="
          fixed inset-0 z-50 overflow-y-auto bg-paper text-ink
          motion-safe:data-[state=closed]:animate-sheet-out
          motion-safe:data-[state=open]:animate-sheet-in
        "
      >
        <div class="page-x">
          <div class="
            flex h-[72px] items-center justify-between
            lg:h-[97px]
          ">
            <span class="text-label text-green">{{ t('nav.contact') }}</span>
            <DialogClose
              class="
                -mr-2.5 flex size-10 items-center justify-center rounded-full
                transition-colors
                hover:bg-ink hover:text-paper-light
                focus-visible:outline-2 focus-visible:outline-ink
              "
              :aria-label="t('contact.close')"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 5l10 10M15 5 5 15"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            </DialogClose>
          </div>
          <div class="
            border-t-[1.5px] border-ink pt-8 pb-24
            lg:pb-[136px]
          ">
            <ContactForm
              :key="session"
              :title-as="DialogTitle"
              :product="product"
              :project-type="projectType"
            >
              <template #done>
                <DialogClose as-child>
                  <DidapButton>{{ t('contact.close') }}</DidapButton>
                </DialogClose>
              </template>
            </ContactForm>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
