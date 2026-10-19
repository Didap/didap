<script setup lang="ts" generic="T extends string | number | null">
// Menu a tendina (Select di Reka UI) per i form del sito e di /admin.
// Le voci si riconoscono per posizione, così anche '' e null sono scelte
// valide (Reka non le accetta come valore). Classi e attributi passano
// al bottone.
defineOptions({ inheritAttrs: false })

const model = defineModel<T>({ required: true })
const props = withDefaults(
  defineProps<{
    options: readonly { value: T; label: string }[]
    label?: string
    variant?: 'admin' | 'site'
  }>(),
  { label: undefined, variant: 'admin' },
)

const current = computed(() => props.options.findIndex((o) => o.value === model.value))
const index = computed({
  get: () => (current.value < 0 ? undefined : String(current.value)),
  set: (i) => {
    const option = i === undefined ? undefined : props.options[Number(i)]
    if (option) model.value = option.value
  },
})

const STYLES = {
  admin: {
    trigger: 'admin-input',
    content: 'rounded-xl border-ink/10 bg-white',
    item: 'rounded-lg text-sm data-[state=checked]:font-medium',
  },
  site: {
    trigger: `
      w-full rounded-lg border border-ink/20 bg-paper px-4 py-2.5 text-base
      focus:border-accent focus:outline-none
    `,
    content: 'rounded-lg border-ink/20 bg-paper',
    item: 'rounded-md text-base data-[state=checked]:text-accent',
  },
}
const style = computed(() => STYLES[props.variant])
</script>

<template>
  <SelectRoot v-model="index">
    <SelectTrigger
      class="flex items-center justify-between gap-2 text-left"
      :class="style.trigger"
      :aria-label="label"
      v-bind="$attrs"
    >
      <!-- Testo dalle opzioni: c'è già nell'HTML del server -->
      <SelectValue>{{ options[current]?.label }}</SelectValue>
      <SelectIcon class="shrink-0 opacity-60">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="
          z-50 max-h-(--reka-select-content-available-height)
          min-w-(--reka-select-trigger-width) overflow-hidden border p-1
          shadow-lg
        "
        :class="style.content"
      >
        <SelectViewport>
          <SelectItem
            v-for="(o, i) in options"
            :key="i"
            :value="String(i)"
            class="
              relative flex items-center py-2 pr-3 pl-8 outline-none select-none
              data-highlighted:bg-ink/5
            "
            :class="style.item"
          >
            <SelectItemIndicator class="absolute left-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3 8.5l3 3 7-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </SelectItemIndicator>
            <SelectItemText>{{ o.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
