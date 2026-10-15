<script setup lang="ts">
// Accesso a /admin. Se mancano password o database lo spiega invece
// di mostrare il modulo.
const emit = defineEmits<{ authenticated: [] }>()
const session = useAdminSessionState()

const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await adminLogin(password.value)
    password.value = ''
    emit('authenticated')
  }
  catch (err) {
    error.value = (err as { statusMessage?: string }).statusMessage ?? 'Accesso non riuscito'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <main
    v-if="!session?.configured || !session?.database"
    class="flex flex-1 items-center justify-center p-6"
  >
    <div class="max-w-md rounded-2xl border border-ink/10 bg-white p-8">
      <h1 class="text-2xl font-bold">
        {{ !session?.configured ? 'Admin non configurato' : 'Database non disponibile' }}
      </h1>
      <p class="mt-3 opacity-70">
        <template v-if="!session?.configured">
          Imposta la variabile d'ambiente ADMIN_PASSWORD sul server per attivare l'accesso.
        </template>
        <template v-else>
          Imposta DATABASE_URL sul server o controlla che il database sia raggiungibile.
        </template>
      </p>
    </div>
  </main>

  <main
    v-else
    class="flex flex-1 items-center justify-center p-6"
  >
    <form
      class="
        flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-ink/10
        bg-white p-8
      "
      @submit.prevent="submit"
    >
      <div>
        <h1 class="text-2xl font-bold">
          Accedi
        </h1>
        <p class="mt-1 text-sm opacity-60">
          Per gestire le pagine prodotto e i preventivi.
        </p>
      </div>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Password</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          autofocus
          class="admin-input"
        >
      </label>
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
        :disabled="busy || !password"
      >
        {{ busy ? 'Accesso…' : 'Entra' }}
      </button>
    </form>
  </main>
</template>
