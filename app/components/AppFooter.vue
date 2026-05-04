<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-ink/10 bg-paper-soft">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-ink-soft md:flex-row md:items-center md:justify-between"
    >
      <p>© {{ year }} Didap — {{ t('footer.tagline') }}</p>
      <p class="text-xs uppercase tracking-widest">
        {{ t('footer.made_in') }}
      </p>
    </div>
  </footer>
</template>
