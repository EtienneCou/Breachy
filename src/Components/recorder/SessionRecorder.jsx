import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMidiSong } from '../../Services/MidiDatabase'
import { pianoSynth } from '../piano'
import { playCue } from '../metronome/click.js'
import { USER_SONG_PREFIX } from '../../hooks/useMusic.js'
import { recordingToMidi } from '../../utils/recordingToMidi.js'
import './SessionRecorder.css'

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Titre proposé à la sauvegarde : « Enregistrement du 1 oct. à 09:42 »
function defaultTitle() {
  const d = new Date()
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `Enregistrement du ${day} à ${time}`
}

const COUNT_IN_KEY = 'breachy.countIn'
const COUNTDOWN = 3 // décompte « 3, 2, 1 » sans métronome, en secondes

function loadCountIn() {
  try {
    return localStorage.getItem(COUNT_IN_KEY) !== 'off'
  } catch {
    return true
  }
}

/**
 * Panneau d'enregistrement du jeu libre : enregistrer, mettre en pause, arrêter,
 * puis écouter, effacer, ou sauvegarder dans « Mes enregistrements » (accueil),
 * d'où l'enregistrement peut servir à l'entraînement comme un morceau.
 * `recorder` est l'objet renvoyé par useSessionRecorder().
 *
 * `metronome` (objet de useMetronome) : s'il est activé au départ, la prise est calée
 * sur ses temps (décompte d'une mesure) et son tempo est sauvegardé avec elle, pour
 * le métronome de l'entraînement. Il sonne alors pendant la prise (et sa réécoute),
 * voir FreePlayPage. Sinon, le décompte est un simple « 3, 2, 1 », sans tempo.
 */
