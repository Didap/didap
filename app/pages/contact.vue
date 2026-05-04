<script setup lang="ts">
import { Motion, AnimatePresence } from 'motion-v'
import InteractiveHoverButton from '~/components/InteractiveHoverButton.vue'

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: `${t('nav.contact')} — Didap`,
  description: t('contact.intro'),
})

const form = reactive({
  name: '',
  email: '',
  company: '',
  projectType: '',
  fundingHelp: '',
  message: '',
  consent: false,
  website: '', // honeypot
})

const status = ref<'idle' | 'sending' | 'success' | 'error'>('idle')
const errorDetail = ref<string | null>(null)

const projectTypeOptions = computed(() => [
  { value: 'product', label: t('contact.form.option_product') },
  { value: 'saas', label: t('contact.form.option_saas') },
  { value: 'app', label: t('contact.form.option_app') },
  { value: 'site', label: t('contact.form.option_site') },
  { value: 'other', label: t('contact.form.option_other') },
])

const showQube = computed(() => form.fundingHelp === 'need_help')

async function onSubmit() {
  if (status.value === 'sending') return
  status.value = 'sending'
  errorDetail.value = null
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        projectType: form.projectType,
        fundingHelp: form.fundingHelp,
        message: form.message.trim(),
        consent: form.consent,
        website: form.website,
      },
    })
    status.value = 'success'
    Object.assign(form, {
      name: '',
      email: '',
      company: '',
      projectType: '',
      fundingHelp: '',
      message: '',
      consent: false,
      website: '',
    })
  } catch (e: unknown) {
    status.value = 'error'
    const msg = e instanceof Error ? e.message : ''
    errorDetail.value = msg || null
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl px-6 py-20">
    <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
      {{ t('contact.kicker') }}
    </p>
    <h1 class="mt-4 font-display text-5xl">{{ t('contact.title') }}</h1>
    <p class="mt-6 text-lg text-ink-soft">{{ t('contact.intro') }}</p>

    <aside
      class="mt-10 rounded-xl border border-ink/10 bg-paper-soft px-6 py-5 text-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-widest text-ink-soft">
        {{ t('contact.info_title') }}
      </p>
      <ul class="mt-3 space-y-2 text-ink-soft">
        <li>· {{ t('contact.info_response') }}</li>
        <li>· {{ t('contact.info_scope') }}</li>
        <li>· {{ t('contact.info_ethics') }}</li>
        <li>
          · {{ t('contact.info_email') }}
          <a
            href="mailto:amministrazione@didap.it"
            class="text-ink underline underline-offset-4 hover:text-accent"
          >
            amministrazione@didap.it
          </a>
        </li>
      </ul>
    </aside>

    <form class="mt-10 space-y-6" @submit.prevent="onSubmit">
      <input
        v-model="form.website"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
        class="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div class="grid gap-6 md:grid-cols-2">
        <label class="block">
          <span
            class="text-xs font-semibold uppercase tracking-widest text-ink-soft"
          >
            {{ t('contact.form.name') }} *
          </span>
          <input
            v-model="form.name"
            type="text"
            required
            :placeholder="t('contact.form.name_placeholder')"
            class="mt-2 w-full rounded-lg border border-ink/20 bg-paper px-4 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
          />
        </label>
        <label class="block">
          <span
            class="text-xs font-semibold uppercase tracking-widest text-ink-soft"
          >
            {{ t('contact.form.email') }} *
          </span>
          <input
            v-model="form.email"
            type="email"
            required
            :placeholder="t('contact.form.email_placeholder')"
            class="mt-2 w-full rounded-lg border border-ink/20 bg-paper px-4 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label class="block">
        <span
          class="text-xs font-semibold uppercase tracking-widest text-ink-soft"
        >
          {{ t('contact.form.company') }}
          <span class="font-normal text-ink-soft/60">
            {{ t('contact.form.company_optional') }}
          </span>
        </span>
        <input
          v-model="form.company"
          type="text"
          :placeholder="t('contact.form.company_placeholder')"
          class="mt-2 w-full rounded-lg border border-ink/20 bg-paper px-4 py-2.5 text-base placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
        />
      </label>

      <label class="block">
        <span
          class="text-xs font-semibold uppercase tracking-widest text-ink-soft"
        >
          {{ t('contact.form.project_type') }}
        </span>
        <select
          v-model="form.projectType"
          class="mt-2 w-full rounded-lg border border-ink/20 bg-paper px-4 py-2.5 text-base focus:border-accent focus:outline-none"
        >
          <option value="">{{ t('contact.form.project_type_default') }}</option>
          <option
            v-for="o in projectTypeOptions"
            :key="o.value"
            :value="o.value"
          >
            {{ o.label }}
          </option>
        </select>
      </label>

      <fieldset class="space-y-4">
        <legend
          class="text-xs font-semibold uppercase tracking-widest text-ink-soft"
        >
          {{ t('contact.form.funding_legend') }}
        </legend>
        <div role="radiogroup" class="flex flex-col gap-3">
          <InteractiveHoverButton
            :text="t('contact.form.funding_have')"
            :active="form.fundingHelp === 'have_budget'"
            tone-class="bg-ink"
            inverted-text-class="text-paper"
            @click="form.fundingHelp = 'have_budget'"
          />
          <InteractiveHoverButton
            :text="t('contact.form.funding_need')"
            :active="form.fundingHelp === 'need_help'"
            tone-class="bg-finance"
            inverted-text-class="text-paper"
            @click="form.fundingHelp = 'need_help'"
          />
        </div>
      </fieldset>

      <!-- Mobile / tablet inline Qube card -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <aside
          v-if="showQube"
          class="space-y-3 rounded-xl border-2 border-finance/40 bg-finance/5 p-5 lg:hidden"
        >
          <p
            class="text-[11px] font-semibold uppercase tracking-widest text-finance"
          >
            {{ t('contact.form.qube_kicker') }}
          </p>
          <h3 class="font-display text-2xl text-ink">The Qube</h3>
          <p class="text-sm text-ink-soft">
            {{ t('contact.form.qube_description') }}
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <a
              href="https://www.theqube.it"
              target="_blank"
              rel="noopener"
              class="rounded-full bg-finance px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:bg-ink"
            >
              {{ t('contact.form.qube_visit') }} ↗
            </a>
            <NuxtLink
              :to="localePath('/clients/the-qube')"
              class="rounded-full border border-finance/60 px-4 py-2 text-xs uppercase tracking-widest text-finance transition hover:border-finance hover:bg-finance hover:text-paper"
            >
              {{ t('contact.form.qube_more') }}
            </NuxtLink>
          </div>
        </aside>
      </Transition>

      <label class="block">
        <span
          class="text-xs font-semibold uppercase tracking-widest text-ink-soft"
        >
          {{ t('contact.form.message') }} *
        </span>
        <textarea
          v-model="form.message"
          required
          rows="6"
          :placeholder="t('contact.form.message_placeholder')"
          class="mt-2 w-full rounded-lg border border-ink/20 bg-paper px-4 py-3 text-base placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
        />
      </label>

      <label class="flex items-start gap-3 text-sm text-ink-soft">
        <input
          v-model="form.consent"
          type="checkbox"
          required
          class="mt-1 size-4 accent-accent"
        />
        <span>
          {{ t('contact.form.consent') }}
          <NuxtLink
            :to="localePath('/privacy')"
            class="text-ink underline underline-offset-4 hover:text-accent"
          >
            {{ t('contact.form.privacy_link') }}
          </NuxtLink>.
        </span>
      </label>

      <div class="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          :disabled="status === 'sending'"
          class="rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-widest text-paper transition hover:bg-accent disabled:opacity-50"
        >
          {{
            status === 'sending'
              ? t('contact.form.submitting')
              : t('contact.form.submit')
          }}
        </button>
        <p v-if="status === 'success'" class="text-sm text-finance">
          {{ t('contact.form.success') }}
        </p>
        <p v-else-if="status === 'error'" class="text-sm text-accent">
          {{ t('contact.form.error') }}
        </p>
      </div>
    </form>

    <!-- Desktop floating Qube card (lg+) -->
    <ClientOnly>
      <AnimatePresence>
        <Motion
          v-if="showQube"
          as="aside"
          :initial="{ y: 60, opacity: 0 }"
          :animate="{ y: 0, opacity: 1 }"
          :exit="{ y: 60, opacity: 0 }"
          :transition="{ duration: 0.35, ease: 'easeOut' }"
          class="fixed bottom-6 right-6 z-40 hidden w-[340px] space-y-3 rounded-xl border-2 border-finance/40 bg-paper p-5 shadow-xl shadow-ink/10 lg:block"
        >
          <p
            class="text-[11px] font-semibold uppercase tracking-widest text-finance"
          >
            {{ t('contact.form.qube_kicker') }}
          </p>
          <h3 class="font-display text-2xl text-ink">The Qube</h3>
          <p class="text-sm text-ink-soft">
            {{ t('contact.form.qube_description') }}
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <a
              href="https://www.theqube.it"
              target="_blank"
              rel="noopener"
              class="rounded-full bg-finance px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:bg-ink"
            >
              {{ t('contact.form.qube_visit') }} ↗
            </a>
            <NuxtLink
              :to="localePath('/clients/the-qube')"
              class="rounded-full border border-finance/60 px-4 py-2 text-xs uppercase tracking-widest text-finance transition hover:border-finance hover:bg-finance hover:text-paper"
            >
              {{ t('contact.form.qube_more') }}
            </NuxtLink>
          </div>
        </Motion>
      </AnimatePresence>
    </ClientOnly>
  </section>
</template>
