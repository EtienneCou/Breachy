import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PianoStage, pianoSynth, usePiano } from '../Components/piano'
import { TransportBar } from '../Components/transport'
import { SessionRecorder } from '../Components/recorder'
import { Metronome } from '../Components/metronome'
import LanguageToggle from '../Components/LanguageToggle/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { useMetronome } from '../hooks/useMetronome.js'
import { useSessionRecorder } from '../hooks/useSessionRecorder.js'
import { useCoachAwake, useRobotMetronome } from '../Components/coach'
import './PianoPage.css'

/**
 * Jeu libre : le clavier seul, sans morceau, sans notes qui tombent ni score.
 */
export default function FreePlayPage() {
  const navigate = useNavigate()
  const { t, isEn } = useLanguage()
  const recorder = useSessionRecorder()
  const metronome = useMetronome({
    play: Boolean(recorder.tempo) && ['countIn', 'recording', 'playing'].includes(recorder.status),
  })
  // Reachy bat la mesure quand le métronome sonne.
  useRobotMetronome(metronome)
  // Il reste éveillé pendant une prise, sa réécoute et le métronome.
  useCoachAwake(metronome.running || ['countIn', 'recording', 'playing'].includes(recorder.status))
  const piano = usePiano({
    onNoteOn: (midi) => recorder.noteOn(midi),
    onNoteOff: (midi) => recorder.noteOff(midi),
  })

  const { sustain: recordSustain } = recorder
  useEffect(() => {
    recordSustain(piano.sustain)
  }, [piano.sustain, recordSustain])

  const hints = useMemo(() => {
    const result = {}
    for (const midi of recorder.playingNotes) result[midi] = 'target'
    return result
  }, [recorder.playingNotes])

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
        <section className="piano-page__card" aria-label={t('freePlay.modeTitle')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
            <button type="button" className="piano-page__back" onClick={() => navigate('/')}>
              {t('common.backHome')}
            </button>
            <LanguageToggle />
          </div>
          <div className="piano-page__song">
            <span className="piano-page__field-label">{t('freePlay.modeLabel')}</span>
            <strong className="piano-page__song-title">{t('freePlay.modeTitle')}</strong>
          </div>
          <p className="piano-page__status">
            {isEn ? (
              <>
                No song: play whatever you want, with mouse, touch, or computer keyboard. <kbd>{piano.octaveKeys.down}</kbd> / <kbd>{piano.octaveKeys.up}</kbd> to
                shift octave, <kbd>Space</kbd> for sustain pedal{piano.sustain ? ' (pressed)' : ''}.
              </>
            ) : (
              <>
                Pas de morceau : joue ce que tu veux, avec la souris, au doigt ou au clavier
                d'ordinateur. <kbd>{piano.octaveKeys.down}</kbd> / <kbd>{piano.octaveKeys.up}</kbd> pour
                changer d'octave, <kbd>Espace</kbd> pour la pédale{piano.sustain ? ' (enfoncée)' : ''}.
              </>
            )}
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
