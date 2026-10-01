import { useCallback, useEffect, useRef, useState } from 'react'
import { PLAYBACK_CHANNEL, pianoSynth } from '../Components/piano'

/**
 * Enregistre ce que le joueur joue en jeu libre, puis le rejoue.
 *
 * Un enregistrement est une liste d'événements datés (en secondes depuis le début,
 * pauses non comptées) :
 *   { time, type: 'on' | 'off', midi }   touche enfoncée / relâchée
 *   { time, type: 'sustain', on }        pédale
 *
 * status :
 * - 'idle'       rien d'enregistré
 * - 'countIn'    décompte avant l'enregistrement (elapsed négatif jusqu'au départ)
 * - 'recording'  enregistrement en cours
 * - 'paused'     enregistrement en pause (ce qui est joué n'est pas gardé)
 * - 'ready'      enregistrement terminé, prêt à écouter
 * - 'playing'    lecture en cours
 * - 'playPaused' lecture en pause
 *
 * À brancher sur usePiano : noteOn / noteOff / sustain reçoivent ce que joue le joueur.
 * `playingNotes` (Set) : notes jouées par la lecture, pour les allumer sur le clavier.
 * `tempo` : { bpm, signature } si la prise est calée sur le métronome (son temps 0
 * tombe sur un premier temps), sinon null.
 */
