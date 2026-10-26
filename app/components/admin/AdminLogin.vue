<script setup lang="ts">
// Accesso a /admin con email e password. Se mancano chiave di sessione o
// database lo spiega invece di mostrare il modulo. "Password dimenticata?"
// chiede solo l'email e manda il link per sceglierne una nuova.
const emit = defineEmits<{ authenticated: [] }>()
const session = useAdminSessionState()

const mode = ref<'login' | 'forgot' | 'sent'>('login')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

function show(next: typeof mode.value) {
  mode.value = next
  error.value = ''
}

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await adminLogin(email.value, password.value)
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

async function forgot() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/password/forgot', { method: 'POST', body: { email: email.value } })
    show('sent')
  }
  catch (err) {
    const e = err as { statusCode?: number, statusMessage?: string }
    error.value = e.statusCode === 422 ? 'Controlla l\'email' : e.statusMessage ?? 'Richiesta non riuscita'
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
          Imposta la variabile d'ambiente SESSION_SECRET sul server (almeno 32 caratteri casuali) per attivare l'accesso.
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
    <!-- Link inviato: stesso messaggio che l'email esista o no -->
    <div
      v-if="mode === 'sent'"
      class="
        flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-ink/10
        bg-white p-8
      "
    >
      <div>
        <h1 class="text-2xl font-bold">
          Controlla la posta
        </h1>
        <p
          class="mt-2 opacity-70"
          role="status"
        >
          Se l'email è registrata, ti abbiamo mandato un link. Vale un'ora.
        </p>
      </div>
      <button
        type="button"
        class="
          self-start text-sm underline underline-offset-4 opacity-70
          hover:opacity-100
        "
        @click="show('login')"
      >
        Torna all'accesso
      </button>
    </div>

    <!-- Password dimenticata -->
    <form
      v-else-if="mode === 'forgot'"
      class="
        flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-ink/10
        bg-white p-8
      "
      @submit.prevent="forgot"
    >
      <div>
        <h1 class="text-2xl font-bold">
          Password dimenticata
        </h1>
        <p class="mt-1 text-sm opacity-60">
          Scrivi la tua email: ti mandiamo un link per sceglierne una nuova.
        </p>
      </div>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Email</span>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          required
          autofocus
          maxlength="200"
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
        :disabled="busy || !email"
      >
        {{ busy ? 'Invio…' : 'Mandami il link' }}
      </button>
      <button
        type="button"
        class="
          self-center text-sm underline underline-offset-4 opacity-70
          hover:opacity-100
        "
        @click="show('login')"
      >
        Torna all'accesso
      </button>
    </form>

    <!-- Accesso -->
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
          Accedi
        </h1>
        <p class="mt-1 text-sm opacity-60">
          Entra con la tua email e la tua password.
        </p>
      </div>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Email</span>
        <input
          v-model="email"
          type="email"
          autocomplete="username"
          required
          autofocus
          maxlength="200"
          class="admin-input"
        >
      </label>
      <!-- Il link sta fuori dalla <label>: lì dentro riceverebbe i clic sull'etichetta -->
      <div class="flex flex-col gap-1.5">
        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">Password</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            maxlength="200"
            class="admin-input"
          >
        </label>
        <button
          type="button"
          class="
            self-end text-xs underline underline-offset-4 opacity-60
            hover:opacity-100
          "
          @click="show('forgot')"
        >
          Password dimenticata?
        </button>
      </div>
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
        :disabled="busy || !email || !password"
      >
        {{ busy ? 'Accesso…' : 'Entra' }}
      </button>
    </form>
  </main>
</template>
