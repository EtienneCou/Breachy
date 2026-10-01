import { useCallback, useEffect, useRef, useState } from 'react'
import { pianoSynth } from '../Components/piano'
import { SIGNATURES, beatLevel, playClick, signatureOf } from '../Components/metronome/click.js'

export { SIGNATURES }
export const MIN_BPM = 30
export const MAX_BPM = 240

const STORAGE_KEY = 'breachy.metronome'
const DEFAULTS = { enabled: false, bpm: 90, signature: '4/4', accent: true, volume: 0.6 }

const LOOKAHEAD = 0.12 // secondes programmées à l'avance dans le moteur audio
const TICK_MS = 25 // fréquence du programmateur

/** Réglages retenus du métronome (aussi lus par le métronome de l'entraînement). */
export function loadMetronomeSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  } catch {
    return DEFAULTS
  }
}

const clampBpm = (bpm) => Math.round(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)))

/**
 * Métronome du jeu libre, joué dans le moteur audio du piano (pianoSynth) et
 * programmé à l'avance pour rester parfaitement régulier même si la page est occupée.
 * Les réglages (activé, tempo, mesure, accent, volume) sont retenus d'une visite à l'autre.
 *
 * Le métronome ne sonne pas tout seul : activé (`enabled`), il sonne quand la page
 * le demande (`play`), c'est-à-dire pendant un enregistrement et sa réécoute.
 * alignTo(t) cale ses temps pour qu'un premier temps tombe à l'instant audio `t`.
 *
 * - play  la page demande le métronome (enregistrement en cours…)
 *
 * Hors enregistrement, `preview` le fait battre pour essayer un réglage
 * (togglePreview / stopPreview) ; l'essai est indisponible pendant `play`.
 *
 * Retourne { enabled, toggle, running (il sonne), preview, togglePreview, stopPreview, busy, bpm, setBpm, signature, setSignature,
 *            accent, setAccent, volume, setVolume, beat (temps en cours, -1 à l'arrêt),
 *            beats, tap, measureLength, audioNow, alignTo }.
 */
export function useMetronome({ play = false } = {}) {
  const [settings, setSettings] = useState(loadMetronomeSettings)
  const [preview, setPreview] = useState(false)
  const [session, setSession] = useState(0) // relance le programmateur après un nouveau calage
  const [beat, setBeat] = useState(-1)

  const { enabled, bpm, signature, accent, volume } = settings
  const running = play ? enabled : preview
  const sig = signatureOf(signature)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // stockage indisponible : les réglages ne sont simplement pas retenus
    }
  }, [settings])

  // Réglages lus par le programmateur sans le relancer.
  const live = useRef({ bpm, sig, accent })
  useEffect(() => {
    live.current = { bpm, sig, accent }
  })

  const anchor = useRef(null) // instant audio d'un premier temps, ou null : on part tout de suite

  // Volume : un gain propre au métronome, branché sur la sortie commune.
  const gain = useRef(null)
  const ensureOutput = () => {
    pianoSynth.ensureContext()
    if (!gain.current) {
      gain.current = pianoSynth.ctx.createGain()
      gain.current.connect(pianoSynth.master)
    }
    return pianoSynth.ctx
  }
  useEffect(() => {
    if (gain.current) gain.current.gain.value = volume
  }, [volume])

  useEffect(() => {
    if (!running) return
    const ctx = ensureOutput()
    gain.current.gain.value = volume

    // Premier temps à jouer : le prochain de la grille calée, ou tout de suite.
    const interval = 60 / live.current.bpm
    let index = 0
    let next = ctx.currentTime + 0.05
    if (anchor.current != null) {
      index = Math.ceil((ctx.currentTime + 0.02 - anchor.current) / interval)
      next = anchor.current + index * interval
    }
    const timers = new Set()
    const clicks = new Set() // clics déjà programmés, coupés à l'arrêt (pause d'un enregistrement)

    const schedule = () => {
      while (next < ctx.currentTime + LOOKAHEAD) {
        const { bpm: tempo, sig: s, accent: accented } = live.current
        const position = ((index % s.beats) + s.beats) % s.beats
        const click = playClick(ctx, gain.current, next, beatLevel(s, position, accented))
        clicks.add(click)
        click.onended = () => clicks.delete(click)
        // le point du temps s'allume quand le clic sonne vraiment
        const timer = setTimeout(() => {
          timers.delete(timer)
          setBeat(position)
        }, Math.max(0, (next - ctx.currentTime) * 1000))
        timers.add(timer)
        index++
        next += 60 / tempo
      }
    }

    schedule()
    const id = setInterval(schedule, TICK_MS)
    return () => {
      clearInterval(id)
      for (const t of timers) clearTimeout(t)
      for (const c of clicks) {
        try {
          c.stop()
        } catch {
          // déjà joué
        }
      }
      setBeat(-1)
    }
    // le volume est suivi à part : le changer ne relance pas le métronome
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, session])

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))
  const setBpm = useCallback((value) => {
    setSettings((s) => ({ ...s, bpm: clampBpm(typeof value === 'function' ? value(s.bpm) : value) }))
  }, [])

  const toggle = useCallback(() => setSettings((s) => ({ ...s, enabled: !s.enabled })), [])

  const togglePreview = useCallback(() => {
    anchor.current = null // essai : il part tout de suite
    setPreview((p) => !p)
  }, [])
  const stopPreview = useCallback(() => setPreview(false), [])

  const alignTo = useCallback((time) => {
    anchor.current = time
    setSession((s) => s + 1)
  }, [])

  // Tempo au toucher : la moyenne des derniers écarts entre les appuis.
  const taps = useRef([])
  const tap = useCallback(() => {
    const now = performance.now()
    const recent = taps.current.filter((t) => now - t < 2500)
    recent.push(now)
    taps.current = recent.slice(-5)
    if (taps.current.length >= 2) {
      const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i])
      const average = gaps.reduce((a, b) => a + b, 0) / gaps.length
      setBpm(60000 / average)
    }
  }, [setBpm])

  return {
    enabled,
    running,
    toggle,
    preview: preview && !play,
    togglePreview,
    stopPreview,
    busy: play,
    bpm,
    setBpm,
    signature,
    setSignature: (value) => update({ signature: value }),
    accent,
    setAccent: (value) => update({ accent: value }),
    volume,
    setVolume: (value) => update({ volume: value }),
    beat,
    beats: sig.beats,
    tap,
    measureLength: (sig.beats * 60) / bpm,
    /** Instant audio actuel (démarre le moteur audio si besoin). */
    audioNow: () => ensureOutput().currentTime,
    alignTo,
  }
}
