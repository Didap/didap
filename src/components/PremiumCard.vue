<script setup lang="ts">
import { ref, computed } from 'vue'

interface Ability {
  name: string
  description: string
}

const props = defineProps<{
  name: string
  year: number
  month: number
  rarity: 'common' | 'rare' | 'ultra'
  type?: 'fire' | 'water' | 'grass' | 'electric' | 'psychic' | 'dark' | 'steel' | 'dragon'
  image: string
  level?: string
  description: string
  link?: string
  abilities: readonly Ability[]
  techStack: readonly string[]
}>()

const cardRef = ref<HTMLElement | null>(null)
const tiltStyle = ref('')
const shineStyle = ref('')
const holoStyle = ref('')

const handleMouseMove = (e: MouseEvent) => {
  if (!cardRef.value) return

  const rect = cardRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const width = rect.width
  const height = rect.height

  const mouseX = x / width
  const mouseY = y / height

  const rotateX = (mouseY - 0.5) * -15
  const rotateY = (mouseX - 0.5) * 15

  tiltStyle.value = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`

  const shineOpacity = props.rarity === 'common' ? 0.2 : 0.4
  shineStyle.value = `background: radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255,255,255,${shineOpacity}) 0%, transparent 60%);`

  if (props.rarity !== 'common') {
    const holoPos = mouseX * 50 + mouseY * 50
    holoStyle.value = `background-position: ${holoPos}% ${holoPos}%; opacity: ${props.rarity === 'ultra' ? 0.7 : 0.4};`
  }
}

const resetTilt = () => {
  tiltStyle.value = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  shineStyle.value = ''
  holoStyle.value = ''
}

const typeGlows = {
  fire: 'text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.4)]',
  water: 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]',
  grass: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]',
  electric: 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]',
  psychic: 'text-fuchsia-400 drop-shadow-[0_0_6px_rgba(232,121,249,0.4)]',
  dark: 'text-slate-400 drop-shadow-[0_0_6px_rgba(148,163,184,0.4)]',
  steel: 'text-zinc-400 drop-shadow-[0_0_6px_rgba(161,161,170,0.4)]',
  dragon: 'text-indigo-400 drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]',
}

const typeColorsCommon = {
  fire: 'text-orange-700',
  water: 'text-sky-700',
  grass: 'text-emerald-700',
  electric: 'text-yellow-700',
  psychic: 'text-fuchsia-700',
  dark: 'text-slate-800',
  steel: 'text-zinc-700',
  dragon: 'text-indigo-800',
}

const typeGlowsRaw = {
  fire: 'rgba(249, 115, 22, 0.08)',
  water: 'rgba(56, 189, 248, 0.08)',
  grass: 'rgba(52, 211, 153, 0.08)',
  electric: 'rgba(250, 204, 21, 0.08)',
  psychic: 'rgba(232, 121, 249, 0.08)',
  dark: 'rgba(148, 163, 184, 0.08)',
  steel: 'rgba(161, 161, 170, 0.08)',
  dragon: 'rgba(129, 140, 248, 0.08)',
}

const cardBaseClasses = computed(() => {
  const glow = typeGlowsRaw[props.type || 'electric']
  if (props.rarity === 'ultra')
    return `bg-black shadow-[0_20px_40px_rgba(0,0,0,0.7),0_0_20px_${glow}]`
  if (props.rarity === 'rare')
    return `bg-slate-900 border-2 border-[#fdf299]/30 shadow-[0_15px_30px_rgba(0,0,0,0.4),0_0_15px_${glow}]`
  return 'bg-slate-100 border-2 border-slate-300 shadow-lg hover:shadow-xl transition-shadow'
})

const textTheme = computed(() => {
  return props.rarity === 'common' ? 'text-slate-900' : 'text-white'
})
</script>

