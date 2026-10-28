// Il primo contatto da didap.it: modulo, pagina /contact ed email.

export const CONTACT_EMAIL = 'amministrazione@didap.it'
// Il numero in chiaro accanto all'email, nel modulo: vuoto finché non c'è
export const CONTACT_PHONE = ''

// "Di cosa si tratta", facoltativo: con 'grant' il modulo presenta The Qube
export const PROJECT_TYPES = ['product', 'app', 'site', 'grant'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

// Dominio a etichette: niente punti doppi o in coda
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/
// Da 6 a 15 cifre, con il + davanti e spazi, punti, trattini o parentesi
const PHONE = /^\+?\d{6,15}$/

/**
 * Il campo "email o telefono": dice quale dei due è, o null se non è
 * nessuno dei due.
 */
export function contactKind(value: string): 'email' | 'phone' | null {
  const v = value.trim()
  if (v.includes('@')) return EMAIL.test(v) ? 'email' : null
  return PHONE.test(v.replace(/[\s.()-]/g, '')) ? 'phone' : null
}

// Il numero come link tel: solo cifre e il + davanti
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

// ?product= di "Avvisami quando esce": il nome del prodotto, ripulito
export function productFromQuery(product: unknown) {
  return typeof product === 'string' ? product.trim().slice(0, 80) : ''
}
