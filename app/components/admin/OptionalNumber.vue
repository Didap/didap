<script setup lang="ts">
import { formatDecimal, parseIntegerInput } from '#shared/money'

// Numero intero facoltativo (euro interi, anni, mesi): vuoto vale null.
// Stesse regole di NumberInput; un testo non valido resta segnato in rosso.
const model = defineModel<number | null>({ required: true })
// `plain`: senza punti delle migliaia (anni)
const props = defineProps<{ suffix?: string, plain?: boolean }>()

const format = (v: number | null) => (v === null ? '' : props.plain ? String(v) : formatDecimal(v))
// undefined = testo non valido
const parse = (t: string) => (t.trim() === '' ? null : parseIntegerInput(t) ?? undefined)

const text = ref(format(model.value))
const invalid = ref(false)

watch(model, (v) => {
  if (parse(text.value) !== v) {
    text.value = format(v)
    invalid.value = false
  }
})

function onInput(value: string) {
  text.value = value
  const v = parse(value)
  invalid.value = v === undefined
  if (v !== undefined && v !== model.value) model.value = v
}

function onBlur() {
  if (!invalid.value) text.value = format(model.value)
}
</script>

<template>
  <span class="relative flex items-center">
    <input
      :value="text"
      inputmode="numeric"
      autocomplete="off"
      class="w-full panel-input text-right tabular-nums"
      :class="[invalid ? 'ring-2 ring-red' : '', suffix ? 'pr-12' : '']"
      :aria-invalid="invalid"
      @input="onInput(($event.target as HTMLInputElement).value)"
      @blur="onBlur"
    >
    <span
      v-if="suffix"
      class="pointer-events-none absolute right-2.5 text-xs opacity-50"
    >{{ suffix }}</span>
  </span>
</template>
