<script setup lang="ts">
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminLogin from '~/components/admin/AdminLogin.vue'
import { adminErrorText } from '~/utils/adminErrors'

// Consenso del connettore MCP: Claude manda qui la persona con la richiesta
// OAuth nella query. Senza sessione prima l'accesso, poi il controllo della
// richiesta. Una scheda al centro come "Scegli la password".
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Collega Claude - Admin Didap' })

await useAdminSession()
const { state } = useAdminPageAccess()
const route = useRoute()

type Consent = {
  clientName: string
  redirectHost: string
  user: { name: string, email: string }
  hasBandi: boolean
}

// Solo i parametri di authorize e solo se stringhe: un parametro ripetuto
// manca e il controllo lo rifiuta
const PARAMS = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'scope', 'resource']
const request = computed(() => {
  const out: Record<string, string> = {}
  for (const k of PARAMS) {
    const v = route.query[k]
    if (typeof v === 'string') out[k] = v
  }
  return out
})

const consent = ref<Consent | null>(null)
const checkError = ref('')
const error = ref('')
const busy = ref(false)

async function check() {
  consent.value = null
  checkError.value = ''
  error.value = ''
  try {
    consent.value = await $fetch<Consent>('/api/admin/oauth/check', { method: 'POST', body: request.value })
  }
  catch (err) {
    checkError.value = adminErrorText(err)
  }
}
// Anche dopo un nuovo accesso dalla scheda di login
onAdminReady(check)

async function approve() {
  busy.value = true
  error.value = ''
  try {
    const { redirect } = await $fetch<{ redirect: string }>('/api/admin/oauth/approve', {
      method: 'POST',
      body: request.value,
    })
    // Il bottone resta spento mentre il browser va da Claude
    window.location.assign(redirect)
  }
  catch (err) {
    error.value = adminErrorText(err)
    busy.value = false
  }
}

// Annulla torna a Claude con access_denied: l'indirizzo l'ha già controllato check
function cancel() {
  const url = new URL(request.value.redirect_uri!)
  url.searchParams.set('error', 'access_denied')
  if (request.value.state !== undefined) url.searchParams.set('state', request.value.state)
  busy.value = true
  window.location.assign(url.toString())
}

async function logout() {
  try {
    await adminLogout()
  }
  catch {
    error.value = 'Uscita non riuscita'
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <AdminHeader @logout="logout" />
    <AdminLogin v-if="state === 'login'" />
    <main
      v-else
      class="flex flex-1 items-center justify-center p-6"
    >
      <!-- Richiesta non valida: solo il messaggio, nessun ritorno a Claude -->
      <div
        v-if="checkError"
        class="max-w-md rounded-2xl border border-ink/10 bg-white p-8"
      >
        <h1 class="text-2xl font-bold">
          Collegamento non riuscito
        </h1>
        <p
          class="mt-3 opacity-70"
          role="alert"
        >
          {{ checkError }}. Torna su Claude, rimuovi il connettore e aggiungilo di nuovo.
        </p>
      </div>

      <div
        v-else-if="consent"
        class="
          flex w-full max-w-md flex-col gap-5 rounded-2xl border border-ink/10
          bg-white p-8
        "
      >
        <div>
          <h1 class="text-2xl font-bold">
            Claude vuole accedere ai bandi di Didap
          </h1>
          <p class="mt-2 opacity-70">
            Con il tuo account Claude potrà cercare e leggere i bandi del radar, segnarli tra gli interessanti, creare la loro cartella e scrivere la bozza della candidatura.
          </p>
        </div>

        <dl class="flex flex-col gap-3 text-sm">
          <div>
            <dt class="opacity-60">
              Account
            </dt>
            <dd class="font-medium">
              {{ consent.user.name }} · {{ consent.user.email }}
            </dd>
          </div>
          <div>
            <dt class="opacity-60">
              Applicazione
            </dt>
            <dd class="font-medium">
              {{ consent.clientName }}
            </dd>
          </div>
          <div>
            <dt class="opacity-60">
              Dopo il consenso torni su
            </dt>
            <dd class="font-mono text-base font-medium break-all">
              {{ consent.redirectHost }}
            </dd>
          </div>
        </dl>

        <p
          v-if="!consent.hasBandi"
          class="text-sm text-red"
          role="alert"
        >
          Il tuo account non ha accesso ai Bandi: chiedi a chi gestisce i collaboratori.
        </p>
        <p
          v-if="error"
          class="text-sm text-red"
          role="alert"
        >
          {{ error }}
        </p>

        <div class="flex flex-wrap gap-3">
          <button
            v-if="consent.hasBandi"
            type="button"
            class="
              rounded-full bg-green px-6 py-3 font-medium text-paper-light
              hover:bg-ink
              disabled:opacity-50
            "
            :disabled="busy"
            @click="approve"
          >
            Consenti
          </button>
          <button
            type="button"
            class="
              rounded-full border border-ink/20 px-6 py-3 font-medium
              hover:bg-ink/5
              disabled:opacity-50
            "
            :disabled="busy"
            @click="cancel"
          >
            Annulla
          </button>
        </div>
        <p class="text-sm opacity-60">
          Puoi scollegare Claude quando vuoi dalla pagina Account.
        </p>
      </div>

      <p
        v-else
        class="opacity-60"
        role="status"
      >
        Controllo la richiesta…
      </p>
    </main>
  </div>
</template>
