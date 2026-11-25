<script setup lang="ts">
// La conversazione con Didi (useDidiChat, una per pagina): Didi a
// sinistra, il cliente a destra in verde, i puntini mentre Didi pensa. A
// ogni messaggio nuovo scende all'ultimo. `tone`: il fondo su cui sta,
// carta (la nuvoletta crema) o ink (la nuvoletta nera della chiusura).
// `scene`: il testo cresce con la scena di DidiTalk (cqw)
const props = defineProps<{ tone: 'paper' | 'ink', scene?: boolean }>()

const { t } = useI18n()
const { thread, thinking } = useDidiChat()

const didi = computed(() => (props.tone === 'ink' ? 'bg-paper-light/12 text-paper-light' : 'bg-ink/6 text-ink'))

const list = ref<HTMLElement>()
watch([() => thread.value.length, thinking], () => nextTick(() => {
  list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
}))
</script>

<template>
  <ol
    ref="list"
    class="flex flex-col gap-2 overflow-y-auto overscroll-contain"
    aria-live="polite"
  >
    <li
      v-for="(m, i) in thread"
      :key="i"
      class="
        chat-bubble max-w-[85%] rounded-[20px] px-4 py-2.5 text-[15px]/snug
        wrap-break-word
      "
      :class="[
        m.role === 'user' ? 'self-end rounded-br-md bg-green text-paper-light' : `
          self-start rounded-bl-md
          ${didi}
        `,
        scene ? 'md:text-[max(1rem,1.45cqw)]/snug' : '',
      ]"
    >
      <span class="sr-only">{{ m.role === 'user' ? t('chat.you') : 'Didi' }}: </span>{{ m.content }}
    </li>
    <li
      v-if="thinking"
      class="
        chat-bubble flex self-start rounded-[20px] rounded-bl-md px-4 py-3.5
      "
      :class="didi"
      role="status"
      :aria-label="t('chat.thinking')"
    >
      <span class="chat-dots flex items-center gap-1.5">
        <span
          v-for="n in 3"
          :key="n"
          class="size-2 rounded-full bg-current"
        />
      </span>
    </li>
  </ol>
</template>
