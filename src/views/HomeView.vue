<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PremiumCard from '../components/PremiumCard.vue'

gsap.registerPlugin(ScrollTrigger)

const exploreCollection = () => {
  window.location.href = '/collection'
}

const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

interface Ability {
  name: string
  description: string
}

interface Project {
  title: string
  category: string
  link?: string
  image: string
  description: string
  year: number | string
  month: number
  rarity: 'common' | 'rare' | 'ultra'
  type: 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'dark' | 'steel' | 'dragon'
  abilities: Ability[]
}

const featuredProjects = ref<Project[]>([])

const fetchFeaturedProjects = async () => {
  try {
    const res = await fetch(
      'http://localhost:1337/api/projects?populate=*&pagination[limit]=3&sort=rarity:desc',
    )
    const data = await res.json()

    interface StrapiProject {
      name: string
      attributes?: {
        name: string
        category: string
        link?: string
        description: string
        year: number | string
        month?: number
        rarity?: 'common' | 'rare' | 'ultra'
        element_type?:
          | 'fire'
          | 'water'
          | 'grass'
          | 'electric'
          | 'psychic'
          | 'dark'
          | 'steel'
          | 'dragon'
        abilities?: Ability[]
        image?: {
          data?: {
            attributes: {
              url: string
            }
          }
        }
      }
      category: string
      link?: string
      description: string
      year: number | string
      month?: number
      rarity?: 'common' | 'rare' | 'ultra'
      element_type?:
        | 'fire'
        | 'water'
        | 'grass'
        | 'electric'
        | 'psychic'
        | 'dark'
        | 'steel'
        | 'dragon'
      abilities?: Ability[]
      image?: {
        url: string
      }
    }

    if (data.data) {
      featuredProjects.value = data.data.map((item: StrapiProject) => ({
        title: item.name || item.attributes?.name,
        category: item.category || item.attributes?.category,
        image: item.image?.url
          ? `http://localhost:1337${item.image.url}`
          : item.attributes?.image?.data?.attributes?.url
            ? `http://localhost:1337${item.attributes.image.data.attributes.url}`
            : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
        link: item.link || item.attributes?.link,
        description: item.description || item.attributes?.description,
        year: (item.year || item.attributes?.year || '2024').toString(),
        month: item.month || item.attributes?.month || 1,
        rarity: item.rarity || item.attributes?.rarity || 'ultra',
        type: item.element_type || item.attributes?.element_type || 'electric',
        abilities: item.abilities || item.attributes?.abilities || [],
      }))
    }
  } catch (err) {
    console.error('Failed to fetch featured projects', err)
  }
}

const skills = [
  'Vue 3',
  'TypeScript',
  'Node.js',
  'Strapi CMS',
  'GSAP Animation',
  'Tailwind CSS',
  'PostgreSQL',
  'UI/UX Design',
  'Cloud Deployment',
]

// --- GSAP Animations ---
onMounted(() => {
  fetchFeaturedProjects()

  const heroTl = gsap.timeline({ delay: 0.6 })

  // Staggered floating elements appearance
  gsap.from('.floating-element', {
    y: 40,
    opacity: 0,
    duration: 1.2,
    stagger: 0.15,
    ease: 'power3.out',
    delay: 0.6,
  })
  heroTl
    .from(
      '.hero-badge',
      {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      },
      0,
    )
    .from(
      '.hero-title',
      {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
      },
      0.2,
    )
    .from(
      '.hero-desc',
      {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      },
      0.4,
    )
    .from(
      '.hero-btns',
      {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      },
      0.6,
    )

  gsap.from('.projects-header', {
    scrollTrigger: {
      trigger: '#projects',
      start: 'top 80%',
    },
    y: 40,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
  })
})
</script>

