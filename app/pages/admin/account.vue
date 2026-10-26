<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import { adminErrorText } from '~/utils/adminErrors'

// Il proprio account: nome, email e cambio password. Aperto a chiunque
// abbia una sessione, qualunque pagina abbia.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Account - Admin Didap' })

const { data: session } = await useAdminSession()
const { notify } = useAdminToast()
const user = computed(() => session.value?.user ?? null)

const MIN = 10
const MAX = 200
const current = ref('')
const next = ref('')
const confirm = ref('')
const saving = ref(false)

const mismatch = computed(() => !!confirm.value && confirm.value !== next.value)
const valid = computed(() =>
  !!current.value && next.value.length >= MIN && next.value.length <= MAX && next.value === confirm.value,
)

async function changePassword() {
  if (!valid.value) return
  saving.value = true
  try {
    await $fetch('/api/admin/account/password', {
      method: 'POST',
      body: { current: current.value, next: next.value },
    })
    current.value = ''
    next.value = ''
    confirm.value = ''
    notify('ok', 'Password cambiata. Le altre sessioni sono state chiuse.')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <AdminShell>
    <main class="
      mx-auto w-full max-w-3xl p-6
      lg:p-10
    ">
      <h1 class="text-3xl font-bold">
        Il tuo account
      </h1>
      <p class="mt-2 opacity-60">
        Nome ed email li cambia chi gestisce i collaboratori. La password la scegli tu.
      </p>

      <div
        v-if="user"
        class="mt-8 flex flex-col gap-6"
      >
        <AdminSection
          id="dati"
          title="Dati"
        >
          <dl class="
            grid gap-5
            sm:grid-cols-2
          ">
            <div class="flex flex-col gap-1.5">
              <dt class="text-sm font-medium">
                Nome
              </dt>
              <dd class="wrap-break-word">
                {{ user.name }}
              </dd>
            </div>
            <div class="flex flex-col gap-1.5">
              <dt class="text-sm font-medium">
                Email
              </dt>
              <dd class="break-all">
                {{ user.email }}
              </dd>
            </div>
          </dl>
        </AdminSection>

        <form @submit.prevent="changePassword">
          <AdminSection
            id="password"
            title="Cambia password"
            description="Le altre sessioni aperte con il tuo account si chiudono."
          >
            <!-- Per i gestori di password: l'account a cui si riferisce -->
            <input
              :value="user.email"
              type="email"
              autocomplete="username"
              class="sr-only"
              tabindex="-1"
              aria-hidden="true"
              readonly
            >
            <AdminField label="Password attuale">
              <input
                v-model="current"
                type="password"
                autocomplete="current-password"
                required
                :maxlength="MAX"
                class="admin-input"
              >
            </AdminField>
            <div class="
              grid gap-5
              sm:grid-cols-2
            ">
              <AdminField
                label="Nuova password"
                :hint="`Almeno ${MIN} caratteri`"
              >
                <input
                  v-model="next"
                  type="password"
                  autocomplete="new-password"
                  required
                  :minlength="MIN"
                  :maxlength="MAX"
                  class="admin-input"
                >
              </AdminField>
              <AdminField label="Conferma nuova password">
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
            </div>
            <p
              v-if="mismatch"
              class="text-sm text-red"
            >
              Le due password non coincidono
            </p>
            <div>
              <button
                type="submit"
                class="
                  rounded-full bg-green px-6 py-3 font-medium text-paper-light
                  hover:bg-ink
                  disabled:opacity-50
                "
                :disabled="saving || !valid"
              >
                {{ saving ? 'Salvataggio…' : 'Cambia password' }}
              </button>
            </div>
          </AdminSection>
        </form>
      </div>
    </main>
  </AdminShell>
</template>
