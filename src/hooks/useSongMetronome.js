import { useEffect, useRef } from 'react'
import { pianoSynth } from '../Components/piano'
import { beatLevel, playClick, signatureOf } from '../Components/metronome/click.js'
import { loadMetronomeSettings } from './useMetronome.js'

const LOOKAHEAD = 0.15 // secondes de morceau programmées à l'avance
const TICK_MS = 25

/**
 * Métronome de l'entraînement, calé sur l'horloge du morceau (useSongClock) :
 * il ne joue que pendant la lecture, suit la vitesse et repart au bon temps
 * après « Recommencer ». Les temps tombent à `offset + k × (60 / bpm)` en temps
 * du morceau (offset : décalage des notes dans le jeu, voir splitSong), décompte compris.
 *
 * - tempo    { bpm, signature } du morceau (null : rien)
 * - clock    objet renvoyé par useSongClock()
 * - enabled  activé par le joueur (coupé par défaut)
 * - offset   temps du morceau où tombe un premier temps
 */
export function useSongMetronome(tempo, clock, { enabled = false, offset = 0 } = {}) {
  const clockRef = useRef(clock)
  useEffect(() => {
    clockRef.current = clock
  })

  const { status, speed } = clock
  const bpm = tempo?.bpm
  const signature = tempo?.signature

  useEffect(() => {
    if (!enabled || !bpm || status !== 'playing') return
    pianoSynth.ensureContext()
    const ctx = pianoSynth.ctx
    const { volume, accent } = loadMetronomeSettings()
    const out = ctx.createGain()
    out.gain.value = volume
    out.connect(pianoSynth.master)

    const sig = signatureOf(signature)
    const beatLength = 60 / bpm
    const sources = new Set()
    let index = null // prochain temps à programmer
    let lastSongTime = null
    const stopAll = () => {
      for (const s of sources) {
        try {
          s.stop()
        } catch {
          // déjà arrêté
        }
      }
      sources.clear()
    }

    const tick = () => {
      const songNow = clockRef.current.toSongTime(performance.now())
      // Premier passage, ou retour en arrière (Recommencer) : on repart du prochain temps.
      if (index === null || songNow < lastSongTime - 0.05) {
        stopAll()
        index = Math.ceil((songNow - offset) / beatLength - 0.001)
      }
      lastSongTime = songNow
      const audioNow = ctx.currentTime
      for (let at = offset + index * beatLength; at < songNow + LOOKAHEAD; at = offset + index * beatLength) {
        const position = ((index % sig.beats) + sig.beats) % sig.beats
        const source = playClick(ctx, out, audioNow + Math.max(0, (at - songNow) / speed), beatLevel(sig, position, accent))
        sources.add(source)
        source.onended = () => sources.delete(source)
        index++
      }
    }

    tick()
    const id = setInterval(tick, TICK_MS)
    return () => {
      clearInterval(id)
      stopAll()
      out.disconnect()
    }
  }, [enabled, bpm, signature, offset, status, speed])
}
