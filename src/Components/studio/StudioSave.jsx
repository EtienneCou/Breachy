import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMidiSong } from '../../Services/MidiDatabase'
import { USER_SONG_PREFIX } from '../../hooks/useMusic.js'
import { practiceTrackNumber, studioToMidi } from '../../utils/studioToMidi.js'
import { instrumentById } from './instruments.js'
import { useLanguage } from '../../context/LanguageContext'
import './StudioSave.css'

function getDefaultTitle(isEn) {
  const d = new Date()
  const locale = isEn ? 'en-US' : 'fr-FR'
  const day = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return isEn ? `Studio session of ${day} at ${time}` : `Studio du ${day} à ${time}`
}

export default function StudioSave({ studio, bpm, signature, onClose }) {
  const navigate = useNavigate()
  const { t, isEn } = useLanguage()
  const [title, setTitle] = useState(() => getDefaultTitle(isEn))
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')

  const number = practiceTrackNumber(studio.tracks)
  const practiceLabel = number ? (isEn ? `Track ${number} · ${instrumentById('piano').label}` : `Piste ${number} · ${instrumentById('piano').label}`) : null

  const save = async (e) => {
    e.preventDefault()
    const name = title.trim() || getDefaultTitle(isEn)
    const id = crypto.randomUUID()
    try {
      const { file, practiceTrack } = studioToMidi({ tracks: studio.tracks, loopBeats: studio.loopBeats, bpm, signature, title: name })
      await addMidiSong({
        id,
        title: name,
        fileName: `${name}.mid`,
        file,
        type: 'audio/midi',
        createdAt: new Date().toISOString(),
        source: 'recording',
        origin: 'studio',
        tempo: { bpm, signature },
        practiceTrack,
      })
      setSaved({ id, practiceTrack })
      setError('')
    } catch (err) {
      console.error(err)
      setError(t('recorder.saveError'))
    }
  }

  return (
    <section className="studio-save" aria-label={t('studio.save')}>
      {saved ? (
        <>
          <p className="studio-save__ok">{t('studio.saveOk')}</p>
          <p className="studio-save__text">
            {saved.practiceTrack ? (
              t('studio.practiceWillPlay', saved.practiceTrack.label)
            ) : (
              t('studio.noPianoSavedWarning')
            )}
          </p>
          <div className="studio-save__buttons">
            <button type="button" className="studio-save__btn" onClick={() => navigate('/?onglet=enregistrements')}>
              {t('recorder.viewRecordings')}
            </button>
            {saved.practiceTrack && (
              <button
                type="button"
                className="studio-save__btn studio-save__btn--main"
                onClick={() => navigate(`/piano?morceau=${encodeURIComponent(USER_SONG_PREFIX + saved.id)}`)}
              >
                {t('recorder.practiceOn')}
              </button>
            )}
            <button type="button" className="studio-save__btn studio-save__btn--ghost" onClick={onClose}>
              {t('studio.keepComposing')}
            </button>
          </div>
        </>
      ) : (
        <form className="studio-save__form" onSubmit={save}>
          <label className="studio-save__label" htmlFor="studio-title">{t('studio.saveModalTitle')}</label>
          <input
            id="studio-title"
            className="studio-save__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          <p className={`studio-save__text${practiceLabel ? '' : ' studio-save__text--warn'}`}>
            {practiceLabel ? (
              t('studio.practiceWillPlayStudio', practiceLabel)
            ) : (
              t('studio.noPianoWarning')
            )}
          </p>
          <div className="studio-save__buttons">
            <button type="submit" className="studio-save__btn studio-save__btn--main">{t('studio.save')}</button>
            <button type="button" className="studio-save__btn studio-save__btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          </div>
          {error && <p className="studio-save__error">{error}</p>}
        </form>
      )}
    </section>
  )
}
