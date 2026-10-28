<script setup lang="ts">
import { DialogClose, DialogContent, DialogPortal, DialogRoot } from 'reka-ui'
import ContactForm from '~/components/ContactForm.vue'

// Il modulo di contatto a tutto schermo, sopra qualunque pagina: la
// barra in alto è alta come la nav, la ✕ sta dove c'era il bottone.
// Ogni apertura è un modulo nuovo, anche se si riapre mentre l'uscita
// è ancora in corso. Cambiare pagina (privacy, indietro) lo chiude.
const { t } = useI18n()
const route = useRoute()
const { open, product } = useContactDialog()

const session = ref(0)
watch(open, (o) => {
  if (o) session.value++
})
watch(() => route.fullPath, () => {
  open.value = false
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogContent
        :aria-describedby="undefined"
        class="
          fixed inset-0 z-50 overflow-y-auto bg-ink text-paper-light
          motion-safe:data-[state=closed]:animate-sheet-out
          motion-safe:data-[state=open]:animate-sheet-in
        "
      >
        <div class="page-x">
          <div class="
            flex h-[72px] items-center justify-between
            lg:h-[97px]
          ">
            <span class="text-label text-banana">{{ t('nav.contact') }}</span>
            <DialogClose
              class="
                -mr-2.5 flex size-10 items-center justify-center rounded-full
                transition-colors
                hover:bg-paper-light hover:text-ink
                focus-visible:outline-2 focus-visible:outline-banana
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
            border-t-[1.5px] border-paper-light pt-8 pb-24
            lg:pb-[136px]
          ">
            <ContactForm
              :key="session"
              dialog
              :product="product"
            />
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
