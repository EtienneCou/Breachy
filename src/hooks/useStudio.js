import { useCallback, useEffect, useRef, useState } from 'react'
import { STUDIO_CHANNELS, studioSynth } from '../Components/studio/studioSynth.js'
import { instrumentById, variantOf } from '../Components/studio/instruments.js'

export const LOOP_MEASURES = [4, 8, 12, 16]
export const MAX_TRACKS = 8

const STORAGE_KEY = 'breachy.studio'
const LOOKAHEAD = 0.2 // secondes programmées à l'avance
const TICK_MS = 25
const START_DELAY = 0.1 // marge avant le premier temps, le temps de programmer les notes
const EARLY = 0.15 // notes jouées juste avant la fin du décompte : gardées au début de la prise
const VELOCITY = 100

const DEFAULT_PROJECT = { measures: 4, tracks: [] }

function loadProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.tracks ? { ...DEFAULT_PROJECT, ...saved } : DEFAULT_PROJECT
  } catch {
    return DEFAULT_PROJECT
  }
}

// Une piste « s'entend » si elle n'est pas muette et, quand des pistes sont en solo, si elle en fait partie.
export function isAudible(track, tracks) {
  const soloing = tracks.some((t) => t.solo)
  return !track.muted && (!soloing || track.solo)
}

/**
 * Le Studio : des pistes qui tournent en boucle sur 4, 8, 12 ou 16 mesures, chacune
 * avec son instrument, et l'enregistrement d'une piste en un seul passage par-dessus
 * les autres. Les notes sont rangées en temps (battements), pas en secondes : changer
 * le tempo ne décale rien.
 *
 * Une note : { note (midi, ou son de batterie), start, duration } en battements.
 * Une piste : { id, instrument, variant, volume, muted, solo, channel, notes }.
 *
 * Options : bpm, beatsPerMeasure (mesure du métronome), onLoopStart(t, { countIn, recording })
 * appelé au démarrage avec l'instant audio du premier temps (pour caler le métronome),
 * onStatusChange(status) à chaque changement d'état.
 *
 * status : 'stopped' | 'playing' | 'countIn' | 'recording'
 * Le brouillon (pistes et longueur) est gardé dans le navigateur.
 */
