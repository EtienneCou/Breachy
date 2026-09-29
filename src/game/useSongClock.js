import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Horloge d'une partie, en secondes. C'est la référence de temps commune :
 * la piste de notes s'en sert pour placer les notes, le jeu pour juger les appuis.
 *
 * - time      temps du morceau. Négatif pendant le décompte (`leadIn`), pour
 *             laisser aux premières notes le temps de tomber depuis le haut.
 * - status    'ready' | 'playing' | 'paused' | 'finished'
 * - toSongTime(performanceNow)  convertit le `time` d'un onNoteOn de usePiano
 *             en temps du morceau, pour comparer avec note.time.
 */
export function useSongClock(duration, { leadIn = 2, tail = 1 } = {}) {
  const [status, setStatus] = useState('ready')
  const [time, setTime] = useState(-leadIn)
  const origin = useRef(0) // performance.now() correspondant à time = 0
  const timeRef = useRef(-leadIn)

  useEffect(() => {
    if (status !== 'playing') return
    let frame
    const tick = () => {
      const t = (performance.now() - origin.current) / 1000
      if (t >= duration + tail) {
        timeRef.current = duration + tail
        setTime(timeRef.current)
        setStatus('finished')
        return
      }
      timeRef.current = t
      setTime(t)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [status, duration, tail])

  const play = useCallback(() => {
    origin.current = performance.now() - timeRef.current * 1000
    setStatus('playing')
  }, [])

  const pause = useCallback(() => setStatus((s) => (s === 'playing' ? 'paused' : s)), [])

  const restart = useCallback(() => {
    timeRef.current = -leadIn
    setTime(-leadIn)
    origin.current = performance.now() + leadIn * 1000
    setStatus('playing')
  }, [leadIn])

  const toSongTime = useCallback((performanceNow) => (performanceNow - origin.current) / 1000, [])

  return { time, status, duration, play, pause, restart, toSongTime }
}
