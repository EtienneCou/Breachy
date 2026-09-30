import { useCallback, useEffect, useMemo, useState } from 'react';
import NoteScroller from './notescroller';
import useTimeline from './Usetimeline';
import { createPianoLayout } from './Notelayout';
import { getSongDuration } from './Timeline';
import { loadMusic, musicCatalog } from '../../data/musicData';

const pianoLayout = createPianoLayout({ from: 'C3', to: 'C8' });

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export default function NoteScrollerDemo() {
  const selectedId = musicCatalog[0].id;
  const [notes, setNotes] = useState([]);
  const [loadedId, setLoadedId] = useState(null);
  const [errorId, setErrorId] = useState(null);
  const selectedMusic = musicCatalog.find(({ id }) => id === selectedId) ?? musicCatalog[0];
  const loading = loadedId !== selectedId && errorId !== selectedId;
  const error = errorId === selectedId ? `Impossible de charger ${selectedMusic.label}` : '';
  const duration = useMemo(() => getSongDuration(notes), [notes]);
  const timeline = useTimeline({ duration });
  const { pause, seek } = timeline;

  useEffect(() => {
    let cancelled = false;
    loadMusic(selectedMusic)
      .then((loadedNotes) => {
        if (!cancelled) {
          setNotes(loadedNotes);
          setLoadedId(selectedMusic.id);
          setErrorId(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotes([]);
          setErrorId(selectedMusic.id);
        }
      });

    pause();
    seek(0);
    return () => {
      cancelled = true;
    };
  }, [pause, seek, selectedMusic]);

  const handleNoteReached = useCallback((note) => {
    console.log('Note à jouer maintenant :', note.note, note.id);
  }, []);

  return (
    <main className="music-app">
      <header className="brand">
        <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
        <span>Reachy band</span>
      </header>
      <aside className="song-card">
        <span className="song-card__eyebrow">Morceau joué</span>
        <h1>{selectedMusic.label}</h1>
        <div className="song-card__progress" aria-label="Progression du morceau">
          <div className="song-card__progress-track">
            <span style={{ width: `${duration ? (timeline.time / duration) * 100 : 0}%` }} />
          </div>
          <div className="song-card__time">
            <span>{formatTime(timeline.time)}</span>
            <span>/ {formatTime(duration)}</span>
          </div>
        </div>
      </aside>

      <section className="music-stage">
        {loading && <p style={{ padding: 24, color: '#fff' }}>Chargement de {selectedMusic.label}...</p>}
        {!loading && error && <p style={{ padding: 24, color: '#ff9b9b' }}>{error}</p>}
        {!loading && !error && (
          <NoteScroller
            notes={notes}
            currentTime={timeline.time}
            playing={timeline.playing}
            noteLayout={pianoLayout}
            markMissed
            showLabels
            onNoteReached={handleNoteReached}
          />
        )}
      </section>

      <div className="piano-space" aria-label="Zone réservée au piano">
        <div className="piano-placeholder" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

    </main>
  );
}