export function useStudio({ bpm, beatsPerMeasure, onLoopStart, onStatusChange }) {
  const [project, setProject] = useState(loadProject)
  const [selectedId, setSelectedId] = useState(() => project.tracks[0]?.id ?? null)
  const [status, setStatus] = useState('stopped')
  const [recordingId, setRecordingId] = useState(null)
  const [position, setPosition] = useState(0) // battement en cours dans la boucle (négatif pendant le décompte)
  const [ready, setReady] = useState(studioSynth.ready)
  const [undo, setUndo] = useState(null) // { trackId, notes } : la piste avant la dernière prise

  const { measures, tracks } = project
  const loopBeats = measures * beatsPerMeasure
  const beatSec = 60 / bpm

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    } catch {
      // stockage indisponible : le brouillon n'est simplement pas gardé
    }
  }, [project])

  // Valeurs lues par le programmateur sans le relancer.
  const live = useRef({})
  useEffect(() => {
    live.current = { tracks, loopBeats, beatSec, onLoopStart, onStatusChange }
  })

  const changeStatus = useCallback((value) => {
    setStatus(value)
    live.current.onStatusChange?.(value)
  }, [])

  // ---------- Synthé ----------

  const ensureSynth = useCallback(() => {
    const loading = studioSynth.ensure()
    if (!studioSynth.ready) loading.then(() => setReady(true)).catch((err) => console.warn('Studio : banque de sons indisponible', err))
    return loading
  }, [])

  // Canal de chaque piste : instrument et volume.
  useEffect(() => {
    if (!ready) return
    for (const t of tracks) {
      const instrument = instrumentById(t.instrument)
      studioSynth.setup(t.channel, {
        program: variantOf(instrument, t.variant).program,
        drums: Boolean(instrument.drums),
        volume: t.volume,
      })
    }
  }, [ready, tracks])

  // ---------- Pistes ----------

  const updateTrack = useCallback((id, patch) => {
    setProject((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
  }, [])

  const addTrack = useCallback((instrumentId) => {
    const id = crypto.randomUUID()
    setProject((p) => {
      if (p.tracks.length >= MAX_TRACKS) return p
      const used = new Set(p.tracks.map((t) => t.channel))
      const channel = STUDIO_CHANNELS.find((c) => !used.has(c))
      const instrument = instrumentById(instrumentId)
      const track = { id, instrument: instrument.id, variant: instrument.variants[0].id, volume: 0.8, muted: false, solo: false, channel, notes: [] }
      return { ...p, tracks: [...p.tracks, track] }
    })
    setSelectedId(id)
    ensureSynth()
  }, [ensureSynth])

  const removeTrack = useCallback((id) => {
    setProject((p) => ({ ...p, tracks: p.tracks.filter((t) => t.id !== id) }))
    setSelectedId((sel) => (sel === id ? null : sel))
  }, [])

  const setMeasures = useCallback((value) => setProject((p) => ({ ...p, measures: value })), [])

  // ---------- Lecture et enregistrement ----------

  const session = useRef(null) // { t0, recordId, interval, frame, timers, scheduledUntil, open, take }

  const stop = useCallback(() => {
    const s = session.current
    if (!s) return
    clearInterval(s.interval)
    cancelAnimationFrame(s.frame)
    for (const t of s.timers) clearTimeout(t)
    session.current = null
    studioSynth.stopAll()
    changeStatus('stopped')
    setRecordingId(null)
    setPosition(0)
  }, [changeStatus])

  // Fin d'une prise : les notes encore tenues s'arrêtent à la fin de la boucle,
  // et la piste reçoit la prise (l'ancienne est gardée pour « Annuler la prise »).
  const finishTake = useCallback(() => {
    const s = session.current
    if (!s?.recordId) return
    const { loopBeats: end } = live.current
    for (const [note, start] of s.open) s.take.push({ note, start, duration: Math.max(0.05, end - start) })
    const notes = s.take.sort((a, b) => a.start - b.start)
    const trackId = s.recordId
    setProject((p) => {
      const previous = p.tracks.find((t) => t.id === trackId)
      if (previous) setUndo({ trackId, notes: previous.notes })
      return { ...p, tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, notes } : t)) }
    })
    stop()
  }, [stop])

  /**
   * Démarre la boucle. Avec `recordId`, enregistre cette piste en un seul passage,
   * après `countIn` battements de décompte (le décompte fait partie de l'attente).
   */
  const start = useCallback(async ({ recordId = null, countIn = 0 } = {}) => {
    stop()
    await ensureSynth()
    const ctx = { now: () => studioSynth.currentTime }
    const { beatSec: sec, onLoopStart: notify } = live.current
    const t0 = ctx.now() + START_DELAY + countIn * sec
    const s = { t0, recordId, timers: new Set(), scheduledUntil: ctx.now(), open: new Map(), take: [] }
    session.current = s
    notify?.(t0, { countIn, recording: Boolean(recordId) })
    setRecordingId(recordId)
    changeStatus(recordId ? (countIn ? 'countIn' : 'recording') : 'playing')
    if (recordId && countIn) {
      const timer = setTimeout(() => {
        if (session.current === s) changeStatus('recording')
      }, (t0 - ctx.now()) * 1000)
      s.timers.add(timer)
    }

    const schedule = () => {
      const { tracks: all, loopBeats: beats, beatSec: bs } = live.current
      const loopSec = beats * bs
      const from = s.scheduledUntil
      const to = ctx.now() + LOOKAHEAD
      // Prise en un seul passage : fin de la boucle = fin de l'enregistrement.
      if (s.recordId && ctx.now() >= t0 + loopSec) {
        finishTake()
        return
      }
      const firstLoop = Math.max(0, Math.floor((from - t0) / loopSec))
      const lastLoop = s.recordId ? 0 : Math.floor((to - t0) / loopSec)
      for (const track of all) {
        if (track.id === s.recordId || !isAudible(track, all)) continue
        for (let k = firstLoop; k <= lastLoop; k++) {
          for (const n of track.notes) {
            if (n.start >= beats) continue // hors de la boucle (après l'avoir raccourcie)
            const at = t0 + k * loopSec + n.start * bs
            if (at < from || at >= to || at < t0) continue
            const end = Math.min(n.start + n.duration, beats)
            studioSynth.noteOn(track.channel, n.note, VELOCITY, at)
            studioSynth.noteOff(track.channel, n.note, t0 + k * loopSec + end * bs)
          }
        }
      }
      s.scheduledUntil = to
    }

    const animate = () => {
      const { loopBeats: beats, beatSec: bs } = live.current
      const beat = (ctx.now() - t0) / bs
      setPosition(beat < 0 || s.recordId ? beat : beat % beats)
      s.frame = requestAnimationFrame(animate)
    }

    schedule()
    s.interval = setInterval(schedule, TICK_MS)
    s.frame = requestAnimationFrame(animate)
  }, [stop, ensureSynth, finishTake, changeStatus])

  // Départ de la page : on coupe tout.
  useEffect(() => () => stop(), [stop])

  // ---------- Jeu au clavier ----------

  // Battement de la prise en cours pour une note jouée maintenant, ou null si on n'enregistre pas.
  const takeBeat = () => {
    const s = session.current
    if (!s?.recordId) return null
    const beat = (studioSynth.currentTime - s.t0) / live.current.beatSec
    if (beat < -EARLY / live.current.beatSec || beat >= live.current.loopBeats) return null
    return Math.max(0, beat)
  }

  const selected = tracks.find((t) => t.id === selectedId) ?? null

  /** Note jouée sur la piste sélectionnée (enregistrée si c'est la piste en cours de prise). */
  const noteOn = useCallback((note) => {
    const track = live.current.tracks.find((t) => t.id === selectedId)
    if (!track) return
    ensureSynth()
    studioSynth.noteOn(track.channel, note, VELOCITY)
    const s = session.current
    if (s?.recordId === track.id) {
      const beat = takeBeat()
      if (beat != null) s.open.set(note, beat)
    }
  }, [selectedId, ensureSynth])

  const noteOff = useCallback((note) => {
    const track = live.current.tracks.find((t) => t.id === selectedId)
    if (!track) return
    studioSynth.noteOff(track.channel, note)
    const s = session.current
    if (s?.recordId === track.id && s.open.has(note)) {
      const begin = s.open.get(note)
      s.open.delete(note)
      const beat = takeBeat()
      const end = beat ?? live.current.loopBeats
      s.take.push({ note, start: begin, duration: Math.max(0.05, Math.min(end, live.current.loopBeats) - begin) })
    }
  }, [selectedId])

  const undoTake = useCallback(() => {
    if (!undo) return
    updateTrack(undo.trackId, { notes: undo.notes })
    setUndo(null)
  }, [undo, updateTrack])

  return {
    ready,
    ensureSynth,
    measures,
    setMeasures,
    loopBeats,
    tracks,
    selected,
    selectedId,
    select: setSelectedId,
    addTrack,
    removeTrack,
    updateTrack,
    status,
    recordingId,
    position,
    play: () => start(),
    record: (trackId, countIn) => start({ recordId: trackId, countIn }),
    stop,
    noteOn,
    noteOff,
    canUndo: Boolean(undo) && status === 'stopped',
    undoTake,
  }
}
