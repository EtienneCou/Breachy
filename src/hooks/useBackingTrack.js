import { useEffect, useRef } from 'react'
import { backingSynth } from '../Components/piano/backingSynth.js'

const LOOKAHEAD = 0.3 // secondes de morceau programmées à l'avance
const TICK_MS = 50

/**
 * Joue l'accompagnement (les notes que le joueur ne joue pas) en suivant l'horloge
 * de useSongClock : démarre avec Jouer, s'arrête en pause, suit la vitesse et
 * repart au bon endroit après Recommencer.
 *
 * - notes  [{ note, start, duration, channel, instrument }] triées par début, en secondes
 * - clock  objet renvoyé par useSongClock()
 */
export function useBackingTrack(notes, clock) {
  const clockRef = useRef(clock)
  useEffect(() => {
    clockRef.current = clock
  })

  const { status, speed } = clock

  useEffect(() => {
    if (status !== 'playing' || notes.length === 0) return
    backingSynth.ensure()

    let cursor = -1 // index de la prochaine note à programmer
    let lastSongTime = null

    const tick = () => {
      const songNow = clockRef.current.toSongTime(performance.now())
      // Premier passage, ou retour en arrière (Recommencer) : on repart de l'instant présent.
      if (cursor === -1 || songNow < lastSongTime - 0.05) {
        backingSynth.stopAll()
        cursor = firstStartingAfter(notes, songNow)
      }
      lastSongTime = songNow

      const audioNow = backingSynth.currentTime
      while (cursor < notes.length && notes[cursor].start < songNow + LOOKAHEAD) {
        const note = notes[cursor]
        const when = audioNow + Math.max(0, (note.start - songNow) / speed)
        backingSynth.play(note, when, note.duration / speed)
        cursor++
      }
    }

    tick()
    const id = setInterval(tick, TICK_MS)
    return () => {
      clearInterval(id)
      backingSynth.stopAll()
    }
  }, [status, speed, notes])
}

// Premier index dont la note commence à `time` ou après (notes triées).
function firstStartingAfter(notes, time) {
  let lo = 0
  let hi = notes.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (notes[mid].start < time) lo = mid + 1
    else hi = mid
  }
  return lo
}
