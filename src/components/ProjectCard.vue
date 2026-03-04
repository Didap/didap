<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  category: string
  year: number
  image: string
  description: string
  techStack: readonly string[]
}>()

const formatCategory = computed(() => {
  return props.category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})
</script>

<template>
  <div
    class="group relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-[0.8s] ease-out will-change-transform"
  >
    <!-- Background Image with Zoom Effect -->
    <div class="absolute inset-0 z-0">
      <div v-if="!image" class="w-full h-full bg-slate-200"></div>
      <img
        v-else
        :src="image"
        :alt="name"
        class="w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110 group-hover:brightness-[1.1]"
        loading="lazy"
      />
    </div>

    <!-- Gradient Overlay that darkens slightly on hover to make text pop -->
    <div
      class="absolute inset-0 z-10 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-500 ease-in-out"
    ></div>

    <!-- Content Area (Bottom Aligned) -->
    <div class="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-10 text-white">
      <!-- Top Badges (Translate down initially, slide up on hover) -->
      <div
        class="flex flex-wrap items-center gap-3 mb-4 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out"
      >
        <span
          class="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[0.6rem] font-bold uppercase tracking-widest"
        >
          {{ year }}
        </span>
        <span
          class="px-3 py-1 rounded-full bg-orange-500/20 backdrop-blur-md border border-orange-500/30 text-orange-300 text-[0.6rem] font-bold uppercase tracking-widest"
        >
          {{ formatCategory }}
        </span>
      </div>

      <!-- Title & Description Container -->
      <div class="transform transition-transform duration-500 ease-out group-hover:-translate-y-2">
        <h3 class="text-3xl md:text-4xl font-heading font-black tracking-tight mb-3 drop-shadow-md">
          {{ name }}
        </h3>
        <p
          class="text-sm text-slate-200/80 font-medium leading-relaxed line-clamp-2 md:line-clamp-3 max-w-[90%] drop-shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100"
        >
          {{ description }}
        </p>

        <!-- Tech Stack (Shows on hover) -->
        <div
          class="flex flex-wrap gap-2 mt-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-150"
        >
          <span
            v-for="tech in techStack.slice(0, 4)"
            :key="tech"
            class="text-[0.6rem] font-bold uppercase tracking-widest text-slate-300"
          >
            #{{ tech }}
          </span>
          <span
            v-if="techStack.length > 4"
            class="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400"
          >
            +{{ techStack.length - 4 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Hover Indicator Arrow -->
    <div
      class="absolute top-8 right-8 z-30 w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-5 h-5 text-white -rotate-45"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </div>
  </div>
</template>
