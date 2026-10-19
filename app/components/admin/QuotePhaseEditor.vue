<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import AdminField from '~/components/admin/AdminField.vue'
import NumberInput from '~/components/admin/NumberInput.vue'
import { moveInArray } from '~/utils/moveInArray'
import { formatEuro } from '#shared/money'
import { itemAmount, newLocalId, type QuoteItem, type QuotePhase } from '#shared/quote'

// Una fase del preventivo con le sue voci (a giorni o a corpo).
// `phase` è l'oggetto della bozza: le modifiche vanno direttamente lì.
const props = defineProps<{
  phase: QuotePhase
  index: number
  count: number
  dayRate: number
  subtotal: number
  /** Durante un'azione: il fieldset non ferma i menu di Reka */
  disabled?: boolean
}>()
const emit = defineEmits<{ move: [delta: -1 | 1]; remove: [] }>()

const confirmRemove = ref(false)
const items = computed(() => props.phase.items)

function addItem(kind: QuoteItem['kind']) {
  items.value.push(kind === 'days'
    ? { id: newLocalId(), kind, description: '', days: 1, rate: props.dayRate }
    : { id: newLocalId(), kind, description: '', amount: 0 })
}

// Cambio di tipo: passando a corpo l'importo resta quello calcolato
// Riscegliere il tipo attivo non azzera la voce
function setKind(i: number, v: unknown) {
  const item = items.value[i]
  const kind = KIND_OPTIONS.find((o) => o.value === v)?.value
  if (!item || !kind || item.kind === kind) return
  items.value[i] = kind === 'fixed'
    ? { id: item.id, kind, description: item.description, amount: itemAmount(item) }
    : { id: item.id, kind, description: item.description, days: 1, rate: props.dayRate }
}

const KIND_OPTIONS = [
  { value: 'days', label: 'A giorni' },
  { value: 'fixed', label: 'A corpo' },
] as const satisfies readonly { value: QuoteItem['kind']; label: string }[]
const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label]))

function askRemove() {
  if (items.value.length) confirmRemove.value = true
  else emit('remove')
}
</script>

<template>
  <section class="rounded-2xl border border-ink/10 bg-white">
    <header class="flex items-center gap-2 border-b border-ink/10 px-5 py-3">
      <span class="font-mono text-sm opacity-50">{{ index + 1 }}.</span>
      <input
        v-model="phase.title"
        class="admin-input flex-1 font-bold"
        placeholder="Titolo della fase"
        aria-label="Titolo della fase"
        maxlength="200"
      >
      <button
        type="button"
        class="admin-icon-btn"
        :disabled="index === 0"
        aria-label="Sposta la fase in alto"
        @click="emit('move', -1)"
      >
        ↑
      </button>
      <button
        type="button"
        class="admin-icon-btn"
        :disabled="index === count - 1"
        aria-label="Sposta la fase in basso"
        @click="emit('move', 1)"
      >
        ↓
      </button>
      <button
        type="button"
        class="admin-icon-btn"
        aria-label="Elimina la fase"
        @click="askRemove"
      >
        ✕
      </button>
    </header>

    <p
      v-if="confirmRemove"
      class="flex flex-wrap items-center gap-3 bg-red/10 px-5 py-3 text-sm"
      role="alert"
    >
      Eliminare la fase e le sue {{ items.length }} voci?
      <button
        type="button"
        class="rounded-full bg-red px-3 py-1 text-white"
        @click="emit('remove')"
      >
        Elimina
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1"
        @click="confirmRemove = false"
      >
        Annulla
      </button>
    </p>

    <div class="flex flex-col gap-4 px-5 py-4">
      <AdminField label="Descrizione della fase">
        <textarea
          v-model="phase.description"
          rows="2"
          maxlength="2000"
          class="admin-input"
        />
      </AdminField>

      <ul
        v-if="items.length"
        class="flex flex-col gap-3"
      >
        <li
          v-for="(item, i) in items"
          :key="item.id"
          class="flex gap-2 rounded-xl bg-paper p-3"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <input
              v-model="item.description"
              class="admin-input"
              placeholder="Descrizione della voce"
              aria-label="Descrizione della voce"
              maxlength="500"
            >
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <SelectRoot
                :model-value="item.kind"
                :disabled="disabled"
                @update:model-value="(v) => setKind(i, v)"
              >
                <SelectTrigger
                  class="select-trigger admin-input w-auto"
                  aria-label="Tipo di voce"
                >
                  <SelectValue>{{ KIND_LABELS[item.kind] }}</SelectValue>
                </SelectTrigger>
                <SelectPortal>
                  <SelectContent
                    position="popper"
                    :side-offset="4"
                    class="select-content admin-select-content"
                  >
                    <SelectViewport>
                      <SelectItem
                        v-for="o in KIND_OPTIONS"
                        :key="o.value"
                        :value="o.value"
                        class="select-item admin-select-item"
                      >
                        <SelectItemText>{{ o.label }}</SelectItemText>
                      </SelectItem>
                    </SelectViewport>
                  </SelectContent>
                </SelectPortal>
              </SelectRoot>
              <template v-if="item.kind === 'days'">
                <div class="w-20">
                  <NumberInput
                    v-model="item.days"
                    kind="days"
                    label="Giorni"
                  />
                </div>
                <span class="opacity-60">gg ×</span>
                <div class="w-28">
                  <NumberInput
                    v-model="item.rate"
                    kind="euro"
                    label="Tariffa giornaliera"
                  />
                </div>
                <span class="opacity-60">€</span>
              </template>
              <template v-else>
                <div class="w-32">
                  <NumberInput
                    v-model="item.amount"
                    kind="euro"
                    label="Importo"
                  />
                </div>
                <span class="opacity-60">€</span>
              </template>
              <span class="ml-auto font-mono tabular-nums">{{ formatEuro(itemAmount(item)) }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <button
              type="button"
              class="admin-icon-btn"
              :disabled="i === 0"
              aria-label="Sposta la voce in alto"
              @click="moveInArray(items, i, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="admin-icon-btn"
              :disabled="i === items.length - 1"
              aria-label="Sposta la voce in basso"
              @click="moveInArray(items, i, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="admin-icon-btn"
              aria-label="Elimina la voce"
              @click="items.splice(i, 1)"
            >
              ✕
            </button>
          </div>
        </li>
      </ul>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="
            rounded-full border border-ink/20 px-3 py-1.5 text-sm
            hover:border-ink
          "
          @click="addItem('days')"
        >
          + Voce a giorni
        </button>
        <button
          type="button"
          class="
            rounded-full border border-ink/20 px-3 py-1.5 text-sm
            hover:border-ink
          "
          @click="addItem('fixed')"
        >
          + Voce a corpo
        </button>
        <span class="ml-auto text-sm">
          Subtotale <strong class="font-mono tabular-nums">{{ formatEuro(subtotal) }}</strong>
        </span>
      </div>
    </div>
  </section>
</template>
