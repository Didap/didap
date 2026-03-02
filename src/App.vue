<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import PremiumCard from './components/PremiumCard.vue';
import BoosterPack from './components/BoosterPack.vue';
import gsap from 'gsap';

const projects = [
  {
    name: "Didap AI",
    year: 2026,
    month: "03",
    rarity: "ultra",
    type: "electric",
    level: "ALPHA-v1.2",
    image: "/didap-ai.png",
    description: "Un motore di intelligenza artificiale avanzato progettato per la generazione automatica di interfacce.",
    techStack: ["Vue 3", "TypeScript", "Vite", "TailwindCSS"],
    abilities: [
      { 
        name: "Generative Logic", 
        description: "Algoritmi predittivi per la creazione di componenti UI dinamici."
      },
      { 
        name: "Real-time Sync", 
        description: "Sincronizzazione istantanea tra codice e preview."
      }
    ]
  },
  {
    name: "Nexus Core",
    year: 2025,
    month: "11",
    rarity: "rare",
    type: "grass",
    level: "STABLE",
    image: "/nexus-core.png",
    description: "Hub centrale per la gestione di microservizi ad alta disponibilità.",
    techStack: ["Node.js", "Docker", "Kubernetes", "Redis"],
    abilities: [
      { 
        name: "Auto-Scalling", 
        description: "Gestione intelligente dei carichi di lavoro in ambienti cloud."
      },
      { 
        name: "Secure Tunnel", 
        description: "Protocolli di crittografia end-to-end per il trasferimento dati."
      }
    ]
  },
  {
    name: "Legacy Tool",
    year: 2024,
    month: "01",
    rarity: "common",
    type: "steel",
    level: "LEGACY",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
    description: "Utility tool per l'automazione di task ripetitivi nel terminale.",
    techStack: ["Python", "Bash", "SQLite"],
    abilities: [
      { 
        name: "Quick Macro", 
        description: "Registrazione e riproduzione di sequenze di comandi."
      },
      { 
        name: "Log Parser", 
        description: "Analisi automatica e formattazione di log complessi."
      }
    ]
  }
] as const;

const isOpened = ref(false);
const revealedIndices = ref<Set<number>>(new Set());
const activeCardIndex = ref<number | null>(null);
const recapMode = ref(false);
const enlargedCardIndex = ref<number | null>(null);
const cardRefs = ref<HTMLElement[]>([]);

const handlePackOpened = async () => {
  isOpened.value = true;
  await nextTick();
  
  // Set up deck for 3D logic. All cards are at rotationY: 0 (showing back).
  // The PremiumCard is rotated 180 inside it and has backface-visibility: hidden.
  gsap.set(cardRefs.value, {
    xPercent: -50,
    yPercent: -50,
    left: "50%",
    top: "50%",
    position: "absolute",
    x: 0,
    y: 180, 
    z: (i) => -i * 8, 
    scale: 0.85, 
    opacity: 0,
    rotationX: 12,
    rotationY: 0 // Key for the flip!
  });

  gsap.to(cardRefs.value, {
    opacity: 1,
    duration: 0.8,
    stagger: 0.05,
    ease: "back.out(1.2)"
  });
};

const handleScreenClick = () => {
  if (!isOpened.value || recapMode.value || enlargedCardIndex.value !== null) return;
  revealNext();
};

const revealNext = () => {
  const tl = gsap.timeline();

  // 1. Dismiss current card off-screen (it stays hidden until recap)
  if (activeCardIndex.value !== null) {
    const prevCard = cardRefs.value[activeCardIndex.value];
    if (prevCard) {
      tl.to(prevCard, {
        x: -window.innerWidth * 0.8, // fly way left
        rotationY: 180 + 45, // tumble
        rotationZ: -45,
        opacity: 0,
        duration: 0.5,
        ease: "power2.in"
      });
    }
  }

  // 2. Find next card in the deck
  const nextIndex = Array.from({length: projects.length}, (_, i) => i)
    .find(i => !revealedIndices.value.has(i));

  // 3. If deck empty, trigger RECAP
  if (nextIndex === undefined) {
    activeCardIndex.value = null;
    recapMode.value = true;
    showRecap();
    return;
  }

  // 4. Reveal new top card
  activeCardIndex.value = nextIndex;
  revealedIndices.value.add(nextIndex);
  const targetCard = cardRefs.value[nextIndex];
  
  if (!targetCard) return;

  // Pull up from deck, then FLIP 180 and centralize
  tl.to(targetCard, {
    z: 350,
    y: -50,
    duration: 0.4,
    ease: "power2.out"
  }, "-=0.3") // Start moving while previous flies away
  .to(targetCard, {
    x: 0,
    y: -40,
    z: 150,
    rotationX: 0,
    rotationY: 180, // True 3D flip over reveals the front!
    rotationZ: 0,
    scale: 1.25, // Make it big to read abilities
    duration: 0.7,
    ease: "back.out(1.2)"
  });
};

const showRecap = async () => {
  // No GSAP clearing needed, we will just conditionally render a different container
  await nextTick();
};

