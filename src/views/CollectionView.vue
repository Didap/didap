<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import BoosterPack from '../components/BoosterPack.vue'
import PremiumCard from '../components/PremiumCard.vue'

const router = useRouter()

interface Ability {
  name: string
  description: string
}

type ProjectCategory = 'web' | 'app' | 'branding'
type ProjectRarity = 'ultra' | 'rare' | 'common'
type ProjectType = 'electric' | 'steel' | 'grass' | 'water'

interface Project {
  name: string
  category: ProjectCategory
  year: number
  month: string
  rarity: ProjectRarity
  type: ProjectType
  level: string
  image: string
  description: string
  techStack: string[]
  abilities: Ability[]
}

const categories = [
  { id: 'web', name: 'Pack Sviluppo Web', color: '#f59e0b', isDark: false },
  { id: 'app', name: 'Pack App & AI', color: '#6366f1', isDark: true },
  { id: 'branding', name: 'Pack Identità', color: '#ec4899', isDark: false },
] as const

const projects: Project[] = [
  {
    name: 'Tonus Tech',
    category: 'app',
    year: 2024,
    month: '03',
    rarity: 'ultra',
    type: 'electric',
    level: 'VMAX VERSION',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    description: "L'AI incontra il fitness wearable per massimizzare ogni allenamento.",
    techStack: ['Vue 3', 'FastAPI', 'TensorFlow'],
    abilities: [
      { name: 'AI Optimization', description: 'Analisi in tempo reale della forma fisica.' },
      { name: 'Bio-Sync', description: 'Sincronizzazione immediata con i parametri vitali.' },
    ],
  },
  {
    name: 'Coltivatori di Emozioni',
    category: 'web',
    year: 2023,
    month: '11',
    rarity: 'rare',
    type: 'grass',
    level: 'STAGE 2',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
    description: 'Salvaguardia del patrimonio agricolo attraverso il social farming.',
    techStack: ['Angular', 'NodeJS', 'MongoDB'],
    abilities: [
      { name: 'Adotta un Campo', description: 'Supporto diretto agli agricoltori locali.' },
      { name: 'Terra-Link', description: 'Tracciabilità completa della filiera.' },
    ],
  },
  {
    name: 'Yacht In Puglia',
    category: 'branding',
    year: 2024,
    month: '01',
    rarity: 'common',
    type: 'water',
    level: 'BASIC',
    image:
      'https://images.unsplash.com/photo-1567891245344-7cdec0098fcc?auto=format&fit=crop&q=80&w=800',
    description: 'Luxury yacht charter management con sistema di booking avanzato.',
    techStack: ['React', 'PostgreSQL', 'Stripe'],
    abilities: [{ name: 'Blue Booking', description: 'Prenotazione immediata in pochi click.' }],
  },
]

const selectedCategory = ref<string | null>(null)
const step = ref<'selection' | 'opening' | 'reveal'>('selection')
const revealCards = ref<Project[]>([])
const currentRevealIndex = ref(0)
const isRevealing = ref(false)

const currentPackData = computed(() => categories.find((c) => c.id === selectedCategory.value))

const currentCard = computed(() => {
  if (currentRevealIndex.value < revealCards.value.length) {
    return revealCards.value[currentRevealIndex.value]
  }
  return null
})

const selectPack = (id: string) => {
  selectedCategory.value = id
  step.value = 'opening'
}

const handlePackOpened = () => {
  const categoryProjects = projects.filter((p) => p.category === selectedCategory.value)
  const otherProjects = projects.filter((p) => p.category !== selectedCategory.value)

  revealCards.value = [
    ...otherProjects.slice(0, 2),
    categoryProjects[0] || projects[0],
  ] as Project[]
  currentRevealIndex.value = 0
  step.value = 'reveal'
}

const reset = () => {
  step.value = 'selection'
  selectedCategory.value = null
  revealCards.value = []
  currentRevealIndex.value = 0
}

// GSAP Animations
const animateSelectionEntrance = () => {
  gsap.from('.pack-container', {
    y: 100,
    opacity: 0,
    duration: 1,
    stagger: 0.15,
    ease: 'power4.out',
  })
}

const animateRevealEntrance = () => {
  gsap.fromTo(
    '.active-reveal-card',
    {
      scale: 0.5,
      opacity: 0,
      y: 100,
      rotationY: 90,
    },
    {
      scale: 1,
      opacity: 1,
      y: 0,
      rotationY: 0,
      duration: 0.8,
      ease: 'back.out(1.5)',
    },
  )
}

const nextCard = () => {
  if (isRevealing.value) return
  isRevealing.value = true

  gsap.to('.active-reveal-card', {
    x: -300,
    y: 50,
    opacity: 0,
    rotation: -15,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: () => {
      currentRevealIndex.value++

      if (currentRevealIndex.value < revealCards.value.length) {
        nextTick(() => {
          gsap.fromTo(
            '.active-reveal-card',
            { x: 300, y: 50, opacity: 0, rotation: 15, scale: 0.9 },
            {
              x: 0,
              y: 0,
              opacity: 1,
              rotation: 0,
              scale: 1,
              duration: 0.5,
              ease: 'back.out(1.2)',
              onComplete: () => {
                isRevealing.value = false
              },
            },
          )
        })
      } else {
        isRevealing.value = false
        nextTick(() => {
          gsap.fromTo(
            '.recap-card',
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.15, duration: 0.6, ease: 'back.out(1.2)' },
          )
        })
      }
    },
  })
}

onMounted(() => {
  animateSelectionEntrance()
})

