<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
    class?: HTMLAttributes['class']
    variant?: 'default' | 'outline' | 'ghost'
    size?: 'default' | 'sm' | 'lg'
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
    variant: 'default',
    size: 'default',
    type: 'button',
})

const variantClasses = {
    default: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600',
    outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

const sizeClasses = {
    default: 'h-11 px-6 py-2',
    sm: 'h-9 px-4 text-xs',
    lg: 'h-14 px-10 py-4',
}
</script>

<template>
    <button :type="props.type" :disabled="props.disabled" :class="cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold uppercase tracking-widest ring-offset-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5',
        variantClasses[props.variant],
        sizeClasses[props.size],
        props.class,
    )">
        <slot />
    </button>
</template>
