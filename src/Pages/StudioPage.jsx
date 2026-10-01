import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Piano, pianoSynth, usePiano } from '../Components/piano'
import { Metronome } from '../Components/metronome'
import { playCue } from '../Components/metronome/click.js'
import TrackList from '../Components/studio/TrackList.jsx'
import StudioSave from '../Components/studio/StudioSave.jsx'
import { DRUM_OCTAVE, drumPads, instrumentById } from '../Components/studio/instruments.js'
import { useMetronome } from '../hooks/useMetronome.js'
import { LOOP_MEASURES, useStudio } from '../hooks/useStudio.js'
import './StudioPage.css'

const METRONOME_HINTS = {
  on: 'Il bat pendant la lecture et l\'enregistrement.',
  off: 'Lecture et enregistrement sans métronome.',
}

/**
 * Studio : composer en superposant des pistes qui tournent en boucle sur 4, 8, 12
 * ou 16 mesures. On choisit un instrument par piste (piano, guitare, basse,
 * batterie, boîte à rythme…), et on enregistre chaque piste en un seul passage,
 * après une mesure de décompte, pendant que les autres pistes jouent.
 * Ouverte depuis le bouton « Studio » de l'accueil (route /studio).
 */
export default function StudioPage() {
  const navigate = useNavigate()

  // Le métronome donne le tempo et la mesure de la boucle, et bat (s'il est activé)
  // tant que la boucle tourne.
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false) // panneau de sauvegarde ouvert
  const metronome = useMetronome({ play: busy })
  const cues = useRef([]) // bips du décompte quand le métronome est désactivé

  const studio = useStudio({
    bpm: metronome.bpm,
    beatsPerMeasure: metronome.beats,
    onLoopStart: (t, { countIn }) => {
      metronome.stopPreview()
      metronome.alignTo(t)
      // Métronome désactivé : le décompte reste audible, avec des bips doux.
      if (countIn && !metronome.enabled) {
        pianoSynth.ensureContext()
        const beat = 60 / metronome.bpm
        cues.current = Array.from({ length: countIn }, (_, i) =>
          playCue(pianoSynth.ctx, pianoSynth.master, t - (countIn - i) * beat, i === countIn - 1),
        )
      }
    },
    onStatusChange: (status) => setBusy(status !== 'stopped'),
  })

  const stop = () => {
    for (const cue of cues.current) {
      try {
        cue.stop()
      } catch {
        // déjà joué
      }
    }
    cues.current = []
    studio.stop()
  }

  // Les instruments se chargent dès la première interaction avec la page.
  const { ensureSynth } = studio
  useEffect(() => {
    const warmUp = () => ensureSynth()
    window.addEventListener('pointerdown', warmUp, { once: true })
    window.addEventListener('keydown', warmUp, { once: true })
    return () => {
      window.removeEventListener('pointerdown', warmUp)
      window.removeEventListener('keydown', warmUp)
    }
  }, [ensureSynth])

  const hasNotes = studio.tracks.some((t) => t.notes.length > 0)
  const { position, loopBeats, measures } = studio
  const beats = metronome.beats
  const countdown = studio.status === 'countIn' ? Math.max(1, Math.ceil(-position - 0.01)) : null
  const measure = Math.min(measures, Math.floor(Math.max(0, position) / beats) + 1)
  const beatInMeasure = Math.floor(Math.max(0, position) % beats) + 1

  return (
    <main className="studio">
      <div className="studio__main">
        <header className="studio__bar">
          <h1 className="studio__title">Studio</h1>

          <div className="studio__transport" role="toolbar" aria-label="Lecture de la boucle">
            {busy ? (
              <button type="button" className="studio__btn studio__btn--stop" onClick={stop}>
                ⏹ {studio.status === 'playing' ? 'Arrêter' : 'Annuler la prise'}
              </button>
            ) : (
              <button type="button" className="studio__btn studio__btn--play" onClick={studio.play} disabled={!hasNotes || !studio.ready}>
                ▶ Lire la boucle
              </button>
            )}
            {!busy && (
              <button
                type="button"
                className="studio__btn"
                onClick={() => setSaving(true)}
                disabled={!hasNotes || saving}
                title="Ranger le morceau dans « Mes enregistrements », pour l'écouter ou t'entraîner dessus"
              >
                💾 Sauvegarder
              </button>
            )}
            {studio.canUndo && (
              <button type="button" className="studio__btn" onClick={studio.undoTake} title="Remettre la piste comme avant la dernière prise">
                ↶ Annuler la dernière prise
              </button>
            )}
          </div>

          <p className="studio__position" aria-live="polite">
            {countdown != null ? (
              <span className="studio__countdown">{countdown}</span>
            ) : busy ? (
              <>
                {studio.status === 'recording' && <span className="studio__rec">● REC</span>}
                Mesure <strong>{measure}</strong>/{measures} · temps <strong>{beatInMeasure}</strong>
              </>
            ) : (
              <span className="studio__muted">{measures} mesures · {loopBeats} temps</span>
            )}
          </p>

          <div className="studio__loop" role="radiogroup" aria-label="Longueur de la boucle">
            <span className="studio__muted">Boucle</span>
            {LOOP_MEASURES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={measures === m}
                className={`studio__chip${measures === m ? ' is-active' : ''}`}
                disabled={busy}
                onClick={() => studio.setMeasures(m)}
              >
                {m}
              </button>
            ))}
            <span className="studio__muted">mesures</span>
          </div>
        </header>

        {saving && !busy && (
          <StudioSave studio={studio} bpm={metronome.bpm} signature={metronome.signature} onClose={() => setSaving(false)} />
        )}

        {!studio.ready && <p className="studio__loading">Les instruments se chargent au premier clic ou à la première touche…</p>}

        <div className="studio__tracks">
          <TrackList studio={studio} beatsPerMeasure={beats} onRecord={(id) => studio.record(id, beats)} />
        </div>

        {studio.selected ? (
          <StudioKeyboard key={`${studio.selected.id}:${studio.selected.instrument}`} studio={studio} />
        ) : (
          <p className="studio__hint">Ajoute une piste et sélectionne-la pour jouer au clavier.</p>
        )}
      </div>

      <aside className="studio__side">
        <section className="studio__card">
          <button type="button" className="studio__back" onClick={() => navigate('/')}>
            ← Retour à l'accueil
          </button>
          <p className="studio__muted studio__help">
            1. Ajoute une piste et choisis son instrument.<br />
            2. Clique sur <span className="studio__dot" aria-hidden="true" /> : une mesure de décompte, puis la boucle s'enregistre une fois.<br />
            3. Ajoute d'autres pistes : les précédentes jouent pendant que tu enregistres.<br />
            4. <strong>Sauvegarde</strong> pour retrouver le morceau dans « Mes enregistrements ». À l'entraînement, tu joues la première piste piano 🎯.
          </p>
        </section>
        <Metronome metronome={metronome} locked={busy} signatureLocked={hasNotes} hints={METRONOME_HINTS} />
      </aside>
    </main>
  )
}

