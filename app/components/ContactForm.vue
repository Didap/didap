<script setup lang="ts">
import type { Component } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import DidapButton from '~/components/DidapButton.vue'
import { CONTACT_EMAIL, CONTACT_PHONE, PROJECT_TYPES, contactKind, telHref } from '#shared/contact'
import { untypeset } from '#shared/typeset'

// Il modulo di contatto, come una sezione della home: titolo grande, poi colonna
// etichetta 302 con i contatti diretti e colonna 954 con il modulo.
// Chi lo usa decide il resto: `titleAs` è il tag del titolo (h1 sulla
// pagina, il titolo del dialog sopra le pagine), lo slot `done` è
// l'azione dopo l'invio. `product`: arriva da "Avvisami quando esce", il
// messaggio è già scritto.
const props = defineProps<{ titleAs?: Component | string; product?: string }>()

const { t } = useI18n()
const localePath = useLocalePath()

// Il messaggio va nel campo e nell'email: senza gli spazi di typeset()
const form = reactive({
  name: '',
  contact: '',
  projectType: '',
  message: props.product ? untypeset(t('contact.form.notify_message', { name: props.product })) : '',
  website: '', // honeypot
})

const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const contactInvalid = ref(false)
const contactInput = ref<HTMLInputElement>()
const invalidId = useId()
const typeId = useId()

async function onSubmit() {
  if (status.value === 'sending') return
  if (!contactKind(form.contact)) {
    contactInvalid.value = true
    contactInput.value?.focus()
    return
  }
  status.value = 'sending'
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        contact: form.contact.trim(),
        projectType: form.projectType,
        message: form.message.trim(),
        website: form.website,
      },
    })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
}

const field = `
  w-full border-b-[1.5px] border-ink/40 bg-transparent py-3 text-body
  transition-colors outline-none
  placeholder:text-ink/35
  focus:border-green
`
</script>

<template>
  <div class="flex flex-col gap-16">
    <component
      :is="titleAs ?? 'h1'"
      class="text-display whitespace-pre-line"
    >
      {{ t('contact.title') }}
    </component>

    <div class="
      grid gap-12
      lg:grid-cols-[302fr_954fr] lg:gap-6
    ">
      <div class="flex flex-col gap-7">
        <p class="text-body">
          {{ t('contact.intro') }}
        </p>
        <div class="flex flex-col gap-2">
          <p class="text-label opacity-60">
            {{ t('contact.direct') }}
          </p>
          <a
            :href="`mailto:${CONTACT_EMAIL}`"
            class="
              self-start text-body-medium break-all underline underline-offset-4
              transition-colors
              hover:text-green
            "
          >{{ CONTACT_EMAIL }}</a>
          <a
            v-if="CONTACT_PHONE"
            :href="telHref(CONTACT_PHONE)"
            class="
              self-start text-body-medium underline underline-offset-4
              transition-colors
              hover:text-green
            "
          >{{ CONTACT_PHONE }}</a>
        </div>
      </div>

      <div aria-live="polite">
        <div
          v-if="status === 'success'"
          class="flex flex-col items-start gap-7"
        >
          <img
            src="/brand/didi-testa.svg"
            alt=""
            width="218"
            height="200"
            class="w-[160px]"
          >
          <p class="text-title">
            {{ t('contact.form.success_title', { name: form.name.trim() }) }}
          </p>
          <p class="text-body">
            {{ t('contact.form.success_body') }}
          </p>
          <slot name="done" />
        </div>

        <form
          v-else
          class="flex flex-col gap-10"
          @submit.prevent="onSubmit"
        >
          <input
            v-model="form.website"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            class="absolute left-[-9999px] size-0 opacity-0"
            aria-hidden="true"
          >

          <div class="
            grid gap-10
            md:grid-cols-2 md:gap-6
          ">
            <label class="flex flex-col gap-1">
              <span class="text-label opacity-60">{{ t('contact.form.name') }}</span>
              <input
                v-model="form.name"
                type="text"
                name="name"
                autocomplete="name"
                required
                maxlength="120"
                :placeholder="t('contact.form.name_placeholder')"
                :class="field"
              >
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-label opacity-60">{{ t('contact.form.contact') }}</span>
              <input
                ref="contactInput"
                v-model="form.contact"
                type="text"
                name="contact"
                autocomplete="email"
                required
                maxlength="200"
                :placeholder="t('contact.form.contact_placeholder')"
                :aria-invalid="contactInvalid || undefined"
                :aria-describedby="invalidId"
                :class="field"
                @input="contactInvalid = false"
              >
              <span
                :id="invalidId"
                class="mt-1 text-label text-red normal-case"
              >{{ contactInvalid ? t('contact.form.contact_invalid') : '' }}</span>
            </label>
          </div>

          <div class="flex flex-col gap-4">
            <span
              :id="typeId"
              class="text-label opacity-60"
            >{{ t('contact.form.project_type') }}</span>
            <ToggleGroupRoot
              v-model="form.projectType"
              type="single"
              :aria-labelledby="typeId"
              class="flex flex-wrap gap-3"
            >
              <ToggleGroupItem
                v-for="p in PROJECT_TYPES"
                :key="p"
                :value="p"
                class="
                  rounded-full border-[1.5px] border-ink/40 px-5 py-3 text-label
                  transition-colors
                  hover:border-ink
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-ink
                  data-[state=on]:border-green data-[state=on]:bg-green
                  data-[state=on]:text-paper-light
                "
              >
                {{ t(`contact.form.option_${p}`) }}
              </ToggleGroupItem>
            </ToggleGroupRoot>
            <p
              v-if="form.projectType === 'grant'"
              class="text-body opacity-80"
            >
              {{ t('contact.form.qube') }}
              <a
                href="https://www.theqube.it"
                target="_blank"
                rel="noopener"
                class="
                  underline underline-offset-4 transition-colors
                  hover:text-green
                "
              >{{ t('contact.form.qube_link') }}&nbsp;↗</a>
            </p>
          </div>

          <label class="flex flex-col gap-1">
            <span class="text-label opacity-60">{{ t('contact.form.message') }}</span>
            <textarea
              v-model="form.message"
              name="message"
              required
              rows="4"
              maxlength="5000"
              :placeholder="t('contact.form.message_placeholder')"
              :class="field"
              class="resize-y"
            />
          </label>

          <div class="flex flex-col items-start gap-5">
            <DidapButton
              type="submit"
              :disabled="status === 'sending'"
            >
              {{ status === 'sending' ? t('contact.form.submitting') : t('contact.form.submit') }}
            </DidapButton>
            <p
              v-if="status === 'error'"
              role="alert"
              class="text-body text-red"
            >
              {{ t('contact.form.error', { email: CONTACT_EMAIL }) }}
            </p>
            <p class="text-sm opacity-60">
              {{ t('contact.form.privacy') }}&nbsp;<NuxtLink
                :to="localePath('/privacy')"
                class="
                  underline underline-offset-4 transition-colors
                  hover:text-green
                "
              >{{ t('contact.form.privacy_link') }}</NuxtLink>.
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
