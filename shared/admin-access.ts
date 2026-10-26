import { ADMIN_PAGES, ADMIN_PAGE_INFO } from './users'
import type { AdminPage } from './users'

// Chi può chiamare quali API e aprire quali pagine del pannello

export type ApiAccess =
  | { kind: 'open' }
  | { kind: 'session' }
  | { kind: 'pages', anyOf: AdminPage[] }
  | { kind: 'deny' }

type Rule = { prefix: string, access: ApiAccess, reads?: ApiAccess }

const pages = (...anyOf: AdminPage[]): ApiAccess => ({ kind: 'pages', anyOf })

const RULES: Rule[] = [
  { prefix: '/api/admin/login', access: { kind: 'open' } },
  { prefix: '/api/admin/session', access: { kind: 'open' } },
  { prefix: '/api/admin/password', access: { kind: 'open' } },
  { prefix: '/api/admin/logout', access: { kind: 'session' } },
  { prefix: '/api/admin/account', access: { kind: 'session' } },
  { prefix: '/api/admin/products', access: pages('prodotti') },
  { prefix: '/api/admin/assets', access: pages('prodotti') },
  { prefix: '/api/admin/quotes', access: pages('preventivi') },
  // I clienti si leggono anche da Preventivi, si modificano solo da Clienti
  { prefix: '/api/admin/clients', access: pages('clienti'), reads: pages('clienti', 'preventivi') },
  { prefix: '/api/admin/radar', access: pages('bandi') },
  { prefix: '/api/admin/settings', access: pages('impostazioni') },
  { prefix: '/api/admin/users', access: pages('collaboratori') },
]

// Corrispondenza per segmenti: prefisso seguito da "/" o fine stringa
const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)
const stripSlash = (path: string) => path.length > 1 ? path.replace(/\/+$/, '') : path

export function apiAccess(path: string, method: string): ApiAccess {
  const p = stripSlash(path)
  const rule = RULES.find(r => matches(p, r.prefix))
  if (!rule) return { kind: 'deny' }
  const m = method.toUpperCase()
  return rule.reads && (m === 'GET' || m === 'HEAD') ? rule.reads : rule.access
}

export function pageForPath(routePath: string): AdminPage | 'session' | 'open' | null {
  const p = stripSlash(routePath)
  if (matches(p, '/admin/account')) return 'session'
  if (matches(p, '/admin/password')) return 'open'
  // Dalla più specifica: "/admin" vale solo esatto
  for (const page of ADMIN_PAGES) {
    const { path } = ADMIN_PAGE_INFO[page]
    if (path === '/admin' ? p === path : matches(p, path)) return page
  }
  return null
}

export function firstAllowedPath(allowed: AdminPage[]): string | null {
  const first = ADMIN_PAGES.find(p => allowed.includes(p))
  return first ? ADMIN_PAGE_INFO[first].path : null
}
