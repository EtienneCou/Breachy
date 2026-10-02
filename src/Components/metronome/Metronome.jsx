import { MAX_BPM, MIN_BPM, SIGNATURES } from '../../hooks/useMetronome.js'
import { useLanguage } from '../../context/LanguageContext'
import './Metronome.css'

// Nom italien du tempo, comme sur une partition.
function tempoName(bpm) {
  if (bpm < 60) return 'Largo'
  if (bpm < 76) return 'Adagio'
  if (bpm < 108) return 'Andante'
  if (bpm < 120) return 'Moderato'
  if (bpm < 168) return 'Allegro'
  return 'Presto'
}

export default function Metronome({ metronome, locked = false, signatureLocked = false, hints, className = '' }) {
  const { t } = useLanguage()
  const m = metronome

  const defaultHintOn = t('metronome.hintOn')
  const defaultHintOff = t('metronome.hintOff')
  const resolvedHints = hints || { on: defaultHintOn, off: defaultHintOff }

  return (
    <section className={`metronome ${className}`} aria-label={t('metronome.title')}>
      <header className="metronome__head">
        <span className="metronome__title">{t('metronome.title')}</span>
        <button
          type="button"
          role="switch"
          aria-checked={m.enabled}
          className={`metronome__switch${m.enabled ? ' is-on' : ''}`}
          onClick={m.toggle}
        >
          <span className="metronome__switch-track" aria-hidden="true"><span /></span>
          {m.enabled ? t('metronome.on') : t('metronome.off')}
        </button>
      </header>
      <p className="metronome__muted metronome__hint">
        {m.enabled ? resolvedHints.on : resolvedHints.off}
      </p>

      {/* Essai : l'entendre pour régler le tempo, hors enregistrement */}
      {!m.busy && (
        <button
          type="button"
          className={`metronome__try${m.preview ? ' is-on' : ''}`}
          onClick={m.togglePreview}
          aria-pressed={m.preview}
        >
          {m.preview ? t('metronome.stopTry') : t('metronome.try')}
        </button>
      )}

      {/* Un point par temps, le premier plus gros */}
      <div className="metronome__beats" aria-hidden="true">
        {Array.from({ length: m.beats }, (_, i) => (
          <span key={i} className={`metronome__beat${i === 0 ? ' is-first' : ''}${m.beat === i ? ' is-lit' : ''}`} />
        ))}
      </div>

      <div className="metronome__tempo" role="group" aria-label="Tempo">
        <button type="button" className="metronome__step" onClick={() => m.setBpm((b) => b - 1)} disabled={locked || m.bpm <= MIN_BPM} aria-label={t('metronome.slower')}>−</button>
        <p className="metronome__bpm">
          <span className="metronome__bpm-value">{m.bpm}</span>
          <span className="metronome__muted">BPM · {tempoName(m.bpm)}</span>
        </p>
        <button type="button" className="metronome__step" onClick={() => m.setBpm((b) => b + 1)} disabled={locked || m.bpm >= MAX_BPM} aria-label={t('metronome.faster')}>+</button>
      </div>
      <input
        className="metronome__slider"
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={m.bpm}
        disabled={locked}
        onChange={(e) => m.setBpm(Number(e.target.value))}
        onPointerUp={(e) => e.currentTarget.blur()}
        aria-label={t('metronome.tempoAria')}
      />

      {locked && <p className="metronome__muted metronome__locked">{t('metronome.tempoLocked')}</p>}

      <details className="metronome__more">
        <summary>{t('metronome.settings')}</summary>

        <button type="button" className="metronome__tap" onClick={m.tap} disabled={locked} title={t('metronome.tapTempoTitle')}>
          {t('metronome.tapTempo')}
        </button>

        <div className="metronome__field">
          <span className="metronome__muted">{t('metronome.measure')}</span>
          <div className="metronome__signatures" role="radiogroup" aria-label={t('metronome.measure')}>
            {Object.keys(SIGNATURES).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={m.signature === s}
                className={`metronome__sig${m.signature === s ? ' is-active' : ''}`}
                disabled={locked || signatureLocked}
                title={signatureLocked ? t('metronome.measureLockedTitle') : undefined}
                onClick={() => m.setSignature(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="metronome__check">
          <input type="checkbox" checked={m.accent} onChange={(e) => m.setAccent(e.target.checked)} />
          {t('metronome.accentFirst')}
        </label>

        <label className="metronome__field">
          <span className="metronome__muted">{t('metronome.volume')} {Math.round(m.volume * 100)} %</span>
          <input
            className="metronome__slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={m.volume}
            onChange={(e) => m.setVolume(Number(e.target.value))}
            onPointerUp={(e) => e.currentTarget.blur()}
          />
        </label>
      </details>
    </section>
  )
}