const resetPack = () => {
  isOpened.value = false;
  recapMode.value = false;
  activeCardIndex.value = null;
  enlargedCardIndex.value = null;
  revealedIndices.value.clear();
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 font-sans overflow-x-hidden relative perspective-2000"
       :class="recapMode ? 'overflow-y-auto' : 'overflow-y-hidden'"
       @click="handleScreenClick">
    
    <!-- Background Dynamic Glow -->
    <div class="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.1),transparent_80%)] pointer-events-none"></div>

    <!-- 1. BOOSTER PHASE -->
    <transition name="fade">
      <div v-if="!isOpened" class="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm pointer-events-none">
        <BoosterPack @open="handlePackOpened" class="pointer-events-auto" />
      </div>
    </transition>

    <!-- 2. REVEAL PHASE (3D Stack) -->
    <div v-show="isOpened && !recapMode" 
         class="fixed inset-0 min-h-screen flex items-center justify-center z-10 w-full transition-all duration-1000">
      
      <!-- Click Instruction Overlay -->
      <div v-if="activeCardIndex !== null" class="absolute bottom-12 left-1/2 -translate-x-1/2 animate-pulse text-white/50 tracking-[0.3em] uppercase text-xs font-bold pointer-events-none z-0">
         Click anywhere to pull next
      </div>

      <!-- Wrapper for individual cards in the stack -->
      <div 
        v-for="(project, index) in projects" 
        :key="project.name" 
        ref="cardRefs"
        class="preserve-3d transform-gpu absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        :style="{ 
          zIndex: (activeCardIndex === index ? 100 : projects.length - index),
        }"
      >
        <!-- BACK FACE (Unrevealed) -->
        <div class="absolute inset-0 backface-hidden bg-slate-900 rounded-[1.8rem] border border-white/10 z-20 flex flex-col items-center justify-center shadow-2xl overflow-hidden shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
           <div class="absolute inset-0 opacity-10" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, #fff 10px, #fff 11px);"></div>
           <div class="w-20 h-20 rounded-full border border-cyan-400/30 flex items-center justify-center relative bg-slate-800 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]">
              <div class="w-8 h-8 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_30px_#22d3ee]"></div>
           </div>
           <h3 class="mt-8 text-white/40 text-[0.55rem] font-medium tracking-[0.5em] uppercase">Didap Core</h3>
        </div>
        
        <!-- FRONT FACE (PremiumCard) -->
        <div class="backface-hidden rotate-y-180 w-full h-full relative z-30 inline-block pointer-events-none transition-all duration-300"
             :class="(activeCardIndex === index) ? '!pointer-events-auto' : ''">
           <PremiumCard v-bind="project" />
        </div>
      </div>
    </div>

    <!-- 3. RECAP PHASE (Clean CSS Collection Grid) -->
    <!-- Totally separate from GSAP to avoid ALL math/matrix overlap bugs -->
    <transition name="fade">
      <div v-if="recapMode" class="relative z-20 w-full flex flex-col items-center justify-center min-h-screen py-20 px-4">
        
        <h2 class="text-5xl font-black text-white italic drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] mb-12 uppercase skew-x-[-10deg]">
           Collection Revealed
        </h2>
        
        <!-- Simply side-by-side using flexbox -->
        <div class="flex flex-row flex-wrap justify-center items-center gap-8 w-full max-w-7xl animate-fade-in-up">
           <div v-for="(project, index) in projects" :key="'recap-'+index" 
                class="relative cursor-pointer transition-all duration-300 hover:-translate-y-4 hover:scale-105 hover:shadow-[0_20px_50px_rgba(34,211,238,0.3)] rounded-[1.8rem]"
                @click.stop="enlargedCardIndex = index"
                style="transform-style: preserve-3d">
              
              <!-- Slightly smaller scale for the grid -->
              <div class="scale-90 transform-gpu pointer-events-none">
                 <PremiumCard v-bind="project" />
              </div>
           </div>
        </div>

        <button 
           @click.stop="resetPack"
           class="mt-16 px-10 py-5 bg-cyan-500 text-white font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:bg-cyan-400 hover:scale-110 active:scale-95 transition-all outline-none"
        >
           Open Another Pack
        </button>
      </div>
    </transition>

    <!-- ENLARGED CARD FULLSCREEN OVERLAY -->
    <transition name="fade">
      <div v-if="enlargedCardIndex !== null" 
           class="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer"
           @click.stop="enlargedCardIndex = null">
         
         <div class="scale-110 md:scale-125 transform-gpu pointer-events-none">
            <PremiumCard v-bind="(projects[enlargedCardIndex || 0] as any)" />
         </div>
         
         <div class="absolute bottom-12 animate-pulse text-white/50 tracking-[0.3em] uppercase text-xs font-bold pointer-events-none">
           Click anywhere to close
         </div>
      </div>
    </transition>

  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

body {
  margin: 0;
  padding: 0;
  background-color: #020617;
}

.perspective-2000 {
  perspective: 2000px;
}

.preserve-3d { 
  transform-style: preserve-3d; 
}
.backface-hidden { 
  backface-visibility: hidden; 
}
.rotate-y-180 { 
  transform: rotateY(180deg); 
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
