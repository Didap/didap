<script setup lang="ts">
import { formatDate } from '#shared/dates'
import { formatDecimal, formatEuro } from '#shared/money'
import { itemAmount, TOKEN_PATTERN, type PublicSnapshot } from '#shared/quote'

// Preventivo per il cliente: ultima revisione emessa, con PDF da scaricare.
// Link privato (token casuale), mai indicizzato.
definePageMeta({ layout: 'quote' })
defineI18nRoute(false)

const route = useRoute()
const token = String(route.params.token)
// Token malformato: 404 subito, senza interrogare l'API
if (!TOKEN_PATTERN.test(token)) {
  throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato', fatal: true })
}
const safeToken = encodeURIComponent(token)
const { data, error } = await useFetch<{ snapshot: PublicSnapshot; expired: boolean }>(`/api/quotes/${safeToken}`)
if (!data.value) {
  // 404 solo se il preventivo non esiste; un guasto del server è un'altra cosa
  if (!error.value || error.value.statusCode === 404) {
    throw createError({ statusCode: 404, statusMessage: 'Preventivo non trovato', fatal: true })
  }
  throw createError({ statusCode: 503, statusMessage: 'Preventivo non disponibile, riprova tra poco', fatal: true })
}

const s = computed(() => data.value!.snapshot)
const pdfUrl = `/p/${safeToken}/pdf`

useSeoMeta({
  title: () => `Preventivo ${s.value.number} - ${s.value.company.name}`,
  robots: 'noindex, nofollow',
})

const clientLines = computed(() => {
  const c = s.value.client
  return [
    c.address,
    c.vatNumber && `P.IVA ${c.vatNumber}`,
    c.taxCode && `C.F. ${c.taxCode}`,
    c.sdiPec && `SDI/PEC ${c.sdiPec}`,
    c.contactName && `Alla c.a. di ${c.contactName}`,
  ].filter(Boolean) as string[]
})
const companyLines = computed(() => {
  const c = s.value.company
  return [c.address, c.vatNumber && `P.IVA ${c.vatNumber}`, c.email, c.phone].filter(Boolean) as string[]
})
const discountLabel = computed(() => {
  const d = s.value.content.discount
  return d.kind === 'percent' ? `Sconto ${formatDecimal(d.value)}%` : 'Sconto'
})
const extras = computed(() =>
  ([
    ['Tempi', s.value.content.timeline],
    ['Condizioni di pagamento', s.value.content.paymentTerms],
    ['Esclusioni', s.value.content.exclusions],
    ['Note', s.value.content.notes],
  ] as const).filter(([, body]) => body.trim()),
)
</script>

