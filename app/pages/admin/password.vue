<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminHeader from '~/components/admin/AdminHeader.vue'
import { adminErrorText } from '~/utils/adminErrors'

// Scelta della password dal link d'invito o di reset (?token=...). Si apre
// senza sessione, quindi niente AdminShell: una scheda al centro come
// l'accesso. Riuscita la scelta si è già dentro.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Scegli la password - Admin Didap' })

await useAdminSession()
const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const MIN = 10
const MAX = 200
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)
const expired = ref(false)

const mismatch = computed(() => !!confirm.value && confirm.value !== password.value)
const valid = computed(() =>
  password.value.length >= MIN && password.value.length <= MAX && password.value === confirm.value,
)

async function submit() {
  if (!valid.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/password/set', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    await refreshAdminSession()
    // Chi non ha Prodotti va da lì alla sua prima pagina
    await navigateTo('/admin')
  }
  catch (err) {
    if ((err as { statusCode?: number }).statusCode === 410) expired.value = true
    else error.value = adminErrorText(err)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <AdminHeader :authenticated="false" />
    <main class="flex flex-1 items-center justify-center p-6">
      <!-- Link senza token, scaduto o già usato -->
      <div
        v-if="!token || expired"
        class="max-w-md rounded-2xl border border-ink/10 bg-white p-8"
      >
        <h1 class="text-2xl font-bold">
          Link non valido
        </h1>
        <p
          class="mt-3 opacity-70"
          role="alert"
        >
          <template v-if="expired">
            Il link è scaduto o è già stato usato. Chiedine uno nuovo.
          </template>
          <template v-else>
            Al link manca una parte. Aprilo di nuovo dall'email o chiedine uno nuovo.
          </template>
        </p>
        <NuxtLink
          to="/admin"
          class="
            mt-5 inline-block rounded-full bg-green px-6 py-3 font-medium
            text-paper-light
            hover:bg-ink
          "
        >
          Vai all'accesso
        </NuxtLink>
      </div>

      <form
        v-else
        class="
          flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-ink/10
          bg-white p-8
        "
        @submit.prevent="submit"
      >
        <div>
          <h1 class="text-2xl font-bold">
            Scegli la password
          </h1>
          <p class="mt-1 text-sm opacity-60">
            La userai con la tua email per entrare nel pannello.
          </p>
        </div>
        <AdminField
          label="Nuova password"
          :hint="`Almeno ${MIN} caratteri`"
        >
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            required
            autofocus
            :minlength="MIN"
            :maxlength="MAX"
            class="admin-input"
          >
        </AdminField>
        <AdminField label="Conferma password">
          <input
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            required
            :maxlength="MAX"
            class="admin-input"
            :aria-invalid="mismatch || undefined"
          >
        </AdminField>
        <p
          v-if="mismatch"
          class="text-sm text-red"
        >
          Le due password non coincidono
        </p>
        <p
          v-if="error"
          class="text-sm text-red"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="
            rounded-full bg-green px-6 py-3 font-medium text-paper-light
            hover:bg-ink
            disabled:opacity-50
          "
          :disabled="busy || !valid"
        >
          {{ busy ? 'Salvataggio…' : 'Salva ed entra' }}
        </button>
      </form>
    </main>
  </div>
</template>
