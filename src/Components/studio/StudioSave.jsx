import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMidiSong } from '../../Services/MidiDatabase'
import { USER_SONG_PREFIX } from '../../hooks/useMusic.js'
import { practiceTrackNumber, studioToMidi } from '../../utils/studioToMidi.js'
import { instrumentById } from './instruments.js'
import './StudioSave.css'

function defaultTitle() {
  const d = new Date()
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `Studio du ${day} à ${time}`
}

/**
 * Sauvegarde du Studio dans « Mes enregistrements » : un fichier MIDI avec toutes les
 * pistes, le tempo et la mesure. Annonce avant la sauvegarde la piste jouée à
 * l'entraînement (la première piste piano), ou prévient qu'il n'y en a pas.
 *
 * - studio     objet renvoyé par useStudio()
 * - bpm, signature   tempo et mesure du métronome
 * - onClose    ferme le panneau
 */
export default function StudioSave({ studio, bpm, signature, onClose }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(defaultTitle)
  const [saved, setSaved] = useState(null) // { id, practiceTrack }
  const [error, setError] = useState('')

  const number = practiceTrackNumber(studio.tracks)
  const practiceLabel = number ? `Piste ${number} · ${instrumentById('piano').label}` : null

  const save = async (e) => {
    e.preventDefault()
    const name = title.trim() || defaultTitle()
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
        source: 'recording', // onglet « Mes enregistrements » de l'accueil
        origin: 'studio',
        tempo: { bpm, signature }, // métronome de l'entraînement
        practiceTrack, // partie à jouer à l'entraînement, ou null (pas de piste piano)
      })
      setSaved({ id, practiceTrack })
      setError('')
    } catch (err) {
      console.error(err)
      setError('La sauvegarde a échoué. Réessaie.')
    }
  }

  return (
    <section className="studio-save" aria-label="Sauvegarder le Studio">
      {saved ? (
        <>
          <p className="studio-save__ok">✓ Sauvegardé dans « Mes enregistrements »</p>
          <p className="studio-save__text">
            {saved.practiceTrack ? (
              <>🎯 À l'entraînement, tu joueras la <strong>{saved.practiceTrack.label}</strong>.</>
            ) : (
              'Pas de piste piano : tu pourras l\'écouter, mais pas t\'entraîner dessus.'
            )}
          </p>
          <div className="studio-save__buttons">
            <button type="button" className="studio-save__btn" onClick={() => navigate('/?onglet=enregistrements')}>
              Voir mes enregistrements
            </button>
            {saved.practiceTrack && (
              <button
                type="button"
                className="studio-save__btn studio-save__btn--main"
                onClick={() => navigate(`/piano?morceau=${encodeURIComponent(USER_SONG_PREFIX + saved.id)}`)}
              >
                S'entraîner dessus
              </button>
            )}
            <button type="button" className="studio-save__btn studio-save__btn--ghost" onClick={onClose}>
              Continuer à composer
            </button>
          </div>
        </>
      ) : (
        <form className="studio-save__form" onSubmit={save}>
          <label className="studio-save__label" htmlFor="studio-title">Nom du morceau</label>
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
              <>🎯 À l'entraînement, tu joueras la <strong>{practiceLabel}</strong> (la première piste piano). Les autres pistes t'accompagneront.</>
            ) : (
              'Aucune piste piano : tu pourras écouter ce morceau, mais pas t\'entraîner dessus. Ajoute une piste piano pour pouvoir le jouer.'
            )}
          </p>
          <div className="studio-save__buttons">
            <button type="submit" className="studio-save__btn studio-save__btn--main">💾 Sauvegarder</button>
            <button type="button" className="studio-save__btn studio-save__btn--ghost" onClick={onClose}>Annuler</button>
          </div>
          {error && <p className="studio-save__error">{error}</p>}
        </form>
      )}
    </section>
  )
}
