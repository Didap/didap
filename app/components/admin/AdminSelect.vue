<script setup lang="ts" generic="T extends string | number | null">
// Menu a tendina dei form di /admin (Select di Reka UI). Le voci si
// riconoscono per posizione, così anche '' e null sono scelte valide.
// Classi e attributi passano al bottone.
defineOptions({ inheritAttrs: false })

const model = defineModel<T>({ required: true })
const props = defineProps<{
  options: readonly { value: T; label: string }[]
  placeholder?: string
  label?: string
}>()

const current = computed(() => props.options.findIndex((o) => o.value === model.value))
const index = computed({
  get: () => (current.value < 0 ? undefined : String(current.value)),
  set: (i) => {
    const option = i === undefined ? undefined : props.options[Number(i)]
    if (option) model.value = option.value
  },
})
</script>

<template>
  <SelectRoot v-model="index">
    <SelectTrigger
      class="
        flex admin-input items-center justify-between gap-2 text-left
        data-placeholder:text-ink/50
      "
      :aria-label="label"
      v-bind="$attrs"
    >
      <SelectValue :placeholder="placeholder">
        {{ options[current]?.label ?? placeholder }}
      </SelectValue>
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
          min-w-(--reka-select-trigger-width) overflow-hidden rounded-xl border
          border-ink/10 bg-white p-1 shadow-lg
        "
      >
        <SelectViewport>
          <SelectItem
            v-for="(o, i) in options"
            :key="i"
            :value="String(i)"
            class="
              relative flex items-center rounded-lg py-2 pr-3 pl-8 text-sm
              outline-none select-none
              data-highlighted:bg-ink/5
              data-[state=checked]:font-medium
            "
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
