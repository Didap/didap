<script setup lang="ts">
import AdminSwitch from '~/components/admin/AdminSwitch.vue'

// Blocco del form = sezione della pagina prodotto. Con `toggle` ha un
// interruttore: spento, la sezione non compare nella pagina. Si può
// chiudere per fare spazio; `highlight` lo fa lampeggiare quando lo si
// seleziona dall'anteprima.
const enabled = defineModel<boolean>('enabled', { default: true })
const props = defineProps<{
  id: string
  title: string
  description?: string
  toggle?: boolean
  highlight?: boolean
}>()
const emit = defineEmits<{ focus: [id: string] }>()

const collapsed = ref(false)
// Selezionata dall'anteprima: si riapre
watch(
  () => props.highlight,
  (h) => {
    if (h) collapsed.value = false
  },
)
</script>

<template>
  <section
    :id="`sezione-${id}`"
    class="
      scroll-mt-44 rounded-2xl border bg-white transition-shadow duration-500
    "
    :class="highlight ? 'border-green shadow-[0_0_0_4px] shadow-green/25' : `
      border-ink/10
    `"
    @focusin="emit('focus', props.id)"
    @click="emit('focus', props.id)"
  >
    <header class="flex flex-wrap items-start gap-4 px-6 pt-5 pb-4">
      <button
        type="button"
        class="
          -ml-2 flex flex-1 items-start gap-2 rounded-lg p-1 text-left
          hover:bg-ink/5
        "
        :aria-expanded="!collapsed"
        :aria-controls="`sezione-${id}-corpo`"
        @click="collapsed = !collapsed"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          class="mt-1 shrink-0 transition-transform"
          :class="collapsed ? '-rotate-90' : ''"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="flex flex-col gap-1">
          <span class="text-lg/tight font-bold">{{ title }}</span>
          <span
            v-if="description"
            class="text-sm opacity-60"
          >{{ description }}</span>
        </span>
      </button>
      <AdminSwitch
        v-if="toggle"
        v-model="enabled"
        :label="enabled ? 'Visibile' : 'Nascosta'"
      />
    </header>
    <div
      v-if="!collapsed && (!toggle || enabled)"
      :id="`sezione-${id}-corpo`"
      class="flex flex-col gap-5 border-t border-ink/10 px-6 py-5"
    >
      <slot />
    </div>
  </section>
</template>
