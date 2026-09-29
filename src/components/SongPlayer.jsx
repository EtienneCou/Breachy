import React, { useState, useEffect, useRef } from 'react';
import { parsePartition, SoundPlayerEngine } from '../utils/audioEngine';
import ReachyCoach from './ReachyCoach';
import './SongPlayer.css';

const AVAILABLE_SONGS = [
  {
    id: 'mario',
    title: 'Super Mario Bros - Thème',
    composer: 'Koji Kondo',
    file: '/songs/mario.txt',
    icon: '🍄'
  },
  {
    id: 'pirate',
    title: 'Pirates des Caraïbes - He\'s a Pirate',
    composer: 'Klaus Badelt & Hans Zimmer',
    file: '/songs/pirate.txt',
    icon: '🏴‍☠️'
  }
];

export default function SongPlayer() {
  const [selectedSong, setSelectedSong] = useState(AVAILABLE_SONGS[0]);
  const [partitionData, setPartitionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Audio Engine & Timers Ref
  const soundEngineRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const speedRef = useRef(playbackSpeed);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Initialize sound engine
  useEffect(() => {
    soundEngineRef.current = new SoundPlayerEngine();
    return () => {
      if (soundEngineRef.current) {
        soundEngineRef.current.stopAll();
      }
      if (playbackTimerRef.current) {
        cancelAnimationFrame(playbackTimerRef.current);
      }
    };
  }, []);

  // Load partition when selected song changes
  useEffect(() => {
    let isMounted = true;
    stopPlayback();

    async function loadSong() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(selectedSong.file);
        if (!response.ok) {
          throw new Error(`Impossible de charger le fichier (${response.status})`);
        }
        const text = await response.text();
        if (isMounted) {
          const parsed = parsePartition(text);
          setPartitionData(parsed);
          setCurrentTime(0);
          setCurrentEventIndex(-1);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Erreur lors du chargement de la partition');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSong();

    return () => {
      isMounted = false;
    };
  }, [selectedSong]);

  // Audio loop execution
  const startPlayback = () => {
    if (!partitionData || partitionData.events.length === 0) return;

    soundEngineRef.current.initContext();
    setIsPlaying(true);

    const startTimestamp = performance.now();
    startTimeRef.current = startTimestamp - (pausedAtRef.current * 1000) / speedRef.current;

    let lastNoteIndex = -1;

    const tick = () => {
      const now = performance.now();
      const elapsedVirtualTime = ((now - startTimeRef.current) / 1000) * speedRef.current;

      if (elapsedVirtualTime >= partitionData.totalDuration) {
        // Song ended
        setCurrentTime(partitionData.totalDuration);
        stopPlayback();
        return;
      }

      setCurrentTime(elapsedVirtualTime);

      // Find current note event in partition
      const eventIndex = partitionData.events.findIndex(
        (ev) => elapsedVirtualTime >= ev.startTime && elapsedVirtualTime < ev.endTime
      );

      if (eventIndex !== -1 && eventIndex !== lastNoteIndex) {
        lastNoteIndex = eventIndex;
        setCurrentEventIndex(eventIndex);

        const currentEv = partitionData.events[eventIndex];
        if (!currentEv.isRest && currentEv.frequency > 0) {
          // Note duration adjusted by speed
          const effectiveDuration = currentEv.duration / speedRef.current;
          soundEngineRef.current.playNote(currentEv.frequency, effectiveDuration);
        }
      }

      playbackTimerRef.current = requestAnimationFrame(tick);
    };

    playbackTimerRef.current = requestAnimationFrame(tick);
  };

  const pausePlayback = () => {
    if (!isPlaying) return;
    if (playbackTimerRef.current) {
      cancelAnimationFrame(playbackTimerRef.current);
    }
    soundEngineRef.current.stopAll();
    pausedAtRef.current = currentTime;
    setIsPlaying(false);
  };

  const stopPlayback = () => {
    if (playbackTimerRef.current) {
      cancelAnimationFrame(playbackTimerRef.current);
    }
    if (soundEngineRef.current) {
      soundEngineRef.current.stopAll();
    }
    pausedAtRef.current = 0;
    setCurrentTime(0);
    setCurrentEventIndex(-1);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const handleSeek = (e) => {
    if (!partitionData) return;
    const newTime = parseFloat(e.target.value);
    const wasPlaying = isPlaying;

    if (wasPlaying) {
      pausePlayback();
    }

    pausedAtRef.current = newTime;
    setCurrentTime(newTime);

    // Update active event index
    const eventIndex = partitionData.events.findIndex(
      (ev) => newTime >= ev.startTime && newTime < ev.endTime
    );
    setCurrentEventIndex(eventIndex);

    if (wasPlaying) {
      startPlayback();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentEvent = partitionData && currentEventIndex >= 0 ? partitionData.events[currentEventIndex] : null;
  const currentNoteDisplay = currentEvent && !currentEvent.isRest ? currentEvent.note : 'Repos';

  return (
    <div className="reachy-band-player">
      {/* Header Section */}
      <header className="player-header">
        <div className="logo-title">
          <span className="app-icon">🎵</span>
          <div>
            <h1>REACHY BAND</h1>
            <p className="app-subtitle">Module d'écoute musicale avec Reachy Mini</p>
          </div>
        </div>

        <div className="song-selector">
          <label htmlFor="song-select">Choisir un morceau :</label>
          <select
            id="song-select"
            value={selectedSong.id}
            onChange={(e) => {
              const song = AVAILABLE_SONGS.find((s) => s.id === e.target.value);
              if (song) setSelectedSong(song);
            }}
            disabled={isPlaying}
          >
            {AVAILABLE_SONGS.map((song) => (
              <option key={song.id} value={song.id}>
                {song.icon} {song.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Grid: Coach Reachy + Music Console */}
      <div className="player-grid">
        {/* Left Column: Reachy Coach */}
        <section className="coach-section">
          <ReachyCoach
            isPlaying={isPlaying}
            currentNote={currentNoteDisplay}
            playbackRate={playbackSpeed}
          />
        </section>

        {/* Right Column: Interactive Deck */}
        <section className="console-section">
          <div className="song-card">
            <div className="song-info">
              <span className="song-card-icon">{selectedSong.icon}</span>
              <div>
                <h2>{selectedSong.title}</h2>
                <span className="composer">{selectedSong.composer}</span>
              </div>
            </div>

            {/* Note & Sound Visualizer */}
            <div className="note-visualizer-container">
              <div className="note-monitor">
                <span className="monitor-label">Note active</span>
                <span className={`monitor-value ${isPlaying && currentNoteDisplay !== 'Repos' ? 'pulse' : ''}`}>
                  {isPlaying ? currentNoteDisplay : '--'}
                </span>
              </div>

              {/* Streaming Note Ribbon */}
              <div className="note-ribbon">
                {partitionData ? (
                  partitionData.events.slice(
                    Math.max(0, currentEventIndex - 3),
                    Math.min(partitionData.events.length, currentEventIndex + 7)
                  ).map((ev) => {
                    const isActive = ev.id === currentEventIndex;
                    return (
                      <div
                        key={ev.id}
                        className={`ribbon-item ${isActive ? 'active' : ''} ${ev.isRest ? 'rest' : ''}`}
                      >
                        <span className="ribbon-note">{ev.note}</span>
                        <span className="ribbon-dur">{ev.duration.toFixed(2)}s</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="ribbon-placeholder">Chargement des notes...</div>
                )}
              </div>
            </div>

            {/* Timeline & Progress Bar */}
            <div className="timeline-container">
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{partitionData ? formatTime(partitionData.totalDuration) : '00:00'}</span>
              </div>
              <input
                type="range"
                className="timeline-slider"
                min="0"
                max={partitionData ? partitionData.totalDuration : 100}
                step="0.05"
                value={currentTime}
                onChange={handleSeek}
                disabled={!partitionData || isLoading}
              />
            </div>

            {/* Playback Controls */}
            <div className="controls-row">
              <div className="buttons-group">
                <button
                  type="button"
                  id="btn-play-pause"
                  className={`btn-control btn-play ${isPlaying ? 'playing' : ''}`}
                  onClick={togglePlay}
                  disabled={!partitionData || isLoading}
                  title={isPlaying ? 'Mettre en pause' : 'Lancer l\'écoute'}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Écouter'}
                </button>

                <button
                  type="button"
                  id="btn-stop"
                  className="btn-control btn-stop"
                  onClick={stopPlayback}
                  disabled={!partitionData || (currentTime === 0 && !isPlaying)}
                  title="Arrêter et recommencer"
                >
                  ⏹ Recommencer
                </button>
              </div>

              {/* Speed Controls (0.5x, 0.75x, 1x, 1.25x) */}
              <div className="speed-control-group">
                <span className="speed-label">Vitesse d'entraînement :</span>
                <div className="speed-buttons">
                  {[0.5, 0.75, 1.0, 1.25].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={`btn-speed ${playbackSpeed === speed ? 'active' : ''}`}
                      onClick={() => setPlaybackSpeed(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status / Metadata */}
            {isLoading && <p className="status-msg">Chargement du morceau...</p>}
            {error && <p className="status-msg error">❌ {error}</p>}
            {partitionData && !isLoading && !error && (
              <div className="song-stats">
                <span>Total : {partitionData.events.length} notes & silences</span>
                <span>•</span>
                <span>Prêt pour l'écoute Reachy</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
