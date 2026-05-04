<script setup lang="ts">
const props = defineProps<{
  to: string
  title: string
  summary: string
  cover?: string
  role?: string
  year?: number
  tags?: string[]
}>()

const isPa = (tag: string) => tag.trim().toUpperCase() === 'PA'
const isFinance = (tag: string) => {
  const t = tag.trim().toLowerCase()
  return t === 'finanza agevolata' || t === 'public funding'
}

const tagWeight = (tag: string) => (isPa(tag) ? 0 : isFinance(tag) ? 1 : 2)

const sortedTags = computed(() =>
  props.tags?.length
    ? [...props.tags].sort((a, b) => tagWeight(a) - tagWeight(b))
    : [],
)
</script>

<template>
  <NuxtLink
    :to="to"
    class="group block overflow-hidden rounded-lg border border-ink/10 bg-paper-soft transition hover:border-accent/40 hover:shadow-lg"
  >
    <div class="aspect-[16/9] w-full overflow-hidden bg-ink/5">
      <img
        v-if="cover"
        :src="cover"
        :alt="title"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center font-display text-3xl text-ink/20"
      >
        {{ title?.[0] }}
      </div>
    </div>

    <div class="space-y-2 p-5">
      <div
        v-if="role || year"
        class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-ink-soft"
      >
        <span v-if="role">{{ role }}</span>
        <span v-if="role && year">·</span>
        <span v-if="year">{{ year }}</span>
      </div>
      <h3 class="font-display text-2xl leading-tight">{{ title }}</h3>
      <p class="text-sm text-ink-soft line-clamp-2">{{ summary }}</p>
      <div v-if="sortedTags.length" class="flex flex-wrap gap-1.5 pt-2">
        <span
          v-for="tag in sortedTags"
          :key="tag"
          :title="
            isPa(tag)
              ? 'Pubblica Amministrazione'
              : isFinance(tag)
                ? 'Finanza agevolata · partner strategico'
                : undefined
          "
          :class="
            isPa(tag)
              ? 'rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink shadow-sm'
              : isFinance(tag)
                ? 'rounded-full bg-finance px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-paper shadow-sm'
                : 'rounded-full border border-ink/15 px-2 py-0.5 text-[11px] uppercase tracking-wider text-ink-soft'
          "
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
