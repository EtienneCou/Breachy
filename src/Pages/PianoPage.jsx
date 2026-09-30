import { PianoStage, usePiano } from '../Components/piano'
import { TransportBar } from '../Components/transport'
import { useSongClock } from '../hooks/useSongClock.js'
import './PianoPage.css'

/**
 * Page du piano : la piste des notes et le clavier à gauche, sur toute la
 * hauteur ; la barre de commande en colonne à droite.
 *
 * - notes      notes midi du morceau choisi. Le clavier s'adapte pour toutes
 *              les couvrir. Sans notes : jeu libre avec changement d'octave.
 * - duration   durée du morceau en secondes. Sans durée, le chrono tourne sans fin.
 * - hints      { midi: 'target' | 'hit' | 'miss' } retour visuel sur les touches
 * - onNoteOn   (midi, { time, songTime }) à chaque appui. songTime = temps du
 *              morceau au moment de l'appui, vitesse comprise, pour juger le jeu.
 * - children   ce qui s'affiche sur la piste. Peut être une fonction qui reçoit
 *              l'horloge : {(clock) => <NotesQuiTombent time={clock.time} />}
 */
export default function PianoPage({ notes, duration, hints, onNoteOn, children }) {
  const clock = useSongClock(duration, { leadIn: duration ? 2 : 0 })
  const piano = usePiano({
    notes,
    onNoteOn: (midi, info) => onNoteOn?.(midi, { ...info, songTime: clock.toSongTime(info.time) }),
  })

  return (
    <main className="piano-page">
      <PianoStage className="piano-page__stage" piano={piano} hints={hints}>
        {typeof children === 'function' ? children(clock) : children}
      </PianoStage>
      <TransportBar className="piano-page__transport" clock={clock} piano={piano} />
    </main>
  )
}
