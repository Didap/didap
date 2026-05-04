<script setup lang="ts">
import ProjectCard from '~/components/ProjectCard.vue'
import ExpandableGallery from '~/components/ExpandableGallery.vue'
import AnimatedTestimonials from '~/components/AnimatedTestimonials.vue'

const { t } = useI18n()
const localePath = useLocalePath()

const workCollection = useProjectCollection('work')
const clientsCollection = useProjectCollection('clients')

const { data: featuredWork } = await useAsyncData(
  () => `home-work-${workCollection.value}`,
  () =>
    queryCollection(workCollection.value)
      .where('featured', '=', true)
      .order('order', 'ASC')
      .all(),
  { watch: [workCollection] },
)

const { data: featuredClients } = await useAsyncData(
  () => `home-clients-${clientsCollection.value}`,
  () =>
    queryCollection(clientsCollection.value)
      .where('featured', '=', true)
      .order('order', 'ASC')
      .all(),
  { watch: [clientsCollection] },
)

const strategicPartner = computed(
  () => featuredClients.value?.find((p) => p.strategic === true) ?? null,
)
const regularClients = computed(() =>
  (featuredClients.value ?? []).filter((p) => !p.strategic),
)

const team = [
  { name: 'Barbara', role: 'Placeholder', image: '/team/barbara.svg' },
  { name: 'William', role: 'Placeholder', image: '/team/william.svg' },
  { name: 'Cristiano', role: 'Placeholder', image: '/team/cristiano.svg' },
  { name: 'Alessandro', role: 'Placeholder', image: '/team/alessandro.svg' },
  { name: 'Vitantonio', role: 'Placeholder', image: '/team/vitantonio.svg' },
]

const teamTestimonials = team.map((m) => ({
  name: m.name,
  designation: m.role,
  image: m.image,
  quote: 'Placeholder.',
}))

