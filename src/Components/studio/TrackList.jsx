import { useState } from 'react'
import { MAX_TRACKS, isAudible } from '../../hooks/useStudio.js'
import { STUDIO_INSTRUMENTS, instrumentById } from './instruments.js'
import { practiceTrackNumber } from '../../utils/studioToMidi.js'
import './TrackList.css'

/**
 * Pistes du Studio : une ligne par piste (instrument, son, aperçu des notes sur la
 * boucle, enregistrer, muet, solo, volume, supprimer) et l'ajout d'une piste.
 * Cliquer sur une piste la sélectionne : c'est elle que joue le clavier.
 * `studio` est l'objet renvoyé par useStudio().
 */
export default function TrackList({ studio, beatsPerMeasure, onRecord }) {
  const { tracks, selectedId, status, recordingId, loopBeats, position } = studio
  const busy = status !== 'stopped'
  const [adding, setAdding] = useState(tracks.length === 0)
  const practiceNumber = practiceTrackNumber(tracks) // piste jouée à l'entraînement

  return (
    <section className="tracks" aria-label="Pistes">
      {tracks.length === 0 && !adding && <p className="tracks__empty">Aucune piste pour l'instant.</p>}

      <ol className="tracks__list">
        {tracks.map((track, index) => {
          const instrument = instrumentById(track.instrument)
          const selected = track.id === selectedId
          const recording = track.id === recordingId
          return (
            <li
              key={track.id}
              className={`track${selected ? ' is-selected' : ''}${recording ? ' is-recording' : ''}${isAudible(track, tracks) ? '' : ' is-silent'}`}
              style={{ '--track-color': instrument.color }}
              onPointerDown={() => !busy && studio.select(track.id)}
            >
              <div className="track__head">
                <span className="track__icon" aria-hidden="true">{instrument.icon}</span>
                <div className="track__names">
                  <span className="track__title">
                    {index + 1}. {instrument.label}
                  </span>
                  {practiceNumber === index + 1 && (
                    <span className="track__practice" title="À l'entraînement, c'est cette piste que tu joues au piano">
                      🎯 Jouée à l'entraînement
                    </span>
                  )}
                  {instrument.variants.length > 1 ? (
                    <select
                      className="track__variant"
                      value={track.variant}
                      disabled={busy}
                      onChange={(e) => studio.updateTrack(track.id, { variant: e.target.value })}
                      aria-label={`Son de la piste ${index + 1}`}
                    >
                      {instrument.variants.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="track__muted">{instrument.variants[0].label}</span>
                  )}
                </div>
              </div>

              <TrackRoll
                track={track}
                loopBeats={loopBeats}
                beatsPerMeasure={beatsPerMeasure}
                playhead={busy && position >= 0 ? position / loopBeats : null}
              />

              <div className="track__controls">
                <button
                  type="button"
                  className="track__btn track__btn--rec"
                  disabled={busy || !studio.ready}
                  onClick={(e) => {
                    e.stopPropagation()
                    studio.select(track.id)
                    onRecord(track.id)
                  }}
                  title={track.notes.length ? 'Réenregistrer la piste' : 'Enregistrer la piste'}
                  aria-label={`Enregistrer la piste ${index + 1}`}
                >
                  <span className="track__dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`track__btn${track.muted ? ' is-on' : ''}`}
                  onClick={() => studio.updateTrack(track.id, { muted: !track.muted })}
                  aria-pressed={track.muted}
                  title="Muet"
                >
                  M
                </button>
                <button
                  type="button"
                  className={`track__btn track__btn--solo${track.solo ? ' is-on' : ''}`}
                  onClick={() => studio.updateTrack(track.id, { solo: !track.solo })}
                  aria-pressed={track.solo}
                  title="Solo : n'entendre que les pistes en solo"
                >
                  S
                </button>
                <input
                  className="track__volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => studio.updateTrack(track.id, { volume: Number(e.target.value) })}
                  onPointerUp={(e) => e.currentTarget.blur()}
                  aria-label={`Volume de la piste ${index + 1}`}
                  title={`Volume ${Math.round(track.volume * 100)} %`}
                />
                <button
                  type="button"
                  className="track__btn track__btn--delete"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!track.notes.length || window.confirm(`Supprimer la piste ${index + 1} (${instrument.label}) ?`)) studio.removeTrack(track.id)
                  }}
                  aria-label={`Supprimer la piste ${index + 1}`}
                  title="Supprimer la piste"
                >
                  ×
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Ajout d'une piste : choix de l'instrument */}
      {tracks.length < MAX_TRACKS &&
        (adding ? (
          <div className="tracks__picker" role="group" aria-label="Instrument de la nouvelle piste">
            <span className="track__muted">Instrument de la nouvelle piste :</span>
            <div className="tracks__instruments">
              {STUDIO_INSTRUMENTS.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="tracks__instrument"
                  style={{ '--track-color': i.color }}
                  onClick={() => {
                    studio.addTrack(i.id)
                    setAdding(false)
                  }}
                >
                  <span aria-hidden="true">{i.icon}</span> {i.label}
                </button>
              ))}
            </div>
            {tracks.length > 0 && (
              <button type="button" className="track__btn tracks__cancel" onClick={() => setAdding(false)}>Annuler</button>
            )}
          </div>
        ) : (
          <button type="button" className="tracks__add" disabled={busy} onClick={() => setAdding(true)}>
            + Ajouter une piste
          </button>
        ))}
    </section>
  )
}

// Aperçu des notes d'une piste sur toute la boucle : les mesures en fond, chaque
// note à sa place (hauteur = note, de la plus grave à la plus aiguë de la piste).
function TrackRoll({ track, loopBeats, beatsPerMeasure, playhead }) {
  const notes = track.notes.filter((n) => n.start < loopBeats)
  const pitches = notes.map((n) => n.note)
  const low = Math.min(...pitches)
  const range = Math.max(1, Math.max(...pitches) - low)
  const measures = Math.round(loopBeats / beatsPerMeasure)
  return (
    <div className="track__roll" aria-hidden="true" style={{ '--measures': measures }}>
      {notes.map((n, i) => (
        <span
          key={i}
          className="track__note"
          style={{
            left: `${(n.start / loopBeats) * 100}%`,
            width: `${(Math.min(n.duration, loopBeats - n.start) / loopBeats) * 100}%`,
            bottom: `${((n.note - low) / range) * 80 + 6}%`,
          }}
        />
      ))}
      {notes.length === 0 && <span className="track__roll-empty">Vide : clique sur ● pour enregistrer</span>}
      {playhead != null && <span className="track__playhead" style={{ left: `${playhead * 100}%` }} />}
    </div>
  )
}
