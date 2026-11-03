<script setup lang="ts">
// Il cuore di un bando, nell'elenco e nelle card: segna o toglie un bando
// dagli interessanti. La posizione la dà chi lo usa, con le sue classi.
defineProps<{ liked: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="
      transition
      hover:text-red
    "
    :class="liked ? 'text-red' : 'text-ink/25'"
    :aria-pressed="liked"
    :aria-label="liked ? 'Togli dagli interessanti' : 'Segna come interessante'"
    :title="liked ? 'Togli dagli interessanti' : 'Segna come interessante'"
    @click="$emit('toggle')"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        d="M10 17s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 10 6.3a3.6 3.6 0 0 1 6.5 2.1C16.5 13.1 10 17 10 17z"
        :fill="liked ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>
