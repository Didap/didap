<script setup lang="ts">
import type { ProjectType } from '#shared/contact'

// La chat con Didi su telefono, nel pannello crema: in alto chi parla
// (e la ✕ se `closable`), la conversazione che scorre (DidiThread), il
// campo a pillola e le strade per sentirci (DidiChatActions). La usano la
// nuvoletta di HomeDock e la chiusura della home. Chi la mette le dà
// l'altezza massima; `focus` porta il cursore nel campo.
defineProps<{ closable?: boolean }>()
const emit = defineEmits<{ close: [], form: [type: ProjectType | '', message: string] }>()

const { t } = useI18n()
const { thinking, sent, actions, ask, reset, formPayload } = useDidiChat()

const draft = ref('')
const input = ref<HTMLTextAreaElement>()
// Il campo parte da una riga, alta quanto il pulsante di invio, e cresce
// con il testo. Vuoto resta su una riga: il segnaposto non va a capo, a
// 14px ci sta intero anche su un telefono da 375px e, dove non ci sta,
// sfuma prima del pulsante invece di finirci sotto (i puntini nei campi a
// più righe Safari non li mette)
useAutosize(input, draft, { max: 160 })

function send() {
  const text = draft.value.trim()
  if (!text || thinking.value) return
  draft.value = ''
  ask(text)
}

function restart() {
  reset()
  nextTick(() => input.value?.focus())
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="flex flex-col px-4 pt-3 pb-4">
    <div class="flex shrink-0 items-center justify-between pl-2">
      <p class="font-wide text-[15px] font-bold tracking-[-0.01em]">
        Didi
      </p>
      <button
        v-if="closable"
        type="button"
        class="
          flex size-9 items-center justify-center rounded-full transition-colors
          hover:bg-ink hover:text-paper-light
          focus-visible:outline-2 focus-visible:outline-ink
        "
        :aria-label="t('didi.close')"
        @click="emit('close')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        ><path
          d="M5 5l10 10M15 5 5 15"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
        /></svg>
      </button>
    </div>

    <DidiThread
      tone="paper"
      class="mt-1 min-h-0 flex-1"
    />

    <form
      v-if="!sent"
      class="mt-3 shrink-0"
      @submit.prevent="send"
    >
      <div
        class="
          flex items-end gap-1 rounded-[30px] border-[1.5px] border-ink py-1.5
          pr-1.5 pl-4 transition-colors
          focus-within:border-green
        "
      >
        <textarea
          ref="input"
          v-model="draft"
          rows="1"
          maxlength="2000"
          :aria-label="t('chat.input')"
          :placeholder="t('chat.placeholder')"
          class="
            min-h-11 min-w-0 flex-1 resize-none overflow-hidden bg-transparent
            py-2.5 text-base/6 outline-none
            placeholder:text-[14px] placeholder:text-ink/40
            placeholder-shown:mask-[linear-gradient(to_right,#000_calc(100%-12px),transparent)]
            placeholder-shown:whitespace-nowrap
          "
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="submit"
          class="
            flex size-11 shrink-0 items-center justify-center rounded-full
            border-[1.5px] border-ink bg-ink text-paper-light transition-colors
            hover:border-green hover:bg-green
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-ink
            disabled:border-ink/20 disabled:bg-transparent disabled:text-ink/35
          "
          :disabled="!draft.trim() || thinking"
          :aria-label="t('chat.send')"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          ><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" /></svg>
        </button>
      </div>
    </form>

    <DidiChatActions
      v-if="actions"
      class="mt-3 shrink-0 pl-2"
      @form="emit('form', ...formPayload(draft))"
      @restart="restart"
    />
  </div>
</template>
