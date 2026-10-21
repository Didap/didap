<script setup lang="ts">
import { COMUNI_PUGLIA } from '#shared/comuni-puglia'
import { PROVINCES } from '#shared/radar'

// I comuni da cercare, uno per uno: si filtrano per nome, si spuntano a
// mano o tutti quelli di una provincia
const model = defineModel<string[]>({ required: true })

const query = ref('')
const province = ref<string | null>(null)

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return COMUNI_PUGLIA.filter(c =>
    (!province.value || c.province === province.value) && (!q || c.name.toLowerCase().includes(q)))
})

const checked = computed(() => new Set(model.value))

// Gli spuntati in chiaro sopra l'elenco, in ordine alfabetico; oltre una
// dozzina basta il conto
const CHIPS = 12
const picked = computed(() => COMUNI_PUGLIA.filter(c => checked.value.has(c.istat)))

function toggle(istat: string) {
  model.value = checked.value.has(istat) ? model.value.filter(c => c !== istat) : [...model.value, istat]
}

// "Tutti" e "Nessuno" valgono per i comuni che si vedono (filtro e provincia)
const allShown = computed(() => shown.value.length > 0 && shown.value.every(c => checked.value.has(c.istat)))

function setShown(on: boolean) {
  const ids = new Set(shown.value.map(c => c.istat))
  model.value = on
    ? [...new Set([...model.value, ...ids])]
    : model.value.filter(c => !ids.has(c))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <input
      v-model="query"
      type="search"
      placeholder="Cerca un comune"
      aria-label="Cerca un comune"
      class="panel-input"
    >
    <div
      class="flex flex-wrap gap-1"
      role="group"
      aria-label="Provincia"
    >
      <button
        v-for="p in [{ value: null, label: 'Tutte' }, ...PROVINCES]"
        :key="p.value ?? 'all'"
        type="button"
        class="rounded-md px-2 py-1 text-xs transition"
        :class="province === p.value ? 'bg-ink text-paper-light' : `
          bg-ink/5
          hover:bg-ink/10
        `"
        :aria-pressed="province === p.value"
        :title="p.value ? p.label : 'Tutte le province'"
        @click="province = p.value"
      >
        {{ p.value ?? p.label }}
      </button>
    </div>
    <div class="flex items-center justify-between text-xs">
      <span class="opacity-60">{{ model.length }} spuntati</span>
      <button
        type="button"
        class="
          underline decoration-dotted underline-offset-2
          hover:decoration-solid
          disabled:opacity-40
        "
        :disabled="!shown.length"
        @click="setShown(!allShown)"
      >
        {{ allShown ? 'Nessuno' : 'Tutti' }}{{ query || province ? ' questi' : '' }}
      </button>
    </div>
    <div
      v-if="picked.length"
      class="flex flex-wrap gap-1"
    >
      <button
        v-for="c in picked.slice(0, CHIPS)"
        :key="c.istat"
        type="button"
        class="
          rounded-full bg-green/10 px-2 py-0.5 text-xs transition
          hover:bg-red/10 hover:line-through
        "
        :title="`Togli ${c.name}`"
        @click="toggle(c.istat)"
      >
        {{ c.name }}
      </button>
      <span
        v-if="picked.length > CHIPS"
        class="px-1 py-0.5 text-xs opacity-60"
      >e altri {{ picked.length - CHIPS }}</span>
    </div>
    <ul class="
      max-h-60 scrollbar-none overflow-y-auto rounded-lg border border-ink/10
      bg-white
    ">
      <li
        v-for="c in shown"
        :key="c.istat"
      >
        <label class="
          flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm
          hover:bg-ink/4
        ">
          <input
            type="checkbox"
            class="accent-green"
            :checked="checked.has(c.istat)"
            @change="toggle(c.istat)"
          >
          <span class="flex-1 truncate">{{ c.name }}</span>
          <span class="text-xs opacity-40">{{ c.province }}</span>
        </label>
      </li>
      <li
        v-if="!shown.length"
        class="px-2.5 py-2 text-sm opacity-60"
      >
        Nessun comune.
      </li>
    </ul>
  </div>
</template>
