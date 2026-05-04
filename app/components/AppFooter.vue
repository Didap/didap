<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-ink/10 bg-paper-soft">
    <div
      class="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-sm text-ink-soft md:grid-cols-3"
    >
      <div class="space-y-2">
        <p class="font-display text-lg text-ink">Didap</p>
        <p>{{ t('footer.tagline') }}</p>
      </div>

      <div class="space-y-3">
        <p class="text-xs uppercase tracking-widest text-ink-soft/70">
          {{ t('footer.legal') }}
        </p>
        <ul class="space-y-1.5">
          <li>
            <NuxtLink
              :to="localePath('/privacy')"
              class="transition hover:text-accent"
            >
              {{ t('footer.privacy') }}
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              :to="localePath('/cookies')"
              class="transition hover:text-accent"
            >
              {{ t('footer.cookies') }}
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div class="space-y-3 md:text-right">
        <p class="text-xs uppercase tracking-widest text-ink-soft/70">
          {{ t('nav.contact') }}
        </p>
        <a
          href="mailto:amministrazione@didap.it"
          class="block transition hover:text-accent"
        >
          amministrazione@didap.it
        </a>
        <p class="text-xs">© {{ year }} Didap srl</p>
      </div>
    </div>
  </footer>
</template>
