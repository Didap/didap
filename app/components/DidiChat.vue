<script setup lang="ts">
import type { Component } from 'vue'
import ContactForm from '~/components/ContactForm.vue'
import DidapButton from '~/components/DidapButton.vue'
import { CONTACT_EMAIL, CONTACT_WHATSAPP, PROJECT_TYPES, mailtoHref, whatsappHref, type ProjectType } from '#shared/contact'
import type { DidiTopic } from '#shared/didi'
import { untypeset } from '#shared/typeset'

// "Lavora con noi": Didi grande che parla in una nuvoletta e sotto un
// campo per scriverle. Da quello che scrive il cliente capisce di cosa
// si tratta (useDidiChat) e gli propone la strada più corta per
// sentirci: WhatsApp se c'è il numero, la mail già scritta, il modulo
// già compilato col suo messaggio. Chi arriva da "Avvisami quando esce"
// (`product`) o con la voce già scelta (`projectType`) va dritto al
// modulo. `titleAs` e lo slot `done` passano come per ContactForm.
const props = defineProps<{ titleAs?: Component | string, product?: string, projectType?: ProjectType | '' }>()

const { t } = useI18n()
const { said, topic, thinking, ask, reset } = useDidiChat()

const draft = ref('')
const input = ref<HTMLTextAreaElement>()
const form = ref(!!(props.product || props.projectType))

const TOPICS = [...PROJECT_TYPES, 'chat'] as const
const topicLabel = (k: DidiTopic) => t(k === 'chat' ? 'didi.chat' : `contact.form.option_${k}`)

// Quello che dice Didi: il saluto, poi la risposta
const line = computed(() => (topic.value ? t(`chat.reply.${topic.value}`) : t('chat.hello')))

const mailto = computed(() =>
  topic.value ? mailtoHref(CONTACT_EMAIL, untypeset(t('didi.subject', { topic: topicLabel(topic.value) })), said.value) : '',
)
const whatsapp = computed(() => (CONTACT_WHATSAPP && said.value ? whatsappHref(CONTACT_WHATSAPP, said.value) : ''))
const formType = computed(() => PROJECT_TYPES.find(p => p === topic.value) ?? props.projectType ?? '')

function send() {
  const text = draft.value.trim()
  if (!text || thinking.value) return
  draft.value = ''
  ask(text)
}

// Le voci pronte: scrivono per il cliente la frase di DidiGuide
function pick(k: DidiTopic) {
  draft.value = untypeset(t(`didi.message.${k}`))
  send()
}

function restart() {
  reset()
  form.value = false
  nextTick(() => input.value?.focus())
}

// Il campo cresce con il testo, fino a qualche riga
watch(draft, () => nextTick(() => {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}))
</script>

