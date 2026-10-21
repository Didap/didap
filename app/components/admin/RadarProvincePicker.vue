<script setup lang="ts">
import { comuniOf, PROVINCES, type Province } from '#shared/radar'

// Le province del modulo comuni: si leggono tutti i loro comuni
const model = defineModel<Province[]>({ required: true })

const count = (p: string) => comuniOf([p]).length
const total = computed(() => comuniOf(model.value).length)

function toggle(p: Province, on: boolean) {
  model.value = PROVINCES.map(x => x.value).filter(x => (x === p ? on : model.value.includes(x)))
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <ul class="flex flex-col rounded-lg border border-ink/10 bg-white">
      <li
        v-for="p in PROVINCES"
        :key="p.value"
      >
        <label class="
          flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm
          hover:bg-ink/4
        ">
          <input
            type="checkbox"
            class="accent-green"
            :checked="model.includes(p.value)"
            @change="toggle(p.value, ($event.target as HTMLInputElement).checked)"
          >
          <span class="flex-1 truncate">{{ p.label }}</span>
          <span class="text-xs tabular-nums opacity-50">{{ count(p.value) }}</span>
        </label>
      </li>
    </ul>
    <p class="text-xs opacity-60">
      {{ total ? `${total} comuni da leggere a ogni import` : 'Scegli almeno una provincia' }}
    </p>
  </div>
</template>
