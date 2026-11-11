<script setup lang="ts">
// Testo lungo con gli stili di testo del Figma: il corpo markdown dei
// contenuti (schede prodotto, casi cliente) con `value`, oppure i
// paragrafi passati nello slot (pagine legali).
// Paragrafi ed elenchi Body, h2 Title, h3 Body in grassetto, elenchi
// tra filetti ink, link sottolineati.
defineProps<{
  value?: Record<string, any>
}>()
</script>

<template>
  <div class="rich-text">
    <ContentRenderer
      v-if="value"
      :value="value"
    />
    <slot v-else />
  </div>
</template>

<style scoped>
.rich-text :deep(h2) {
  margin-top: 3.5rem;
  font-size: clamp(1.75rem, 1.1rem + 2vw, 2.5rem);
  line-height: 1.08;
  letter-spacing: -0.01em;
}

.rich-text :deep(h3) {
  margin-top: 2.5rem;
  font-size: clamp(1.0625rem, 0.95rem + 0.4vw, 1.25rem);
  line-height: 1.3;
}

.rich-text :deep(p),
.rich-text :deep(ul),
.rich-text :deep(ol),
.rich-text :deep(blockquote) {
  margin-top: 1.75rem;
  font-size: clamp(1.0625rem, 0.95rem + 0.4vw, 1.25rem);
  line-height: 1.5;
}

/* Il paragrafo resta vicino al suo h3 */
.rich-text :deep(h3 + p),
.rich-text :deep(h3 + ul),
.rich-text :deep(h3 + ol) {
  margin-top: 0.75rem;
}

/* Il primo blocco non stacca dall'alto */
.rich-text :deep(h2:first-child),
.rich-text :deep(h3:first-child),
.rich-text :deep(p:first-child),
.rich-text :deep(ul:first-child),
.rich-text :deep(ol:first-child),
.rich-text :deep(blockquote:first-child) {
  margin-top: 0;
}

.rich-text :deep(ul),
.rich-text :deep(ol) {
  border-bottom: 1px solid var(--color-ink);
}

.rich-text :deep(ol) {
  list-style: decimal inside;
}

.rich-text :deep(li) {
  border-top: 1px solid var(--color-ink);
  padding-block: 1.25rem;
}

.rich-text :deep(blockquote) {
  border-left: 1.5px solid var(--color-ink);
  padding-left: 1.5rem;
}

.rich-text :deep(blockquote > p) {
  margin-top: 0;
}

.rich-text :deep(a) {
  text-decoration: underline;
  transition: color 0.2s;
}

.rich-text :deep(a:hover) {
  color: var(--color-green);
}

/* Nuxt Content avvolge i titoli in un link ancora */
.rich-text :deep(:is(h2, h3) a),
.rich-text :deep(:is(h2, h3) a:hover) {
  color: inherit;
  text-decoration: none;
}

.rich-text :deep(strong) {
  font-weight: 700;
}
</style>
