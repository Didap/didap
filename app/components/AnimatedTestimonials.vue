<script setup lang="ts">
import { Motion, AnimatePresence } from 'motion-v'

interface Testimonial {
  quote: string
  name: string
  designation: string
  image: string
}

const props = withDefaults(
  defineProps<{
    testimonials?: Testimonial[]
    autoplay?: boolean
    duration?: number
  }>(),
  {
    testimonials: () => [],
    autoplay: false,
    duration: 5000,
  },
)

const active = ref(0)
const interval = ref<ReturnType<typeof setInterval> | null>(null)

const activeTestimonialQuote = computed(() =>
  props.testimonials[active.value]?.quote.split(' ') ?? [],
)

function handleNext() {
  active.value = (active.value + 1) % props.testimonials.length
}

function handlePrev() {
  active.value =
    (active.value - 1 + props.testimonials.length) % props.testimonials.length
}

function isActive(i: number) {
  return active.value === i
}

function randomRotateY() {
  return Math.floor(Math.random() * 21) - 10
}

onMounted(() => {
  if (props.autoplay) {
    interval.value = setInterval(handleNext, props.duration)
  }
})

onUnmounted(() => {
  if (interval.value) clearInterval(interval.value)
})
</script>

<template>
  <div class="mx-auto max-w-sm px-4 py-6 font-sans antialiased md:max-w-4xl md:px-8">
    <div class="grid grid-cols-1 gap-12 md:grid-cols-2">
      <div>
        <div class="relative h-72 w-full">
          <AnimatePresence>
            <Motion
              v-for="(t, i) in props.testimonials"
              :key="t.image"
              as="div"
              :initial="{
                opacity: 0,
                scale: 0.9,
                z: -100,
                rotate: randomRotateY(),
              }"
              :animate="{
                opacity: isActive(i) ? 1 : 0.6,
                scale: isActive(i) ? 1 : 0.95,
                z: isActive(i) ? 0 : -100,
                rotate: isActive(i) ? 0 : randomRotateY(),
                zIndex: isActive(i) ? 40 : props.testimonials.length + 2 - i,
                y: isActive(i) ? [0, -40, 0] : 0,
              }"
              :exit="{
                opacity: 0,
                scale: 0.9,
                z: 100,
                rotate: randomRotateY(),
              }"
              :transition="{ duration: 0.4, ease: 'easeInOut' }"
              class="absolute inset-0 origin-bottom"
            >
              <img
                :src="t.image"
                :alt="t.name"
                draggable="false"
                class="h-full w-full rounded-2xl object-cover object-center"
              />
            </Motion>
          </AnimatePresence>
        </div>
      </div>

      <div class="flex flex-col justify-between py-2">
        <Motion
          :key="active"
          as="div"
          :initial="{ y: 16, opacity: 0 }"
          :animate="{ y: 0, opacity: 1 }"
          :exit="{ y: -16, opacity: 0 }"
          :transition="{ duration: 0.2, ease: 'easeInOut' }"
        >
          <h3 class="font-display text-2xl text-ink">
            {{ props.testimonials[active]?.name }}
          </h3>
          <p class="mt-1 text-xs uppercase tracking-widest text-ink-soft">
            {{ props.testimonials[active]?.designation }}
          </p>
          <Motion as="p" class="mt-6 text-base text-ink-soft">
            <Motion
              v-for="(word, i) in activeTestimonialQuote"
              :key="i"
              as="span"
              :initial="{ filter: 'blur(8px)', opacity: 0, y: 4 }"
              :animate="{ filter: 'blur(0px)', opacity: 1, y: 0 }"
              :transition="{
                duration: 0.2,
                ease: 'easeInOut',
                delay: 0.02 * i,
              }"
              class="inline-block"
            >
              {{ word }}&nbsp;
            </Motion>
          </Motion>
        </Motion>

        <div class="mt-8 flex gap-3">
          <button
            type="button"
            aria-label="Previous"
            class="group flex size-9 items-center justify-center rounded-full border border-ink/20 transition hover:border-ink hover:bg-ink hover:text-paper"
            @click="handlePrev"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4 transition-transform duration-300 group-hover:rotate-12"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next"
            class="group flex size-9 items-center justify-center rounded-full border border-ink/20 transition hover:border-ink hover:bg-ink hover:text-paper"
            @click="handleNext"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4 transition-transform duration-300 group-hover:-rotate-12"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
