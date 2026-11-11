<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import ContactForm from '~/components/ContactForm.vue'
import DidapButton from '~/components/DidapButton.vue'
import type { ProjectType } from '#shared/contact'

// Il modulo di contatto in un foglio che sale dal basso, sopra la home
// (la chiusura rossa, "Oppure contattaci direttamente"). Sale lento e si
// posa senza scatto, il modulo lo segue un attimo dopo; si chiude con la
// ✕, con Esc, toccando fuori o tirando giù la maniglia. `projectType` e
// `message`: quello già scelto o scritto a Didi. Ogni apertura è un
// modulo nuovo.
const open = defineModel<boolean>('open', { required: true })
defineProps<{ projectType?: ProjectType | '', message?: string }>()

const { t } = useI18n()
const sheetId = useId()

const session = ref(0)
watch(open, (o) => {
  if (!o) return
  session.value++
  drag.value = 0
})

// Il primo campo prende il fuoco quando il foglio è arrivato, così il
// browser non scorre per mostrarlo. Sul telefono no: la tastiera
// coprirebbe il foglio mentre sale
function focusFirstField(e: Event) {
  e.preventDefault()
  const sheet = document.getElementById(sheetId)
  sheet?.focus({ preventScroll: true })
  if (!window.matchMedia('(pointer: fine)').matches) return
  setTimeout(() => sheet?.querySelector<HTMLElement>('input[name="name"]')?.focus({ preventScroll: true }), 600)
}

// Tirare giù dalla maniglia: il foglio segue il dito; oltre 120px, o con
// un colpo veloce, si chiude partendo da dove è stato lasciato, se no
// torna su
const drag = ref(0)
const dragging = ref(false)
let startY = 0
let startT = 0

function dragStart(e: PointerEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
  dragging.value = true
  startY = e.clientY
  startT = e.timeStamp
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function dragMove(e: PointerEvent) {
  if (dragging.value) drag.value = Math.max(0, e.clientY - startY)
}

function dragEnd(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  const speed = drag.value / Math.max(1, e.timeStamp - startT)
  if (drag.value > 120 || (drag.value > 24 && speed > 0.6)) open.value = false
  else drag.value = 0
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="veil fixed inset-0 z-50 bg-ink/50" />
      <DialogContent
        :id="sheetId"
        :aria-describedby="undefined"
        class="
          sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92svh] flex-col
          rounded-t-[28px] bg-paper text-ink
          shadow-[0_-20px_60px_-20px_rgb(22_20_18/0.35)] outline-none
        "
        :class="{ 'transition-transform duration-500 ease-vintage': !dragging }"
        :style="drag ? { transform: `translateY(${drag}px)` } : undefined"
        @open-auto-focus="focusFirstField"
      >
        <!-- La maniglia e la testata: da qui si tira giù il foglio -->
        <div
          class="
            shrink-0 cursor-grab touch-none select-none
            active:cursor-grabbing
          "
          @pointerdown="dragStart"
          @pointermove="dragMove"
          @pointerup="dragEnd"
          @pointercancel="dragEnd"
        >
          <div
            class="mx-auto mt-3 h-1 w-10 rounded-full bg-ink/25"
            aria-hidden="true"
          />
          <div class="page-x">
            <div class="
              flex items-center justify-between gap-6 border-b-[1.5px]
              border-ink pt-4 pb-5
            ">
              <DialogTitle class="
                font-wide text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)]
                leading-[0.95] font-bold tracking-[-0.03em]
              ">
                {{ t('nav.cta') }}
              </DialogTitle>
              <DialogClose
                class="
                  -mr-2.5 flex size-10 shrink-0 items-center justify-center
                  rounded-full transition-colors
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
          </div>
        </div>

        <div class="
          sheet-body page-x min-h-0 overflow-y-auto overscroll-contain pt-8
          pb-[max(40px,env(safe-area-inset-bottom))]
          lg:pb-16
        ">
          <ContactForm
            :key="session"
            untitled
            :project-type="projectType"
            :message="message"
          >
            <template #done>
              <DialogClose as-child>
                <DidapButton>{{ t('contact.close') }}</DidapButton>
              </DialogClose>
            </template>
          </ContactForm>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Sale lento e si posa senza scatto, scende più svelto; il modulo arriva
   un attimo dopo il foglio. Con meno movimento compare e sparisce */
@media (prefers-reduced-motion: no-preference) {
  .sheet[data-state='open'] {
    animation: sheet-up 820ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  .sheet[data-state='closed'] {
    animation: sheet-down 560ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
  }

  .veil[data-state='open'] {
    animation: veil-in 600ms ease-out;
  }

  .veil[data-state='closed'] {
    animation: veil-out 560ms ease-in forwards;
  }

  .sheet-body {
    animation: body-in 700ms cubic-bezier(0.32, 0.72, 0, 1) 220ms both;
  }
}

@keyframes sheet-up {
  from { transform: translateY(100%); }
}

/* Senza `from`: parte da dove l'ha lasciato il dito */
@keyframes sheet-down {
  to { transform: translateY(100%); }
}

@keyframes veil-in {
  from { opacity: 0; }
}

@keyframes veil-out {
  to { opacity: 0; }
}

@keyframes body-in {
  from { opacity: 0; transform: translateY(24px); }
}
</style>
