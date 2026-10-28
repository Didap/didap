<script setup lang="ts">
import AdminConfirm from '~/components/admin/AdminConfirm.vue'
import { injectGrantDraft } from '~/composables/useGrantDraft'
import { formatDateTime } from '~/utils/format'
import { draftAuthor, draftFileName, MAX_DRAFT_CHARS } from '#shared/grant-draft'
import type { EvaluatedGrant } from '#shared/radar'

// Scheda "Bozza" di un bando: la bozza della candidatura in Markdown, la
// stessa che legge e scrive Claude. Il testo e la versione li tiene la
// pagina (injectGrantDraft); la scheda si rimonta per bando (:key) e apre
// quello suo. Niente anteprima formattata: il Markdown si legge anche così.
const props = defineProps<{ grant: EvaluatedGrant }>()

const editor = injectGrantDraft()

onMounted(() => editor.open(props.grant.id))

// Finché non è letta la bozza di questo bando, niente editor
const ready = computed(() => editor.grantId === props.grant.id && editor.loaded)

// "Ricarica" nel riquadro del 409: con modifiche chiede prima conferma
const confirmReload = ref(false)
const reloading = ref(false)

function askReload() {
  if (editor.dirty) confirmReload.value = true
  else reload()
}

async function reload() {
  reloading.value = true
  try {
    await editor.load(true)
  }
  finally {
    reloading.value = false
    confirmReload.value = false
  }
}

// "Scarica": il testo com'è adesso, anche non salvato, in un file .md
function download() {
  const url = URL.createObjectURL(new Blob([editor.text], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = draftFileName(props.grant.title, props.grant.id)
  a.click()
  // Non subito: il browser deve ancora leggere il file
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <template v-if="!ready">
      <p
        v-if="editor.loading || editor.grantId !== grant.id"
        class="opacity-60"
      >
        Carico la bozza...
      </p>
      <template v-else>
        <p class="text-red">
          Bozza non caricata.
        </p>
        <button
          type="button"
          class="
            inline-flex w-fit items-center rounded-full border border-ink/20
            px-4 py-2
            hover:border-ink
          "
          @click="editor.load()"
        >
          Riprova
        </button>
      </template>
    </template>

    <template v-else>
      <p
        v-if="!editor.saved"
        class="opacity-70"
      >
        Nessuna bozza. Chiedi a Claude di preparare la candidatura, oppure scrivila qui.
      </p>

      <!-- Salvataggio rifiutato: il testo scritto resta finché non si ricarica -->
      <div
        v-if="editor.conflict"
        role="alert"
        class="flex flex-col items-start gap-2 rounded-xl bg-red/8 p-3"
      >
        <p>{{ editor.conflict }}</p>
        <button
          type="button"
          class="
            inline-flex items-center rounded-full bg-ink px-4 py-1.5 font-medium
            text-paper-light
            hover:bg-green
            disabled:opacity-40
          "
          :disabled="reloading"
          @click="askReload"
        >
          Ricarica
        </button>
      </div>

      <textarea
        v-model="editor.text"
        :maxlength="MAX_DRAFT_CHARS"
        rows="24"
        aria-label="Bozza della candidatura, in Markdown"
        class="
          min-h-80 w-full resize-y rounded-xl border border-ink/20 bg-white p-3
          text-sm/relaxed
          focus:outline-2 focus:outline-offset-1 focus:outline-green
        "
      />

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="
            inline-flex items-center rounded-full bg-ink px-4 py-2 font-medium
            text-paper-light
            hover:bg-green
            disabled:opacity-40
            disabled:hover:bg-ink
          "
          :disabled="!editor.dirty || editor.saving || !!editor.conflict"
          @click="editor.save()"
        >
          {{ editor.saving ? 'Salvo...' : 'Salva' }}
        </button>
        <button
          type="button"
          class="
            inline-flex items-center rounded-full border border-ink/20 px-4 py-2
            hover:border-ink
            disabled:opacity-40
            disabled:hover:border-ink/20
          "
          :disabled="!editor.text"
          title="Scarica il testo com'è adesso in un file Markdown"
          @click="download"
        >
          Scarica
        </button>
      </div>
      <p
        v-if="!editor.hasFolder"
        class="text-xs opacity-60"
      >
        Salvando, il bando va tra gli interessanti e gli si crea la cartella.
      </p>
      <p
        v-if="editor.saved"
        class="text-xs opacity-60"
      >
        Ultimo salvataggio: {{ formatDateTime(editor.saved.savedAt) }}, {{ draftAuthor(editor.saved) }}
      </p>
    </template>

    <AdminConfirm
      v-model:open="confirmReload"
      title="Ricaricare la bozza?"
      description="Il testo scritto qui viene sostituito dalla bozza salvata. Se ti servono, copia prima le tue modifiche."
      confirm-label="Sì, ricarica"
      :busy="reloading"
      @confirm="reload"
    />
  </div>
</template>