<template>
  <div class="flex flex-col gap-[clamp(28px,5vh,56px)]">
    <div class="flex flex-col gap-3">
      <component
        :is="titleAs ?? 'h1'"
        class="
          font-wide text-[clamp(2.25rem,1.4rem+2.6vw,4rem)] leading-[0.95]
          font-bold tracking-[-0.03em]
        "
      >
        {{ t('chat.title') }}
      </component>
      <p class="text-body whitespace-pre-line opacity-80">
        {{ t('chat.lines') }}
      </p>
    </div>

    <!-- Il modulo, già compilato con quello che ha scritto a Didi -->
    <div
      v-if="form"
      class="flex flex-col items-start gap-10"
    >
      <button
        type="button"
        class="
          flex items-center gap-2 border-b border-current py-1 text-label
          opacity-70 transition-opacity
          hover:opacity-100
        "
        @click="restart"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M12 7H2m4.5-4.5L2 7l4.5 4.5" /></svg>
        {{ t('chat.back') }}
      </button>
      <ContactForm
        class="w-full"
        title-as="h2"
        :product="product"
        :project-type="formType"
        :message="said"
      >
        <template #done>
          <slot name="done" />
        </template>
      </ContactForm>
    </div>

    <template v-else>
      <!-- La scena: Didi e la sua nuvoletta -->
      <div class="
        grid grid-cols-[minmax(0,1fr)] items-end gap-y-2
        md:max-w-[820px] md:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] md:gap-x-4
      ">
        <img
          src="/brand/didi-testa.svg"
          alt=""
          width="218"
          height="200"
          class="
            didi order-2 w-28 self-end
            md:order-1 md:w-full md:max-w-[280px] md:justify-self-end
          "
          :class="{ 'is-thinking': thinking, 'is-talking': topic }"
        >
        <div
          class="
            relative order-1 mb-[8%] grid aspect-16/10 place-items-center
            rounded-[50%] bg-ink px-[13%] py-[11%] text-paper-light
            md:order-2 md:mb-[14%]
          "
          aria-live="polite"
        >
          <p
            v-if="thinking"
            class="dots flex gap-2"
            role="status"
            :aria-label="t('chat.thinking')"
          >
            <span
              v-for="n in 3"
              :key="n"
              class="size-3 rounded-full bg-current"
            />
          </p>
          <p
            v-else
            :key="line"
            class="said font-wide leading-[1.05] font-bold tracking-[-0.02em]"
            :class="line.length < 50
              ? 'text-[clamp(1.5rem,0.9rem+2vw,3rem)]'
              : 'text-[clamp(1.0625rem,0.75rem+1.1vw,1.875rem)]'"
          >
            {{ line }}
          </p>
          <!-- La coda, verso Didi in basso a sinistra -->
          <svg
            viewBox="0 0 100 90"
            class="absolute bottom-[-12%] left-[9%] w-[18%] text-ink"
            aria-hidden="true"
          ><path
            d="M38 0 100 14 0 90Z"
            fill="currentColor"
          /></svg>
        </div>
      </div>

      <!-- Le strade per sentirci, dopo la risposta -->
      <div
        v-if="topic"
        class="flex flex-wrap items-center gap-x-7 gap-y-4"
      >
        <DidapButton
          v-if="whatsapp"
          :href="whatsapp"
        >
          {{ t('didi.whatsapp') }}
        </DidapButton>
        <DidapButton :href="mailto">
          {{ t('didi.email') }}
        </DidapButton>
        <button
          type="button"
          class="
            border-b-[1.5px] border-current py-2.5 text-button transition-colors
            hover:text-green
          "
          @click="form = true"
        >
          {{ t('chat.form') }}
        </button>
        <p class="text-sm opacity-60">
          {{ t('chat.note') }}
        </p>
      </div>

      <!-- Quello che il cliente scrive a Didi -->
      <form
        class="flex flex-col gap-4"
        @submit.prevent="send"
      >
        <p
          v-if="said"
          class="text-label opacity-60"
        >
          {{ t('chat.you') }}: <span class="normal-case">“{{ said }}”</span>
        </p>
        <div class="
          flex items-end gap-3 rounded-[30px] border-[1.5px] border-ink
          bg-paper-light p-2 pl-6 transition-colors
          focus-within:border-green
        ">
          <textarea
            ref="input"
            v-model="draft"
            rows="1"
            maxlength="2000"
            :aria-label="t('chat.input')"
            :placeholder="t('chat.placeholder')"
            class="
              min-w-0 flex-1 resize-none bg-transparent py-3 text-body
              outline-none
              placeholder:text-ink/40
            "
            @keydown.enter.exact.prevent="send"
          />
          <DidapButton
            type="submit"
            :disabled="!draft.trim() || thinking"
          >
            {{ t('chat.send') }}
          </DidapButton>
        </div>
        <ul
          v-if="!said"
          class="flex flex-wrap gap-2"
        >
          <li
            v-for="k in TOPICS"
            :key="k"
          >
            <button
              type="button"
              class="
                rounded-full border-[1.5px] border-ink/40 px-4 py-2 text-label
                transition-colors
                hover:border-ink hover:bg-ink hover:text-paper-light
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-ink
              "
              @click="pick(k)"
            >
              {{ topicLabel(k) }}
            </button>
          </li>
        </ul>
        <button
          v-else
          type="button"
          class="
            self-start text-label opacity-60 transition-opacity
            hover:opacity-100
          "
          @click="restart"
        >
          {{ t('chat.restart') }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
/* Didi pensa dondolando, risponde con un saltello; la risposta entra
   dal basso. Con meno movimento sta ferma */
@media (prefers-reduced-motion: no-preference) {
  .didi {
    transform-origin: 50% 100%;
  }

  .didi.is-thinking {
    animation: didi-think 0.9s ease-in-out infinite;
  }

  .didi.is-talking {
    animation: didi-hop 0.5s var(--ease-vintage);
  }

  .said {
    animation: said-in 0.45s var(--ease-vintage);
  }

  .dots span {
    animation: dot 1s ease-in-out infinite;
  }

  .dots span:nth-child(2) { animation-delay: 0.15s; }
  .dots span:nth-child(3) { animation-delay: 0.3s; }
}

@keyframes didi-think {
  0%, 100% { transform: rotate(-4deg); }
  50% { transform: rotate(4deg); }
}

@keyframes didi-hop {
  0% { transform: none; }
  35% { transform: translateY(-8%) scale(0.97, 1.04); }
  70% { transform: translateY(0) scale(1.04, 0.96); }
  100% { transform: none; }
}

@keyframes said-in {
  from { opacity: 0; transform: translateY(10px); }
}

@keyframes dot {
  0%, 100% { opacity: 0.35; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
}
</style>
