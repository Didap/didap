<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gsap from 'gsap'

defineProps<{
  packName?: string
  themeColor?: string
  isDark?: boolean
}>()
// Use props in a dummy way if linter is very strict, but usually template usage is enough.
// console.log('Pack:', props.packName)

const emit = defineEmits(['open'])

const containerRef = ref<HTMLElement | null>(null)
const leftDoorRef = ref<HTMLElement | null>(null)
const rightDoorRef = ref<HTMLElement | null>(null)
const centerContentRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const openPack = () => {
  if (isOpen.value) return
  isOpen.value = true

  const tl = gsap.timeline({
    onComplete: () => {
      emit('open')
    },
  })

  // 1. Anticipation squeeze
  tl.to(containerRef.value, {
    scale: 0.92,
    duration: 0.2,
    ease: 'power2.in',
  })

  // 2. Shake & Rumble
  tl.to(containerRef.value, {
    x: 'random(-5, 5)',
    y: 'random(-5, 5)',
    rotation: 'random(-2, 2)',
    duration: 0.05,
    repeat: 10,
    yoyo: true,
    ease: 'none',
  })

  // Restore position and quick scale burst
  tl.to(containerRef.value, {
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1.1,
    duration: 0.15,
    ease: 'power2.out',
  })

  // 3. Fade out center content with an outward burst
  tl.to(centerContentRef.value, {
    opacity: 0,
    scale: 1.5,
    duration: 0.3,
    ease: 'expo.out',
  })

  // 4. Explosive door opening
  tl.to(
    leftDoorRef.value,
    {
      x: '-100%',
      rotationY: 45,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    },
    '-=0.2',
  )

  tl.to(
    rightDoorRef.value,
    {
      x: '100%',
      rotationY: -45,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    },
    '<',
  )

  // 5. Fade out the base container
  tl.to(
    containerRef.value,
    {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    },
    '-=0.4',
  )
}

onMounted(() => {
  if (containerRef.value) {
    gsap.from(containerRef.value, {
      scale: 0.8,
      y: 100,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
    })
  }
})
</script>

<template>
  <div class="relative w-80 h-[520px] cursor-pointer group perspective-1000 main-pack" @click="openPack"
    ref="containerRef">
    <!-- Subtle Outer Glow -->
    <div
      class="absolute -inset-1 rounded-4xl blur-2xl opacity-40 group-hover:opacity-80 group-active:opacity-100 transition-opacity duration-500 mix-blend-screen"
      :style="{ backgroundColor: themeColor || '#fbbf24' }"></div>

    <div
      class="absolute inset-0 glass rounded-4xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex pack-container">
      <!-- Premium Foil/Paper Texture Layer -->
      <div class="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay" style="
          background-image: url('https://www.transparenttextures.com/patterns/black-linen.png');
        "></div>

      <div ref="leftDoorRef"
        class="w-1/2 h-full bg-white/80 backdrop-blur-xl relative z-10 border-r border-slate-200/50 flex flex-col items-end justify-center overflow-hidden shadow-[inset_-10px_0_20px_rgba(0,0,0,0.05)] origin-left">
        <div class="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" :style="{
          background: `radial-gradient(circle at 0% 20%, ${themeColor || '#f97316'}, transparent 70%)`,
        }"></div>
      </div>

      <div ref="rightDoorRef"
        class="w-1/2 h-full bg-white/80 backdrop-blur-xl relative z-10 flex flex-col items-start justify-center overflow-hidden shadow-[inset_10px_0_20px_rgba(0,0,0,0.05)] origin-right">
        <div class="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" :style="{
          background: `radial-gradient(circle at 100% 80%, ${themeColor || '#fbbf24'}, transparent 70%)`,
        }"></div>
      </div>

      <!-- Center Logo & Branding Element -->
      <div ref="centerContentRef"
        class="absolute inset-0 z-30 pointer-events-none flex flex-col justify-center items-center">
        <div class="flex flex-col items-center justify-center transition-all duration-500 group-hover:scale-105">
          <div class="relative">
            <div class="absolute inset-0 blur-3xl rounded-full scale-150 animate-pulse-slow mix-blend-multiply"
              :style="{ backgroundColor: themeColor || '#fbbf24', opacity: 0.15 }"></div>
            <img src="../assets/logo (1).png" alt="Didap Logo"
              class="relative z-10 w-40 h-auto drop-shadow-sm animate-float brightness-0" />
          </div>

          <div class="mt-12 flex flex-col items-center">
            <p
              class="text-[0.7rem] font-black uppercase tracking-[0.5em] px-4 py-1.5 rounded-full border border-slate-300 glass shadow-sm text-slate-800">
              {{ packName || 'Premium Pack' }}
            </p>
          </div>
        </div>

        <!-- Interactive CTA -->
        <div class="absolute bottom-8 w-full text-center z-20">
          <div
            class="inline-block px-8 py-2.5 rounded-full border border-slate-300 glass backdrop-blur-xl shadow-sm transition-all duration-300 group-hover:shadow-[0_4px_15px_rgba(249,115,22,0.15)] group-hover:scale-105 group-hover:border-orange-300">
            <p
              class="text-[0.65rem] font-bold text-slate-500 uppercase tracking-[0.3em] group-hover:text-orange-500 group-active:scale-95 transition-transform">
              Apri Pack
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 0.8;
  }
}

.main-pack {
  transform-style: preserve-3d;
  will-change: transform;
}
</style>
