import { MAX_BPM, MIN_BPM, SIGNATURES } from '../../hooks/useMetronome.js'
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

/**
 * Panneau du métronome : activé / désactivé (il sonne alors pendant l'enregistrement),
 * tempo (curseur, −/+, tempo au toucher),
 * mesure, accent du premier temps, volume, et un point allumé par temps.
 * `metronome` est l'objet renvoyé par useMetronome().
 * `locked` : tempo et mesure bloqués (prise calée sur le métronome, en cours ou réécoutée).
 * `signatureLocked` : seule la mesure est bloquée (Studio : des pistes sont déjà enregistrées).
 * `hints` : { on, off } textes sous l'interrupteur, selon la page.
 */
const DEFAULT_HINTS = {
  on: 'Il se lance avec l\'enregistrement et s\'arrête avec lui.',
  off: 'L\'enregistrement part sans métronome.',
}

export default function Metronome({ metronome, locked = false, signatureLocked = false, hints = DEFAULT_HINTS, className = '' }) {
  const m = metronome
  return (
    <section className={`metronome ${className}`} aria-label="Métronome">
      <header className="metronome__head">
        <span className="metronome__title">Métronome</span>
        {/* Interrupteur : activé, le métronome se lance avec l'enregistrement */}
        <button
          type="button"
          role="switch"
          aria-checked={m.enabled}
          className={`metronome__switch${m.enabled ? ' is-on' : ''}`}
          onClick={m.toggle}
        >
          <span className="metronome__switch-track" aria-hidden="true"><span /></span>
          {m.enabled ? 'Activé' : 'Désactivé'}
        </button>
      </header>
      <p className="metronome__muted metronome__hint">
        {m.enabled ? hints.on : hints.off}
      </p>

      {/* Essai : l'entendre pour régler le tempo, hors enregistrement */}
      {!m.busy && (
        <button
          type="button"
          className={`metronome__try${m.preview ? ' is-on' : ''}`}
          onClick={m.togglePreview}
          aria-pressed={m.preview}
        >
          {m.preview ? '⏹ Arrêter l\'essai' : '▶ Essayer'}
        </button>
      )}

      {/* Un point par temps, le premier plus gros */}
      <div className="metronome__beats" aria-hidden="true">
        {Array.from({ length: m.beats }, (_, i) => (
          <span key={i} className={`metronome__beat${i === 0 ? ' is-first' : ''}${m.beat === i ? ' is-lit' : ''}`} />
        ))}
      </div>

      <div className="metronome__tempo" role="group" aria-label="Tempo">
        <button type="button" className="metronome__step" onClick={() => m.setBpm((b) => b - 1)} disabled={locked || m.bpm <= MIN_BPM} aria-label="Ralentir">−</button>
        <p className="metronome__bpm">
          <span className="metronome__bpm-value">{m.bpm}</span>
          <span className="metronome__muted">BPM · {tempoName(m.bpm)}</span>
        </p>
        <button type="button" className="metronome__step" onClick={() => m.setBpm((b) => b + 1)} disabled={locked || m.bpm >= MAX_BPM} aria-label="Accélérer">+</button>
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
        aria-label="Tempo en battements par minute"
      />

      {locked && <p className="metronome__muted metronome__locked">🔒 Tempo calé sur la prise en cours</p>}

      <details className="metronome__more">
        <summary>Réglages</summary>

        <button type="button" className="metronome__tap" onClick={m.tap} disabled={locked} title="Tape au moins deux fois au rythme voulu">
          Taper le tempo
        </button>

        <div className="metronome__field">
          <span className="metronome__muted">Mesure</span>
          <div className="metronome__signatures" role="radiogroup" aria-label="Mesure">
            {Object.keys(SIGNATURES).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={m.signature === s}
                className={`metronome__sig${m.signature === s ? ' is-active' : ''}`}
                disabled={locked || signatureLocked}
                title={signatureLocked ? 'La mesure ne change plus une fois des pistes enregistrées' : undefined}
                onClick={() => m.setSignature(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="metronome__check">
          <input type="checkbox" checked={m.accent} onChange={(e) => m.setAccent(e.target.checked)} />
          Marquer le 1er temps
        </label>

        <label className="metronome__field">
          <span className="metronome__muted">Volume {Math.round(m.volume * 100)} %</span>
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
