import { useState } from 'react'
import { MAX_TRACKS, isAudible } from '../../hooks/useStudio.js'
import { STUDIO_INSTRUMENTS, instrumentById } from './instruments.js'
import { practiceTrackNumber } from '../../utils/studioToMidi.js'
import { useLanguage } from '../../context/LanguageContext'
import './TrackList.css'

export default function TrackList({ studio, beatsPerMeasure, onRecord }) {
  const { t } = useLanguage()
  const { tracks, selectedId, status, recordingId, loopBeats, position } = studio
  const busy = status !== 'stopped'
  const [adding, setAdding] = useState(tracks.length === 0)
  const practiceNumber = practiceTrackNumber(tracks)

  return (
    <section className="tracks" aria-label="Tracks">
      {tracks.length === 0 && !adding && <p className="tracks__empty">{t('studio.noTracks')}</p>}

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
                    <span className="track__practice" title={t('studio.practiceTrackTitle')}>
                      {t('studio.playedInPractice')}
                    </span>
                  )}
                  {instrument.variants.length > 1 ? (
                    <select
                      className="track__variant"
                      value={track.variant}
                      disabled={busy}
                      onChange={(e) => studio.updateTrack(track.id, { variant: e.target.value })}
                      aria-label={`Sound ${index + 1}`}
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
                emptyText={t('studio.emptyTrackRoll')}
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
                  title={track.notes.length ? t('studio.reRecordTrack') : t('studio.recordTrack')}
                  aria-label={`Record track ${index + 1}`}
                >
                  <span className="track__dot" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`track__btn${track.muted ? ' is-on' : ''}`}
                  onClick={() => studio.updateTrack(track.id, { muted: !track.muted })}
                  aria-pressed={track.muted}
                  title={t('studio.mute')}
                >
                  M
                </button>
                <button
                  type="button"
                  className={`track__btn track__btn--solo${track.solo ? ' is-on' : ''}`}
                  onClick={() => studio.updateTrack(track.id, { solo: !track.solo })}
                  aria-pressed={track.solo}
                  title={t('studio.solo')}
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
                  aria-label={`Volume track ${index + 1}`}
                  title={`${t('transport.backingHeading')} ${Math.round(track.volume * 100)} %`}
                />
                <button
                  type="button"
                  className="track__btn track__btn--delete"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!track.notes.length || window.confirm(t('studio.confirmDeleteTrack', index + 1, instrument.label))) studio.removeTrack(track.id)
                  }}
                  aria-label={`Delete track ${index + 1}`}
                  title={t('studio.deleteTrack')}
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
          <div className="tracks__picker" role="group" aria-label={t('studio.newTrackInstrument')}>
            <span className="track__muted">{t('studio.newTrackInstrument')}</span>
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
              <button type="button" className="track__btn tracks__cancel" onClick={() => setAdding(false)}>{t('common.cancel')}</button>
            )}
          </div>
        ) : (
          <button type="button" className="tracks__add" disabled={busy} onClick={() => setAdding(true)}>
            {t('studio.addTrack')}
          </button>
        ))}
    </section>
  )
}

function TrackRoll({ track, loopBeats, beatsPerMeasure, playhead, emptyText }) {
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
      {notes.length === 0 && <span className="track__roll-empty">{emptyText}</span>}
      {playhead != null && <span className="track__playhead" style={{ left: `${playhead * 100}%` }} />}
    </div>
  )
}
