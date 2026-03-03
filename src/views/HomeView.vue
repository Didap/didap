<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const router = useRouter()
const heroTitle = ref(null)
const heroSubtitle = ref(null)
const heroCta = ref(null)
const heroLogo = ref(null)

const exploreCollection = () => {
  router.push('/collection')
}

const featuredProjects = [
  {
    title: 'Tonus Tech',
    category: 'Wearable & AI',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    description:
      "Wearable intelligente che ottimizza le sessioni fitness con la potenza dell'intelligenza artificiale.",
  },
  {
    title: 'Coltivatori di Emozioni',
    category: 'Sviluppo Web',
    image:
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
    description:
      'La prima piattaforma italiana di Social Farming dedicata alla salvaguardia del patrimonio agricolo.',
  },
  {
    title: 'Yacht In Puglia',
    category: 'Booking Platform',
    image:
      'https://images.unsplash.com/photo-1567891245344-7cdec0098fcc?auto=format&fit=crop&q=80&w=800',
    description:
      'Sistema di prenotazione e gestione per catamarani di lusso con calendario dinamico.',
  },
]

const skills = [
  'UI/UX Design',
  'Web Design',
  'Gamification',
  'App Development',
  'HTML/CSS',
  'Javascript',
  'PHP',
  'Angular',
  'NodeJS',
  'MongoDB',
  'Figma',
]

onMounted(() => {
  // 1. Header Entrance
  gsap.from('.main-header', {
    y: -100,
    opacity: 0,
    duration: 1.2,
    ease: 'expo.out',
  })

  // 2. Hero Entrance
  const tl = gsap.timeline({ delay: 0.5 })

  tl.from(heroLogo.value, {
    scale: 0,
    rotation: -180,
    opacity: 0,
    duration: 1.5,
    ease: 'elastic.out(1, 0.5)',
  })
    .from(
      heroTitle.value,
      {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
      },
      '-=1',
    )
    .from(
      heroSubtitle.value,
      {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      },
      '-=0.6',
    )
    .from(
      heroCta.value,
      {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      },
      '-=0.4',
    )

  // 3. Background Elements Parallax
  gsap.to('.bg-splash-1', {
    y: 100,
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 2,
    },
  })

  gsap.to('.bg-splash-2', {
    y: -150,
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 3,
    },
  })

  // 4. Section Reveals
  // Project Section
  gsap.from('.project-section-header', {
    scrollTrigger: {
      trigger: '#work',
      start: 'top 80%',
    },
    x: -50,
    opacity: 0,
    duration: 1,
    ease: 'power3.out',
  })

  gsap.from('.project-card', {
    scrollTrigger: {
      trigger: '.project-grid',
      start: 'top 85%',
    },
    y: 100,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    ease: 'power4.out',
  })

  // Skills Section
  gsap.from('.skill-pill', {
    scrollTrigger: {
      trigger: '#about',
      start: 'top 90%',
    },
    scale: 0,
    opacity: 0,
    duration: 0.6,
    stagger: 0.05,
    ease: 'back.out(1.7)',
  })

  // 5. Logo Floating (Continuous)
  gsap.to('.floating-logo', {
    y: 15,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'power1.inOut',
  })
})