<template>
  <div
    class="min-h-screen bg-white font-body selection:bg-orange-500 selection:text-white overflow-x-hidden pt-20"
  >
    <!-- ===== HERO SECTION ===== -->
    <section
      id="home"
      class="relative pt-32 pb-32 px-6 md:px-16 overflow-hidden min-h-[90vh] flex items-center"
    >
      <!-- Glow background -->
      <div
        class="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-orange-100/40 blur-[120px] rounded-full -z-10 animate-glow"
      ></div>
      <div
        class="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-blue-50/30 blur-[100px] rounded-full -z-10"
      ></div>

      <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <!-- Left Column: Content -->
        <div class="relative z-10 text-left pt-10 md:pt-0">
          <h1
            class="hero-title text-6xl md:text-8xl font-heading font-black tracking-tighter text-slate-900 leading-[0.9] mb-8"
          >
            Sviluppiamo <br />
            <span class="font-display italic text-slate-400">Idee Vincenti.</span>
          </h1>

          <p
            class="hero-desc text-slate-500 text-lg md:text-xl font-medium leading-relaxed mb-12 max-w-xl"
          >
            Siamo un'agenzia creativa specializzata in Web, App e Brand Identity. Trasformiamo la
            visione del tuo business in un'esperienza digitale indimenticabile.
          </p>

          <div class="hero-btns flex flex-wrap gap-6 mb-16 md:mb-0">
            <button
              @click="scrollToSection('projects')"
              class="px-10 py-5 bg-orange-500 text-white rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/40 hover:bg-orange-600 hover:-translate-y-1 transition-all duration-300"
            >
              Guarda i Lavori
            </button>
            <button
              @click="scrollToSection('skills')"
              class="px-10 py-5 bg-white border border-slate-200 text-slate-900 rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-sm hover:border-slate-400 hover:-translate-y-1 transition-all duration-300"
            >
              Scopri di Più
            </button>
          </div>
        </div>

        <!-- Right Column: Minimal Floating Stats & Logo -->
        <div
          class="hero-visual relative flex items-center justify-center w-full h-[400px] md:h-[500px]"
        >
          <!-- Central Logo (No Background) -->
          <div
            class="absolute inset-0 m-auto w-40 h-40 md:w-56 md:h-56 flex items-center justify-center z-20 floating-element"
          >
            <img
              src="../assets/logo (1).png"
              alt="Didap Logo"
              class="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>

          <!-- Top Left Stat -->
          <div
            class="absolute top-10 left-4 md:left-12 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.05)] z-10 floating-element hover:-translate-y-2 transition-transform duration-300"
          >
            <div
              class="text-4xl md:text-5xl font-black font-heading text-slate-900 tracking-tighter"
            >
              50<span class="text-orange-500">+</span>
            </div>
            <div
              class="text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2 leading-tight"
            >
              Progetti <br />
              Completati
            </div>
          </div>

          <!-- Bottom Right Stat -->
          <div
            class="absolute bottom-10 right-4 md:right-12 bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.2)] z-30 floating-element hover:-translate-y-2 transition-transform duration-300"
          >
            <div class="text-4xl md:text-5xl font-black font-heading text-white tracking-tighter">
              100<span class="text-orange-500">%</span>
            </div>
            <div
              class="text-[0.6rem] md:text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2 leading-tight"
            >
              Clienti <br />
              Felici
            </div>
          </div>

          <!-- Middle Left Stat -->
          <div
            class="absolute bottom-32 left-0 md:left-8 bg-orange-50 rounded-3xl p-5 md:p-6 shadow-[0_15px_30px_-5px_rgba(249,115,22,0.1)] z-10 floating-element hover:-translate-y-2 transition-transform duration-300"
          >
            <div class="text-3xl font-black font-heading text-orange-600 tracking-tighter">
              5<span class="text-orange-500">+</span>
            </div>
            <div
              class="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-orange-900/50 mt-1 leading-tight"
            >
              Anni di <br />
              Esperienza
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== PROJECTS SECTION ===== -->
    <section
      id="projects"
      class="relative z-10 px-6 md:px-16 py-32 bg-slate-50/50 rounded-[4rem] mx-4"
    >
      <div class="max-w-7xl mx-auto">
        <div
          class="projects-header flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6"
        >
          <div class="max-w-2xl text-left">
            <span
              class="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[0.4em] mb-4 block font-heading"
              >Progetti Evidenziati</span
            >
            <h2
              class="text-4xl md:text-6xl font-heading font-black tracking-tighter text-slate-900"
            >
              Lavori che fanno<br />
              <span class="font-display italic text-slate-400">la differenza.</span>
            </h2>
          </div>
          <button
            @click="exploreCollection"
            class="group flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-orange-500 transition-colors"
          >
            Vedi tutti
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

        <!-- Featured Projects Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 justify-items-center">
          <div
            v-for="(project, index) in featuredProjects"
            :key="index"
            class="featured-project-card group flex justify-center"
          >
            <PremiumCard
              :name="project.title"
              :year="parseInt(project.year.toString()) || 2024"
              :month="project.month"
              :rarity="project.rarity"
              :type="project.type"
              :image="project.image"
              :link="project.link"
              :description="project.description"
              :abilities="project.abilities"
              :techStack="['Vue 3', 'GSAP', 'Tailwind']"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ===== SKILLS SECTION ===== -->
    <section id="skills" class="relative z-10 px-6 md:px-16 py-32 border-t border-slate-100">
      <div class="max-w-5xl mx-auto flex flex-col items-center">
        <div class="skills-header text-center mb-16">
          <span
            class="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[0.4em] mb-4 block font-heading"
            >Il nostro toolkit</span
          >
          <h2 class="text-3xl md:text-5xl font-heading font-black tracking-tighter text-slate-900">
            Tecnologie <span class="font-display italic text-slate-400">&</span> Competenze
          </h2>
        </div>
        <div class="flex flex-wrap justify-center gap-3 max-w-3xl">
          <div
            v-for="skill in skills"
            :key="skill"
            class="skill-pill px-5 py-2.5 glass border border-slate-200/60 rounded-full shadow-sm text-sm font-heading font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:shadow-md hover:shadow-orange-500/5 transition-all duration-300 cursor-default"
          >
            {{ skill }}
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER SECTION ===== -->
    <section id="contacts" class="px-6 md:px-16 py-32 bg-slate-900 rounded-t-[4rem] text-white">
      <div class="max-w-7xl mx-auto text-center">
        <h2 class="text-4xl md:text-7xl font-heading font-black tracking-tighter mb-12">
          Hai un'idea? <br />
          <span class="text-orange-500 font-display italic">Realizziamola.</span>
        </h2>

        <div
          class="flex flex-col md:flex-row items-center justify-center gap-12 mb-20 font-heading"
        >
          <div class="flex flex-col items-center">
            <span class="text-[0.6rem] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2"
              >Scrivici</span
            >
            <a
              href="mailto:info@didap.it"
              class="text-xl md:text-2xl font-bold hover:text-orange-500 transition-colors"
              >info@didap.it</a
            >
          </div>
          <div class="flex flex-col items-center">
            <span class="text-[0.6rem] font-bold uppercase tracking-[0.4em] text-slate-400 mb-2"
              >Chiamaci</span
            >
            <a
              href="tel:+3912345678"
              class="text-xl md:text-2xl font-bold hover:text-orange-500 transition-colors"
              >+39 123 456 78</a
            >
          </div>
        </div>

        <div
          class="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[0.6rem] font-bold uppercase tracking-widest font-heading"
        >
          <div class="text-slate-500">© 2026 DIDAP Digital Agency — Crafted with passion</div>
          <div class="flex gap-8">
            <a
              v-for="s in ['Instagram', 'LinkedIn', 'Facebook']"
              :key="s"
              href="#"
              class="text-slate-400 hover:text-white transition-colors"
              >{{ s }}</a
            >
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.text-gradient-orange {
  background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 3.5rem;
    line-height: 1;
  }
}
</style>
