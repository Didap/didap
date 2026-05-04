<script setup lang="ts">
interface TeamMember {
  name: string
  role: string
  image: string
}

defineProps<{
  members: TeamMember[]
}>()
</script>

<template>
  <div class="flex h-96 w-full gap-2">
    <div
      v-for="m in members"
      :key="m.name"
      class="group relative flex h-full flex-1 cursor-pointer overflow-hidden rounded-lg bg-paper-soft transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:flex-[3]"
    >
      <img
        :src="m.image"
        :alt="m.name"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div
        class="relative mt-auto flex w-full flex-col gap-1 p-4 text-paper opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      >
        <p class="text-[11px] uppercase tracking-widest opacity-80">
          {{ m.role }}
        </p>
        <p class="font-display text-2xl leading-tight">{{ m.name }}</p>
      </div>
      <p
        class="absolute bottom-4 left-4 right-4 origin-bottom-left rotate-90 whitespace-nowrap font-display text-lg uppercase tracking-widest text-ink/40 transition-opacity duration-500 group-hover:opacity-0"
      >
        {{ m.name }}
      </p>
    </div>
  </div>
</template>
