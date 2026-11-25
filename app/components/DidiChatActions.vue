<script setup lang="ts">
import DidapButton from '~/components/DidapButton.vue'

// Le strade per sentirci sotto la chat con Didi (useDidiChat `actions`):
// WhatsApp se c'è il numero, la mail già scritta e il modulo (evento
// `form`); quando l'idea è partita solo "Ricomincia". `paper`: pulsanti
// carta, sul rosso della chiusura
defineProps<{ paper?: boolean }>()
const emit = defineEmits<{ form: [], restart: [] }>()

const { t } = useI18n()
const { sent, mailto, whatsapp } = useDidiChat()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <template v-if="!sent">
      <DidapButton
        v-if="whatsapp"
        :href="whatsapp"
        :paper="paper"
      >
        {{ t('didi.whatsapp') }}
      </DidapButton>
      <DidapButton
        :href="mailto"
        :paper="paper"
      >
        {{ t('didi.email') }}
      </DidapButton>
      <button
        type="button"
        class="
          border-b-[1.5px] border-current py-2.5 text-button transition-opacity
          hover:opacity-70
        "
        @click="emit('form')"
      >
        {{ t('chat.form') }}
      </button>
    </template>
    <button
      type="button"
      class="
        text-label opacity-70 transition-opacity
        hover:opacity-100
      "
      @click="emit('restart')"
    >
      {{ t('chat.restart') }}
    </button>
  </div>
</template>
