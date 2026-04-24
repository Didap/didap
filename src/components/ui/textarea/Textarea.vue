<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
    class?: HTMLAttributes['class']
    defaultValue?: string
    modelValue?: string
}>()

defineEmits<{
    'update:modelValue': [value: string]
}>()
</script>

<template>
    <textarea
        :class="cn('flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-transparent px-4 py-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none', props.class)"
        :default-value="defaultValue" :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)" />
</template>
