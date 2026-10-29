<script setup lang="ts">
import type { Component } from 'vue'
import ContactForm from '~/components/ContactForm.vue'
import DidiTalk from '~/components/DidiTalk.vue'
import type { ProjectType } from '#shared/contact'

// "Lavora con noi": "Chiedi a Didi!" con tre domande, poi Didi che parla
// (DidiTalk). Il modulo si apre qui sotto, già compilato con quello che
// il cliente le ha scritto. Chi arriva da "Avvisami quando esce"
// (`product`), con la voce già scelta (`projectType`) o con un messaggio
// già scritto a Didi altrove (`message`, la chiusura della home) va
// dritto al modulo. `titleAs` e lo slot `done` passano come per
// ContactForm.
const props = defineProps<{
  titleAs?: Component | string
  product?: string
  projectType?: ProjectType | ''
  message?: string
}>()

const { t } = useI18n()

const form = ref(!!(props.product || props.projectType || props.message))
const formType = ref<ProjectType | ''>(props.projectType ?? '')
const formMessage = ref(props.message ?? '')

function openForm(type: ProjectType | '', message: string) {
  formType.value = type
  formMessage.value = message
  form.value = true
}
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
      <!-- Tre domande, una per riga -->
      <ul class="text-body opacity-80">
        <li
          v-for="n in 3"
          :key="n"
        >
          {{ t(`chat.questions.q${n}`) }}
        </li>
      </ul>
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
        @click="form = false"
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
        :message="formMessage"
      >
        <template #done>
          <slot name="done" />
        </template>
      </ContactForm>
    </div>

    <DidiTalk
      v-else
      :hello="t('chat.hello')"
      suggestions
      @form="openForm"
    />
  </div>
</template>
