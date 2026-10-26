import { z } from 'zod'
import { text } from './text'

// Collaboratori del pannello: pagine, permessi e validazione

export const ADMIN_PAGES = ['prodotti', 'preventivi', 'clienti', 'bandi', 'impostazioni', 'collaboratori'] as const
export type AdminPage = typeof ADMIN_PAGES[number]

export const ADMIN_PAGE_INFO: Record<AdminPage, { label: string, path: string }> = {
  prodotti: { label: 'Prodotti', path: '/admin' },
  preventivi: { label: 'Preventivi', path: '/admin/preventivi' },
  clienti: { label: 'Clienti', path: '/admin/clienti' },
  bandi: { label: 'Bandi', path: '/admin/bandi' },
  impostazioni: { label: 'Impostazioni', path: '/admin/impostazioni' },
  collaboratori: { label: 'Collaboratori', path: '/admin/collaboratori' },
}

export const emailSchema = z.string().trim().toLowerCase().email().max(200)
export const passwordSchema = z.string().min(10, 'Almeno 10 caratteri').max(200)

// Senza duplicati, nell'ordine del menu
export const pagesSchema = z
  .array(z.enum(ADMIN_PAGES))
  .transform(pages => ADMIN_PAGES.filter(p => pages.includes(p)))

export const userCreateSchema = z
  .object({
    name: text(120).min(1),
    email: emailSchema,
    pages: pagesSchema,
  })
  .strict()

export const userUpdateSchema = z
  .object({
    name: text(120).min(1),
    pages: pagesSchema,
    active: z.boolean(),
  })
  .strict()

export type UserCreate = z.infer<typeof userCreateSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>

export type UserStatus = 'attivo' | 'invito' | 'disattivato'

// La persona della sessione
export type AdminUser = { id: string, name: string, email: string, pages: AdminPage[] }

// Riga della pagina Collaboratori
export type AdminUserRow = AdminUser & { status: UserStatus, createdAt: string, lastLoginAt: string | null }
