<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PremiumCard from '../components/PremiumCard.vue'
import ContactForm from '../components/ContactForm.vue'
import { resolveMediaUrl, STRAPI_URL } from '../utils/media'

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
  techStack: string[]
}

interface Stack {
  name: string
  logo: string | null
}

const featuredProjects = ref<Project[]>([])
const allStacks = ref<Stack[]>([])

const fetchFeaturedProjects = async () => {
  try {
    const res = await fetch(`${STRAPI_URL}/api/projects?populate=*&pagination[limit]=3&sort=rarity:desc`)
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
      stacks?: any
      image?: {
        url: string
      }
    }

    if (data.data) {
      featuredProjects.value = data.data.map((item: StrapiProject) => ({
        title: item.name || item.attributes?.name,
        category: item.category || item.attributes?.category,
        image: resolveMediaUrl(
          item.image?.url || item.attributes?.image?.data?.attributes?.url,
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800'
        ),
        link: item.link || item.attributes?.link,
        description: item.description || item.attributes?.description,
        year: (item.year || item.attributes?.year || '2024').toString(),
        month: item.month || item.attributes?.month || 1,
        rarity: item.rarity || item.attributes?.rarity || 'ultra',
        type: item.element_type || item.attributes?.element_type || 'electric',
        abilities: item.abilities || item.attributes?.abilities || [],
        techStack:
          item.stacks?.map?.((s: any) => s.name || s.attributes?.name) ||
          item.stacks?.data?.map?.((s: any) => s.attributes?.name) ||
          (item.attributes as any)?.stacks?.data?.map?.((s: any) => s.attributes?.name) ||
          [],
      }))
    }
  } catch (err) {
    console.error('Failed to fetch featured projects', err)
  }
}

const fetchAllStacks = async () => {
  try {
    const res = await fetch(`${STRAPI_URL}/api/stacks?populate=*`)
    const data = await res.json()

    if (data.data) {
      allStacks.value = data.data.map((item: any) => ({
        name: item.name || item.attributes?.name,
        logo: resolveMediaUrl(
          item.logo?.url || item.attributes?.logo?.data?.attributes?.url
        ) || null,
      }))
    }
  } catch (err) {
    console.error('Failed to fetch all stacks', err)
  }
}

const handleGlobalMouseMove = (e: MouseEvent) => {
  const xNormalized = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)
  const yNormalized = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)

  gsap.to('.parallax-logo', { x: xNormalized * 25, y: yNormalized * 25, ease: 'power2.out', duration: 0.6 })
  gsap.to('.parallax-stat-1', { x: xNormalized * -15, y: yNormalized * -20, ease: 'power2.out', duration: 0.6 })
  gsap.to('.parallax-stat-2', { x: xNormalized * -20, y: yNormalized * 15, ease: 'power2.out', duration: 0.6 })
  gsap.to('.parallax-stat-3', { x: xNormalized * 15, y: yNormalized * -15, ease: 'power2.out', duration: 0.6 })
}

