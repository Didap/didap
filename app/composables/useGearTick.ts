// Lo scatto di un cricchetto: la registrazione della cinghia di un
// attacco da snowboard ("snowboard straps 6" di fleurescence, da
// Pixabay, Pixabay Content License), in /sounds/cricchetto.mp3.
// Ogni scatto è un dente solo, tagliato corto: la coda della stanza
// registrata suonerebbe come riverbero. `step`, al passaggio su una
// voce, è il dente leggero; `press`, al click e ai passi di rotella,
// quello forte. Ogni volta cambia appena di velocità: due scatti di
// fila non suonano identici. Il browser lascia suonare solo dopo che la
// persona ha interagito con la pagina (un click, un tasto): prima resta
// muto, senza errori.

type Kind = 'step' | 'press'

const SRC = '/sounds/cricchetto.mp3'

// I tagli del file, in secondi: un dente ciascuno, con 30ms di coda
const CUTS: Record<Kind, { from: number, to: number, gain: number }> = {
  step: { from: 0.042, to: 0.072, gain: 0.4 },
  press: { from: 0.116, to: 0.148, gain: 0.5 },
}

let ctx: AudioContext | null = null
let out: GainNode | null = null
let sample: AudioBuffer | null = null
let loading: Promise<void> | null = null
let last = 0

function audio() {
  if (typeof window === 'undefined') return null
  // Senza un gesto il contesto nascerebbe sospeso, con un avviso in console
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    // La registrazione arriva al fondo scala: un compressore la tiene
    // sotto, così gli scatti ravvicinati della rotella non saturano
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -12
    comp.knee.value = 6
    comp.ratio.value = 4
    comp.attack.value = 0.001
    comp.release.value = 0.06
    comp.connect(ctx.destination)
    out = ctx.createGain()
    out.connect(comp)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function load(ac: AudioContext) {
  loading ??= fetch(SRC)
    .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then(data => ac.decodeAudioData(data))
    .then((buffer) => { sample = buffer })
    // Senza il file il menu resta muto: si riprova al prossimo scatto
    .catch(() => { loading = null })
}

function play(kind: Kind) {
  const ac = audio()
  if (!ac || !out) return
  if (!sample) {
    load(ac)
    return
  }
  if (ac.state !== 'running') return
  // Gli scatti ravvicinati si fondono in un ronzio: uno ogni 40ms al massimo
  const now = performance.now()
  if (kind === 'step' && now - last < 40) return
  last = now

  const cut = CUTS[kind]
  const length = Math.min(cut.to, sample.duration) - cut.from
  const t = ac.currentTime

  const src = ac.createBufferSource()
  src.buffer = sample
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.08
  // Il dente pieno per 6ms, poi si spegne in fretta: niente coda di
  // stanza, e il taglio non fa clic
  const env = ac.createGain()
  const end = t + length / src.playbackRate.value
  env.gain.setValueAtTime(cut.gain, t)
  env.gain.setValueAtTime(cut.gain, t + 0.006)
  env.gain.exponentialRampToValueAtTime(0.001, end)
  src.connect(env).connect(out)
  src.start(t, cut.from, length)
}

// Il file si prepara al primo tocco sulla pagina, così il primo scatto
// non va perso. Una volta sola per pagina, e solo con il mouse: col dito
// non c'è né l'indice né la corsa della rotella, che lo fanno suonare
let warming = false

export function useGearTick() {
  if (import.meta.client && !warming && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    warming = true
    const warm = () => {
      const ac = audio()
      if (ac) load(ac)
    }
    window.addEventListener('pointerdown', warm, { once: true, passive: true })
    window.addEventListener('keydown', warm, { once: true, passive: true })
  }
  return play
}
