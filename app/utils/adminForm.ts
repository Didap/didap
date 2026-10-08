import type { MediaSlot, ProductOverride, PRODUCT_STATUSES } from '#shared/product'

// Stato del form di /admin e conversione da/verso i dati salvati.
// Il form ha sempre tutti i campi; ogni blocco opzionale ha un interruttore.

export interface AdminForm {
  title: string
  role: string
  status: '' | (typeof PRODUCT_STATUSES)[number]
  scope: string
  stack: string
  lede: string
  url: string
  logo: string
  heroOn: boolean
  hero: MediaSlot
  pairOn: boolean
  pair: MediaSlot[]
  intro: string
  wideOn: boolean
  wide: MediaSlot
  challengeOn: boolean
  challenge: { title: string; body: string }
  featuresOn: boolean
  featureMediaOn: boolean
  feature: MediaSlot[]
  features: { title: string; items: { name: string; desc: string }[] }
  tripleOn: boolean
  triple: MediaSlot[]
  model: string
  next: string
}

export type AdminSource = ProductOverride & { summary?: string }

const slot = (s?: MediaSlot | null): MediaSlot => ({ color: 'ink', ...(s ?? {}) })
const slots = (list: MediaSlot[] | undefined, n: number) =>
  Array.from({ length: n }, (_, i) => slot(list?.[i]))

export function toAdminForm(p: AdminSource): AdminForm {
  return {
    title: p.title ?? '',
    role: p.role ?? '',
    status: p.status ?? '',
    scope: p.scope ?? '',
    stack: p.stack ?? '',
    lede: p.lede || p.summary || '',
    url: p.url ?? '',
    logo: p.logo ?? '',
    heroOn: !!p.hero,
    hero: slot(p.hero),
    pairOn: !!p.media?.pair?.length,
    pair: slots(p.media?.pair, 2),
    intro: p.intro ?? '',
    wideOn: !!p.media?.wide,
    wide: slot(p.media?.wide),
    challengeOn: !!p.challenge,
    challenge: { title: p.challenge?.title ?? '', body: p.challenge?.body ?? '' },
    featuresOn: !!p.features,
    featureMediaOn: !!p.media?.feature?.length,
    feature: slots(p.media?.feature, 2),
    features: {
      title: p.features?.title ?? '',
      items: (p.features?.items ?? []).map((i) => ({ ...i })),
    },
    tripleOn: !!p.media?.triple?.length,
    triple: slots(p.media?.triple, 3),
    model: p.model ?? '',
    next: p.next ?? '',
  }
}

// Uno slot con immagine tiene src/alt, altrimenti colore e scritta
const cleanSlot = (s: MediaSlot): MediaSlot =>
  s.src
    ? { src: s.src, ...(s.alt?.trim() ? { alt: s.alt.trim() } : {}) }
    : { color: s.color ?? 'ink', label: s.label !== false }

export function fromAdminForm(f: AdminForm): ProductOverride {
  const items = f.features.items.filter((i) => i.name.trim() || i.desc.trim())
  return {
    title: f.title,
    role: f.role,
    status: f.status || null,
    scope: f.scope,
    stack: f.stack,
    lede: f.lede,
    url: f.url,
    logo: f.logo,
    hero: f.heroOn ? cleanSlot(f.hero) : null,
    intro: f.intro,
    challenge: f.challengeOn ? { ...f.challenge } : null,
    features: f.featuresOn ? { title: f.features.title, items } : null,
    model: f.model,
    next: f.next,
    media: {
      pair: f.pairOn ? f.pair.map(cleanSlot) : [],
      wide: f.wideOn ? cleanSlot(f.wide) : null,
      feature: f.featuresOn && f.featureMediaOn ? f.feature.map(cleanSlot) : [],
      triple: f.tripleOn ? f.triple.map(cleanSlot) : [],
    },
  }
}

/** Firma stabile del form per capire se ci sono modifiche non salvate */
export const formSignature = (f: AdminForm | null) =>
  f ? JSON.stringify(fromAdminForm(f)) : ''