// --- GSAP Animations ---
onMounted(() => {
  fetchFeaturedProjects()
  fetchAllStacks()
  window.addEventListener('mousemove', handleGlobalMouseMove)

  // 1. Entrance choreography (Hero)
  const heroTl = gsap.timeline({ delay: 0.2 })
  heroTl
    .from('.hero-badge', { y: 10, opacity: 0, duration: 0.8, ease: 'power3.out' })
    .from('.hero-title-main', { y: 60, opacity: 0, duration: 1.2, ease: 'power4.out' }, '-=0.6')
    .from('.hero-title-italic', { x: -40, opacity: 0, duration: 1.4, ease: 'power3.out' }, '-=1')
    .from('.hero-desc', { y: 20, opacity: 0, duration: 1, ease: 'power2.out' }, '-=1')
    .from('.hero-btns', { y: 10, opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.8')
    .from('.hero-visual', { scale: 0.95, opacity: 0, duration: 1.5, ease: 'expo.out' }, '-=1.2')

  // 2. Section Revelations (Subtle Parallax)
  const sections = gsap.utils.toArray('.reveal-section')
  sections.forEach((section: any) => {
    const header = section.querySelector('.section-header')
    const content = section.querySelector('.section-content')
    
    if (header) {
      gsap.from(header, {
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
        },
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      })
    }
    
    if (content) {
      gsap.from(content, {
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
        },
        y: 40,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.1
      })
    }
  })

  // 3. Stat Numbers
  const statNumbers = document.querySelectorAll('.stat-number')
  statNumbers.forEach((el) => {
    const target = parseFloat(el.getAttribute('data-target') || '0')
    gsap.to(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 95%',
      },
      innerHTML: target,
      duration: 3,
      ease: 'expo.out',
      snap: { innerHTML: 1 },
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove)
})
</script>

<template>
  <div class="page-wrapper min-h-screen bg-white font-body selection:bg-orange-500 selection:text-white overflow-x-hidden pt-20 snap-y snap-mandatory">
    <!-- ===== HERO SECTION ===== -->
    <section id="home"
      class="reveal-section snap-start relative px-4 md:px-16 overflow-hidden min-h-screen flex items-center">
      <!-- Glow background -->
      <div class="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-orange-100/30 blur-[150px] rounded-full -z-10 animate-glow"></div>
      
      <div class="max-w-7xl mx-auto flex flex-col lg:flex-row items-center relative w-full gap-20">
        <!-- Left Column: Content -->
        <div class="relative z-20 text-left w-full lg:w-3/5">
          <div class="hero-badge mb-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            <span class="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-slate-400">Visionary Studio</span>
          </div>

          <h1 class="hero-title text-7xl sm:text-8xl lg:text-[8.5rem] font-heading font-black tracking-[-0.05em] text-slate-900 leading-[0.75] mb-12">
            Sviluppiamo<br />
            <span class="font-display italic text-slate-300 block">Idee Vincenti.</span>
          </h1>

          <p class="hero-desc text-slate-500 text-xl lg:text-3xl font-medium leading-tight mb-16 max-w-2xl">
            Un'agenzia creativa per chi cerca la perfezione digitale. Web, App & Brand Identity con un'anima artigianale.
          </p>

          <div class="hero-btns flex flex-wrap gap-6">
            <button @click="scrollToSection('projects')"
              class="px-12 py-6 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-[0.25em] hover:bg-orange-500 transition-all duration-500 shadow-2xl hover:shadow-orange-500/30">
              Esplora i Lavori
            </button>
          </div>
        </div>

        <!-- Right Column: Simplified Visual -->
        <div class="hero-visual relative flex flex-col items-start gap-12 w-full lg:w-2/5">
          <div class="flex items-baseline gap-2">
            <span class="text-8xl lg:text-[10rem] font-heading font-black text-slate-900 tracking-tighter stat-number" data-target="50">0</span>
            <span class="text-4xl lg:text-6xl font-display italic text-orange-500">+</span>
            <span class="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-slate-400 ml-4">Progetti<br/>Completati</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-8xl lg:text-[10rem] font-heading font-black text-slate-900 tracking-tighter stat-number" data-target="100">0</span>
            <span class="text-4xl lg:text-6xl font-display italic text-orange-500">%</span>
            <span class="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-slate-400 ml-4">Clienti<br/>Soddisfatti</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== PROJECTS SECTION (STAGGERED EDITORIAL) ===== -->
    <section id="projects" class="reveal-section snap-start relative px-4 md:px-16 py-32 bg-slate-50">
      <div class="max-w-7xl mx-auto">
        <div class="section-header mb-32">
          <span class="text-[0.7rem] font-bold text-orange-500 uppercase tracking-[0.5em] mb-8 block font-heading">Journal</span>
          <h2 class="text-6xl md:text-8xl font-heading font-black tracking-[-0.05em] text-slate-900 leading-none">
            Opere <span class="font-display italic text-slate-300">Scelte.</span>
          </h2>
        </div>

        <div class="section-content grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-32">
          <div v-for="(project, index) in featuredProjects" :key="index"
            :class="index % 2 === 1 ? 'md:mt-40' : ''"
            class="project-item group">
            <div class="mb-10 overflow-hidden rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-[0.98]">
               <PremiumCard :name="project.title" :year="parseInt(project.year.toString()) || 2024" :month="project.month"
                :rarity="project.rarity" :type="project.type" :image="project.image" :link="project.link"
                :description="project.description" :abilities="project.abilities" :techStack="project.techStack || []" />
            </div>
          </div>
          <!-- CTA Cell -->
          <div class="flex flex-col justify-center items-start p-12">
             <h3 class="text-4xl font-heading font-black text-slate-900 mb-8 leading-tight">Vedi come trasformiamo<br/>visioni in realtà.</h3>
             <button @click="exploreCollection" class="group flex items-center gap-4 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-orange-500 hover:text-slate-900 transition-colors">
               Archivio Completo
               <div class="w-10 h-px bg-orange-500 group-hover:w-16 group-hover:bg-slate-900 transition-all duration-500"></div>
             </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== SKILLS SECTION (EDITORIAL SPEC) ===== -->
    <section id="skills" class="reveal-section snap-start relative px-4 md:px-16 py-32 bg-white">
      <div class="max-w-7xl mx-auto">
        <div class="section-header mb-32 grid grid-cols-1 lg:grid-cols-2 gap-20">
          <h2 class="text-6xl md:text-8xl font-heading font-black tracking-[-0.05em] text-slate-900 leading-[0.8]">
            L'eccellenza <br />
            <span class="font-display italic text-slate-300">tecnica.</span>
          </h2>
          <p class="text-slate-500 text-xl lg:text-2xl font-medium leading-relaxed self-end">
            Non siamo solo designer. Siamo ingegneri del possibile. Utilizziamo stack all'avanguardia per performance senza compromessi.
          </p>
        </div>
        
        <div class="section-content border-t border-slate-100">
          <div v-for="stack in allStacks.slice(0, 8)" :key="stack.name"
            class="flex items-center justify-between py-10 border-b border-slate-100 group hover:px-8 transition-all duration-500">
            <div class="flex items-center gap-12">
               <span class="text-xs font-black text-slate-200 group-hover:text-orange-500 transition-colors">0{{ allStacks.indexOf(stack) + 1 }}</span>
               <h4 class="text-2xl md:text-4xl font-heading font-black text-slate-900">{{ stack.name }}</h4>
            </div>
            <img v-if="stack.logo" :src="stack.logo" :alt="stack.name" class="w-12 h-12 object-contain grayscale opacity-20 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CONTACTS SECTION ===== -->
    <section id="contacts"
      class="reveal-section snap-start px-4 md:px-16 py-32 bg-slate-900 text-white relative overflow-hidden">
      <div class="max-w-7xl mx-auto">
        <div class="section-header mb-32">
          <h2 class="text-7xl md:text-[9rem] font-heading font-black tracking-[-0.05em] leading-[0.75]">
            Diamo vita<br />
            <span class="text-orange-500 font-display italic">al domani.</span>
          </h2>
        </div>

        <div class="section-content grid grid-cols-1 lg:grid-cols-2 gap-32">
          <div class="space-y-16">
            <p class="text-slate-400 text-2xl font-medium max-w-md">Hai un'idea che merita di essere grande? Parliamone oggi.</p>
            <div class="space-y-4">
              <span class="text-[0.6rem] font-bold uppercase tracking-[0.5em] text-slate-600 block">Direzione</span>
              <a href="mailto:info@didap.it" class="text-3xl font-heading font-black hover:text-orange-500 transition-colors">info@didap.it</a>
            </div>
          </div>
          <div class="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3rem]">
            <ContactForm />
          </div>
        </div>
        
        <div class="mt-40 pt-12 border-t border-white/5 flex justify-between items-center opacity-20 text-[0.6rem] font-black uppercase tracking-[0.4em]">
          <span>© 2026 DIDAP AGENCY</span>
          <div class="flex gap-12">
             <span>IG</span><span>LI</span><span>TW</span>
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
