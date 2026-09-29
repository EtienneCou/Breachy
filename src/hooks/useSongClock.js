import { useCallback, useEffect, useRef, useState } from 'react'

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * Horloge de lecture, en secondes. C'est la référence de temps commune :
 * la piste de notes s'en sert pour placer les notes, le jeu pour juger les appuis.
 *
 * - duration  durée du morceau. Sans durée, l'horloge tourne sans fin.
 * - time      temps du morceau. Négatif pendant le décompte (`leadIn`), pour
 *             laisser aux premières notes le temps de tomber depuis le haut.
 * - status    'ready' | 'playing' | 'paused' | 'finished'
 * - speed     vitesse de lecture (1 = normal), modifiable avec setSpeed / slower / faster
 * - toSongTime(performanceNow)  convertit le `time` d'un onNoteOn de usePiano
 *             en temps du morceau, pour comparer avec le moment prévu d'une note.
 */
export function useSongClock(duration = Infinity, { leadIn = 2, tail = 1 } = {}) {
  const [status, setStatus] = useState('ready')
  const [time, setTime] = useState(-leadIn)
  const [speed, setSpeedState] = useState(1)
  const timeRef = useRef(-leadIn)
  const speedRef = useRef(1)
  const lastNow = useRef(0) // performance.now() de la dernière mise à jour de timeRef
  const end = duration + tail

  useEffect(() => {
    if (status !== 'playing') return
    let frame
    lastNow.current = performance.now()
    const tick = () => {
      const now = performance.now()
      timeRef.current += ((now - lastNow.current) / 1000) * speedRef.current
      lastNow.current = now
      if (timeRef.current >= end) {
        timeRef.current = end
        setTime(end)
        setStatus('finished')
        return
      }
      setTime(timeRef.current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [status, end])

  const restart = useCallback(() => {
    timeRef.current = -leadIn
    lastNow.current = performance.now()
    setTime(-leadIn)
    setStatus('playing')
  }, [leadIn])

  const play = useCallback(() => {
    if (status === 'finished') restart()
    else setStatus('playing')
  }, [status, restart])

  const pause = useCallback(() => setStatus((s) => (s === 'playing' ? 'paused' : s)), [])

  const toggle = useCallback(() => (status === 'playing' ? pause() : play()), [status, play, pause])

  const setSpeed = useCallback((value) => {
    speedRef.current = value
    setSpeedState(value)
  }, [])

  const slower = useCallback(() => {
    const next = [...SPEEDS].reverse().find((s) => s < speedRef.current)
    if (next) setSpeed(next)
  }, [setSpeed])

  const faster = useCallback(() => {
    const next = SPEEDS.find((s) => s > speedRef.current)
    if (next) setSpeed(next)
  }, [setSpeed])

  const toSongTime = useCallback(
    (performanceNow) =>
      status === 'playing'
        ? timeRef.current + ((performanceNow - lastNow.current) / 1000) * speedRef.current
        : timeRef.current,
    [status],
  )

  return {
    time, status, duration, speed,
    play, pause, toggle, restart, setSpeed, slower, faster, toSongTime,
    canGoSlower: speed > SPEEDS[0],
    canGoFaster: speed < SPEEDS[SPEEDS.length - 1],
  }
}
