import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMidiSong } from '../../Services/MidiDatabase'
import { pianoSynth } from '../piano'
import { playCue } from '../metronome/click.js'
import { USER_SONG_PREFIX } from '../../hooks/useMusic.js'
import { recordingToMidi } from '../../utils/recordingToMidi.js'
import { useLanguage } from '../../context/LanguageContext'
import './SessionRecorder.css'

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function getDefaultTitle(isEn) {
  const d = new Date()
  const locale = isEn ? 'en-US' : 'fr-FR'
  const day = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return isEn ? `Recording of ${day} at ${time}` : `Enregistrement du ${day} à ${time}`
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

export default function SessionRecorder({ recorder, metronome, className = '' }) {
  const navigate = useNavigate()
  const { t, isEn } = useLanguage()
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
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [saveError, setSaveError] = useState('')
  const editing = form?.events === events
  const savedId = saved?.events === events ? saved.id : null
  const recording = status === 'recording' || status === 'paused' || status === 'countIn'
  const playing = status === 'playing' || status === 'playPaused'
  const hasTake = status === 'ready' || playing

  const cues = useRef([]) // bips du décompte « 3, 2, 1 », coupés si on annule

  const startNew = () => {
    if (hasTake && !savedId && !window.confirm(t('recorder.confirmReplace'))) return
    metronome?.stopPreview()
    if (metronome?.enabled) {
      const delay = 0.1 + (countIn ? metronome.measureLength : 0)
      metronome.alignTo(metronome.audioNow() + delay)
      recorder.record({ delay, tempo: { bpm: metronome.bpm, signature: metronome.signature } })
    } else if (countIn) {
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

  const playTake = () => {
    metronome?.stopPreview()
    if (tempo && metronome) {
      metronome.setBpm(tempo.bpm)
      metronome.setSignature(tempo.signature)
      metronome.alignTo(metronome.audioNow() - (status === 'playPaused' ? recorder.position() : 0))
    }
    recorder.play()
  }

  const resume = () => {
    metronome?.stopPreview()
    if (tempo && metronome) metronome.alignTo(metronome.audioNow() - recorder.position())
    recorder.resumeRecording()
  }

  const beatsLeft =
    status !== 'countIn'
      ? null
      : tempo
        ? Math.max(1, Math.ceil((-elapsed * tempo.bpm) / 60 - 0.01))
        : Math.min(COUNTDOWN, Math.max(1, Math.ceil(-elapsed - 0.01)))

  const save = async (e) => {
    e.preventDefault()
    const title = form.title.trim() || getDefaultTitle(isEn)
    const id = crypto.randomUUID()
    try {
      await addMidiSong({
        id,
        title,
        fileName: `${title}.mid`,
        file: recordingToMidi(events, title, tempo),
        tempo,
        type: 'audio/midi',
        createdAt: new Date().toISOString(),
        source: 'recording',
      })
      setSaved({ events, id })
      setForm(null)
      setSaveError('')
    } catch (err) {
      console.error(err)
      setSaveError(t('recorder.saveError'))
    }
  }

  const progress = playing && duration ? Math.min(1, elapsed / duration) : 0

  return (
    <section className={`recorder ${className}`} aria-label={t('recorder.title')}>
      <header className="recorder__head">
        <span className="recorder__title">{t('recorder.title')}</span>
        <span className={`recorder__state recorder__state--${status}`} aria-live="polite">
          {status === 'countIn' && t('recorder.countIn')}
          {status === 'recording' && <><span className="recorder__dot" aria-hidden="true" /> {t('recorder.rec')}</>}
          {status === 'paused' && t('recorder.paused')}
          {status === 'playing' && t('recorder.playing')}
          {status === 'playPaused' && t('recorder.playPaused')}
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
        {status === 'idle' && <span className="recorder__muted">{t('recorder.noRecording')}</span>}
      </p>

      {playing && (
        <span className="recorder__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <span style={{ transform: `scaleX(${progress})` }} />
        </span>
      )}
      {status === 'ready' && (
        <p className="recorder__muted recorder__info">
          {t('recorder.notesCount', noteCount)}
          {tempo && ` · ${tempo.bpm} BPM, ${tempo.signature}`}
        </p>
      )}
      {recording && tempo && (
        <p className="recorder__muted recorder__info">{t('recorder.syncedMetronome', tempo.bpm, tempo.signature)}</p>
      )}

      <div className="recorder__buttons">
        {!recording && !playing && (
          <button type="button" className="recorder__btn recorder__btn--rec" onClick={startNew}>
            <span className="recorder__dot" aria-hidden="true" /> {hasTake ? t('recorder.newRec') : t('recorder.record')}
          </button>
        )}
        {status === 'recording' && (
          <button type="button" className="recorder__btn" onClick={recorder.pauseRecording}>⏸ {t('recorder.pause')}</button>
        )}
        {status === 'paused' && (
          <button type="button" className="recorder__btn" onClick={resume}>
            <span className="recorder__dot" aria-hidden="true" /> {t('recorder.resume')}
          </button>
        )}
        {recording && (
          <button type="button" className="recorder__btn recorder__btn--stop" onClick={stop}>
            {status === 'countIn' ? t('recorder.cancel') : t('recorder.stop')}
          </button>
        )}

        {(status === 'ready' || status === 'playPaused') && (
          <button
            type="button"
            className="recorder__btn recorder__btn--play recorder__btn--icon"
            onClick={playTake}
            aria-label={status === 'playPaused' ? t('recorder.resume') : t('recorder.listen')}
            title={status === 'playPaused' ? t('recorder.resume') : t('recorder.listen')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" />
            </svg>
          </button>
        )}
        {status === 'playing' && (
          <button type="button" className="recorder__btn" onClick={recorder.pausePlayback}>⏸ {t('recorder.pause')}</button>
        )}
        {playing && (
          <button type="button" className="recorder__btn recorder__btn--stop" onClick={recorder.stopPlayback}>{t('recorder.stop')}</button>
        )}
        {status === 'ready' && !savedId && !editing && (
          <button type="button" className="recorder__btn recorder__btn--save" onClick={() => setForm({ events, title: getDefaultTitle(isEn) })}>
            {t('recorder.save')}
          </button>
        )}
        {status === 'ready' && (
          <button
            type="button"
            className="recorder__btn recorder__btn--ghost recorder__btn--icon"
            onClick={() => (savedId || window.confirm(t('recorder.confirmClear'))) && recorder.clear()}
            aria-label={savedId ? t('recorder.close') : t('recorder.clear')}
            title={savedId ? t('recorder.close') : t('recorder.clear')}
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
            {t('recorder.countInLabel')}
            <span className="recorder__hint">
              {metronome.enabled ? t('recorder.countInMetroHint') : t('recorder.countInFreeHint')}
            </span>
          </span>
        </label>
      )}

      {editing && status === 'ready' && (
        <form className="recorder__save" onSubmit={save}>
          <label className="recorder__muted" htmlFor="recorder-title">{t('recorder.nameLabel')}</label>
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
            <button type="submit" className="recorder__btn recorder__btn--play">{t('common.save')}</button>
            <button type="button" className="recorder__btn recorder__btn--ghost" onClick={() => setForm(null)}>{t('common.cancel')}</button>
          </div>
          {saveError && <p className="recorder__error">{saveError}</p>}
        </form>
      )}

      {savedId && (
        <div className="recorder__saved">
          <p className="recorder__saved-text">{t('recorder.savedOk')}</p>
          <div className="recorder__buttons">
            <button type="button" className="recorder__btn" onClick={() => navigate('/?onglet=enregistrements')}>
              {t('recorder.viewRecordings')}
            </button>
            <button
              type="button"
              className="recorder__btn recorder__btn--play"
              onClick={() => navigate(`/piano?morceau=${encodeURIComponent(USER_SONG_PREFIX + savedId)}`)}
            >
              {t('recorder.practiceOn')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
