import { useEventListener } from '@vueuse/core'

/**
 * La pagina a schermate (la home): una pila di schermate alte quanto lo
 * schermo, `[data-screen]` dentro `root`,
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
 * pagina a ogni passo. Un gesto nuovo durante la corsa non va perso: la
 * allunga alla schermata dopo, ripartendo dalla velocità che ha.
 */
export function useScreens(root: Ref<HTMLElement | undefined>) {
  useHead({ htmlAttrs: { class: 'screen-snap' } })

  const DURATION = 700
  // Parte piano, scorre, si posa piano: come cubic-bezier(0.76, 0, 0.24, 1)
  const ease = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)
  // Una corsa che ne allunga un'altra è già in moto: non riparte da ferma
  const easeOut = (t: number) => 1 - (1 - t) ** 3

  let gliding = false
  let frame = 0
  // Lo stesso scatto da ingranaggio dell'indice a destra, a ogni passo di rotella
  const tick = useGearTick()
  // La schermata dove va la corsa in atto: il gesto dopo conta da lì
  let target = 0

  const screens = () => [...(root.value?.querySelectorAll<HTMLElement>('[data-screen]') ?? [])]

  // La schermata più vicina alla posizione attuale
  function current() {
    const y = window.scrollY
    const tops = screens().map(s => s.offsetTop)
    return tops.reduce((best, top, i) => (Math.abs(top - y) < Math.abs(tops[best]! - y) ? i : best), 0)
  }

  // Dove si sta andando: la schermata della corsa in atto, o quella in scena
  const destination = () => (gliding ? target : current())

  // Parte una corsa verso `el`; falso se non serve (ci si è già, o la
  // corsa in atto va proprio lì)
  function glideTo(el: HTMLElement): boolean {
    const index = Math.max(0, screens().indexOf(el))
    if (gliding && index === target) return false
    const from = window.scrollY
    const to = Math.min(el.offsetTop, document.documentElement.scrollHeight - window.innerHeight)
    target = index
    if (Math.abs(to - from) < 2) return false
    // Una corsa nuova ferma quella in corso: mai due che tirano lo scroll
    cancelAnimationFrame(frame)
    const curve = gliding ? easeOut : ease
    gliding = true
    document.documentElement.classList.add('screen-gliding')
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      window.scrollTo({ top: from + (to - from) * curve(t), behavior: 'instant' })
      if (t < 1) frame = requestAnimationFrame(step)
      else {
        gliding = false
        document.documentElement.classList.remove('screen-gliding')
      }
    }
    frame = requestAnimationFrame(step)
    return true
  }

  // Una schermata avanti o indietro da dove si sta andando
  function go(delta: number): boolean {
    const list = screens()
    const next = list[Math.max(0, Math.min(list.length - 1, destination() + delta))]
    return next ? glideTo(next) : false
  }

  // Conta solo quello che succede nella pagina a schermate: il modulo di
  // contatto sta fuori (portato nel body), la splash le sta sopra
  const ours = (target: EventTarget | null) =>
    !document.documentElement.classList.contains('splash')
    && (target === document.body || (target instanceof Node && !!root.value?.contains(target)))

  // Rotella e trackpad: conta solo l'inizio di un gesto. L'inerzia del
  // trackpad manda colpi sempre più deboli e ravvicinati; un gesto nuovo
  // arriva dopo una pausa o con un colpo più forte, anche in piena corsa.
  // La rotella girata di seguito manda colpi pari e forti, senza coda e
  // staccati (almeno NOTCH_GAP ms fra uno e l'altro): ognuno vale una
  // schermata. L'inerzia del trackpad manda anche lei colpi pari e forti,
  // ma a ogni fotogramma: non conta. Fra due passi almeno GAP ms, se no un
  // solo gesto deciso ne farebbe due. Il campo di Didi scorre da solo
  const GAP = 250
  const NOTCH_GAP = 25
  let lastT = 0
  let lastAbs = 0
  let lastGo = 0
  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || !ours(e.target) || (e.target as Element).closest?.('textarea')) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    e.preventDefault()
    const now = performance.now()
    const abs = Math.abs(e.deltaY)
    const rising = abs > lastAbs * 1.4 + 4
    const notch = abs >= 50 && abs >= lastAbs && now - lastT > NOTCH_GAP
    const fresh = now - lastT > 160 || (now - lastGo > GAP && (rising || notch))
    lastT = now
    lastAbs = abs
    if (abs < 6 || !fresh) return
    lastGo = now
    if (go(Math.sign(e.deltaY))) tick('press')
  }

  function onKey(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey || !ours(e.target)) return
    const el = e.target instanceof Element ? e.target : null
    if (el?.closest('input, textarea, select, [contenteditable]') || (e.key === ' ' && el?.closest('a, button'))) return
    // Maiuscolo e spazio torna indietro, come nel browser
    const delta = ({
      'ArrowDown': 1,
      'PageDown': 1,
      ' ': e.shiftKey ? -1 : 1,
      'ArrowUp': -1,
      'PageUp': -1,
      'Home': -Infinity,
      'End': Infinity,
    } as Record<string, number>)[e.key]
    if (!delta) return
    e.preventDefault()
    // Il tasto tenuto giù ripete: non è un gesto nuovo, aspetta la fine
    // della corsa invece di lanciarne una per ogni ripetizione
    if (e.repeat && gliding) return
    go(delta)
  }

  // Link a una schermata di questa pagina ("#contatti" o "/#contatti"):
  // stessa corsa, l'indirizzo non cambia. In cattura, prima del router,
  // che così lascia stare
  function onClick(e: MouseEvent) {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]')
    if (!a || a.origin !== location.origin || a.pathname !== location.pathname) return
    const target = document.getElementById(a.hash.slice(1))
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
    // A ogni passaggio sulla metà si ricontrolla chi la contiene: sul
    // confine due schermate la toccano insieme e l'ultimo evento non basta
    observer = new IntersectionObserver(
      () => {
        const mid = window.innerHeight / 2
        const i = els.findIndex((el) => {
          const r = el.getBoundingClientRect()
          return r.top <= mid && r.bottom > mid
        })
        if (i >= 0) active.value = i
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    els.forEach(el => observer!.observe(el))

    if (!matchMedia('(pointer: fine)').matches || !motion.value) return
    useEventListener(window, 'wheel', onWheel, { passive: false })
    useEventListener(window, 'keydown', onKey)
    useEventListener(root, 'click', onClick, { capture: true })
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
    document.documentElement.classList.remove('screen-gliding')
  })

  return { active, motion }
}