<template>
  <div
    ref="cardRef"
    class="relative w-85 h-[560px] rounded-[1.8rem] transition-all duration-300 ease-out cursor-pointer select-none group overflow-hidden main-card-container"
    :class="cardBaseClasses"
    :style="{ transform: tiltStyle }"
    @mousemove="handleMouseMove"
    @mouseleave="resetTilt"
  >
    <!-- 1. ULTRA RARE: FULL ART BACKGROUND -->
    <template v-if="rarity === 'ultra'">
      <div class="absolute inset-0 z-0 transform-gpu">
        <img
          :src="image"
          :alt="name"
          class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div
          class="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/80"
        ></div>
      </div>
      <!-- Holo Layer: Changed mix-blend to difference or overlay for light mode visibility if needed, but keeping color-dodge as it is standard, just boosting opacity -->
      <div
        class="absolute inset-0 pointer-events-none z-10 mix-blend-color-dodge transition-opacity duration-300 holo-spectrum transform-gpu"
        :style="holoStyle"
      ></div>
      <div
        class="absolute inset-0 pointer-events-none z-20 mix-blend-overlay opacity-30 animate-vmax-flow bg-[url('https://www.transparenttextures.com/patterns/energy-rings.png')] transform-gpu"
      ></div>
    </template>

    <!-- 2. COMMON/RARE: FRAMED LAYOUT -->
    <template v-else>
      <div
        class="absolute inset-0 z-0 p-4 flex flex-col"
        :class="rarity === 'common' ? 'bg-slate-200' : 'bg-slate-900'"
      >
        <!-- Header area for Common/Rare -->
        <div class="flex justify-between items-center mb-4 px-1">
          <h2
            class="text-xl font-black uppercase tracking-tight"
            :class="rarity === 'common' ? 'text-slate-800' : 'text-white'"
          >
            {{ name }}
          </h2>
          <div
            class="text-2xl font-black italic select-none"
            :class="
              rarity === 'common'
                ? typeColorsCommon[type || 'electric']
                : typeGlows[type || 'electric']
            "
          >
            {{ year }}<span class="text-sm opacity-60">.{{ month }}</span>
          </div>
        </div>

        <!-- Image Box (Frame) -->
        <div
          class="relative w-full aspect-4/3 rounded-xl overflow-hidden border-4 border-slate-800 shadow-inner group/img transform-gpu"
        >
          <img :src="image" :alt="name" class="w-full h-full object-cover" />
          <!-- RARE ONLY: Holo inside image -->
          <div
            v-if="rarity === 'rare'"
            class="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300 holo-spectrum"
            :style="holoStyle"
          ></div>
          <div
            class="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"
          ></div>
        </div>

        <!-- Tech Badges for Common/Rare (Smaller) -->
        <div class="mt-4 flex flex-wrap gap-1.5 px-1">
          <span
            v-for="tech in techStack.slice(0, 3)"
            :key="tech"
            class="px-2 py-0.5 rounded text-[0.55rem] font-bold uppercase tracking-widest border"
            :class="
              rarity === 'common'
                ? 'bg-slate-300 border-slate-400 text-slate-700'
                : 'bg-white/5 border-white/20 text-[#fdf299]'
            "
          >
            {{ tech }}
          </span>
        </div>

        <!-- Description Area -->
        <div class="mt-6 flex-1 px-1">
          <p
            class="text-[0.75rem] italic font-medium leading-relaxed"
            :class="rarity === 'common' ? 'text-slate-600' : 'text-slate-400'"
          >
            "{{ description }}"
          </p>

          <!-- Abilities list simplified -->
          <div class="mt-6 space-y-4">
            <div v-for="ability in abilities" :key="ability.name" class="flex flex-col">
              <h3
                class="text-[0.65rem] font-black uppercase tracking-widest"
                :class="rarity === 'common' ? 'text-slate-800' : 'text-[#f7e48b]'"
              >
                {{ ability.name }}
              </h3>
              <p class="text-[0.65rem] opacity-70 mt-1 leading-tight" :class="textTheme">
                {{ ability.description }}
              </p>
            </div>
          </div>

          <!-- External Link Button -->
          <div v-if="link" class="mt-8 flex justify-center pointer-events-auto">
            <a
              :href="link"
              target="_blank"
              @click.stop
              class="group/btn relative px-6 py-2 bg-slate-800 rounded-full text-white text-[0.6rem] font-bold uppercase tracking-[0.2em] hover:bg-orange-500 overflow-hidden transition-colors shadow-lg active:scale-95"
              :class="
                rarity === 'common'
                  ? 'bg-slate-900 border border-slate-700'
                  : 'bg-white/10 border border-white/20 backdrop-blur-md hover:border-orange-400'
              "
            >
              <span class="relative z-10 flex items-center gap-2">
                Visita il Sito
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-3 h-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </span>
            </a>
          </div>
        </div>

        <div
          class="mt-auto pt-4 flex justify-between items-center opacity-40 text-[0.5rem] font-bold uppercase tracking-widest"
          :class="textTheme"
        >
          <span>Project Card</span>
          <span>#{{ rarity.toUpperCase() }}</span>
        </div>
      </div>
    </template>

    <!-- 3. ULTRA RARE OVERLAYS -->
    <div
      v-if="rarity === 'ultra'"
      class="relative h-full w-full flex flex-col p-6 z-30 transform-gpu"
    >
      <div class="flex justify-between items-start mb-auto">
        <div class="flex flex-col drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <span class="text-[0.65rem] font-black text-white/70 uppercase tracking-[0.25em] mb-1">
            {{ level || 'VMAX VERSION' }}
          </span>
          <h2
            class="text-3xl font-black text-white uppercase tracking-tighter leading-none skew-x-[-10deg] shadow-text"
          >
            {{ name }}
          </h2>
        </div>
        <div class="flex flex-col items-end drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <div
            class="text-4xl font-black italic leading-none"
            :class="typeGlows[type || 'electric']"
          >
            {{ year }}<span class="text-xl opacity-60">.{{ month }}</span>
          </div>
          <span class="text-[0.6rem] font-bold text-white/60 uppercase tracking-widest mt-1"
            >Full Art Core</span
          >
        </div>
      </div>

      <div class="mb-6 self-start max-w-[85%]">
        <div class="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl">
          <p class="text-[0.8rem] text-white/90 font-bold leading-tight italic">
            "{{ description }}"
          </p>
        </div>
      </div>

      <div class="space-y-4 mb-8">
        <div v-for="ability in abilities" :key="ability.name" class="group/ability">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff] animate-pulse"></div>
            <h3
              class="text-xs font-black text-white uppercase tracking-widest italic drop-shadow-md"
            >
              {{ ability.name }}
            </h3>
          </div>
          <div
            class="bg-white/5 backdrop-blur-sm border-l-2 border-white/20 px-3 py-1.5 rounded-r-lg group-hover/ability:bg-white/10 transition-colors"
          >
            <p class="text-[0.7rem] text-white/70 font-medium leading-normal">
              {{ ability.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- External Link Button (Ultra) -->
      <div v-if="link" class="mb-6 flex justify-center pointer-events-auto">
        <a
          :href="link"
          target="_blank"
          @click.stop
          class="group/btn relative px-8 py-3 bg-white/10 backdrop-blur-xl border border-white/30 rounded-full text-white text-[0.65rem] font-black uppercase tracking-[0.25em] hover:bg-orange-500 hover:border-orange-400 overflow-hidden transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] active:scale-95"
        >
          <span class="relative z-10 flex items-center gap-2 drop-shadow-md">
            Visita Subito
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-3 h-3 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </span>
        </a>
      </div>

      <div class="flex flex-wrap gap-2 justify-center mt-auto">
        <span
          v-for="tech in techStack"
          :key="tech"
          class="px-3 py-1 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-[0.6rem] font-black text-white uppercase tracking-widest shadow-lg hover:scale-110 transition-transform cursor-default"
        >
          {{ tech }}
        </span>
      </div>
    </div>

    <!-- GLOBAL GLARE/SHINE LAYER -->
    <div
      class="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform-gpu"
      :style="shineStyle"
    ></div>
    <!-- ULTRA/RARE Shine Overlay (always visible but faint) -->
    <div
      v-if="rarity !== 'common'"
      class="absolute inset-0 pointer-events-none z-40 bg-linear-to-tr from-transparent via-white/5 to-white/10 mix-blend-overlay"
    ></div>
    <div
      v-if="rarity === 'ultra'"
      class="absolute inset-0 pointer-events-none z-60 border-[1.5px] border-white/10 rounded-[1.8rem] group-hover:border-white/30 transition-colors duration-500 transform-gpu"
    ></div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.main-card-container {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);
  isolation: isolate;
}

.transform-gpu {
  transform: translateZ(0);
  will-change: transform;
}

.holo-spectrum {
  opacity: 0;
  background-image: linear-gradient(
    115deg,
    transparent 0%,
    rgba(255, 0, 255, 0.4) 10%,
    rgba(0, 255, 255, 0.4) 25%,
    rgba(255, 255, 0, 0.4) 40%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 0, 0.4) 60%,
    rgba(0, 255, 255, 0.4) 75%,
    rgba(255, 0, 255, 0.4) 90%,
    transparent 100%
  );
  background-size: 200% 200%;
}

.group:hover .holo-spectrum {
  opacity: 0.35;
}

@keyframes vmax-flow {
  0% {
    transform: translateY(0) translateZ(0);
  }
  100% {
    transform: translateY(-40px) translateZ(0);
  }
}

.animate-vmax-flow {
  animation: vmax-flow 10s linear infinite;
}

.shadow-text {
  text-shadow:
    2px 2px 0px rgba(0, 0, 0, 0.8),
    -1px -1px 0px rgba(255, 255, 255, 0.2);
}
</style>
