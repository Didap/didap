<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import gsap from 'gsap'
import BoosterPack from '../components/BoosterPack.vue'
import PremiumCard from '../components/PremiumCard.vue'
import { resolveMediaUrl, STRAPI_URL } from '../utils/media'

interface Ability {
  name: string
  description: string
}

type ProjectCategory = 'sviluppo_web' | 'app_ai' | 'app' | 'branding'
type ProjectRarity = 'ultra' | 'rare' | 'common'
type ProjectType = 'electric' | 'steel' | 'grass' | 'water'

interface Project {
  id: number
  name: string
  category: ProjectCategory
  year: number
  month: number
  rarity: ProjectRarity
  type: ProjectType
  level: string
  link?: string
  image: string
  description: string
  techStack: string[]
  abilities: Ability[]
}

const projects = ref<Project[]>([])
const isLoading = ref(true)
const viewStatus = ref<'selection' | 'opening' | 'grid'>('selection')
const selectedCategory = ref<ProjectCategory | 'all'>('all')

// Predefined colors for categories
const packColors = ['#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981']

const categoryPacks = computed(() => {
  const categories = [...new Set(projects.value.map((p) => p.category))]
  return categories.map((cat, index) => {
    let label = 'Progetti'
    if (cat === 'sviluppo_web') label = 'Web & E-commerce'
    if (cat === 'app_ai' || cat === 'app') label = 'Applicazioni'
    if (cat === 'branding') label = 'Identità Visiva'

    return {
      id: cat,
      label: label,
      color: packColors[index % packColors.length],
    }
  })
})

const fetchProjects = async () => {
  try {
    isLoading.value = true
    const res = await fetch(`${STRAPI_URL}/api/projects?populate=*`)
    if (!res.ok) throw new Error('Network response was not ok')
    const data = await res.json()

    const mapCategory = (cat: string): ProjectCategory => {
      const lower = cat?.toLowerCase() || ''
      if (lower.includes('web')) return 'sviluppo_web'
      if (lower.includes('app') || lower.includes('ai')) return 'app_ai'
      if (lower.includes('brand')) return 'branding'
      return 'sviluppo_web'
    }

    interface ProjectAttributes {
      name: string
      category: string
      year: number
      month: number
      rarity?: ProjectRarity
      element_type?: ProjectType
      level_text?: string
      link?: string
      description: string
      tech_stack?: string[]
      abilities?: Ability[]
      stacks?: any
      image?: {
        data?: {
          attributes: {
            url: string
          }
        }
        url?: string
      }
    }

    interface StrapiProject {
      id: number
      attributes?: ProjectAttributes
      name?: string
      category?: string
      year?: number
      month?: number
      rarity?: ProjectRarity
      element_type?: ProjectType
      level_text?: string
      link?: string
      description?: string
      tech_stack?: string[]
      abilities?: Ability[]
      image?: {
        data?: {
          attributes: {
            url: string
          }
        }
        url?: string
      }
    }

    projects.value = data.data.map((item: StrapiProject) => {
      // Handle both flattened and nested Strapi responses
      const attrs = (item.attributes || item) as ProjectAttributes
      return {
        id: item.id,
        name: attrs.name,
        category: mapCategory(attrs.category),
        year: attrs.year,
        month: attrs.month,
        rarity: attrs.rarity || 'common',
        type: attrs.element_type || 'electric',
        level: attrs.level_text || '',
        link: attrs.link,
        description: attrs.description,
        techStack:
          attrs.stacks?.map?.((s: any) => s.name || s.attributes?.name) ||
          attrs.stacks?.data?.map?.((s: any) => s.attributes?.name) ||
          [],
        abilities: attrs.abilities || [],
        image: resolveMediaUrl(
          attrs.image?.data?.attributes?.url || attrs.image?.url,
          ''
        ),
      }
    })
  } catch (err) {
    console.error('Failed to fetch projects', err)
  } finally {
    isLoading.value = false
  }
}

const filteredProjects = computed(() => {
  if (selectedCategory.value === 'all') return projects.value
  return projects.value.filter((p) => p.category === selectedCategory.value)
})

const handlePackOpen = (category: ProjectCategory) => {
  selectedCategory.value = category
  viewStatus.value = 'opening'

  // Opening state lasts for the animation duration
  setTimeout(() => {
    viewStatus.value = 'grid'
    nextTick(() => {
      animateGridReveal()
    })
  }, 1800)
}

