import { useEffect, useEffectEvent, useState } from 'react'
import { backingSynth, pianoSynth } from '../piano'
import { TRANSPORT_KEYS } from './keys.js'
import './TransportBar.css'

const percent = (value) => `${Math.round(value * 100)} %`

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Barre de commande : jouer / pause, recommencer, vitesse, et si `piano`
 * est fourni, l'octave (en jeu libre) et le volume du piano.
 *
 * - clock          objet renvoyé par useSongClock() (optionnel : sans morceau,
 *                  seuls l'octave et le volume sont affichés)
 * - piano          objet renvoyé par usePiano() (optionnel)
 * - accompaniment  affiche le volume de l'accompagnement (quand la page en joue un)
 * - orientation  'vertical' (colonne à côté du piano) ou 'horizontal'
 * - shortcuts    raccourcis clavier : Entrée, Retour arrière, ↓, ↑
 */
export default function TransportBar({ clock, piano, accompaniment = false, orientation = 'vertical', shortcuts = true, className = '' }) {
  const { status, time, duration, speed } = clock ?? {}
  const playing = status === 'playing'
  const finite = Number.isFinite(duration) && duration > 0

  const handleKey = useEffectEvent((e) => {
    if (!clock || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
    // Laisser les champs et boutons gérer leurs propres touches.
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, button, a')) return
    const action = Object.keys(TRANSPORT_KEYS).find((k) => TRANSPORT_KEYS[k] === e.key)
    if (!action) return
    e.preventDefault()
    clock[action]()
  })

  useEffect(() => {
    if (!shortcuts) return
    const onKey = (e) => handleKey(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts])

  const playLabel = playing ? 'Pause' : status === 'paused' ? 'Reprendre' : status === 'finished' ? 'Rejouer' : 'Jouer'
  const progress = finite ? Math.min(1, Math.max(0, time / duration)) : 0

  return (
    <div className={`transport transport--${orientation} ${className}`} role="toolbar" aria-label="Commandes de lecture">
      {clock && (
        <>
          <div className="transport__section transport__main">
            <button
              type="button"
              className={`transport__btn transport__btn--play${playing ? ' is-playing' : ''}`}
              onClick={clock.toggle}
              aria-pressed={playing}
            >
              <Icon name={playing ? 'pause' : 'play'} />
              <span className="transport__label">{playLabel}</span>
              <kbd>Entrée</kbd>
            </button>
            <button type="button" className="transport__btn" onClick={clock.restart} title="Recommencer depuis le début">
              <Icon name="restart" />
              <span className="transport__label">Recommencer</span>
              <kbd>⌫</kbd>
            </button>
          </div>

          <div className="transport__section">
            <span className="transport__clock">
              {playing && time < 0 ? `Départ dans ${Math.ceil(-time)}` : formatTime(time)}
              {finite && <span className="transport__muted"> / {formatTime(duration)}</span>}
            </span>
            {finite && (
              <span className="transport__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <span style={{ transform: `scaleX(${progress})` }} />
              </span>
            )}
          </div>

          <label className="transport__section" htmlFor="transport-speed">
            <span className="transport__heading">
              Vitesse <span className="transport__muted">{percent(speed)}</span>
            </span>
            <input
              id="transport-speed"
              className="transport__slider"
              type="range"
              min="0.5"
              max="1.5"
              step="0.25"
              value={speed}
              onChange={(event) => clock.setSpeed(Number(event.target.value))}
              onDoubleClick={() => clock.setSpeed(1)}
              aria-label="Vitesse de lecture"
              title="Double-cliquer pour revenir à 100 %"
            />
          </label>
        </>
      )}

      {piano?.canShiftOctave && (
        <Stepper
          title="Octave"
          keys={[piano.octaveKeys.down, piano.octaveKeys.up]}
          onDown={() => piano.setOctave((o) => o - 1)}
          onUp={() => piano.setOctave((o) => o + 1)}
          canDown={piano.canGoLower}
          canUp={piano.canGoHigher}
          downLabel="Octave plus grave"
          upLabel="Octave plus aiguë"
        >
          <span className="transport__value">
            <span className="transport__value-number">{piano.octave}</span>
            <span className="transport__value-word">{piano.octave < 4 ? 'Grave' : piano.octave > 4 ? 'Aigu' : 'Milieu'}</span>
          </span>
        </Stepper>
      )}

      {piano && <VolumeSlider id="transport-volume-piano" label="Piano" synth={pianoSynth} />}
      {accompaniment && <VolumeSlider id="transport-volume-backing" label="Accompagnement" synth={backingSynth} />}
    </div>
  )
}

// Curseur de volume d'un synthé (pianoSynth ou backingSynth).
function VolumeSlider({ id, label, synth }) {
  const [volume, setVolume] = useState(synth.volume)
  const change = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    synth.setVolume(v)
  }
  return (
    <label className="transport__section" htmlFor={id}>
      <span className="transport__heading">
        {label} <span className="transport__muted">{percent(volume)}</span>
      </span>
      <input
        id={id}
        className="transport__slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={change}
        onPointerUp={(e) => e.currentTarget.blur()}
      />
    </label>
  )
}

function Stepper({ title, onDown, onUp, canDown, canUp, downLabel, upLabel, children }) {
  return (
    <div className={`transport__section transport__section--${title.toLowerCase()}`} role="group" aria-label={title}>
      <span className="transport__heading">{title}</span>
      <div className="transport__stepper">
        <button type="button" className="transport__btn transport__btn--small" onClick={onDown} disabled={!canDown} aria-label={downLabel} title={downLabel}>
          <Icon name="minus" />
        </button>
        {children}
        <button type="button" className="transport__btn transport__btn--small" onClick={onUp} disabled={!canUp} aria-label={upLabel} title={upLabel}>
          <Icon name="plus" />
        </button>
      </div>
    </div>
  )
}

function Icon({ name }) {
  const paths = {
    play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
    pause: (
      <>
        <rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" />
        <rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" />
      </>
    ),
    restart: (
      <>
        <path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M5 4v4.5h4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    minus: <path d="M6 12h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
    plus: <path d="M6 12h12M12 6v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  }
  return (
    <svg className="transport__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