watch(step, async (newStep) => {
  await nextTick()
  if (newStep === 'selection') {
    animateSelectionEntrance()
  } else if (newStep === 'reveal') {
    animateRevealEntrance()
  }
})
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900 selection:bg-orange-500 selection:text-white"
  >
    <!-- Decorative Ambient Glows -->
    <div
      class="fixed top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-200/40 blur-[150px] rounded-full pointer-events-none mix-blend-multiply"
    ></div>
    <div
      class="fixed bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-orange-200/40 blur-[150px] rounded-full pointer-events-none mix-blend-multiply"
    ></div>

    <div class="relative z-10 max-w-7xl mx-auto px-6 py-12">
      <!-- Header -->
      <div class="flex justify-between items-center mb-16">
        <div>
          <button
            @click="router.push('/')"
            class="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-widest mb-4 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Torna alla Home
          </button>
          <h1 class="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">
            Didap <span class="text-orange-500">Store</span>
          </h1>
        </div>

        <div v-if="step !== 'selection'">
          <button
            @click="reset"
            class="px-6 py-3 glass border border-slate-200 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-100/50 transition-all shadow-sm active:scale-95 text-slate-700 hover:border-slate-300 hover:text-slate-900"
          >
            Cambia Pack
          </button>
        </div>
      </div>

      <!-- 1. Selection Step -->
      <div v-if="step === 'selection'" class="flex flex-col items-center">
        <div class="text-center mb-16">
          <p class="text-orange-400 font-bold uppercase tracking-[0.3em] text-[0.65rem] mb-2">
            Colleziona l'eccellenza
          </p>
          <h2 class="text-4xl font-black text-slate-900">Scegli un Booster Pack</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl px-4">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="pack-container flex flex-col items-center group cursor-pointer"
            @click="selectPack(cat.id)"
          >
            <BoosterPack :pack-name="cat.name" :theme-color="cat.color" :is-dark="cat.isDark" />
            <div class="mt-8 text-center transition-transform group-hover:translate-y-2">
              <span
                class="inline-block px-3 py-1 rounded-lg glass border border-slate-200 shadow-sm text-[0.6rem] font-black uppercase tracking-widest text-slate-500 mb-3"
                >Premium Edition</span
              >
              <h3
                class="text-2xl font-black text-slate-900 group-hover:text-orange-600 transition-colors drop-shadow-sm"
              >
                {{ cat.name }}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Opening Step -->
      <div
        v-else-if="step === 'opening'"
        class="flex flex-col items-center justify-center min-h-[60vh]"
      >
        <div class="relative scale-110 md:scale-125">
          <BoosterPack
            v-if="currentPackData"
            :pack-name="currentPackData.name"
            :theme-color="currentPackData.color"
            :is-dark="currentPackData.isDark"
            @open="handlePackOpened"
          />
        </div>
        <p
          class="mt-16 text-slate-500 font-black uppercase tracking-[0.4em] text-[0.7rem] animate-pulse"
        >
          Trascina per aprire il pack
        </p>
      </div>

      <!-- 3. Reveal Step -->
      <div v-else-if="step === 'reveal'" class="flex flex-col items-center">
        <div class="text-center mb-16">
          <div
            class="inline-block px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[0.65rem] font-black uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
          >
            Pack Aperto con Successo
          </div>
          <h2 class="text-4xl md:text-5xl font-black text-slate-900">Le Tue Nuove Carte</h2>
        </div>

        <div class="flex relative justify-center items-center min-h-[600px] w-full px-4 pb-32">
          <!-- Active Card -->
          <div v-if="currentCard" class="active-reveal-card absolute z-10">
            <PremiumCard
              :name="currentCard.name"
              :year="currentCard.year"
              :month="currentCard.month"
              :rarity="currentCard.rarity"
              :type="currentCard.type"
              :image="currentCard.image"
              :level="currentCard.level || ''"
              :description="currentCard.description"
              :tech-stack="currentCard.techStack"
              :abilities="currentCard.abilities"
            />
          </div>

          <!-- Recap View -->
          <div v-else class="flex flex-col items-center w-full">
            <h3 class="text-xs font-black uppercase tracking-[0.4em] text-orange-500 mb-8 mt-8">
              Riepilogo Pack
            </h3>
            <div class="flex flex-wrap justify-center gap-4 md:gap-8 max-w-5xl">
              <div
                v-for="(card, i) in revealCards"
                :key="i"
                class="recap-card scale-75 md:scale-90 origin-top"
              >
                <PremiumCard
                  :name="card.name"
                  :year="card.year"
                  :month="card.month"
                  :rarity="card.rarity"
                  :type="card.type"
                  :image="card.image"
                  :level="card.level || ''"
                  :description="card.description"
                  :tech-stack="card.techStack"
                  :abilities="card.abilities"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="fixed bottom-8 z-50 flex flex-col items-center gap-4">
          <button
            v-if="currentRevealIndex < revealCards.length - 1"
            @click="nextCard"
            class="px-8 py-3 bg-orange-500 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl hover:bg-orange-600 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
          >
            Prossima Carta
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          <button
            v-else-if="currentRevealIndex === revealCards.length - 1"
            @click="nextCard"
            class="px-8 py-3 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
          >
            Termina Spacchettamento
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>

          <button
            v-else
            @click="reset"
            class="px-10 py-5 bg-slate-900 text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl hover:bg-orange-500 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-105 transition-all active:scale-95 flex items-center gap-4 animate-fade-in"
          >
            Apri un Altro Pack
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pack-container {
  perspective: 1000px;
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out backwards;
  animation-delay: 0.5s;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
