import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Piano, pianoSynth, usePiano } from '../Components/piano'
import { Metronome } from '../Components/metronome'
import { playCue } from '../Components/metronome/click.js'
import TrackList from '../Components/studio/TrackList.jsx'
import StudioSave from '../Components/studio/StudioSave.jsx'
import { DRUM_OCTAVE, drumPads, instrumentById } from '../Components/studio/instruments.js'
import LanguageToggle from '../Components/LanguageToggle/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { useMetronome } from '../hooks/useMetronome.js'
import { LOOP_MEASURES, useStudio } from '../hooks/useStudio.js'
import './StudioPage.css'

export default function StudioPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const metronome = useMetronome({ play: busy })
  const cues = useRef([])

  const metronomeHints = {
    on: t('metronome.studioHintOn'),
    off: t('metronome.studioHintOff'),
  }

  const studio = useStudio({
    bpm: metronome.bpm,
    beatsPerMeasure: metronome.beats,
    onLoopStart: (t, { countIn }) => {
      metronome.stopPreview()
      metronome.alignTo(t)
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
          <h1 className="studio__title">{t('studio.title')}</h1>

          <div className="studio__transport" role="toolbar" aria-label={t('transport.toolbarAria')}>
            {busy ? (
              <button type="button" className="studio__btn studio__btn--stop" onClick={stop}>
                ⏹ {studio.status === 'playing' ? t('studio.stop') : t('studio.cancelTake')}
              </button>
            ) : (
              <button type="button" className="studio__btn studio__btn--play" onClick={studio.play} disabled={!hasNotes || !studio.ready}>
                {t('studio.playLoop')}
              </button>
            )}
            {!busy && (
              <button
                type="button"
                className="studio__btn"
                onClick={() => setSaving(true)}
                disabled={!hasNotes || saving}
                title={t('studio.saveTooltip')}
              >
                {t('studio.save')}
              </button>
            )}
            {studio.canUndo && (
              <button type="button" className="studio__btn" onClick={studio.undoTake} title={t('studio.undoTooltip')}>
                {t('studio.undoTake')}
              </button>
            )}
          </div>

          <p className="studio__position" aria-live="polite">
            {countdown != null ? (
              <span className="studio__countdown">{countdown}</span>
            ) : busy ? (
              <>
                {studio.status === 'recording' && <span className="studio__rec">● REC</span>}
                {t('studio.measurePos', measure, measures, beatInMeasure)}
              </>
            ) : (
              <span className="studio__muted">{t('studio.loopSummary', measures, loopBeats)}</span>
            )}
          </p>

          <div className="studio__loop" role="radiogroup" aria-label={t('studio.loopGroupLabel')}>
            <span className="studio__muted">{t('studio.loop')}</span>
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
            <span className="studio__muted">{t('studio.measures')}</span>
          </div>
        </header>

        {saving && !busy && (
          <StudioSave studio={studio} bpm={metronome.bpm} signature={metronome.signature} onClose={() => setSaving(false)} />
        )}

        {!studio.ready && <p className="studio__loading">{t('studio.loading')}</p>}

        <div className="studio__tracks">
          <TrackList studio={studio} beatsPerMeasure={beats} onRecord={(id) => studio.record(id, beats)} />
        </div>

        {studio.selected ? (
          <StudioKeyboard key={`${studio.selected.id}:${studio.selected.instrument}`} studio={studio} />
        ) : (
          <p className="studio__hint">{t('studio.selectTrackPrompt')}</p>
        )}
      </div>

      <aside className="studio__side">
        <section className="studio__card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
            <button type="button" className="studio__back" onClick={() => navigate('/')}>
              {t('common.backHome')}
            </button>
            <LanguageToggle />
          </div>
          <p className="studio__muted studio__help">
            {t('studio.help1')}<br />
            {t('studio.help2')}<br />
            {t('studio.help3')}<br />
            {t('studio.help4')}
          </p>
        </section>
        <Metronome metronome={metronome} locked={busy} signatureLocked={hasNotes} hints={metronomeHints} />
      </aside>
    </main>
  )
}

function StudioKeyboard({ studio }) {
  const { t } = useLanguage()
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
    <section className="studio__keyboard" style={{ '--track-color': instrument.color }} aria-label={`Keyboard: ${instrument.label}`}>
      <div className="studio__keyboard-bar">
        <span className="studio__keyboard-title">
          <span aria-hidden="true">{instrument.icon}</span> {instrument.label}
        </span>
        {piano.canShiftOctave && (
          <span className="studio__octave" role="group" aria-label={t('transport.octaveHeading')}>
            <button type="button" className="studio__chip" onClick={() => piano.setOctave((o) => o - 1)} disabled={!piano.canGoLower} aria-label={t('studio.octaveLower')}>
              − <kbd>{piano.octaveKeys.down}</kbd>
            </button>
            <span className="studio__muted">{t('transport.octaveHeading')} {piano.octave}</span>
            <button type="button" className="studio__chip" onClick={() => piano.setOctave((o) => o + 1)} disabled={!piano.canGoHigher} aria-label={t('studio.octaveHigher')}>
              + <kbd>{piano.octaveKeys.up}</kbd>
            </button>
          </span>
        )}
        {drums && <span className="studio__muted">{t('studio.drumPadHint')}</span>}
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
