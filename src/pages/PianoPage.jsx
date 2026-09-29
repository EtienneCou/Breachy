import { useState } from 'react'
import { PianoSettings, PianoStage, midiToFreq, noteName, scientificName, usePiano } from '../components/piano'
import './pages.css'

/**
 * Page du piano : la piste des notes en haut, le clavier, puis les réglages.
 *
 * - notes      notes midi du morceau choisi. Le clavier s'adapte pour toutes
 *              les couvrir. Sans notes : jeu libre avec changement d'octave.
 * - hints      { midi: 'target' | 'hit' | 'miss' } retour visuel sur les touches
 * - onNoteOn   (midi, { time }) à chaque appui, pour juger le jeu
 * - children   ce qui s'affiche sur la piste (les notes qui tombent)
 */
export default function PianoPage({ notes, hints, onNoteOn, children }) {
  const [lastNote, setLastNote] = useState(null)
  const piano = usePiano({
    notes,
    onNoteOn: (midi, info) => {
      setLastNote(midi)
      onNoteOn?.(midi, info)
    },
  })

  return (
    <main className="screen">
      <PianoStage piano={piano} hints={hints}>
        {children}
      </PianoStage>

      <footer className="bar">
        <div className="bar__row">
          <h1 className="brand bar__brand">Pianoforte</h1>
          <p className="bar__readout" aria-live="polite">
            {lastNote === null ? (
              <span className="bar__idle">Appuyez sur une touche</span>
            ) : (
              <>
                <span className="bar__note">{noteName(lastNote)}</span>
                <span className="bar__meta">
                  {scientificName(lastNote)} · {midiToFreq(lastNote).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Hz · MIDI {lastNote}
                </span>
              </>
            )}
          </p>
          <span className={`pedal${piano.sustain ? ' is-on' : ''}`}>Pédale · Espace</span>
        </div>

        <div className="bar__row">
          {piano.canShiftOctave && (
            <div className="piano-setting">
              Octave
              <button type="button" className="button" onClick={() => piano.setOctave((o) => o - 1)} aria-label="Octave inférieure">−</button>
              <span className="bar__octave">{piano.octave}</span>
              <button type="button" className="button" onClick={() => piano.setOctave((o) => o + 1)} aria-label="Octave supérieure">+</button>
            </div>
          )}
          <PianoSettings piano={piano} />
          <p className="bar__hint">
            Plage : {noteName(piano.range.from)} → {noteName(piano.range.to)}
            {piano.canShiftOctave && (
              <> · Octave : <kbd>{piano.octaveKeys.down}</kbd> / <kbd>{piano.octaveKeys.up}</kbd></>
            )}
          </p>
        </div>

        {piano.missingNotes.length > 0 && (
          <p className="bar__warning" role="alert">
            Ce morceau dépasse les 3 octaves jouables au clavier. Notes sans touche : {piano.missingNotes.map(noteName).join(', ')}
          </p>
        )}
      </footer>
    </main>
  )
}