<template>
  <main
    v-if="data"
    class="
      mx-auto w-full max-w-4xl px-4 py-10
      sm:px-8 sm:py-16
    "
  >
    <header class="flex flex-wrap items-center justify-between gap-6">
      <img
        src="/brand/logo-esteso.svg"
        :alt="s.company.name"
        width="140"
        height="40"
        class="h-10 w-auto"
      >
      <a
        :href="pdfUrl"
        class="
          rounded-full bg-green px-6 py-3 text-button text-paper-light
          transition-colors
          hover:bg-ink
        "
      >Scarica PDF</a>
    </header>

    <p
      v-if="data.expired"
      class="mt-8 rounded-2xl bg-banana/30 px-5 py-3"
      role="status"
    >
      Offerta scaduta il {{ formatDate(s.content.validUntil) }}. Scrivici per un aggiornamento.
    </p>

    <section class="mt-12">
      <p class="text-label opacity-60">
        Preventivo
      </p>
      <h1 class="mt-2 text-title">
        {{ s.title || 'Preventivo' }}
      </h1>
      <dl class="
        mt-6 grid gap-4 text-sm
        sm:grid-cols-3
      ">
        <div>
          <dt class="opacity-60">
            Numero
          </dt>
          <dd class="font-mono">
            {{ s.number }} · rev. {{ s.rev }}
          </dd>
        </div>
        <div>
          <dt class="opacity-60">
            Data
          </dt>
          <dd>{{ formatDate(s.issuedDate) }}</dd>
        </div>
        <div>
          <dt class="opacity-60">
            Valido fino al
          </dt>
          <dd>{{ s.content.validUntil ? formatDate(s.content.validUntil) : '-' }}</dd>
        </div>
      </dl>
    </section>

    <section class="
      mt-10 grid gap-4
      sm:grid-cols-2
    ">
      <div class="rounded-2xl bg-cream p-5">
        <p class="text-label opacity-60">
          Per
        </p>
        <p class="mt-2 font-bold">
          {{ s.client.name }}
        </p>
        <p
          v-for="line in clientLines"
          :key="line"
          class="text-sm whitespace-pre-line"
        >
          {{ line }}
        </p>
      </div>
      <div class="rounded-2xl border border-ink/10 p-5">
        <p class="text-label opacity-60">
          Da
        </p>
        <p class="mt-2 font-bold">
          {{ s.company.name }}
        </p>
        <p
          v-for="line in companyLines"
          :key="line"
          class="text-sm whitespace-pre-line"
        >
          {{ line }}
        </p>
      </div>
    </section>

    <p
      v-if="s.content.intro"
      class="mt-10 text-lg whitespace-pre-line"
    >
      {{ s.content.intro }}
    </p>

    <section
      v-for="(phase, i) in s.content.phases"
      :key="phase.id"
      class="mt-12"
    >
      <h2 class="text-2xl font-bold">
        {{ i + 1 }}. {{ phase.title }}
      </h2>
      <p
        v-if="phase.description"
        class="mt-2 whitespace-pre-line opacity-80"
      >
        {{ phase.description }}
      </p>
      <table class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b-2 border-ink text-left text-xs uppercase">
            <th class="py-2 font-medium opacity-60">
              Descrizione
            </th>
            <th class="py-2 text-right font-medium opacity-60">
              Giorni
            </th>
            <th class="
              hidden py-2 text-right font-medium opacity-60
              sm:table-cell
            ">
              Tariffa
            </th>
            <th class="py-2 text-right font-medium opacity-60">
              Importo
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in phase.items"
            :key="item.id"
            class="border-b border-ink/10 align-top"
          >
            <td class="py-3 pr-4">
              {{ item.description }}
            </td>
            <td class="py-3 text-right font-mono">
              {{ item.kind === 'days' ? formatDecimal(item.days) : '' }}
            </td>
            <td class="
              hidden py-3 text-right font-mono whitespace-nowrap
              sm:table-cell
            ">
              {{ item.kind === 'days' ? formatEuro(item.rate) : 'a corpo' }}
            </td>
            <td class="py-3 pl-4 text-right font-mono whitespace-nowrap">
              {{ formatEuro(itemAmount(item)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td
              colspan="4"
              class="py-3 text-right font-bold"
            >
              Subtotale fase
              <span class="ml-4 font-mono">{{ formatEuro(s.totals.phases[i] ?? 0) }}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="mt-12 ml-auto max-w-sm">
      <dl class="flex flex-col gap-2">
        <div class="flex justify-between">
          <dt>Imponibile</dt>
          <dd class="font-mono">
            {{ formatEuro(s.totals.subtotal) }}
          </dd>
        </div>
        <template v-if="s.totals.discount > 0">
          <div class="flex justify-between">
            <dt>{{ discountLabel }}</dt>
            <dd class="font-mono">
              {{ formatEuro(-s.totals.discount) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>Imponibile scontato</dt>
            <dd class="font-mono">
              {{ formatEuro(s.totals.taxable) }}
            </dd>
          </div>
        </template>
        <div class="flex justify-between">
          <dt>IVA {{ formatDecimal(s.content.vatRate) }}%</dt>
          <dd class="font-mono">
            {{ formatEuro(s.totals.vat) }}
          </dd>
        </div>
        <div class="
          mt-2 flex justify-between rounded-xl bg-green px-4 py-3 text-lg
          font-bold text-paper-light
        ">
          <dt>Totale</dt>
          <dd class="font-mono">
            {{ formatEuro(s.totals.total) }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      v-for="[title, body] in extras"
      :key="title"
      class="mt-10"
    >
      <h2 class="text-lg font-bold">
        {{ title }}
      </h2>
      <p class="mt-2 whitespace-pre-line">
        {{ body }}
      </p>
    </section>

    <p
      v-if="s.company.iban"
      class="mt-10 text-sm"
    >
      <span class="opacity-60">IBAN</span> <span class="font-mono">{{ s.company.iban }}</span>
    </p>

    <footer class="
      mt-16 flex flex-wrap items-center justify-between gap-4 border-t
      border-ink/10 pt-6
    ">
      <p class="text-sm opacity-60">
        {{ s.company.name }} · Preventivo {{ s.number }} rev. {{ s.rev }}
      </p>
      <a
        :href="pdfUrl"
        class="
          rounded-full border border-ink/20 px-5 py-2.5 text-sm
          hover:border-ink
        "
      >Scarica PDF</a>
    </footer>
  </main>
</template>
