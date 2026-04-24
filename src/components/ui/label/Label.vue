<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
    class?: HTMLAttributes['class']
    for?: string
}>()
</script>

<template>
    <label
        :class="cn('text-sm font-semibold text-slate-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', props.class)"
        :for="props.for">
        <slot />
    </label>
</template>
