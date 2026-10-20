<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
import { adminErrorText } from '~/utils/adminErrors'
import type { Settings } from '#shared/settings'

// Dati di Didap stampati nei preventivi e valori di partenza delle bozze
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Impostazioni - Admin Didap' })

await useAdminSession()
const { notify } = useAdminToast()

const form = ref<Settings | null>(null)
const saving = ref(false)

async function load() {
  try {
    form.value = await $fetch<Settings>('/api/admin/settings')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
}

onAdminReady(load)

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    form.value = await $fetch<Settings>('/api/admin/settings', { method: 'PUT', body: form.value })
    notify('ok', 'Impostazioni salvate')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    saving.value = false
  }
}

const COMPANY_FIELDS = [
  { key: 'name', label: 'Ragione sociale', max: 200 },
  { key: 'vatNumber', label: 'Partita IVA', max: 40 },
  { key: 'taxCode', label: 'Codice fiscale', max: 40 },
  { key: 'email', label: 'Email', max: 200 },
  { key: 'phone', label: 'Telefono', max: 60 },
  { key: 'iban', label: 'IBAN', max: 60 },
] as const
</script>

<template>
  <AdminShell>
    <main class="
      mx-auto w-full max-w-3xl p-6
      lg:p-10
    ">
      <h1 class="text-3xl font-bold">
        Impostazioni
      </h1>
      <p class="mt-2 opacity-60">
        Dati di Didap stampati nei preventivi e valori con cui parte ogni nuova bozza.
        Cambiarli non tocca i preventivi già creati.
      </p>

      <form
        v-if="form"
        class="mt-8 flex flex-col gap-6"
        @submit.prevent="save"
      >
        <AdminSection
          id="azienda"
          title="Didap"
          description="Intestazione e piè di pagina del PDF."
        >
          <div class="
            grid gap-5
            sm:grid-cols-2
          ">
            <AdminField
              v-for="f in COMPANY_FIELDS"
              :key="f.key"
              :label="f.label"
            >
              <input
                v-model="form.company[f.key]"
                :maxlength="f.max"
                class="admin-input"
              >
            </AdminField>
          </div>
          <AdminField label="Indirizzo">
            <textarea
              v-model="form.company.address"
              rows="2"
              maxlength="500"
              class="admin-input"
            />
          </AdminField>
        </AdminSection>

        <AdminSection
          id="partenza"
          title="Valori di partenza"
          description="Copiati in ogni nuova bozza, poi modificabili."
        >
          <div class="
            grid gap-5
            sm:grid-cols-3
          ">
            <AdminField label="Tariffa giornaliera (€)">
              <NumberInput
                v-model="form.defaults.dayRate"
                kind="euro"
              />
            </AdminField>
            <AdminField label="IVA (%)">
              <NumberInput
                v-model="form.defaults.vatRate"
                kind="percent"
              />
            </AdminField>
            <AdminField label="Validità (giorni)">
              <input
                v-model.number="form.defaults.validityDays"
                type="number"
                required
                min="1"
                max="365"
                class="admin-input"
              >
            </AdminField>
          </div>
          <AdminField label="Condizioni di pagamento">
            <textarea
              v-model="form.defaults.paymentTerms"
              rows="3"
              maxlength="5000"
              class="admin-input"
            />
          </AdminField>
          <AdminField label="Esclusioni">
            <textarea
              v-model="form.defaults.exclusions"
              rows="3"
              maxlength="5000"
              class="admin-input"
            />
          </AdminField>
          <AdminField label="Note">
            <textarea
              v-model="form.defaults.notes"
              rows="3"
              maxlength="5000"
              class="admin-input"
            />
          </AdminField>
        </AdminSection>

        <AdminSection
          id="note-legali"
          title="Note legali"
          description="Stampate in fondo a ogni preventivo, sopra le firme. Valgono dalla prossima conferma."
        >
          <AdminField
            label="Testo"
            :value="form.contract.legalNotes"
            :max="20000"
          >
            <textarea
              v-model="form.contract.legalNotes"
              rows="10"
              maxlength="20000"
              class="admin-input text-sm"
            />
          </AdminField>
        </AdminSection>

        <div>
          <button
            type="submit"
            class="
              rounded-full bg-green px-6 py-3 font-medium text-paper-light
              hover:bg-ink
              disabled:opacity-50
            "
            :disabled="saving"
          >
            {{ saving ? 'Salvo…' : 'Salva impostazioni' }}
          </button>
        </div>
      </form>
    </main>
  </AdminShell>
</template>
