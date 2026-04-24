<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import gsap from 'gsap'

const router = useRouter()
const route = useRoute()
const headerEl = ref<HTMLElement | null>(null)
const isScrolled = ref(false)
const isMobileOpen = ref(false)

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'I Nostri Progetti', to: '/collection' },
  { label: 'Contatti', href: '#contact' },
]

const handleScroll = () => {
  isScrolled.value = window.scrollY > 60
}

const navigateTo = (link: { to?: string; href?: string }) => {
  isMobileOpen.value = false
  if (link.to) {
    router.push(link.to)
  } else if (link.href) {
    const el = document.querySelector(link.href)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      // If we're not on the home page, go to home first
      router.push('/').then(() => {
        setTimeout(() => {
          document.querySelector(link.href!)?.scrollIntoView({ behavior: 'smooth' })
        }, 400)
      })
    }
  }
}

const isActive = (link: { to?: string }) => {
  if (!link.to) return false
  return route.path === link.to
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })

  // Simplified entrance to ensure visibility
  gsap.fromTo(
    headerEl.value,
    { y: -20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: 'power3.out',
      delay: 0.1,
    },
  )
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header ref="headerEl"
    class="fixed top-4 left-4 right-4 md:left-8 md:right-8 z-100 flex justify-between items-center px-6 md:px-8 py-3.5 rounded-4xl transition-all duration-500 will-change-transform"
    :class="isScrolled
        ? 'glass-strong shadow-lg shadow-slate-200/40'
        : 'bg-white/40 backdrop-blur-md border border-white/20 shadow-sm'
      ">
    <!-- Logo -->
    <router-link to="/" class="flex items-center gap-3 group">
      <img src="../assets/logo (1).png" alt="Logo Didap"
        class="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300" />
    </router-link>

    <!-- Desktop Nav -->
    <nav class="hidden md:flex items-center gap-10">
      <button v-for="link in navLinks" :key="link.label" @click="navigateTo(link)"
        class="text-[0.7rem] font-bold uppercase tracking-[0.25em] transition-colors duration-300 relative group"
        :class="isActive(link) ? 'text-orange-500' : 'text-slate-600 hover:text-orange-500'">
        {{ link.label }}
        <!-- Active indicator dot -->
        <span v-if="isActive(link)"
          class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500"></span>
      </button>
    </nav>

    <!-- CTA -->
    <a href="mailto:info@didap.it"
      class="hidden md:inline-flex px-8 py-3 bg-slate-900 text-white text-[0.7rem] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-orange-500 transition-all duration-500 shadow-xl hover:shadow-orange-500/20 active:scale-95">
      Lavora con noi
    </a>

    <!-- Mobile Hamburger -->
    <button @click="isMobileOpen = !isMobileOpen"
      class="md:hidden relative w-10 h-10 flex flex-col justify-center items-center gap-1.5 glass rounded-full"
      aria-label="Menu">
      <span class="w-5 h-0.5 bg-slate-900 rounded-full transition-all duration-300"
        :class="isMobileOpen ? 'rotate-45 translate-y-[4.5px]' : ''"></span>
      <span class="w-5 h-0.5 bg-slate-900 rounded-full transition-all duration-300"
        :class="isMobileOpen ? '-rotate-45 -translate-y-[4.5px]' : ''"></span>
    </button>
  </header>

  <!-- Mobile Menu Overlay -->
  <Transition name="mobile-menu">
    <div v-if="isMobileOpen"
      class="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
      <button v-for="link in navLinks" :key="link.label" @click="navigateTo(link)"
        class="text-3xl font-heading font-black tracking-tight transition-colors duration-300"
        :class="isActive(link) ? 'text-orange-500' : 'text-slate-900 hover:text-orange-500'">
        {{ link.label }}
      </button>
      <a href="mailto:info@didap.it"
        class="mt-4 px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-[0.15em] rounded-full hover:bg-orange-500 transition-all">
        Lavora con noi
      </a>
    </div>
  </Transition>
</template>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.mobile-menu-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