const resetView = () => {
  viewStatus.value = 'selection'
}

const animateGridReveal = () => {
  const gridHeader = document.querySelector('.grid-header')
  if (gridHeader) {
    gsap.fromTo(
      gridHeader,
      { y: -30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
    )
  }

  const projectGridItems = document.querySelectorAll('.project-grid-item')
  if (projectGridItems.length) {
    gsap.fromTo(
      projectGridItems,
      { y: 60, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.2,
        stagger: 0.1,
        ease: 'power4.out',
        clearProps: 'transform',
      },
    )
  }
}

onMounted(() => {
  fetchProjects()
  const headerElements = document.querySelectorAll('.header-element')
  if (headerElements.length) {
    gsap.from(headerElements, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out',
    })
  }
})
</script>

<template>
  <div
    class="min-h-screen bg-[#FDFDFD] relative overflow-hidden font-body text-slate-900 selection:bg-orange-500 selection:text-white">
    <!-- Background Glow -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[400px] bg-orange-200/15 blur-[120px] rounded-full pointer-events-none z-0">
    </div>

    <div class="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-28 md:pt-40 pb-24 min-h-screen">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
        <div class="w-10 h-10 rounded-full border-2 border-slate-100 border-t-orange-500 animate-spin mb-6"></div>
        <span class="text-[0.7rem] font-bold uppercase tracking-[0.4em] text-slate-400">Caricamento Universo
          Didap...</span>
      </div>

      <template v-else>
        <!-- SELECTION VIEW -->
        <div v-if="viewStatus === 'selection'" class="flex flex-col items-center">
          <div class="text-center mb-24 header-element">
            <span class="text-[0.7rem] font-bold text-orange-500 uppercase tracking-[0.4em] mb-6 block font-heading">Portfolio</span>
            <h1 class="text-6xl md:text-8xl font-heading font-black tracking-[-0.04em] mb-8 leading-[0.9]">
              I Nostri <span class="font-display italic text-slate-400">Progetti</span>
            </h1>
            <p class="text-slate-500 text-lg md:text-xl max-w-2xl font-medium leading-relaxed mx-auto">
              Scegli una categoria per sbloccare tutti i nostri lavori in quel settore.
            </p>
          </div>

          <div class="flex flex-wrap justify-center gap-8 md:gap-16">
            <div v-for="pack in categoryPacks" :key="pack.id" class="flex flex-col items-center">
              <BoosterPack :packName="pack.label" :themeColor="pack.color"
                @open="handlePackOpen(pack.id as ProjectCategory)" />
              <p class="mt-8 text-[0.6rem] font-black uppercase tracking-[0.3em] text-slate-400 font-heading">
                Sblocca {{ pack.label }}
              </p>
            </div>
          </div>
        </div>

        <!-- OPENING VIEW -->
        <div v-if="viewStatus === 'opening'" class="flex items-center justify-center py-40 min-h-[60vh]">
          <div class="text-center animate-bounce">
            <p class="text-[0.8rem] font-black uppercase tracking-[0.5em] text-orange-500">
              Apertura Universo...
            </p>
          </div>
        </div>

        <!-- GRID VIEW -->
        <div v-if="viewStatus === 'grid'" class="flex flex-col items-center">
          <div class="grid-header w-full flex justify-between items-center mb-16 px-4">
            <button @click="resetView"
              class="group flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-orange-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Altre Categorie
            </button>

            <div class="text-right">
              <span class="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[0.4em] mb-1">Categoria
                Sbloccata</span>
              <h2 class="text-2xl font-heading font-black tracking-tight uppercase">
                {{categoryPacks.find((p) => p.id === selectedCategory)?.label}}
              </h2>
            </div>
          </div>

          <div v-if="filteredProjects.length === 0"
            class="flex flex-col items-center justify-center py-20 min-h-[40vh] text-slate-400">
            <p class="text-sm font-medium">Nessun progetto trovato per questa categoria.</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 w-full">
            <div v-for="project in filteredProjects" :key="project.id"
              class="project-grid-item opacity-0 flex justify-center">
              <PremiumCard :name="project.name" :year="project.year" :month="project.month" :rarity="project.rarity"
                :type="project.type" :image="project.image" :link="project.link" :description="project.description"
                :techStack="project.techStack" :abilities="project.abilities" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
</style>
