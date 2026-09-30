import Piano from './Piano.jsx'
import PianoLanes from './PianoLanes.jsx'
import './Piano.css'

/**
 * Piste de notes + clavier, collés l'un à l'autre, qui remplissent la hauteur
 * disponible. `piano` est l'objet renvoyé par usePiano().
 * Les notes qui tombent (et tout ce qui s'affiche sur la piste) vont en `children`.
 */
export default function PianoStage({ piano, hints, children, className = '' }) {
  const { from, to } = piano.range
  return (
    <div className={`piano-stage ${className}`}>
      <PianoLanes className="piano-stage__lanes" from={from} to={to} activeNotes={piano.activeNotes}>
        {children}
      </PianoLanes>
      <Piano
        from={from}
        to={to}
        activeNotes={piano.activeNotes}
        labels={piano.labels}
        hints={hints}
        onNoteOn={piano.pressNote}
        onNoteOff={piano.releaseNote}
      />
    </div>
  )
}
