import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PianoStage, pianoSynth, usePiano } from '../Components/piano'
import { TransportBar } from '../Components/transport'
import { SessionRecorder } from '../Components/recorder'
import { Metronome } from '../Components/metronome'
import { useMetronome } from '../hooks/useMetronome.js'
import { useSessionRecorder } from '../hooks/useSessionRecorder.js'
import './PianoPage.css'

/**
 * Jeu libre : le clavier seul, sans morceau, sans notes qui tombent ni score.
 * Ouverte depuis le bouton « Jeu libre » de l'accueil (route /jeu-libre).
 * On peut changer d'octave, régler le volume, jouer avec un métronome, et enregistrer
 * sa session pour la réécouter.
 */
export default function FreePlayPage() {
  const navigate = useNavigate()
  const recorder = useSessionRecorder()
  // Le métronome (s'il est activé) sonne pendant une prise calée sur lui, décompte
  // compris, et pendant sa réécoute ; il se tait en pause et à l'arrêt.
  const metronome = useMetronome({
    play: Boolean(recorder.tempo) && ['countIn', 'recording', 'playing'].includes(recorder.status),
  })
  const piano = usePiano({
    onNoteOn: (midi) => recorder.noteOn(midi),
    onNoteOff: (midi) => recorder.noteOff(midi),
  })

  // La pédale est gérée dans usePiano : on suit son état pour l'enregistrer.
  const { sustain: recordSustain } = recorder
  useEffect(() => {
    recordSustain(piano.sustain)
  }, [piano.sustain, recordSustain])

  // Pendant la lecture, les notes rejouées s'allument sur le clavier.
  const hints = useMemo(() => {
    const result = {}
    for (const midi of recorder.playingNotes) result[midi] = 'target'
    return result
  }, [recorder.playingNotes])

  // Démarre le moteur audio dès la première interaction, pour que les
  // premières touches sonnent tout de suite (comme sur la page piano).
  useEffect(() => {
    const warmUp = () => pianoSynth.ensureContext()
    window.addEventListener('pointerdown', warmUp, { once: true })
    window.addEventListener('keydown', warmUp, { once: true })
    return () => {
      window.removeEventListener('pointerdown', warmUp)
      window.removeEventListener('keydown', warmUp)
    }
  }, [])

  return (
    <main className="piano-page">
      <div className="piano-page__play">
        <PianoStage className="piano-page__stage" piano={piano} hints={hints} />
      </div>

      <aside className="piano-page__side piano-page__side--scroll">
        <section className="piano-page__card" aria-label="Jeu libre">
          <button type="button" className="piano-page__back" onClick={() => navigate('/')}>
            ← Retour à l'accueil
          </button>
          <div className="piano-page__song">
            <span className="piano-page__field-label">Mode</span>
            <strong className="piano-page__song-title">Jeu libre</strong>
          </div>
          <p className="piano-page__status">
            Pas de morceau : joue ce que tu veux, avec la souris, au doigt ou au clavier
            d'ordinateur. <kbd>{piano.octaveKeys.down}</kbd> / <kbd>{piano.octaveKeys.up}</kbd> pour
            changer d'octave, <kbd>Espace</kbd> pour la pédale{piano.sustain ? ' (enfoncée)' : ''}.
          </p>
        </section>
        <Metronome
          metronome={metronome}
          locked={Boolean(recorder.tempo) && ['countIn', 'recording', 'paused', 'playing', 'playPaused'].includes(recorder.status)}
        />
        <SessionRecorder recorder={recorder} metronome={metronome} />
        <TransportBar className="piano-page__transport" piano={piano} />
      </aside>
    </main>
  )
}
