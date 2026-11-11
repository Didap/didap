<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import PageIntro from '~/components/PageIntro.vue'
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
  searchOpen.value = false
  activeTags.value = new Set()
}

const hasFilters = computed(
  () => search.value.length > 0 || activeTags.value.size > 0,
)

const isPa = (tag: string) => tag.trim().toUpperCase() === 'PA'

// "Cerca" è un bottone che diventa campo; vuoto e lasciato, torna bottone
// I due bottoni accanto al titolo, a contorno ink come le voci
const pill = `
  flex min-h-10 items-center gap-2 rounded-full border-[1.5px] border-ink px-4
  text-label transition-colors
  hover:bg-ink hover:text-paper
  focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-ink
`

const searchOpen = ref(false)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const searchButton = useTemplateRef<HTMLButtonElement>('searchButton')
function openSearch() {
  searchOpen.value = true
  nextTick(() => searchInput.value?.focus())
}
// Chiusa da tastiera o con la X, il fuoco torna sul bottone
function closeSearch() {
  search.value = ''
  searchOpen.value = false
  nextTick(() => searchButton.value?.focus())
}

useSeoMeta({
  title: `${t('nav.work')} - Didap`,
  description: t('work.intro').replace(/\s+/g, ' '),
})
</script>

<template>
  <div>
    <!-- Niente frase: il titolo basta. Cerca e Filtra sono due bottoni
         accanto al titolo; i filtri si aprono in un pannello -->
    <PageIntro
      :kicker="t('work.kicker')"
      :title="t('work.title')"
    >
      <template
        v-if="items?.length"
        #actions
      >
        <div
          v-if="searchOpen || search"
          class="
            flex min-h-10 items-center gap-2 rounded-full border-[1.5px]
            border-ink pr-1 pl-4 transition-colors
            focus-within:border-green
          "
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          ><circle
            cx="6"
            cy="6"
            r="4.5"
          /><path d="m9.5 9.5 3 3" /></svg>
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            :aria-label="t('work.search_label')"
            :placeholder="t('work.search_label')"
            class="
              w-32 bg-transparent text-base outline-none
              placeholder:text-ink/40
              [&::-webkit-search-cancel-button]:hidden
            "
            @blur="search || (searchOpen = false)"
            @keydown.esc="closeSearch"
          >
          <button
            type="button"
            class="
              flex size-8 items-center justify-center rounded-full
              hover:bg-ink hover:text-paper
              focus-visible:outline-2 focus-visible:outline-ink
            "
            :aria-label="t('work.search_clear')"
            @mousedown.prevent
            @click="closeSearch"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              stroke="currentColor"
              stroke-width="1.6"
              aria-hidden="true"
            ><path d="m1 1 8 8M9 1 1 9" /></svg>
          </button>
        </div>
        <button
          v-else
          ref="searchButton"
          type="button"
          :class="pill"
          @click="openSearch"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          ><circle
            cx="6"
            cy="6"
            r="4.5"
          /><path d="m9.5 9.5 3 3" /></svg>
          {{ t('work.search_label') }}
        </button>

        <PopoverRoot v-if="allTags.length">
          <PopoverTrigger :class="[pill, { 'bg-ink text-paper': activeTags.size }]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              aria-hidden="true"
            ><path d="M1 3h12M3 7h8M5.5 11h3" /></svg>
            {{ t('work.filter') }}
            <span v-if="activeTags.size">· {{ activeTags.size }}</span>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              side="bottom"
              align="end"
              :side-offset="8"
              :collision-padding="20"
              class="
                z-50 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-4
                rounded-[24px] border-[1.5px] border-ink bg-paper p-5 text-ink
              "
            >
              <div
                role="group"
                :aria-label="t('work.filter')"
                class="flex flex-wrap gap-2"
              >
                <!-- PA su banana, come nelle schede -->
                <button
                  v-for="tag in allTags"
                  :key="tag"
                  type="button"
                  :title="isPa(tag) ? 'Pubblica Amministrazione' : undefined"
                  :aria-pressed="activeTags.has(tag)"
                  class="
                    min-h-10 rounded-full border-[1.5px] px-4 text-label
                    transition-colors
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-ink
                  "
                  :class="
                    activeTags.has(tag)
                      ? isPa(tag)
                        ? 'border-banana bg-banana text-ink'
                        : 'border-ink bg-ink text-paper'
                      : isPa(tag)
                        ? `
                          border-banana
                          hover:bg-banana
                        `
                        : `
                          border-ink/40
                          hover:border-ink
                        `
                  "
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
              <button
                v-if="activeTags.size"
                type="button"
                class="
                  self-start text-label underline underline-offset-4
                  transition-colors
                  hover:text-green
                "
                @click="activeTags = new Set()"
              >
                {{ t('work.clear_filters') }}
              </button>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </template>
    </PageIntro>

    <!-- Quanti ne restano: solo per gli screen reader -->
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ t(filtered.length === 1 ? 'work.results_count_one' : 'work.results_count_other', { count: filtered.length }) }}
    </p>

    <section class="
      page-x pb-24
      lg:pb-30
    ">
      <div
        v-if="filtered.length"
        class="
          grid gap-x-6 gap-y-16
          md:grid-cols-2
          lg:grid-cols-3
        "
      >
        <ProjectCard
          v-for="p in filtered"
          :key="p.path"
          :to="localePath(`/work/${p.stem.split('/').pop()}`)"
          :title="p.title"
          :summary="p.summary"
          :cover="p.cover"
          :media="p.hero"
          :role="p.role"
          :year="p.year"
          :tags="p.tags"
        />
      </div>
      <div
        v-else-if="hasFilters"
        class="flex flex-col items-start gap-4"
      >
        <p class="text-body">
          {{ t('common.no_results') }}
        </p>
        <button
          type="button"
          class="
            text-label underline underline-offset-4 transition-colors
            hover:text-green
          "
          @click="clearFilters"
        >
          {{ t('work.clear_filters') }}
        </button>
      </div>
      <p
        v-else
        class="text-body"
      >
        {{ t('common.no_items') }}
      </p>
    </section>
  </div>
</template>
