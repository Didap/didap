<script setup lang="ts">
import { DialogClose, DialogTitle, ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { CONTACT_EMAIL, CONTACT_PHONE, PROJECT_TYPES, contactKind, telHref } from '#shared/contact'
import { untypeset } from '#shared/typeset'

// Il modulo di contatto su fondo inchiostro: titolo grande, poi colonna
// etichetta 302 con i contatti diretti e colonna 954 con il modulo.
// `dialog`: dentro il modulo a tutto schermo (titolo del dialog e
// bottone per chiudere dopo l'invio); altrimenti è la pagina /contact.
// `product`: arriva da "Avvisami quando esce", il messaggio è già scritto.
const props = defineProps<{ dialog?: boolean; product?: string }>()

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
const sentName = ref('')
const invalidId = useId()
const typeId = useId()

function pickProjectType(v: unknown) {
  form.projectType = typeof v === 'string' ? v : ''
}

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
    sentName.value = form.name.trim()
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
}

const field = `
  w-full border-b-[1.5px] border-paper-light/40 bg-transparent py-3 text-body
  transition-colors outline-none
  placeholder:text-paper-light/35
  focus:border-banana
`
</script>

<template>
  <div class="flex flex-col gap-16">
    <component
      :is="dialog ? DialogTitle : 'h1'"
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
              hover:text-banana
            "
          >{{ CONTACT_EMAIL }}</a>
          <a
            v-if="CONTACT_PHONE"
            :href="telHref(CONTACT_PHONE)"
            class="
              self-start text-body-medium underline underline-offset-4
              transition-colors
              hover:text-banana
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
            {{ t('contact.form.success_title', { name: sentName }) }}
          </p>
          <p class="text-body">
            {{ t('contact.form.success_body') }}
          </p>
          <DialogClose
            v-if="dialog"
            class="
              rounded-full bg-banana px-[26px] py-4 text-button text-ink
              transition-colors
              hover:bg-paper-light
            "
          >
            {{ t('contact.close') }}
          </DialogClose>
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
                class="mt-1 text-label text-blush normal-case"
              >{{ contactInvalid ? t('contact.form.contact_invalid') : '' }}</span>
            </label>
          </div>

          <div class="flex flex-col gap-4">
            <span
              :id="typeId"
              class="text-label opacity-60"
            >{{ t('contact.form.project_type') }}</span>
            <ToggleGroupRoot
              :model-value="form.projectType"
              type="single"
              :aria-labelledby="typeId"
              class="flex flex-wrap gap-3"
              @update:model-value="pickProjectType"
            >
              <ToggleGroupItem
                v-for="p in PROJECT_TYPES"
                :key="p"
                :value="p"
                class="
                  rounded-full border-[1.5px] border-paper-light/40 px-5 py-3
                  text-label transition-colors
                  hover:border-paper-light
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-banana
                  data-[state=on]:border-banana data-[state=on]:bg-banana
                  data-[state=on]:text-ink
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
                  hover:text-banana
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
            <button
              type="submit"
              :disabled="status === 'sending'"
              class="
                rounded-full bg-banana px-[26px] py-4 text-button text-ink
                transition-colors
                hover:bg-paper-light
                focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-banana
                disabled:opacity-50
              "
            >
              {{ status === 'sending' ? t('contact.form.submitting') : t('contact.form.submit') }}
            </button>
            <p
              v-if="status === 'error'"
              role="alert"
              class="text-body text-blush"
            >
              {{ t('contact.form.error', { email: CONTACT_EMAIL }) }}
            </p>
            <p class="text-sm opacity-60">
              {{ t('contact.form.privacy') }}&nbsp;<NuxtLink
                :to="localePath('/privacy')"
                class="
                  underline underline-offset-4 transition-colors
                  hover:text-banana
                "
              >{{ t('contact.form.privacy_link') }}</NuxtLink>.
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
