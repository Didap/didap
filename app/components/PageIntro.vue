<script setup lang="ts">
// L'apertura delle pagine interne (prodotti, clienti, chi siamo, legali)
// sulla griglia della scheda prodotto: filetto ink in alto, a sinistra il
// kicker verde, a destra il titolo Hero e la frase in Body Medium. Lo
// slot sta sotto la frase, nella stessa colonna (date).
defineProps<{
  kicker?: string
  title: string
  intro?: string
}>()
</script>

<template>
  <header class="page-x">
    <div class="
      grid gap-x-6 gap-y-4 border-t-[1.5px] border-ink pt-8 pb-12
      lg:grid-cols-[minmax(0,302fr)_minmax(0,954fr)] lg:pb-16
    ">
      <p
        v-if="kicker"
        class="text-label text-green"
      >
        {{ kicker }}
      </p>
      <div class="
        flex min-w-0 flex-col items-start gap-5
        lg:col-start-2
      ">
        <!-- `actions`: bottoni sulla riga del titolo, a capo su telefono -->
        <div class="
          flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-4
        ">
          <h1 class="text-hero">
            {{ title }}
          </h1>
          <div
            v-if="$slots.actions"
            class="flex flex-wrap items-center gap-2"
          >
            <slot name="actions" />
          </div>
        </div>
        <p
          v-if="intro"
          class="text-body-medium"
        >
          {{ intro }}
        </p>
        <div
          v-if="$slots.default"
          class="mt-3 w-full"
        >
          <slot />
        </div>
      </div>
    </div>
  </header>
</template>