// Clavier de la piste sélectionnée. Monté à nouveau à chaque changement de piste
// ou d'instrument, pour repartir sur la bonne octave. Les percussions ont un clavier
// fixe, avec le nom du son sur chaque touche.
function StudioKeyboard({ studio }) {
  const instrument = instrumentById(studio.selected.instrument)
  const drums = Boolean(instrument.drums)

  const toSound = useRef((midi) => midi)
  const piano = usePiano({
    sound: false,
    initialOctave: drums ? DRUM_OCTAVE : instrument.octave,
    allowOctaveShift: !drums,
    onNoteOn: (midi) => {
      const note = toSound.current(midi)
      if (note != null) studio.noteOn(note)
    },
    onNoteOff: (midi) => {
      const note = toSound.current(midi)
      if (note != null) studio.noteOff(note)
    },
  })

  const { from, to } = piano.range
  const pads = useMemo(() => (drums ? drumPads(from, to) : null), [drums, from, to])
  useEffect(() => {
    toSound.current = pads ? (midi) => pads[midi]?.note ?? null : (midi) => midi
  }, [pads])
  const names = useMemo(() => (pads ? Object.fromEntries(Object.entries(pads).map(([k, p]) => [k, p.name])) : undefined), [pads])

  return (
    <section className="studio__keyboard" style={{ '--track-color': instrument.color }} aria-label={`Clavier : ${instrument.label}`}>
      <div className="studio__keyboard-bar">
        <span className="studio__keyboard-title">
          <span aria-hidden="true">{instrument.icon}</span> {instrument.label}
        </span>
        {piano.canShiftOctave && (
          <span className="studio__octave" role="group" aria-label="Octave">
            <button type="button" className="studio__chip" onClick={() => piano.setOctave((o) => o - 1)} disabled={!piano.canGoLower} aria-label="Octave plus grave">
              − <kbd>{piano.octaveKeys.down}</kbd>
            </button>
            <span className="studio__muted">Octave {piano.octave}</span>
            <button type="button" className="studio__chip" onClick={() => piano.setOctave((o) => o + 1)} disabled={!piano.canGoHigher} aria-label="Octave plus aiguë">
              + <kbd>{piano.octaveKeys.up}</kbd>
            </button>
          </span>
        )}
        {drums && <span className="studio__muted">Chaque touche joue un son du kit</span>}
      </div>
      <Piano
        className="studio__piano"
        from={from}
        to={to}
        activeNotes={piano.activeNotes}
        labels={piano.labels}
        names={names}
        onNoteOn={piano.pressNote}
        onNoteOff={piano.releaseNote}
      />
    </section>
  )
}
