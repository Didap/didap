<script setup lang="ts">
import {
  formatDecimal,
  formatEuroPlain,
  parseDaysInput,
  parseEuroInput,
  parsePercentInput,
} from '#shared/money'

// Campo numerico all'italiana (virgola per i decimali). Con kind="euro"
// il valore è in centesimi. Il modello cambia solo con un testo valido;
// un testo non valido resta visibile e segnato in rosso.
const model = defineModel<number>({ required: true })
// `panel`: campo compatto dei pannelli (fondo leggero, niente bordo)
const props = defineProps<{ kind: 'euro' | 'days' | 'percent'; label?: string; panel?: boolean }>()

const PARSERS = { euro: parseEuroInput, days: parseDaysInput, percent: parsePercentInput }
const parse = (t: string) => PARSERS[props.kind](t)
const format = (v: number) => (props.kind === 'euro' ? formatEuroPlain(v) : formatDecimal(v))

const text = ref(format(model.value))
const invalid = ref(false)

// Valore cambiato da fuori (ricarica, cambio di tipo): si riallinea il testo
watch(model, (v) => {
  if (parse(text.value) !== v) {
    text.value = format(v)
    invalid.value = false
  }
})

function onInput(value: string) {
  text.value = value
  const v = parse(value)
  invalid.value = v === null
  if (v !== null && v !== model.value) model.value = v
}

function onBlur() {
  if (!invalid.value) text.value = format(model.value)
}
</script>

<template>
  <input
    :value="text"
    inputmode="decimal"
    autocomplete="off"
    class="w-full text-right tabular-nums"
    :class="[panel ? 'panel-input' : 'admin-input font-mono', invalid ? `
      ring-2 ring-red
    ` : '']"
    :aria-label="label"
    :aria-invalid="invalid"
    @input="onInput(($event.target as HTMLInputElement).value)"
    @blur="onBlur"
  >
</template>
