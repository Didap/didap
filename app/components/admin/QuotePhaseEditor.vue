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
import AdminIcon from '~/components/admin/AdminIcon.vue'
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
  <section class="flex flex-col gap-3 py-5">
    <header class="flex items-center gap-1">
      <span class="w-5 shrink-0 text-sm tabular-nums opacity-40">{{ index + 1 }}</span>
      <input
        v-model="phase.title"
        class="min-w-0 flex-1 panel-input font-bold"
        placeholder="Titolo della fase"
        aria-label="Titolo della fase"
        maxlength="200"
      >
      <button
        type="button"
        class="ghost-icon"
        :disabled="index === 0"
        aria-label="Sposta la fase in alto"
        @click="emit('move', -1)"
      >
        <AdminIcon name="up" />
      </button>
      <button
        type="button"
        class="ghost-icon"
        :disabled="index === count - 1"
        aria-label="Sposta la fase in basso"
        @click="emit('move', 1)"
      >
        <AdminIcon name="down" />
      </button>
      <button
        type="button"
        class="
          ghost-icon
          hover:text-red
        "
        aria-label="Elimina la fase"
        @click="askRemove"
      >
        <AdminIcon name="close" />
      </button>
    </header>

    <p
      v-if="confirmRemove"
      class="
        ml-6 flex flex-wrap items-center gap-3 rounded-lg bg-red/10 px-3 py-2
        text-sm
      "
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

    <textarea
      v-model="phase.description"
      rows="2"
      maxlength="2000"
      placeholder="Descrizione della fase (facoltativa)"
      aria-label="Descrizione della fase"
      class="ml-6 panel-input"
    />

    <ul
      v-if="items.length"
      class="@container ml-6 flex flex-col gap-3"
    >
      <li
        v-for="(item, i) in items"
        :key="item.id"
        class="
          grid items-center gap-x-1.5 gap-y-2
          @3xl:grid-cols-[minmax(0,1fr)_auto]
        "
      >
        <input
          v-model="item.description"
          class="panel-input"
          placeholder="Descrizione della voce"
          aria-label="Descrizione della voce"
          maxlength="500"
        >
        <div class="flex items-center gap-1.5 text-sm">
          <SelectRoot
            :model-value="item.kind"
            :disabled="disabled"
            @update:model-value="(v) => setKind(i, v)"
          >
            <SelectTrigger
              class="select-trigger w-28 panel-input"
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
            <div class="w-16">
              <NumberInput
                v-model="item.days"
                kind="days"
                label="Giorni"
                panel
              />
            </div>
            <span class="opacity-50">gg ×</span>
            <div class="w-24">
              <NumberInput
                v-model="item.rate"
                kind="euro"
                label="Tariffa giornaliera"
                panel
              />
            </div>
          </template>
          <div
            v-else
            class="w-39"
          >
            <NumberInput
              v-model="item.amount"
              kind="euro"
              label="Importo"
              panel
            />
          </div>
          <span class="ml-auto w-24 text-right tabular-nums">{{ formatEuro(itemAmount(item)) }}</span>
          <button
            type="button"
            class="ghost-icon"
            :disabled="i === 0"
            aria-label="Sposta la voce in alto"
            @click="moveInArray(items, i, -1)"
          >
            <AdminIcon name="up" />
          </button>
          <button
            type="button"
            class="ghost-icon"
            :disabled="i === items.length - 1"
            aria-label="Sposta la voce in basso"
            @click="moveInArray(items, i, 1)"
          >
            <AdminIcon name="down" />
          </button>
          <button
            type="button"
            class="
              ghost-icon
              hover:text-red
            "
            aria-label="Elimina la voce"
            @click="items.splice(i, 1)"
          >
            <AdminIcon name="close" />
          </button>
        </div>
      </li>
    </ul>

    <div class="ml-6 flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        class="
          rounded-full px-3 py-1.5 text-green
          hover:bg-green/10
        "
        @click="addItem('days')"
      >
        + Voce a giorni
      </button>
      <button
        type="button"
        class="
          rounded-full px-3 py-1.5 text-green
          hover:bg-green/10
        "
        @click="addItem('fixed')"
      >
        + Voce a corpo
      </button>
      <span class="ml-auto pr-1">
        <span class="opacity-60">Subtotale</span>
        <strong class="ml-2 tabular-nums">{{ formatEuro(subtotal) }}</strong>
      </span>
    </div>
  </section>
</template>
