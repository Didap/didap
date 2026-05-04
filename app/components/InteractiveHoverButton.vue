<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string
    active?: boolean
    toneClass?: string
    invertedTextClass?: string
  }>(),
  {
    text: 'Button',
    active: false,
    toneClass: 'bg-ink',
    invertedTextClass: 'text-paper',
  },
)
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    :class="[
      'group relative w-full cursor-pointer overflow-hidden rounded-full border-2 bg-paper p-3 px-6 text-left text-sm font-semibold uppercase tracking-widest transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40',
      active ? 'border-ink' : 'border-ink/20 hover:border-ink',
    ]"
  >
    <div class="flex items-center gap-3">
      <span
        :class="[
          'size-2 shrink-0 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          toneClass,
          active ? 'scale-[300]' : 'scale-100 group-hover:scale-[300]',
        ]"
      />
      <span
        :class="[
          'block transition-all duration-300',
          active
            ? 'translate-x-8 opacity-0'
            : 'group-hover:translate-x-8 group-hover:opacity-0',
        ]"
      >
        {{ text }}
      </span>
    </div>

    <div
      :class="[
        'absolute inset-0 z-10 flex items-center justify-center gap-2 px-4 transition-all duration-300',
        invertedTextClass,
        active
          ? 'translate-x-0 opacity-100'
          : 'translate-x-8 opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
      ]"
    >
      <span class="text-balance">{{ text }}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </div>
  </button>
</template>
