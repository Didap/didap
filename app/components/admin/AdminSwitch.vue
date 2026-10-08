<script setup lang="ts">
// Interruttore on/off (role="switch")
const model = defineModel<boolean>({ default: false })
defineProps<{ label: string }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    class="group inline-flex items-center gap-3 text-sm"
    @click="model = !model"
  >
    <span
      class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      :class="model ? 'bg-green' : 'bg-ink/20'"
    >
      <span
        class="
          absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm
          transition-transform
        "
        :class="model ? 'translate-x-5' : ''"
      />
    </span>
    <span>{{ label }}</span>
  </button>
</template>