onUnmounted(() => {
  ScrollTrigger.getAll().forEach((t) => t.kill())
})
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 relative font-sans text-slate-900 overflow-x-hidden selection:bg-orange-500 selection:text-white"
  >
    <!-- Decorative Ambient Glows -->
    <div
      class="bg-splash-1 fixed top-[10%] left-[-10%] w-[40%] h-[40%] bg-amber-200/40 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-multiply"
    ></div>
    <div
      class="bg-splash-2 fixed bottom-[-20%] right-[10%] w-[50%] h-[50%] bg-orange-300/30 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-multiply"
    ></div>

    <!-- Minimal Header -->
    <header
      class="main-header glass fixed top-4 left-4 right-4 md:left-12 md:right-12 z-50 flex justify-between items-center px-6 md:px-8 py-4 rounded-3xl transition-all"
    >
      <div class="flex items-center gap-3">
        <img src="../assets/logo (1).png" alt="Logo" class="w-8 h-8 object-contain" />
        <span class="text-xl font-black tracking-tight tracking-[0.1em] text-slate-900">DIDAP</span>
      </div>
      <nav class="hidden md:flex gap-10">
        <a
          href="#work"
          class="text-xs font-bold text-slate-600 hover:text-orange-500 transition-colors uppercase tracking-widest"
          >Progetti</a
        >
        <a
          href="#about"
          class="text-xs font-bold text-slate-600 hover:text-orange-500 transition-colors uppercase tracking-widest"
          >Servizi</a
        >
        <a
          href="#contact"
          class="text-xs font-bold text-slate-600 hover:text-orange-500 transition-colors uppercase tracking-widest"
          >Contatti</a
        >
      </nav>
      <button
        class="px-7 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-full hover:bg-orange-500 transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95"
      >
        Lavora con noi
      </button>
    </header>

    <!-- 1. Hero Section -->
    <section
      class="relative z-10 flex flex-col items-center justify-center min-h-[100vh] px-6 text-center pt-32 pb-24"
    >
      <div ref="heroLogo" class="relative mb-8">
        <div
          class="absolute inset-0 bg-orange-200/40 blur-[60px] rounded-full scale-150 mix-blend-multiply"
        ></div>
        <img
          src="../assets/logo (1).png"
          alt="Profile"
          class="floating-logo relative z-10 w-32 h-auto drop-shadow-lg"
        />
      </div>

      <div
        class="inline-block px-5 py-2 rounded-full glass border border-slate-200 text-orange-600 text-[0.65rem] font-bold uppercase tracking-[0.3em] mb-8"
      >
        Innovazione Made by Didap
      </div>

      <h1
        ref="heroTitle"
        class="text-6xl md:text-8xl font-black leading-[1.05] tracking-tighter mb-8 text-slate-900"
      >
        Prodotti digitali <br class="hidden md:block" />
        <span class="text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-amber-500"
          >con un'anima.</span
        >
      </h1>

      <p
        ref="heroSubtitle"
        class="text-lg md:text-xl text-slate-500 font-medium mb-12 leading-relaxed max-w-2xl"
      >
        Trasformiamo idee complesse in prodotti digitali attraverso il design UI/UX, l'IA e la
        Gamification. Portiamo l'innovazione al centro del tuo business.
      </p>

      <div ref="heroCta" class="flex flex-col sm:flex-row items-center gap-6">
        <button
          @click="exploreCollection"
          class="px-8 py-4 bg-orange-600 text-white rounded-full font-bold text-sm uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-700 hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
        >
          Scopri i Progetti
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
        <button
          class="px-8 py-4 glass border border-slate-300 text-slate-800 rounded-full font-bold text-sm uppercase tracking-widest hover:border-slate-400 hover:bg-white/50 transition-all active:scale-95 shadow-sm"
        >
          Servizi
        </button>
      </div>
    </section>

    <!-- 2. Selected Work -->
    <section id="work" class="relative z-10 px-6 md:px-16 py-32">
      <div class="max-w-7xl mx-auto">
        <div
          class="project-section-header flex flex-col md:flex-row md:items-end justify-between mb-24 gap-6"
        >
          <div class="max-w-2xl text-left">
            <h2 class="text-xs font-black text-orange-600 uppercase tracking-[0.4em] mb-4">
              Progetti Evidenziati
            </h2>
            <h3 class="text-4xl md:text-6xl font-black tracking-tighter text-slate-900">
              Lavori che fanno<br />
              <span class="text-slate-400">la differenza.</span>
            </h3>
          </div>
        </div>

        <div class="project-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(project, i) in featuredProjects"
            :key="i"
            class="project-card group cursor-pointer"
          >
            <div
              class="relative overflow-hidden rounded-3xl aspect-[4/5] mb-6 border border-slate-200 shadow-xl glass"
            >
              <img
                :src="project.image"
                :alt="project.title"
                class="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-transform duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100"
              />
              <div
                class="absolute inset-0 bg-linear-to-t from-white via-white/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500 flex flex-col justify-end p-8"
              >
                <h4
                  class="text-slate-900 text-3xl font-black mb-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
                >
                  {{ project.title }}
                </h4>
                <p
                  class="text-orange-600 text-xs font-bold uppercase tracking-widest mb-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75"
                >
                  {{ project.category }}
                </p>
                <p
                  class="text-slate-700 text-sm font-medium line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-100"
                >
                  {{ project.description }}
                </p>
              </div>
            </div>
            <div class="flex justify-between items-start px-2">
              <div>
                <h4
                  class="text-xl font-bold text-slate-800 group-hover:text-orange-600 transition-colors"
                >
                  {{ project.title }}
                </h4>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {{ project.category }}
                </p>
              </div>
              <div
                class="p-3 rounded-full border border-slate-200 bg-white group-hover:border-orange-200 group-hover:bg-orange-50 transition-colors shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5 text-slate-400 group-hover:text-orange-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Tech Stack section -->
    <section
      id="about"
      class="relative z-10 px-6 md:px-16 py-32 border-t border-slate-200/50 bg-white/50"
    >
      <div class="max-w-7xl mx-auto flex flex-col items-center">
        <h2 class="text-xs font-black text-orange-600 uppercase tracking-[0.4em] mb-4">
          I nostri servizi
        </h2>
        <h3
          class="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 mb-16 text-center max-w-2xl"
        >
          Competenze <span class="text-slate-400">&</span> Tecnologie
        </h3>
        <div class="flex flex-wrap justify-center gap-4 max-w-3xl">
          <div
            v-for="skill in skills"
            :key="skill"
            class="skill-pill px-6 py-3 glass border border-slate-200/50 rounded-full shadow-sm text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600 hover:bg-white transition-colors cursor-default"
          >
            {{ skill }}
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Footer -->
    <footer
      id="contact"
      class="relative z-20 bg-slate-900 text-white px-6 md:px-16 py-24 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.1)]"
    >
      <div class="max-w-7xl mx-auto flex flex-col items-center text-center">
        <h2 class="text-5xl md:text-8xl font-black tracking-tighter mb-10 leading-none">
          Restiamo <br />
          <span class="text-orange-500">in contatto.</span>
        </h2>
        <a
          href="mailto:info@didap.it"
          class="text-3xl md:text-5xl font-medium text-slate-300 hover:text-white transition-all mb-16 relative group"
        >
          info@didap.it
          <span
            class="absolute -bottom-2 left-0 w-0 h-1 bg-orange-500 transition-all duration-300 group-hover:w-full"
          ></span>
        </a>

        <div class="flex gap-10 mb-20 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          <a
            href="https://www.linkedin.com/company/didap-startup/"
            target="_blank"
            class="hover:text-orange-400 transition-colors"
            >LinkedIn</a
          >
          <a
            href="https://www.instagram.com/didap_it/"
            target="_blank"
            class="hover:text-orange-400 transition-colors"
            >Instagram</a
          >
          <a
            href="https://www.facebook.com/didap.it"
            target="_blank"
            class="hover:text-orange-400 transition-colors"
            >Facebook</a
          >
        </div>

        <div
          class="pt-12 border-t border-slate-800 w-full flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div class="flex items-center gap-3">
            <img
              src="../assets/logo (1).png"
              alt="Logo"
              class="w-8 h-8 object-contain contrast-125 invert brightness-0"
            />
            <span class="font-black text-sm uppercase tracking-widest"
              >DIDAP <span class="text-orange-500">CORE</span></span
            >
          </div>
          <p class="text-slate-500 text-xs font-bold uppercase tracking-widest">
            © 2026 Didap - Startup Innovativa
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
html {
  scroll-behavior: smooth;
}
</style>