export default function SessionRecorder({ recorder, metronome, className = '' }) {
  const navigate = useNavigate()
  const { status, events, elapsed, duration, noteCount, tempo } = recorder
  const [countIn, setCountIn] = useState(loadCountIn)
  const changeCountIn = (on) => {
    setCountIn(on)
    try {
      localStorage.setItem(COUNT_IN_KEY, on ? 'on' : 'off')
    } catch {
      // réglage simplement pas retenu
    }
  }
  // Formulaire de sauvegarde, et prise déjà sauvegardée : liés à la prise en cours,
  // ils disparaissent d'eux-mêmes après un nouvel enregistrement.
  const [form, setForm] = useState(null) // { events, title } pendant la saisie du titre
  const [saved, setSaved] = useState(null) // { events, id }
  const [saveError, setSaveError] = useState('')
  const editing = form?.events === events
  const savedId = saved?.events === events ? saved.id : null
  const recording = status === 'recording' || status === 'paused' || status === 'countIn'
  const playing = status === 'playing' || status === 'playPaused'
  const hasTake = status === 'ready' || playing

  const cues = useRef([]) // bips du décompte « 3, 2, 1 », coupés si on annule

  const startNew = () => {
    if (hasTake && !savedId && !window.confirm('Remplacer l\'enregistrement actuel ? Il n\'a pas été sauvegardé.')) return
    metronome?.stopPreview() // l'essai du métronome s'arrête quand l'enregistrement commence
    if (metronome?.enabled) {
      // Calée sur le métronome : le départ tombe sur un premier temps,
      // après une mesure de décompte si elle est demandée.
      const delay = 0.1 + (countIn ? metronome.measureLength : 0)
      metronome.alignTo(metronome.audioNow() + delay)
      recorder.record({ delay, tempo: { bpm: metronome.bpm, signature: metronome.signature } })
    } else if (countIn) {
      // Sans métronome : « 3, 2, 1 » juste pour annoncer le départ, sans tempo.
      pianoSynth.ensureContext()
      const { ctx } = pianoSynth
      const start = ctx.currentTime + 0.05
      cues.current = Array.from({ length: COUNTDOWN }, (_, i) =>
        playCue(ctx, pianoSynth.master, start + i, i === COUNTDOWN - 1),
      )
      recorder.record({ delay: COUNTDOWN + 0.05 })
    } else {
      recorder.record()
    }
  }

  const stop = () => {
    if (status === 'countIn') {
      for (const cue of cues.current) {
        try {
          cue.stop()
        } catch {
          // déjà joué
        }
      }
    }
    cues.current = []
    recorder.stopRecording()
  }

  // Réécoute d'une prise calée : le métronome prend son tempo et la suit.
  // Une prise sans tempo est réécoutée sans métronome (voir FreePlayPage).
  const playTake = () => {
    metronome?.stopPreview()
    if (tempo && metronome) {
      metronome.setBpm(tempo.bpm)
      metronome.setSignature(tempo.signature)
      metronome.alignTo(metronome.audioNow() - (status === 'playPaused' ? recorder.position() : 0))
    }
    recorder.play()
  }

  // Reprise après une pause : le métronome reprend la grille de la prise là où elle en était.
  const resume = () => {
    metronome?.stopPreview()
    if (tempo && metronome) metronome.alignTo(metronome.audioNow() - recorder.position())
    recorder.resumeRecording()
  }

  // Chiffre du décompte : temps restants (calé sur le métronome) ou secondes (« 3, 2, 1 »)
  const beatsLeft =
    status !== 'countIn'
      ? null
      : tempo
        ? Math.max(1, Math.ceil((-elapsed * tempo.bpm) / 60 - 0.01))
        : Math.min(COUNTDOWN, Math.max(1, Math.ceil(-elapsed - 0.01)))

  const save = async (e) => {
    e.preventDefault()
    const title = form.title.trim() || defaultTitle()
    const id = crypto.randomUUID()
    try {
      await addMidiSong({
        id,
        title,
        fileName: `${title}.mid`,
        file: recordingToMidi(events, title, tempo),
        tempo, // { bpm, signature } ou null : pour le métronome de l'entraînement
        type: 'audio/midi',
        createdAt: new Date().toISOString(),
        source: 'recording', // rangé dans l'onglet « Mes enregistrements » de l'accueil
      })
      setSaved({ events, id })
      setForm(null)
      setSaveError('')
    } catch (err) {
      console.error(err)
      setSaveError('La sauvegarde a échoué. Réessaie.')
    }
  }

  const progress = playing && duration ? Math.min(1, elapsed / duration) : 0

  return (
    <section className={`recorder ${className}`} aria-label="Live">
      <header className="recorder__head">
        <span className="recorder__title">Live</span>
        <span className={`recorder__state recorder__state--${status}`} aria-live="polite">
          {status === 'countIn' && 'Décompte'}
          {status === 'recording' && <><span className="recorder__dot" aria-hidden="true" /> REC</>}
        </span>
      </header>

      <p className="recorder__time">
        {beatsLeft != null && <span className="recorder__count">{beatsLeft}</span>}
        {(status === 'recording' || status === 'paused') && formatTime(elapsed)}
        {hasTake && (
          <>
            {formatTime(playing ? elapsed : 0)}
            <span className="recorder__muted"> / {formatTime(duration)}</span>
          </>
        )}
      </p>

      {playing && (
        <span className="recorder__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </span>
      )}
      {status === 'ready' && (
        <p className="recorder__muted recorder__info">
          {noteCount} note{noteCount > 1 ? 's' : ''} enregistrée{noteCount > 1 ? 's' : ''}
        </p>
      )}

      <div className="recorder__buttons">
        {/* Enregistrement */}
        {!recording && !playing && (
          <button type="button" className="recorder__btn recorder__btn--rec" onClick={startNew}>
            <span className="recorder__dot" aria-hidden="true" /> {hasTake ? 'Nouveau' : 'Enregistrer'}
          </button>
        )}
        {status === 'recording' && (
          <button type="button" className="recorder__btn" onClick={recorder.pauseRecording}>⏸ Pause</button>
        )}
        {status === 'paused' && (
          <button type="button" className="recorder__btn" onClick={resume}>
            <span className="recorder__dot" aria-hidden="true" /> Reprendre
          </button>
        )}
        {recording && (
          <button type="button" className="recorder__btn recorder__btn--stop" onClick={stop}>
            {status === 'countIn' ? 'Annuler' : '⏹ Arrêter'}
          </button>
        )}

        {/* Lecture */}
        {(status === 'ready' || status === 'playPaused') && (
          <button
            type="button"
            className="recorder__btn recorder__btn--play recorder__btn--icon"
            onClick={playTake}
            aria-label={status === 'playPaused' ? 'Reprendre' : 'Écouter'}
            title={status === 'playPaused' ? 'Reprendre' : 'Écouter'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </button>
        )}
        {status === 'playing' && (
          <button type="button" className="recorder__btn" onClick={recorder.pausePlayback}>⏸ Pause</button>
        )}
        {playing && (
          <button type="button" className="recorder__btn recorder__btn--stop" onClick={recorder.stopPlayback}>⏹ Arrêter</button>
        )}
        {status === 'ready' && !savedId && !editing && (
          <button type="button" className="recorder__btn recorder__btn--save" onClick={() => setForm({ events, title: defaultTitle() })}>
            Save
          </button>
        )}
        {status === 'ready' && (
          <button
            type="button"
            className="recorder__btn recorder__btn--ghost recorder__btn--icon"
            onClick={() => (savedId || window.confirm('Effacer l\'enregistrement ? Il n\'a pas été sauvegardé.')) && recorder.clear()}
            aria-label={savedId ? 'Fermer' : 'Effacer'}
            title={savedId ? 'Fermer' : 'Effacer'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {metronome && !recording && !playing && (
        <label className="recorder__check">
          <input type="checkbox" checked={countIn} onChange={(e) => changeCountIn(e.target.checked)} />
          <span>
            Activer le décompte
          </span>
        </label>
      )}

      {/* Sauvegarde : nom de l'enregistrement */}
      {editing && status === 'ready' && (
        <form className="recorder__save" onSubmit={save}>
          <label className="recorder__muted" htmlFor="recorder-title">Nom de l'enregistrement</label>
          <input
            id="recorder-title"
            className="recorder__input"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={80}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          <div className="recorder__buttons">
            <button type="submit" className="recorder__btn recorder__btn--play">Sauvegarder</button>
            <button type="button" className="recorder__btn recorder__btn--ghost" onClick={() => setForm(null)}>Annuler</button>
          </div>
          {saveError && <p className="recorder__error">{saveError}</p>}
        </form>
      )}

      {/* Sauvegardé : on peut aller le retrouver, ou s'entraîner dessus */}
      {savedId && (
        <div className="recorder__saved">
          <p className="recorder__saved-text">✓ Sauvegardé dans « Mes enregistrements »</p>
          <div className="recorder__buttons">
            <button type="button" className="recorder__btn" onClick={() => navigate('/?onglet=enregistrements')}>
              Voir mes enregistrements
            </button>
            <button
              type="button"
              className="recorder__btn recorder__btn--play"
              onClick={() => navigate(`/piano?morceau=${encodeURIComponent(USER_SONG_PREFIX + savedId)}`)}
            >
              S'entraîner dessus
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