useSeoMeta({
  title: 'Didap',
  description: t('home.intro'),
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-ink/10">
      <div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-24 md:py-32">
        <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
          {{ t('home.kicker') }}
        </p>
        <h1 class="font-display text-5xl leading-[0.95] md:text-7xl">
          {{ t('home.title') }}
        </h1>
        <p class="max-w-2xl text-lg text-ink-soft">
          {{ t('home.intro') }}
        </p>
        <div class="flex flex-wrap gap-3 pt-2">
          <NuxtLink
            :to="localePath('/work')"
            class="rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-widest text-paper transition hover:bg-accent"
          >
            {{ t('home.cta_work') }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('/contact')"
            class="rounded-full border border-ink/30 px-6 py-3 text-sm uppercase tracking-widest transition hover:border-accent hover:text-accent"
          >
            {{ t('home.cta_contact') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Products (was 'Our work') -->
    <section
      v-if="featuredWork?.length"
      class="border-b border-ink/10"
    >
      <div class="mx-auto max-w-6xl px-6 pt-20">
        <div class="mb-10 flex items-end justify-between">
          <h2 class="font-display text-3xl md:text-4xl">
            {{ t('home.work_heading') }}
          </h2>
          <NuxtLink
            :to="localePath('/work')"
            class="text-sm uppercase tracking-widest hover:text-accent"
          >
            {{ t('home.see_all') }} →
          </NuxtLink>
        </div>
      </div>
      <div class="marquee pb-20">
        <div class="marquee__track">
          <div
            v-for="p in featuredWork"
            :key="p.path"
            class="mr-8 w-[80vw] max-w-[340px] flex-none md:w-[340px]"
          >
            <ProjectCard
              :to="localePath(`/work/${p.stem.split('/').pop()}`)"
              :title="p.title"
              :summary="p.summary"
              :cover="p.cover"
              :role="p.role"
              :year="p.year"
              :tags="p.tags"
            />
          </div>
          <div
            v-for="p in featuredWork"
            :key="`d-${p.path}`"
            class="marquee__duplicate mr-8 w-[80vw] max-w-[340px] flex-none md:w-[340px]"
            aria-hidden="true"
          >
            <ProjectCard
              :to="localePath(`/work/${p.stem.split('/').pop()}`)"
              :title="p.title"
              :summary="p.summary"
              :cover="p.cover"
              :role="p.role"
              :year="p.year"
              :tags="p.tags"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Partners (was 'Our clients') -->
    <section
      v-if="featuredClients?.length"
      class="border-b border-ink/10"
    >
      <div class="mx-auto max-w-6xl px-6 pt-20">
        <div class="mb-10 flex items-end justify-between">
          <h2 class="font-display text-3xl md:text-4xl">
            {{ t('home.clients_heading') }}
          </h2>
          <NuxtLink
            :to="localePath('/clients')"
            class="text-sm uppercase tracking-widest hover:text-accent"
          >
            {{ t('home.see_all') }} →
          </NuxtLink>
        </div>
      </div>

      <div class="mx-auto max-w-6xl px-6 pb-20">
        <div
          class="grid gap-8"
          :class="strategicPartner ? 'lg:grid-cols-[1fr_320px]' : ''"
        >
          <!-- Strategic partner: top on mobile, right on desktop -->
          <aside
            v-if="strategicPartner"
            class="-order-1 space-y-2 lg:order-last"
          >
            <p class="text-[11px] font-semibold uppercase tracking-widest text-finance">
              {{ t('clients.strategic_partner') }}
            </p>
            <div
              class="rounded-xl ring-2 ring-finance/40 ring-offset-4 ring-offset-paper transition hover:ring-finance/70"
            >
              <ProjectCard
                :to="
                  localePath(
                    `/clients/${strategicPartner.stem.split('/').pop()}`,
                  )
                "
                :title="strategicPartner.title"
                :summary="strategicPartner.summary"
                :cover="strategicPartner.cover"
                :role="strategicPartner.role"
                :tags="strategicPartner.tags"
              />
            </div>
          </aside>

          <!-- Regular partners marquee (excludes strategic) -->
          <div class="marquee min-w-0 overflow-hidden">
            <div class="marquee__track">
              <div
                v-for="p in regularClients"
                :key="p.path"
                class="mr-6 w-[80vw] max-w-[300px] flex-none md:w-[300px]"
              >
                <ProjectCard
                  :to="localePath(`/clients/${p.stem.split('/').pop()}`)"
                  :title="p.title"
                  :summary="p.summary"
                  :cover="p.cover"
                  :role="p.role"
                  :tags="p.tags"
                />
              </div>
              <div
                v-for="p in regularClients"
                :key="`d-${p.path}`"
                class="marquee__duplicate mr-6 w-[80vw] max-w-[300px] flex-none md:w-[300px]"
                aria-hidden="true"
              >
                <ProjectCard
                  :to="localePath(`/clients/${p.stem.split('/').pop()}`)"
                  :title="p.title"
                  :summary="p.summary"
                  :cover="p.cover"
                  :role="p.role"
                  :tags="p.tags"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section v-if="team.length">
      <div class="mx-auto max-w-6xl px-6 pt-20">
        <header class="mb-10 max-w-2xl space-y-4">
          <p class="text-xs uppercase tracking-[0.3em] text-ink-soft">
            {{ t('home.team_kicker') }}
          </p>
          <h2 class="font-display text-3xl md:text-4xl">
            {{ t('home.team_heading') }}
          </h2>
          <p class="text-lg text-ink-soft">{{ t('home.team_intro') }}</p>
        </header>
      </div>

      <!-- Desktop / tablet: expandable gallery -->
      <div class="mx-auto hidden max-w-6xl px-6 pb-20 md:block">
        <ExpandableGallery :members="team" />
      </div>

      <!-- Mobile: animated testimonials -->
      <div class="pb-20 md:hidden">
        <ClientOnly>
          <AnimatedTestimonials
            :testimonials="teamTestimonials"
            :autoplay="true"
            :duration="6000"
          />
        </ClientOnly>
      </div>
    </section>
  </div>
</template>
