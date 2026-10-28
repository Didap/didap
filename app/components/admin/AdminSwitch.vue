<script setup lang="ts">
import { Label, SwitchRoot, SwitchThumb } from 'reka-ui'

// Interruttore on/off (Switch di Reka UI); anche la scritta lo accende
const model = defineModel<boolean>({ default: false })
defineProps<{ label: string, disabled?: boolean }>()

const id = useId()
</script>

<template>
  <span class="inline-flex items-center gap-3 text-sm">
    <SwitchRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="
        relative h-6 w-11 shrink-0 rounded-full bg-ink/20 transition-colors
        data-disabled:cursor-not-allowed data-disabled:opacity-50
        data-[state=checked]:bg-green
      "
    >
      <SwitchThumb
        class="
          absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm
          transition-transform
          data-[state=checked]:translate-x-5
        "
      />
    </SwitchRoot>
    <Label :for="id">{{ label }}</Label>
  </span>
</template>
