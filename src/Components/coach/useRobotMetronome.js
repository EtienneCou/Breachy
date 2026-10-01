import { useEffect, useRef } from 'react'
import { useRobotDance } from './useRobotDance.js'

const METRONOME = { level: 'metronome' } // style de danse : voir DANCE_STYLES

/**
 * Reachy bat la mesure avec le métronome (jeu libre, Studio) : la tête hoche sur
 * chaque temps et les antennes battent. Métronome arrêté, il se repose.
 *
 * `metronome` : objet de useMetronome(). Ses temps (`beat`, mis à jour quand le clic
 * sonne vraiment) recalent Reachy ; entre deux clics, il avance au tempo (`bpm`).
 */
export function useRobotMetronome(metronome) {
  const { running, bpm, beat } = metronome
  const period = 60 / bpm

  // Un clic vient de sonner : on compte un temps de plus, à cet instant.
  const clicks = useRef({ count: 0, at: 0 })
  useEffect(() => {
    if (beat < 0) return
    clicks.current = { count: clicks.current.count + 1, at: performance.now() }
  }, [beat])

  // Temps « en rythme » pour la danse : les clics tombent sur les multiples de `period`.
  const beatRef = useRef(() => null)
  useEffect(() => {
    if (running) clicks.current = { count: 0, at: performance.now() }
    beatRef.current = () => {
      if (!running) return null
      const { count, at } = clicks.current
      return { time: count * period + (performance.now() - at) / 1000, period }
    }
  }, [running, period])

  const danceRef = useRef(METRONOME)
  useRobotDance({ beatRef, danceRef })
}
