<script setup lang="ts">
import AdminConfirm from '~/components/admin/AdminConfirm.vue'
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminShell from '~/components/admin/AdminShell.vue'
import NewPasswordFields from '~/components/admin/NewPasswordFields.vue'
import { adminErrorText } from '~/utils/adminErrors'
import { formatDateTime } from '~/utils/format'
import { PASSWORD_MAX } from '#shared/users'

// Il proprio account: nome, email e cambio password. Aperto a chiunque
// abbia una sessione, qualunque pagina abbia.
definePageMeta({ layout: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: 'Account - Admin Didap' })

const { data: session } = await useAdminSession()
const { notify } = useAdminToast()
const user = computed(() => session.value?.user ?? null)

const current = ref('')
const next = ref('')
const confirm = ref('')
const nextValid = ref(false)
const saving = ref(false)

const valid = computed(() => !!current.value && nextValid.value)

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

// Claude collegato con questo account: elenco e "Scollega"
type ClaudeLink = { id: string, clientName: string, createdAt: string, lastUsedAt: string | null }
const { data: links, refresh: refreshLinks } = await useFetch<ClaudeLink[]>('/api/admin/account/claude', { default: () => [] })
const siteOrigin = useRequestURL().origin
const unlinking = ref<ClaudeLink | null>(null)
const confirmUnlink = computed({
  get: () => !!unlinking.value,
  set: (v) => { if (!v) unlinking.value = null },
})
const unlinkBusy = ref(false)

async function unlink() {
  const link = unlinking.value
  if (!link) return
  unlinkBusy.value = true
  try {
    await $fetch(`/api/admin/account/claude/${link.id}`, { method: 'DELETE' })
    notify('ok', 'Claude scollegato')
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    unlinkBusy.value = false
    unlinking.value = null
    await refreshLinks()
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
        Il nome lo cambia chi gestisce i collaboratori. L'email non si può cambiare:
        per usarne un'altra, chi gestisce i collaboratori ti rimuove e ti invita di nuovo.
        La password la scegli tu.
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
                :maxlength="PASSWORD_MAX"
                class="admin-input"
              >
            </AdminField>
            <NewPasswordFields
              v-model="next"
              v-model:confirm="confirm"
              v-model:valid="nextValid"
              confirm-label="Conferma nuova password"
              columns
            />
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

        <AdminSection
          id="claude"
          title="Claude collegato"
          description="I Claude che leggono i bandi con il tuo account."
        >
          <p
            v-if="!links.length"
            class="wrap-break-word opacity-70"
          >
            Nessun Claude collegato. Per collegarlo aggiungi il connettore
            <code>{{ siteOrigin }}/mcp</code> nelle impostazioni di Claude.
          </p>
          <ul
            v-else
            class="flex flex-col gap-3"
          >
            <li
              v-for="link in links"
              :key="link.id"
              class="
                flex flex-wrap items-center justify-between gap-3 rounded-xl
                bg-ink/5 p-4
              "
            >
              <div class="min-w-0">
                <p class="font-medium wrap-break-word">
                  {{ link.clientName }}
                </p>
                <p class="text-sm opacity-60">
                  Collegato il {{ formatDateTime(link.createdAt) }}.
                  {{ link.lastUsedAt ? `Ultimo uso ${formatDateTime(link.lastUsedAt)}` : 'Mai usato' }}
                </p>
              </div>
              <button
                type="button"
                class="
                  rounded-full px-4 py-2 text-sm font-medium text-red
                  hover:bg-red/10
                "
                @click="unlinking = link"
              >
                Scollega
              </button>
            </li>
          </ul>
        </AdminSection>
      </div>
    </main>

    <AdminConfirm
      v-model:open="confirmUnlink"
      title="Scollegare Claude?"
      description="Dovrà rifare l'accesso."
      confirm-label="Sì, scollega"
      :busy="unlinkBusy"
      @confirm="unlink"
    />
  </AdminShell>
</template>
