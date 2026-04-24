<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { STRAPI_URL } from '@/utils/media'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const formSchema = toTypedSchema(
    z.object({
        name: z.string().min(2, 'Il nome deve avere almeno 2 caratteri'),
        email: z.string().email('Inserisci un indirizzo email valido'),
        subject: z.string().min(3, 'L\'oggetto deve avere almeno 3 caratteri'),
        message: z.string().min(10, 'Il messaggio deve avere almeno 10 caratteri'),
    })
)

const { handleSubmit, defineField, errors, resetForm } = useForm({
    validationSchema: formSchema,
})

const [name, nameAttrs] = defineField('name')
const [email, emailAttrs] = defineField('email')
const [subject, subjectAttrs] = defineField('subject')
const [message, messageAttrs] = defineField('message')

const isSubmitting = ref(false)
const submitStatus = ref<'idle' | 'success' | 'error'>('idle')

const onSubmit = handleSubmit(async (values) => {
    isSubmitting.value = true
    submitStatus.value = 'idle'

    try {
        const res = await fetch(`${STRAPI_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        })

        if (!res.ok) throw new Error('Failed to send message')

        submitStatus.value = 'success'
        resetForm()

        setTimeout(() => {
            submitStatus.value = 'idle'
        }, 5000)
    } catch {
        submitStatus.value = 'error'
    } finally {
        isSubmitting.value = false
    }
})
</script>

<template>
    <form @submit="onSubmit" class="w-full max-w-2xl mx-auto space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Name -->
            <div class="space-y-2 text-left">
                <Label for="name" class="text-slate-300">Nome</Label>
                <Input id="name" v-model="name" v-bind="nameAttrs" placeholder="Il tuo nome"
                    class="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500" />
                <p v-if="errors.name" class="text-xs text-red-400 font-medium">{{ errors.name }}</p>
            </div>

            <!-- Email -->
            <div class="space-y-2 text-left">
                <Label for="email" class="text-slate-300">Email</Label>
                <Input id="email" v-model="email" v-bind="emailAttrs" type="email" placeholder="la@tua.email"
                    class="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500" />
                <p v-if="errors.email" class="text-xs text-red-400 font-medium">{{ errors.email }}</p>
            </div>
        </div>

        <!-- Subject -->
        <div class="space-y-2 text-left">
            <Label for="subject" class="text-slate-300">Oggetto</Label>
            <Input id="subject" v-model="subject" v-bind="subjectAttrs" placeholder="Di cosa hai bisogno?"
                class="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500" />
            <p v-if="errors.subject" class="text-xs text-red-400 font-medium">{{ errors.subject }}</p>
        </div>

        <!-- Message -->
        <div class="space-y-2 text-left">
            <Label for="message" class="text-slate-300">Messaggio</Label>
            <Textarea id="message" v-model="message" v-bind="messageAttrs" placeholder="Raccontaci il tuo progetto..."
                class="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-orange-500 min-h-[140px]" />
            <p v-if="errors.message" class="text-xs text-red-400 font-medium">{{ errors.message }}</p>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
            <Button type="submit" size="lg" :disabled="isSubmitting" class="w-full md:w-auto">
                <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
                <Send v-else class="w-4 h-4" />
                {{ isSubmitting ? 'Invio in corso...' : 'Invia Messaggio' }}
            </Button>
        </div>

        <!-- Success/Error Messages -->
        <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
            <div v-if="submitStatus === 'success'"
                class="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 class="w-5 h-5 shrink-0" />
                <p class="text-sm font-medium">Messaggio inviato con successo! Ti risponderemo al più presto.</p>
            </div>
            <div v-else-if="submitStatus === 'error'"
                class="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle class="w-5 h-5 shrink-0" />
                <p class="text-sm font-medium">Errore nell'invio. Riprova o scrivici direttamente a info@didap.it</p>
            </div>
        </Transition>
    </form>
</template>
