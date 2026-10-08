<script setup lang="ts">
import AdminField from '~/components/admin/AdminField.vue'
import AdminSection from '~/components/admin/AdminSection.vue'
import AdminSwitch from '~/components/admin/AdminSwitch.vue'
import ImageDrop from '~/components/admin/ImageDrop.vue'
import MediaField from '~/components/admin/MediaField.vue'
import { PRODUCT_STATUSES } from '#shared/product'
import type { AdminForm } from '~/utils/adminForm'
import type { MediaSlot as MediaSlotType } from '#shared/product'

// Form della scheda prodotto: un blocco per ogni sezione della pagina,
// nello stesso ordine in cui compaiono.
const form = defineModel<AdminForm>({ required: true })
defineProps<{
  others: { slug: string; title: string }[]
  highlighted?: string | null
}>()
const emit = defineEmits<{ focus: [section: string] }>()

const STATUS_LABELS = { live: 'Live', pilot: 'Pilot', pending: 'Stato da confermare' }

// ---- Voci di "Cosa fa": trascinamento (dalla maniglia) e frecce da tastiera
const items = computed(() => form.value.features.items)
const dragFrom = ref<number | null>(null)
const dropAt = ref<number | null>(null) // posizione di inserimento 0..n
const armed = ref<number | null>(null) // riga trascinabile solo dalla maniglia

function moveItem(from: number, to: number) {
  const list = form.value.features.items
  if (to < 0 || to >= list.length || from === to) return
  const [it] = list.splice(from, 1)
  list.splice(to, 0, it!)
}