export function useSessionRecorder() {
  const [status, setStatus] = useState('idle')
  const [events, setEvents] = useState([])
  const [elapsed, setElapsed] = useState(0) // durée enregistrée, ou position de lecture
  const [playingNotes, setPlayingNotes] = useState(() => new Set())
  const [tempo, setTempo] = useState(null)

  const take = useRef([]) // événements en cours d'enregistrement
  const held = useRef(new Set()) // notes enfoncées pendant l'enregistrement
  const sustainOn = useRef(false)
  const clock = useRef({ startedAt: null, offset: 0 }) // offset = temps déjà écoulé avant la dernière reprise
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  })

  // startedAt null : horloge arrêtée (pause), le temps reste à `offset`
  const now = () =>
    clock.current.startedAt == null ? clock.current.offset : clock.current.offset + (performance.now() - clock.current.startedAt) / 1000
  const startClock = (offset) => {
    clock.current = { startedAt: performance.now(), offset }
  }

  // ---------- Enregistrement ----------

  // Notes jouées juste avant la fin du décompte : gardées, au tout début de la prise.
  const EARLY = 0.15
  const countInTimer = useRef(0)

  /**
   * Lance un enregistrement. Options :
   * - delay  secondes de décompte avant le départ (0 : tout de suite)
   * - tempo  { bpm, signature } si la prise est calée sur le métronome
   */
  const record = useCallback(({ delay = 0, tempo: takeTempo = null } = {}) => {
    clearTimeout(countInTimer.current)
    take.current = []
    held.current = new Set()
    // pédale déjà enfoncée au départ : on la note pour la rejouer pareil
    if (sustainOn.current) take.current.push({ time: 0, type: 'sustain', on: true })
    setEvents([])
    setTempo(takeTempo)
    setElapsed(-delay)
    clock.current = { startedAt: performance.now() + delay * 1000, offset: 0 }
    if (delay > 0) {
      setStatus('countIn')
      countInTimer.current = setTimeout(() => setStatus((s) => (s === 'countIn' ? 'recording' : s)), delay * 1000)
    } else {
      setStatus('recording')
    }
  }, [])

  // Ferme les notes encore enfoncées, pour qu'aucune ne reste bloquée à la lecture.
  const closeHeld = (time) => {
    for (const midi of held.current) take.current.push({ time, type: 'off', midi })
    held.current.clear()
    if (sustainOn.current) take.current.push({ time, type: 'sustain', on: false })
  }

  const pauseRecording = useCallback(() => {
    if (statusRef.current !== 'recording') return
    const time = now()
    closeHeld(time)
    clock.current = { startedAt: null, offset: time }
    setElapsed(time)
    setStatus('paused')
  }, [])

  const resumeRecording = useCallback(() => {
    if (statusRef.current !== 'paused') return
    if (sustainOn.current) take.current.push({ time: clock.current.offset, type: 'sustain', on: true })
    startClock(clock.current.offset)
    setStatus('recording')
  }, [])

  const stopRecording = useCallback(() => {
    const current = statusRef.current
    // Arrêt pendant le décompte : on annule, rien n'est gardé.
    if (current === 'countIn') {
      clearTimeout(countInTimer.current)
      take.current = []
      held.current.clear()
      setElapsed(0)
      setTempo(null)
      setStatus('idle')
      return
    }
    if (current !== 'recording' && current !== 'paused') return
    const time = current === 'recording' ? now() : clock.current.offset
    if (current === 'recording') closeHeld(time)
    const recorded = take.current
    setEvents(recorded)
    setElapsed(0)
    setStatus(recorded.some((e) => e.type === 'on') ? 'ready' : 'idle')
  }, [])

  const noteOn = useCallback((midi) => {
    const listening = statusRef.current === 'recording' || (statusRef.current === 'countIn' && now() > -EARLY)
    if (!listening) return
    held.current.add(midi)
    take.current.push({ time: Math.max(0, now()), type: 'on', midi })
  }, [])

  const noteOff = useCallback((midi) => {
    if (!held.current.has(midi) || (statusRef.current !== 'recording' && statusRef.current !== 'countIn')) return
    held.current.delete(midi)
    take.current.push({ time: Math.max(0, now()), type: 'off', midi })
  }, [])

  const sustain = useCallback((on) => {
    if (sustainOn.current === on) return
    sustainOn.current = on
    if (statusRef.current === 'recording') take.current.push({ time: now(), type: 'sustain', on })
  }, [])

  // ---------- Lecture ----------

  const cursor = useRef(0) // index du prochain événement à jouer
  const sounding = useRef(new Set()) // notes que la lecture fait sonner
  const frame = useRef(0)

  const silence = () => {
    for (const midi of sounding.current) pianoSynth.noteOff(midi, PLAYBACK_CHANNEL)
    sounding.current.clear()
    pianoSynth.setSustain(false, PLAYBACK_CHANNEL)
    setPlayingNotes(new Set())
  }

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(frame.current)
    silence()
    cursor.current = 0
    setElapsed(0)
    setStatus((s) => (s === 'playing' || s === 'playPaused' ? 'ready' : s))
  }, [])

  const duration = events.length ? events.at(-1).time : 0

  const play = useCallback(() => {
    const current = statusRef.current
    if (current !== 'ready' && current !== 'playPaused') return
    pianoSynth.ensureContext()
    if (current === 'ready') {
      cursor.current = 0
      startClock(0)
    } else {
      startClock(clock.current.offset)
    }
    setStatus('playing')

    // À chaque image : on joue les événements arrivés à leur moment.
    const step = () => {
      const t = now()
      let changed = false
      while (cursor.current < events.length && events[cursor.current].time <= t) {
        const e = events[cursor.current++]
        if (e.type === 'on') {
          pianoSynth.noteOn(e.midi, PLAYBACK_CHANNEL)
          sounding.current.add(e.midi)
          changed = true
        } else if (e.type === 'off') {
          pianoSynth.noteOff(e.midi, PLAYBACK_CHANNEL)
          sounding.current.delete(e.midi)
          changed = true
        } else {
          pianoSynth.setSustain(e.on, PLAYBACK_CHANNEL)
        }
      }
      if (changed) setPlayingNotes(new Set(sounding.current))
      setElapsed(Math.min(t, duration))
      if (cursor.current >= events.length) stopPlayback()
      else frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [events, duration, stopPlayback])

  const pausePlayback = useCallback(() => {
    if (statusRef.current !== 'playing') return
    cancelAnimationFrame(frame.current)
    clock.current = { startedAt: null, offset: now() }
    silence()
    setStatus('playPaused')
  }, [])

  const clear = useCallback(() => {
    stopPlayback()
    take.current = []
    setEvents([])
    setTempo(null)
    setElapsed(0)
    setStatus('idle')
  }, [stopPlayback])

  // Départ de la page : on coupe la lecture.
  useEffect(() => () => {
    clearTimeout(countInTimer.current)
    cancelAnimationFrame(frame.current)
    for (const midi of sounding.current) pianoSynth.noteOff(midi, PLAYBACK_CHANNEL)
    pianoSynth.setSustain(false, PLAYBACK_CHANNEL)
  }, [])

  // Chronomètre affiché pendant l'enregistrement (et le décompte, plus finement).
  useEffect(() => {
    if (status !== 'recording' && status !== 'countIn') return
    const id = setInterval(() => setElapsed(now()), status === 'countIn' ? 50 : 200)
    return () => clearInterval(id)
  }, [status])

  return {
    status,
    events,
    tempo,
    /** Temps actuel de la prise, en secondes (pauses non comptées). */
    position: now,
    elapsed,
    duration,
    noteCount: events.filter((e) => e.type === 'on').length,
    playingNotes,
    record,
    pauseRecording,
    resumeRecording,
    stopRecording,
    play,
    pausePlayback,
    stopPlayback,
    clear,
    noteOn,
    noteOff,
    sustain,
  }
}
