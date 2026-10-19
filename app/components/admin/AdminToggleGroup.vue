<script setup lang="ts" generic="T extends string">
// Scelta singola a pulsanti (ToggleGroup di Reka UI): una voce resta
// sempre attiva, un clic su quella attiva non la spegne. Come AppSelect,
// le voci si riconoscono per posizione, così anche '' è una scelta valida.
// `segmented`: pulsanti in una pista grigia; `pills`: pillole separate.
// Con :model-value + @update:model-value il genitore può rifiutare il
// cambio (per esempio per chiedere prima di salvare).
const model = defineModel<T>({ required: true })
const props = withDefaults(
  defineProps<{
    options: readonly { value: T; label: string }[]
    variant?: 'segmented' | 'pills'
    disabled?: boolean
  }>(),
  { variant: 'pills' },
)

const STYLES = {
  segmented: {
    root: 'rounded-full bg-ink/5 p-1',
    item: `
      px-3 py-1 opacity-60
      hover:opacity-100
      data-[state=on]:bg-white data-[state=on]:font-medium
      data-[state=on]:opacity-100 data-[state=on]:shadow-sm
    `,
  },
  pills: {
    root: 'flex-wrap gap-2',
    item: `
      border border-ink/20 px-3 py-1.5
      hover:border-ink
      data-[state=on]:border-ink data-[state=on]:bg-ink
      data-[state=on]:text-paper-light
    `,
  },
}
const style = computed(() => STYLES[props.variant])

const current = computed(() => {
  const i = props.options.findIndex((o) => o.value === model.value)
  return i < 0 ? undefined : String(i)
})

function onUpdate(value: unknown) {
  const option = typeof value === 'string' && value ? props.options[Number(value)] : undefined
  if (option) model.value = option.value
}
</script>

<template>
  <ToggleGroupRoot
    :model-value="current"
    type="single"
    :disabled="disabled"
    class="flex"
    :class="style.root"
    @update:model-value="onUpdate"
  >
    <ToggleGroupItem
      v-for="(o, i) in options"
      :key="i"
      :value="String(i)"
      class="flex items-center gap-1.5 rounded-full text-sm transition"
      :class="style.item"
    >
      <slot
        name="item"
        :option="o"
      >
        {{ o.label }}
      </slot>
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
