<script setup lang="ts">
import AdminHeader from '~/components/admin/AdminHeader.vue'
import NewPasswordFields from '~/components/admin/NewPasswordFields.vue'
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

const password = ref('')
const valid = ref(false)
const error = ref('')
const busy = ref(false)
const expired = ref(false)
// Prima dell'idratazione il form non funziona: il bottone resta spento e i
// campi in sola lettura (Vue svuota i campi password al montaggio, il testo
// scritto prima andrebbe perso)
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

async function submit() {
  if (!mounted.value || !valid.value) return
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
    <AdminHeader />
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
        <NewPasswordFields
          v-model="password"
          v-model:valid="valid"
          :readonly="!mounted"
          autofocus
        />
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
          :disabled="!mounted || busy || !valid"
        >
          {{ busy ? 'Salvataggio…' : 'Salva ed entra' }}
        </button>
      </form>
    </main>
  </div>
</template>
