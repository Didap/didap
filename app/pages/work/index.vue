<script setup lang="ts">
import ProjectCard from '~/components/ProjectCard.vue'

const { t } = useI18n()
const localePath = useLocalePath()
const collection = useProjectCollection('work')

const { data: items } = await useAsyncData(
  () => `work-list-${collection.value}`,
  () =>
    queryCollection(collection.value)
      .order('order', 'ASC')
      .order('year', 'DESC')
      .all(),
  { watch: [collection] },
)

const search = ref('')
const activeTags = ref<Set<string>>(new Set())

const allTags = computed(() => {
  const set = new Set<string>()
  for (const p of items.value ?? []) {
    for (const tag of p.tags ?? []) set.add(tag)
  }
  return [...set].sort((a, b) => {
    // PA always first, then alphabetical
    const pa = (s: string) => s.trim().toUpperCase() === 'PA'
    if (pa(a) && !pa(b)) return -1
    if (!pa(a) && pa(b)) return 1
    return a.localeCompare(b)
  })
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const tagsSelected = activeTags.value
  return (items.value ?? []).filter((p) => {
    if (q) {
      const hay = `${p.title ?? ''} ${p.summary ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (tagsSelected.size > 0) {
      const projectTags = new Set((p.tags ?? []).map((s) => s.toLowerCase()))
      let matched = false
      for (const t of tagsSelected) {
        if (projectTags.has(t.toLowerCase())) {
          matched = true
          break
        }
      }
      if (!matched) return false
    }
    return true
  })
})

function toggleTag(tag: string) {
  const next = new Set(activeTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  activeTags.value = next
}

function clearFilters() {
  search.value = ''
  activeTags.value = new Set()
}

const hasFilters = computed(
  () => search.value.length > 0 || activeTags.value.size > 0,
)

const isPa = (tag: string) => tag.trim().toUpperCase() === 'PA'

useSeoMeta({
  title: `${t('nav.work')} — Didap`,
  description: t('work.intro'),
})
</script>

<template>
  <section class="mx-auto max-w-6xl px-6 py-20">
    <header class="mb-12 max-w-2xl space-y-4">
      <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
        {{ t('work.kicker') }}
      </p>
      <h1 class="font-display text-5xl">{{ t('work.title') }}</h1>
      <p class="text-lg text-ink-soft">{{ t('work.intro') }}</p>
    </header>

    <div v-if="items?.length" class="mb-12 space-y-5">
      <input
        v-model="search"
        type="search"
        :placeholder="t('work.search_placeholder')"
        class="w-full max-w-md rounded-full border border-ink/20 bg-paper-soft px-5 py-2.5 text-sm placeholder:text-ink-soft/60 focus:border-accent focus:outline-none"
      />

      <div v-if="allTags.length" class="flex flex-wrap items-center gap-2">
        <span class="mr-1 text-xs uppercase tracking-widest text-ink-soft">
          {{ t('work.filter_by') }}
        </span>
        <button
          v-for="tag in allTags"
          :key="tag"
          type="button"
          :title="isPa(tag) ? 'Pubblica Amministrazione' : undefined"
          @click="toggleTag(tag)"
          :class="[
            'rounded-full px-3 py-1 text-[11px] uppercase tracking-wider transition',
            activeTags.has(tag)
              ? isPa(tag)
                ? 'bg-gold text-ink shadow-sm'
                : 'bg-ink text-paper'
              : isPa(tag)
                ? 'border border-gold/60 text-ink-soft hover:border-gold hover:text-ink'
                : 'border border-ink/20 text-ink-soft hover:border-ink hover:text-ink',
          ]"
        >
          {{ tag }}
        </button>
        <button
          v-if="hasFilters"
          type="button"
          @click="clearFilters"
          class="ml-auto text-xs uppercase tracking-widest text-ink-soft underline underline-offset-4 hover:text-accent"
        >
          {{ t('work.clear_filters') }}
        </button>
      </div>
    </div>

    <div v-if="filtered.length" class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <ProjectCard
        v-for="p in filtered"
        :key="p.path"
        :to="localePath(`/work/${p.stem.split('/').pop()}`)"
        :title="p.title"
        :summary="p.summary"
        :cover="p.cover"
        :role="p.role"
        :year="p.year"
        :tags="p.tags"
      />
    </div>
    <p v-else-if="hasFilters" class="text-ink-soft">
      {{ t('common.no_results') }}
    </p>
    <p v-else class="text-ink-soft">{{ t('common.no_items') }}</p>
  </section>
</template>
