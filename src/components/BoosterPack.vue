<script setup lang="ts">
import { ref, onMounted } from 'vue';
import gsap from 'gsap';

const emit = defineEmits(['open']);

const containerRef = ref<HTMLElement | null>(null);
const leftDoorRef = ref<HTMLElement | null>(null);
const rightDoorRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);

const openPack = () => {
  if (isOpen.value) return;
  isOpen.value = true;

  const tl = gsap.timeline({
    onComplete: () => {
      emit('open');
    }
  });

  // Small scale down on click
  tl.to(containerRef.value, {
    scale: 0.95,
    duration: 0.1,
    ease: "power1.inOut"
  });

  // Smooth elegant opening
  tl.to(leftDoorRef.value, {
    x: '-100%',
    opacity: 0,
    duration: 0.8,
    ease: "power3.inOut"
  }, "+=0.1");

  tl.to(rightDoorRef.value, {
    x: '100%',
    opacity: 0,
    duration: 0.8,
    ease: "power3.inOut"
  }, "-=0.8");

  // Fade out container
  tl.to(containerRef.value, {
    opacity: 0,
    duration: 0.4,
    ease: "power2.in"
  }, "-=0.2");
};

onMounted(() => {
  gsap.from(containerRef.value, {
    scale: 0.8,
    y: 100,
    opacity: 0,
    duration: 1,
    ease: "power3.out"
  });
});
</script>

<template>
  <div class="relative w-80 h-[500px] cursor-pointer group perspective-1000" @click="openPack" ref="containerRef">
    
    <!-- Outer Glow -->
    <div class="absolute -inset-1 bg-linear-to-r from-purple-500 via-cyan-400 to-purple-500 rounded-[2rem] blur-xl opacity-30 group-hover:opacity-70 transition-opacity duration-500 animate-pulse"></div>

    <div class="absolute inset-0 bg-slate-900 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex">
      
      <!-- LEFT DOOR -->
      <div ref="leftDoorRef" class="w-1/2 h-full bg-slate-800 relative z-10 border-r border-white/5 flex flex-col items-end justify-center pr-4 overflow-hidden shadow-inner">
         <div class="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(168,85,247,0.1),transparent_70%)]"></div>
         <h2 class="text-5xl font-black text-white/10 uppercase rotate-90 origin-right translate-x-12 whitespace-nowrap tracking-widest">
           DIDAP
         </h2>
      </div>

      <!-- RIGHT DOOR -->
      <div ref="rightDoorRef" class="w-1/2 h-full bg-slate-800 relative z-10 border-l border-white/5 flex flex-col items-start justify-center pl-4 overflow-hidden shadow-inner">
         <div class="absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,rgba(34,211,238,0.1),transparent_70%)]"></div>
         <h2 class="text-5xl font-black text-white/10 uppercase -rotate-90 origin-left -translate-x-12 whitespace-nowrap tracking-widest">
           CORE
         </h2>
      </div>

      <!-- Center Seam Element (Attached to container, revealed on hover) -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
         <div class="w-6 h-6 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]"></div>
      </div>

      <!-- Subtitle -->
       <div class="absolute bottom-8 w-full text-center z-20 pointer-events-none">
          <p class="text-[0.6rem] text-cyan-400/80 font-bold uppercase tracking-[0.5em] animate-pulse">Touch to Open</p>
       </div>

    </div>
  </div>
</template>

<style scoped>
/* Cleaned up styles, relying on Tailwind for structure. */
</style>
