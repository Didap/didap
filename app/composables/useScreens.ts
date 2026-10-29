/**
 * Le pagine a schermate (la home, le schede prodotto a slide): una pila
 * di schermate alte quanto lo schermo, `[data-screen]` dentro `root`,
 * con lo snap del browser (classe `screen-snap` su <html>, stili in
 * main.css). Restituisce la schermata in scena, quella che passa per la
 * metà dello schermo, e `motion` se il movimento è permesso.
 *
 * Con mouse e trackpad un gesto porta alla schermata dopo con una corsa
 * morbida invece dello scatto dello snap. Vale anche per tastiera e
 * ancore interne (indice, invito a scorrere). Lo scroll resta quello
 * della pagina: si anima la sua posizione. Col dito, o con meno
 * movimento, resta lo snap nativo. Mentre corre lo snap si spegne
 * (classe `screen-gliding` su <html>), se no il browser riaggancia la
 * pagina a ogni passo.
 */
export function useScreens(root: Ref<HTMLElement | undefined>) {
  useHead({ htmlAttrs: { class: 'screen-snap' } })

  const DURATION = 950
  // Parte piano, scorre, si posa piano: come cubic-bezier(0.76, 0, 0.24, 1)
  const ease = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

  let gliding = false
  let frame = 0

  const screens = () => [...(root.value?.querySelectorAll<HTMLElement>('[data-screen]') ?? [])]

  // La schermata più vicina alla posizione attuale
  function current() {
    const y = window.scrollY
    const tops = screens().map(s => s.offsetTop)
    return tops.reduce((best, top, i) => (Math.abs(top - y) < Math.abs(tops[best]! - y) ? i : best), 0)
  }

  function glideTo(el: HTMLElement) {
    const from = window.scrollY
    const to = Math.min(el.offsetTop, document.documentElement.scrollHeight - window.innerHeight)
    if (Math.abs(to - from) < 2) return
    gliding = true
    document.documentElement.classList.add('screen-gliding')
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      window.scrollTo({ top: from + (to - from) * ease(t), behavior: 'instant' })
      if (t < 1) frame = requestAnimationFrame(step)
      else {
        document.documentElement.classList.remove('screen-gliding')
        // Un attimo di quiete: la coda d'inerzia del trackpad non vale
        setTimeout(() => (gliding = false), 80)
      }
    }
    frame = requestAnimationFrame(step)
  }

  function go(delta: number) {
    const list = screens()
    const next = list[Math.max(0, Math.min(list.length - 1, current() + delta))]
    if (next) glideTo(next)
  }

  // Fuori dalla home a schermate: il modulo di contatto, la splash
  const elsewhere = (target: EventTarget | null) =>
    (target instanceof Element && !!target.closest('[role="dialog"]'))
    || document.documentElement.classList.contains('splash')

  // Rotella e trackpad: conta solo l'inizio di un gesto. L'inerzia del
  // trackpad manda colpi sempre più deboli e ravvicinati; un gesto nuovo
  // arriva dopo una pausa o con un colpo più forte
  let lastT = 0
  let lastAbs = 0
  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || elsewhere(e.target) || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    e.preventDefault()
    const now = performance.now()
    const abs = Math.abs(e.deltaY)
    const fresh = now - lastT > 180 || abs > lastAbs * 1.6 + 4
    lastT = now
    lastAbs = abs
    if (gliding || abs < 6 || !fresh) return
    go(Math.sign(e.deltaY))
  }

  const NEXT = ['ArrowDown', 'PageDown', ' ']
  const PREV = ['ArrowUp', 'PageUp']
  function onKey(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || elsewhere(e.target)) return
    const el = e.target instanceof Element ? e.target : null
    if (el?.closest('input, textarea, select, [contenteditable]') || (e.key === ' ' && el?.closest('a, button'))) return
    const delta = NEXT.includes(e.key) ? 1 : PREV.includes(e.key) ? -1 : 0
    if (delta || e.key === 'Home' || e.key === 'End') e.preventDefault()
    if (gliding) return
    if (delta) go(delta)
    else if (e.key === 'Home') go(-Infinity)
    else if (e.key === 'End') go(Infinity)
  }

  // Ancore interne: stessa corsa, l'indirizzo non cambia
  function onClick(e: MouseEvent) {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
    const target = a && document.getElementById(a.hash.slice(1))
    if (!target?.hasAttribute('data-screen')) return
    e.preventDefault()
    glideTo(target)
  }

  const active = ref(0)
  const motion = ref(false)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    motion.value = !matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = screens()
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) active.value = els.indexOf(e.target as HTMLElement)
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    els.forEach(el => observer!.observe(el))

    if (!matchMedia('(pointer: fine)').matches || !motion.value) return
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    root.value?.addEventListener('click', onClick)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
    document.documentElement.classList.remove('screen-gliding')
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKey)
    root.value?.removeEventListener('click', onClick)
  })

  return { active, motion }
}
