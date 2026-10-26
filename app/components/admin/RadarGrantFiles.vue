<script setup lang="ts">
import { adminErrorText } from '~/utils/adminErrors'
import type { EvaluatedGrant, FolderStart } from '#shared/radar'

// Scheda "File" di un bando: la cartella si crea una volta (col bando e i
// suoi PDF) e si riprova se il riempimento non è finito
const props = defineProps<{ grant: EvaluatedGrant, configured: boolean }>()
// La cartella si riempie in background: la pagina segna il bando e lo
// ricarica finché non è pronta
const emit = defineEmits<{ folder: [id: string, start: FolderStart] }>()

const { notify } = useAdminToast()
const starting = ref(false)

async function createFolder() {
  const id = props.grant.id
  starting.value = true
  try {
    emit('folder', id, await $fetch<FolderStart>(`/api/admin/radar/grants/${id}/folder`, { method: 'POST' }))
  }
  catch (err) {
    notify('error', adminErrorText(err))
  }
  finally {
    starting.value = false
  }
}

// La nota dell'ultimo riempimento: in rosso se è andato storto
const failed = computed(() => props.grant.folderNote.startsWith('Non riuscita'))
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-sm">
    <p
      v-if="!configured"
      class="text-red"
    >
      Cloudinary non configurato
    </p>
    <button
      v-if="!grant.folderFilled && !grant.folderFilling"
      type="button"
      class="
        inline-flex w-fit items-center rounded-full bg-ink px-4 py-2 font-medium
        text-paper-light
        hover:bg-green
        disabled:opacity-40
      "
      :disabled="!configured || starting"
      :title="configured ? 'Crea la cartella del bando, col bando e i suoi PDF' : 'Cloudinary non configurato'"
      @click="createFolder"
    >
      {{ grant.hasFolder ? 'Riprova a prendere i file dal bando' : 'Crea cartella del bando' }}
    </button>
    <button
      v-else-if="grant.folderFilling"
      type="button"
      class="
        inline-flex w-fit items-center rounded-full border border-ink/20 px-4
        py-2
      "
      disabled
    >
      Preparo la cartella...
    </button>
    <p
      v-if="grant.folderNote"
      class="text-xs"
      :class="failed ? 'text-red' : 'opacity-60'"
    >
      {{ grant.folderNote }}
    </p>
  </div>
</template>