function onItemDragStart(i: number, e: DragEvent) {
  dragFrom.value = i
  e.dataTransfer?.setData('text/plain', String(i))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onItemDragOver(i: number, e: DragEvent) {
  if (dragFrom.value === null) return
  e.preventDefault()
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dropAt.value = e.clientY < r.top + r.height / 2 ? i : i + 1
}
function onItemDrop() {
  const from = dragFrom.value
  const at = dropAt.value
  if (from !== null && at !== null) moveItem(from, at > from ? at - 1 : at)
  onItemDragEnd()
}
function onItemDragEnd() {
  dragFrom.value = null
  dropAt.value = null
  armed.value = null
}

async function onHandleKey(i: number, e: KeyboardEvent) {
  const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  if (!dir) return
  e.preventDefault()
  moveItem(i, i + dir)
  await nextTick()
  document.querySelectorAll<HTMLElement>('[data-item-handle]')[i + dir]?.focus()
}

async function addItem() {
  form.value.features.items.push({ name: '', desc: '' })
  await nextTick()
  const inputs = document.querySelectorAll<HTMLInputElement>('[data-feature-name]')
  inputs[inputs.length - 1]?.focus()
}

// ---- Più file trascinati insieme: riempiono gli slot successivi del gruppo
const { upload } = useAssetUpload()
async function fillNext(group: MediaSlotType[], from: number, files: File[]) {
  for (const [k, file] of files.entries()) {
    const i = from + 1 + k
    if (i >= group.length) break
    const url = await upload(file)
    if (url) group[i] = { ...group[i], src: url }
  }
}

const onFocus = (id: string) => emit('focus', id)

// Senza racconto, sfida, funzioni e modello la pagina mostra il testo
// markdown originale del prodotto: lo diciamo, sennò l'anteprima confonde
const usesMarkdownBody = computed(
  () =>
    !form.value.intro.trim()
    && !form.value.challengeOn
    && !form.value.featuresOn
    && !form.value.model.trim(),
)
</script>

<template>
  <div class="flex flex-col gap-5">
    <p
      v-if="usesMarkdownBody"
      class="rounded-2xl bg-green/10 p-4 text-sm/relaxed"
    >
      Ora la pagina mostra il testo originale del prodotto sotto la scheda.
      Appena compili il racconto, La cosa difficile, Cosa fa o il modello,
      passa alla struttura nuova con quei blocchi.
    </p>
    <!-- Scheda -->
    <AdminSection
      id="scheda"
      :highlight="highlighted === 'scheda'"
      title="Scheda"
      description="Nome, dati a sinistra e frase grande accanto."
      @focus="onFocus"
    >
      <div class="
        grid gap-5
        sm:grid-cols-2
      ">
        <AdminField label="Nome del prodotto">
          <input
            v-model="form.title"
            required
            maxlength="120"
            class="admin-input"
          >
        </AdminField>
        <AdminField
          label="Sito del prodotto"
          hint="Lo apre il bottone e il logo nella nav."
        >
          <input
            v-model="form.url"
            type="url"
            inputmode="url"
            placeholder="https://"
            maxlength="500"
            class="admin-input"
          >
        </AdminField>
        <AdminField label="Categoria">
          <input
            v-model="form.role"
            maxlength="120"
            placeholder="Es. Fantacalcio"
            class="admin-input"
          >
        </AdminField>
        <AdminField
          label="Stato"
          group
        >
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in ['', ...PRODUCT_STATUSES] as const"
              :key="s"
              type="button"
              class="rounded-full border px-3 py-1.5 text-sm transition"
              :class="form.status === s ? 'border-ink bg-ink text-paper-light' : `
                border-ink/20
                hover:border-ink
              `"
              :aria-pressed="form.status === s"
              @click="form.status = s"
            >
              {{ s ? STATUS_LABELS[s] : 'Nessuno' }}
            </button>
          </div>
        </AdminField>
        <AdminField label="Ruolo">
          <input
            v-model="form.scope"
            maxlength="200"
            placeholder="Es. Design e sviluppo full-stack"
            class="admin-input"
          >
        </AdminField>
        <AdminField label="Stack">
          <input
            v-model="form.stack"
            maxlength="300"
            placeholder="Es. Nuxt 4, Vue 3, PostgreSQL"
            class="admin-input"
          >
        </AdminField>
      </div>
      <AdminField
        label="Frase di apertura"
        :value="form.lede"
        :max="600"
        hint="Il testo grande accanto ai dati. Breve: due righe al massimo."
      >
        <textarea
          v-model="form.lede"
          rows="3"
          maxlength="600"
          class="admin-input"
        />
      </AdminField>
      <AdminField
        group
        label="Logo del prodotto"
        hint="Compare in alto a destra nella nav della pagina. Meglio un SVG o un PNG trasparente."
      >
        <div class="max-w-xs">
          <ImageDrop
            v-model="form.logo"
            aspect="aspect-[3/1]"
            fit="contain"
            empty-label="Carica logo"
          >
            <template #empty>
              <span class="text-sm opacity-50">Nessun logo: nella nav c'è il nome</span>
            </template>
          </ImageDrop>
        </div>
      </AdminField>
    </AdminSection>

    <!-- Testata -->
    <AdminSection
      id="testata"
      :highlight="highlighted === 'testata'"
      v-model:enabled="form.heroOn"
      title="Immagine di testata"
      description="A tutta larghezza, sotto la nav."
      toggle
      @focus="onFocus"
    >
      <MediaField
        v-model="form.hero"
        title="Testata · 1440×864"
        aspect="aspect-[1440/864]"
      />
    </AdminSection>

    <!-- Il prodotto -->
    <AdminSection
      id="prodotto"
      :highlight="highlighted === 'prodotto'"
      title="Il prodotto"
      description="Due immagini affiancate, il racconto, un'immagine larga."
      @focus="onFocus"
    >
      <AdminSwitch
        v-model="form.pairOn"
        label="Due immagini affiancate"
      />
      <div
        v-if="form.pairOn"
        class="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <MediaField
          v-for="(_, i) in form.pair"
          :key="i"
          v-model="form.pair[i]!"
          :title="`Immagine ${i + 1} · 628×760`"
          aspect="aspect-[628/760]"
          @extra-files="fillNext(form.pair, i, $event)"
        />
      </div>
      <AdminField
        label="Racconto"
        :value="form.intro"
        :max="3000"
        hint="Il paragrafo in grassetto largo. Lascia vuoto per nasconderlo."
      >
        <textarea
          v-model="form.intro"
          rows="5"
          maxlength="3000"
          class="admin-input"
        />
      </AdminField>
      <AdminSwitch
        v-model="form.wideOn"
        label="Immagine larga"
      />
      <MediaField
        v-if="form.wideOn"
        v-model="form.wide"
        title="Immagine larga · 1280×720"
        aspect="aspect-video"
      />
    </AdminSection>

    <!-- La cosa difficile -->
    <AdminSection
      id="difficile"
      :highlight="highlighted === 'difficile'"
      v-model:enabled="form.challengeOn"
      title="La cosa difficile"
      description="Il problema tecnico più interessante, raccontato in breve."
      toggle
      @focus="onFocus"
    >
      <AdminField
        label="Titolo"
        :value="form.challenge.title"
        :max="200"
      >
        <input
          v-model="form.challenge.title"
          maxlength="200"
          placeholder="Es. Nessun timer sul server."
          class="admin-input"
        >
      </AdminField>
      <AdminField
        label="Testo"
        :value="form.challenge.body"
        :max="3000"
      >
        <textarea
          v-model="form.challenge.body"
          rows="5"
          maxlength="3000"
          class="admin-input"
        />
      </AdminField>
    </AdminSection>

    <!-- Cosa fa -->
    <AdminSection
      id="cosafa"
      :highlight="highlighted === 'cosafa'"
      v-model:enabled="form.featuresOn"
      title="Cosa fa"
      description="Le funzioni principali, una per riga."
      toggle
      @focus="onFocus"
    >
      <AdminSwitch
        v-model="form.featureMediaOn"
        label="Immagini sopra l'elenco"
      />
      <div
        v-if="form.featureMediaOn"
        class="
          grid items-start gap-4
          sm:grid-cols-[2fr_1fr]
        "
      >
        <MediaField
          v-model="form.feature[0]!"
          title="Grande · 848×760"
          aspect="aspect-[848/760]"
          @extra-files="fillNext(form.feature, 0, $event)"
        />
        <MediaField
          v-model="form.feature[1]!"
          title="Piccola · 408×385"
          aspect="aspect-[408/385]"
        />
      </div>
      <AdminField
        label="Titolo"
        :value="form.features.title"
        :max="200"
      >
        <input
          v-model="form.features.title"
          maxlength="200"
          placeholder="Es. Dalla sera dell'asta a tutta la stagione."
          class="admin-input"
        >
      </AdminField>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">Voci</span>
        <ol
          class="flex flex-col"
          @dragover.prevent
          @drop="onItemDrop"
        >
          <li
            v-for="(item, i) in items"
            :key="i"
            class="relative py-1"
            :draggable="armed === i"
            @dragstart="onItemDragStart(i, $event)"
            @dragover="onItemDragOver(i, $event)"
            @dragend="onItemDragEnd"
          >
            <span
              v-if="dropAt === i"
              class="absolute inset-x-0 -top-px h-0.5 rounded-full bg-green"
              aria-hidden="true"
            />
            <div
              class="
                grid items-center gap-2 rounded-xl bg-paper p-2 transition
                sm:grid-cols-[auto_1fr_2fr_auto]
              "
              :class="dragFrom === i ? 'opacity-40' : ''"
            >
              <button
                type="button"
                data-item-handle
                class="
                  flex h-9 w-7 cursor-grab items-center justify-center
                  rounded-lg text-ink/40
                  hover:bg-ink/5 hover:text-ink
                  active:cursor-grabbing
                "
                :aria-label="`Voce ${i + 1}: trascina o usa le frecce su e giù per spostarla`"
                title="Trascina per spostare"
                @mousedown="armed = i"
                @mouseup="armed = null"
                @keydown="onHandleKey(i, $event)"
              >
                <svg
                  width="12"
                  height="18"
                  viewBox="0 0 12 18"
                  fill="currentColor"
                  aria-hidden="true"
                ><circle
                  cx="3"
                  cy="3"
                  r="1.6"
                /><circle
                  cx="9"
                  cy="3"
                  r="1.6"
                /><circle
                  cx="3"
                  cy="9"
                  r="1.6"
                /><circle
                  cx="9"
                  cy="9"
                  r="1.6"
                /><circle
                  cx="3"
                  cy="15"
                  r="1.6"
                /><circle
                  cx="9"
                  cy="15"
                  r="1.6"
                /></svg>
              </button>
              <input
                v-model="item.name"
                data-feature-name
                maxlength="120"
                placeholder="Funzione"
                :aria-label="`Voce ${i + 1}: nome`"
                class="admin-input"
              >
              <input
                v-model="item.desc"
                maxlength="600"
                placeholder="Cosa fa, in una riga"
                :aria-label="`Voce ${i + 1}: descrizione`"
                class="admin-input"
              >
              <button
                type="button"
                class="
                  admin-icon
                  hover:bg-red!
                "
                :aria-label="`Elimina la voce ${i + 1}`"
                title="Elimina"
                @click="form.features.items.splice(i, 1)"
              >
                ×
              </button>
            </div>
            <span
              v-if="dropAt === items.length && i === items.length - 1"
              class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-green"
              aria-hidden="true"
            />
          </li>
        </ol>
        <div>
          <button
            type="button"
            class="
              rounded-full border border-dashed border-ink/30 px-4 py-2 text-sm
              hover:border-ink
            "
            @click="addItem"
          >
            + Aggiungi voce
          </button>
        </div>
      </div>
    </AdminSection>

    <!-- Chiusura -->
    <AdminSection
      id="chiusura"
      :highlight="highlighted === 'chiusura'"
      title="Chiusura"
      description="Tre immagini, il modello di prezzo e il prodotto successivo."
      @focus="onFocus"
    >
      <AdminSwitch
        v-model="form.tripleOn"
        label="Tre immagini affiancate"
      />
      <div
        v-if="form.tripleOn"
        class="
          grid gap-4
          sm:grid-cols-3
        "
      >
        <MediaField
          v-for="(_, i) in form.triple"
          :key="i"
          v-model="form.triple[i]!"
          :title="`Immagine ${i + 1}`"
          aspect="aspect-[410/540]"
          @extra-files="fillNext(form.triple, i, $event)"
        />
      </div>
      <AdminField
        label="Modello"
        :value="form.model"
        :max="3000"
        hint="Come si paga il prodotto. Lascia vuoto per nasconderlo."
      >
        <textarea
          v-model="form.model"
          rows="4"
          maxlength="3000"
          class="admin-input"
        />
      </AdminField>
      <AdminField label="Prossimo prodotto">
        <select
          v-model="form.next"
          class="admin-input"
        >
          <option value="">
            Il successivo in ordine
          </option>
          <option
            v-for="p in others"
            :key="p.slug"
            :value="p.slug"
          >
            {{ p.title }}
          </option>
        </select>
      </AdminField>
    </AdminSection>
  </div>
</template>
