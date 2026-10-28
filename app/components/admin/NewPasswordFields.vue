<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import { PASSWORD_MAX, PASSWORD_MIN, passwordSchema } from '#shared/users'

// Nuova password con conferma: i due campi, l'avviso se non coincidono e
// `valid` (lunghezza giusta e conferma uguale). La conferma la tiene il
// componente, a meno che chi lo usa non la leghi con v-model:confirm (per
// svuotarla dopo il salvataggio).
const password = defineModel<string>({ required: true })
const confirm = defineModel<string>('confirm', { default: '' })
const valid = defineModel<boolean>('valid', { default: false })
withDefaults(defineProps<{
  confirmLabel?: string
  // Due colonne da sm in su
  columns?: boolean
  // Prima dell'idratazione (vedi password.vue)
  readonly?: boolean
  autofocus?: boolean
}>(), { confirmLabel: 'Conferma password', columns: false, readonly: false, autofocus: false })

const mismatch = computed(() => !!confirm.value && confirm.value !== password.value)
watchEffect(() => {
  valid.value = passwordSchema.safeParse(password.value).success && password.value === confirm.value
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div :class="columns ? `
      grid gap-5
      sm:grid-cols-2
    ` : 'contents'">
      <AdminField
        label="Nuova password"
        :hint="`Almeno ${PASSWORD_MIN} caratteri`"
      >
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          :readonly="readonly"
          :autofocus="autofocus"
          :minlength="PASSWORD_MIN"
          :maxlength="PASSWORD_MAX"
          class="admin-input"
        >
      </AdminField>
      <AdminField :label="confirmLabel">
        <input
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          required
          :readonly="readonly"
          :maxlength="PASSWORD_MAX"
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
  </div>
</template>
