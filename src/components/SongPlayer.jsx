import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { parsePartition, parseMidiBuffer, SoundPlayerEngine, noteToFrequency } from '../utils/audioEngine';
import ReachyCoach from './ReachyCoach';
import VirtualPiano from './VirtualPiano';
import './SongPlayer.css';

const AVAILABLE_SONGS = [
  {
    id: 'mario',
    title: 'Super Mario Bros - Thème',
    composer: 'Koji Kondo',
    file: '/songs/mario.txt',
    icon: '🍄',
    defaultOctave: 6,
    difficulty: 'Intermédiaire',
    description: 'Le thème culte et rythmé de Nintendo',
    format: 'TXT'
  },
  {
    id: 'pirate',
    title: 'Pirates des Caraïbes - He\'s a Pirate',
    composer: 'Klaus Badelt & Hans Zimmer',
    file: '/songs/pirate.txt',
    icon: '🏴‍☠️',
    defaultOctave: 4,
    difficulty: 'Débutant / Avancé',
    description: 'Une mélodie épique et entraînante',
    format: 'TXT'
  },
  {
    id: 'take_on_me',
    title: 'A-ha - Take On Me',
    composer: 'A-ha (Pål Waaktaar, Magne Furuholmen, Morten Harket)',
    file: '/songs/Aha__Take_on_me.mid',
    icon: '⚡',
    defaultOctave: 5,
    difficulty: 'Rythmé / Pop',
    description: 'Le riff de synthétiseur légendaire des années 80',
    format: 'MIDI'
  },
  {
    id: 'bohemian',
    title: 'Queen - Bohemian Rhapsody',
    composer: 'Freddie Mercury',
    file: '/songs/Queen_Bohemian_Rhapsody.mid',
    icon: '👑',
    defaultOctave: 4,
    difficulty: 'Chef-d\'œuvre Rock',
    description: 'La partie de piano mythique et les harmonies de Queen',
    format: 'MIDI'
  },
  {
    id: 'show_must_go_on',
    title: 'Queen - The Show Must Go On',
    composer: 'Queen (Brian May & Freddie Mercury)',
    file: '/songs/show_must_go_on_Queen.mid',
    icon: '🎭',
    defaultOctave: 3,
    difficulty: 'Épique & Émotion',
    description: 'Une symphonie rock inoubliable avec cordes et guitares',
    format: 'MIDI'
  }
];

export default function SongPlayer({ initialSong, onBack }) {
  const [selectedSong, setSelectedSong] = useState(initialSong || AVAILABLE_SONGS[0]);

  // Sync if initialSong changes from parent
  useEffect(() => {
    if (initialSong) {
      setSelectedSong(initialSong);
    }
  }, [initialSong]);
  const [partitionData, setPartitionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // App mode: 'listen' | 'training'
  const [activeMode, setActiveMode] = useState('listen');

  // --- Listen Mode States ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentNotePlaying, setCurrentNotePlaying] = useState('--');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // --- Training Mode States ---
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingFeedback, setTrainingFeedback] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0, combo: 0 });
  const [baseOctave, setBaseOctave] = useState(selectedSong.defaultOctave);

  // Background song playback during training
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);

  // Audio Engine & Timers Ref
  const soundEngineRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const bgPlaybackTimerRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const speedRef = useRef(playbackSpeed);

  // Cursor for timeline event playback
  const eventCursorRef = useRef(0);
  const bgCursorRef = useRef(0);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Sync base octave when selected song changes
  useEffect(() => {
    setBaseOctave(selectedSong.defaultOctave);
    setTrainingIndex(0);
    setScore({ correct: 0, total: 0, combo: 0 });
    setTrainingFeedback(null);
    setCurrentNotePlaying('--');
    stopBgMusic();
  }, [selectedSong]);

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
      if (bgPlaybackTimerRef.current) {
        cancelAnimationFrame(bgPlaybackTimerRef.current);
      }
    };
  }, []);

  // Playable notes for Training Mode (lead track)
  const playableTrainingNotes = useMemo(() => {
    if (!partitionData) return [];
    return partitionData.leadNotes && partitionData.leadNotes.length > 0
      ? partitionData.leadNotes
      : partitionData.events.filter((ev) => !ev.isRest && ev.frequency > 0);
  }, [partitionData]);

  // Load partition (handles both .txt and .mid files)
  useEffect(() => {
    let isMounted = true;
    stopPlayback();
    stopBgMusic();

    async function loadSong() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(selectedSong.file);
        if (!response.ok) {
          throw new Error(`Impossible de charger le fichier (${response.status})`);
        }

        const isMidi = selectedSong.file.toLowerCase().endsWith('.mid');
        let parsed;

        if (isMidi) {
          const buffer = await response.arrayBuffer();
          parsed = parseMidiBuffer(buffer);
        } else {
          const text = await response.text();
          parsed = parsePartition(text);
        }

        if (isMounted) {
          setPartitionData(parsed);
          setCurrentTime(0);
          setCurrentNotePlaying('--');
          setTrainingIndex(0);
          eventCursorRef.current = 0;
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

  // -------------------------------------------------------------
  // SONG SELECTION WITH DIRECT CHOICE (JOUER vs S'ENTRAINER)
  // -------------------------------------------------------------
  const handleSelectSongWithMode = (song, targetMode) => {
    stopPlayback();
    stopBgMusic();
    setSelectedSong(song);
    setActiveMode(targetMode);

    if (targetMode === 'listen') {
      setTimeout(() => {
        startPlayback();
      }, 200);
    }
  };

  // -------------------------------------------------------------
  // LISTEN MODE PLAYBACK (TIMELINE CURSOR ENGINE)
  // -------------------------------------------------------------
  const startPlayback = () => {
    if (!partitionData || partitionData.events.length === 0) return;

    soundEngineRef.current.initContext();
    setIsPlaying(true);

    const startTimestamp = performance.now();
    startTimeRef.current = startTimestamp - (pausedAtRef.current * 1000) / speedRef.current;

    // Reset cursor to the current time offset
    const currentVirtualTime = pausedAtRef.current;
    let cursor = partitionData.events.findIndex((e) => e.startTime >= currentVirtualTime);
    if (cursor === -1) cursor = partitionData.events.length;
    eventCursorRef.current = cursor;

    const tick = () => {
      const now = performance.now();
      const elapsedVirtualTime = ((now - startTimeRef.current) / 1000) * speedRef.current;

      if (elapsedVirtualTime >= partitionData.totalDuration) {
        setCurrentTime(partitionData.totalDuration);
        setCurrentNotePlaying('--');
        stopPlayback();
        return;
      }

      setCurrentTime(elapsedVirtualTime);

      // Trigger all events scheduled up to elapsedVirtualTime
      while (
        eventCursorRef.current < partitionData.events.length &&
        partitionData.events[eventCursorRef.current].startTime <= elapsedVirtualTime
      ) {
        const ev = partitionData.events[eventCursorRef.current];
        if (!ev.isRest && ev.frequency > 0) {
          const effectiveDuration = ev.duration / speedRef.current;
          const vol = Math.min(0.25, (ev.velocity || 0.7) * 0.22);
          soundEngineRef.current.playNote(ev.frequency, effectiveDuration, 0, vol);
          setCurrentNotePlaying(ev.note);
        }
        eventCursorRef.current++;
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
    eventCursorRef.current = 0;
    setCurrentTime(0);
    setCurrentNotePlaying('--');
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

    // Reposition cursor
    let cursor = partitionData.events.findIndex((ev) => ev.startTime >= newTime);
    if (cursor === -1) cursor = partitionData.events.length;
    eventCursorRef.current = cursor;

    if (wasPlaying) {
      startPlayback();
    }
  };

  // -------------------------------------------------------------
  // BACKGROUND MUSIC DURING TRAINING (MORCEAU EN ARRIERE-PLAN)
  // -------------------------------------------------------------
  const startBgMusic = () => {
    if (!partitionData || partitionData.events.length === 0) return;

    soundEngineRef.current.initContext();
    setBgMusicPlaying(true);

    const startTimestamp = performance.now();
    bgCursorRef.current = 0;

    const bgTick = () => {
      const now = performance.now();
      const elapsedVirtualTime = ((now - startTimestamp) / 1000) * speedRef.current;

      const loopTime = elapsedVirtualTime % partitionData.totalDuration;

      // Handle loop reset
      if (bgCursorRef.current >= partitionData.events.length || loopTime < (partitionData.events[bgCursorRef.current]?.startTime || 0) - 1.0) {
        bgCursorRef.current = 0;
      }

      while (
        bgCursorRef.current < partitionData.events.length &&
        partitionData.events[bgCursorRef.current].startTime <= loopTime
      ) {
        const ev = partitionData.events[bgCursorRef.current];
        if (!ev.isRest && ev.frequency > 0) {
          const effectiveDuration = ev.duration / speedRef.current;
          // Soft volume for background accompaniment
          soundEngineRef.current.playNote(ev.frequency, effectiveDuration, 0, 0.06);
        }
        bgCursorRef.current++;
      }

      bgPlaybackTimerRef.current = requestAnimationFrame(bgTick);
    };

    bgPlaybackTimerRef.current = requestAnimationFrame(bgTick);
  };

  const stopBgMusic = () => {
    if (bgPlaybackTimerRef.current) {
      cancelAnimationFrame(bgPlaybackTimerRef.current);
    }
    setBgMusicPlaying(false);
    bgCursorRef.current = 0;
  };

  const toggleBgMusic = () => {
    if (bgMusicPlaying) {
      stopBgMusic();
    } else {
      startBgMusic();
    }
  };

  // -------------------------------------------------------------
  // TRAINING MODE LOGIC
  // -------------------------------------------------------------
  const expectedTrainingEvent = playableTrainingNotes[trainingIndex] || null;
  const expectedNoteName = expectedTrainingEvent ? expectedTrainingEvent.note : null;

  const handleUserPlayNote = useCallback((playedNote, keyInfo) => {
    if (!soundEngineRef.current) return;

    // Play note at full distinct volume for clear user feedback
    const freq = noteToFrequency(playedNote);
    if (freq > 0) {
      soundEngineRef.current.playNote(freq, 0.35, 0, 0.28);
    }

    if (activeMode !== 'training' || !expectedNoteName) return;

    const cleanExpected = expectedNoteName.trim().toUpperCase();
    const cleanPlayed = playedNote.trim().toUpperCase();

    // Check match: exact match OR matching pitch letter
    const isExactMatch = cleanPlayed === cleanExpected;
    const isLetterMatch = cleanPlayed.replace(/\d+/, '') === cleanExpected.replace(/\d+/, '');

    if (isExactMatch || isLetterMatch) {
      // SUCCESS !
      const newIndex = trainingIndex + 1;
      const isCompleted = newIndex >= playableTrainingNotes.length;

      setScore((prev) => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
        combo: prev.combo + 1
      }));

      if (isCompleted) {
        setTrainingFeedback({
          type: 'complete',
          message: '🎉 Félicitations ! Tu as joué tout le morceau avec Reachy !',
          keyHint: null
        });
      } else {
        const encouragements = [
          'Excellent !',
          'En plein dans le mille !',
          'Superbe enchaînement !',
          'Reachy adore ce rythme !',
          'Parfait ! Continue comme ça !'
        ];
        const randomPraise = encouragements[Math.floor(Math.random() * encouragements.length)];

        const nextNote = playableTrainingNotes[newIndex]?.note;
        setTrainingFeedback({
          type: 'success',
          message: `${randomPraise} Note suivante : ${nextNote}`,
          keyHint: keyInfo?.keyShortcut
        });
        setTrainingIndex(newIndex);
      }
    } else {
      // BENEVOLENT MISTAKE FEEDBACK
      setScore((prev) => ({
        ...prev,
        total: prev.total + 1,
        combo: 0
      }));

      const gentleHints = [
        `Presque ! Tu as joué ${cleanPlayed}. Reachy attend ${cleanExpected}.`,
        `Pas de souci ! Reachy t'attend sur le ${cleanExpected}.`,
        `Écoute bien : Reachy attend la note ${cleanExpected}. Réessaye !`
      ];
      const randomHint = gentleHints[Math.floor(Math.random() * gentleHints.length)];

      setTrainingFeedback({
        type: 'mistake',
        message: randomHint,
        keyHint: null
      });
    }
  }, [activeMode, expectedNoteName, trainingIndex, playableTrainingNotes]);

  const handleHearExpectedNote = () => {
    if (!expectedTrainingEvent || !soundEngineRef.current) return;
    soundEngineRef.current.playNote(expectedTrainingEvent.frequency, 0.5, 0, 0.28);
    setTrainingFeedback({
      type: 'hint',
      message: `Écoute bien la note attendue : ${expectedTrainingEvent.note}`,
      keyHint: null
    });
  };

  const handleResetTraining = () => {
    setTrainingIndex(0);
    setScore({ correct: 0, total: 0, combo: 0 });
    setTrainingFeedback({
      type: 'hint',
      message: "Entraînement réinitialisé. À toi de jouer !",
      keyHint: null
    });
  };

  const handleSkipTrainingNote = () => {
    if (trainingIndex < playableTrainingNotes.length - 1) {
      setTrainingIndex((prev) => prev + 1);
      setTrainingFeedback({
        type: 'hint',
        message: `Note passée. Note suivante : ${playableTrainingNotes[trainingIndex + 1]?.note}`,
        keyHint: null
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentNoteDisplay = activeMode === 'listen'
    ? currentNotePlaying
    : expectedNoteName;

  const trainingProgressPct = playableTrainingNotes.length > 0
    ? Math.round((trainingIndex / playableTrainingNotes.length) * 100)
    : 0;

  return (
    <div className="reachy-band-player">
      {/* Header Section */}
      <header className="player-header">
        <div className="header-left-col">
          {onBack && (
            <button type="button" className="btn-back-library" onClick={onBack}>
              ← Tous les morceaux
            </button>
          )}
          <div className="logo-title">
            <span className="app-icon">{selectedSong.icon || '🎵'}</span>
            <div>
              <h1>{selectedSong.title}</h1>
              <p className="app-subtitle">{selectedSong.composer} • Mode {activeMode === 'listen' ? 'Écoute' : 'Entraînement'}</p>
            </div>
          </div>
        </div>

        {/* Global Mode Switcher Tabs */}
        <div className="mode-switcher">
          <button
            type="button"
            className={`btn-mode ${activeMode === 'listen' ? 'active' : ''}`}
            onClick={() => {
              stopPlayback();
              stopBgMusic();
              setActiveMode('listen');
            }}
          >
            🎧 Mode Écoute
          </button>
          <button
            type="button"
            className={`btn-mode ${activeMode === 'training' ? 'active' : ''}`}
            onClick={() => {
              stopPlayback();
              setActiveMode('training');
            }}
          >
            🎯 Mode Entraînement
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          SONG CATALOGUE & DUAL ACTION SELECTION (TXT & MIDI)
          ------------------------------------------------------------- */}
      <section className="song-catalogue-section">
        <h2 className="catalogue-title">Catalogue des Morceaux : 5 morceaux prêts à jouer</h2>
        <div className="song-cards-grid">
          {AVAILABLE_SONGS.map((song) => {
            const isSelected = selectedSong.id === song.id;
            return (
              <div
                key={song.id}
                className={`catalogue-card ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="card-top">
                  <span className="song-badge-icon">{song.icon}</span>
                  <div className="song-meta">
                    <div className="card-title-row">
                      <h3>{song.title}</h3>
                      <span className={`format-badge ${song.format.toLowerCase()}`}>{song.format}</span>
                    </div>
                    <p className="card-composer">{song.composer}</p>
                    <span className="card-difficulty">{song.difficulty}</span>
                  </div>
                </div>

                <p className="card-description">{song.description}</p>

                {/* Direct Action Choices for EACH Song */}
                <div className="card-actions">
                  <button
                    type="button"
                    className={`btn-choice btn-choice-listen ${isSelected && activeMode === 'listen' ? 'current-active' : ''}`}
                    onClick={() => handleSelectSongWithMode(song, 'listen')}
                    title={`Écouter Reachy jouer ${song.title}`}
                  >
                    ▶ Jouer le morceau
                  </button>

                  <button
                    type="button"
                    className={`btn-choice btn-choice-train ${isSelected && activeMode === 'training' ? 'current-active' : ''}`}
                    onClick={() => handleSelectSongWithMode(song, 'training')}
                    title={`S'entraîner sur ${song.title} au clavier AZERTY`}
                  >
                    🎯 S'entraîner
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Grid: Coach Reachy + Music Console */}
      <div className="player-grid">
        {/* Left Column: Reachy Coach */}
        <section className="coach-section">
          <ReachyCoach
            mode={activeMode}
            isPlaying={isPlaying || bgMusicPlaying}
            currentNote={currentNoteDisplay}
            playbackRate={playbackSpeed}
            trainingFeedback={trainingFeedback}
            score={score}
          />

          {/* Octave Controls for Training */}
          {activeMode === 'training' && (
            <div className="octave-control-box">
              <span className="octave-label">Plage d'octave clavier :</span>
              <div className="octave-btn-group">
                <button
                  type="button"
                  className="btn-octave"
                  onClick={() => setBaseOctave((o) => Math.max(1, o - 1))}
                  title="Descendre d'une octave"
                >
                  -1 Octave
                </button>
                <span className="octave-current">Octave {baseOctave}</span>
                <button
                  type="button"
                  className="btn-octave"
                  onClick={() => setBaseOctave((o) => Math.min(7, o + 1))}
                  title="Monter d'une octave"
                >
                  +1 Octave
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Interactive Deck */}
        <section className="console-section">
          <div className="song-card">
            <div className="song-header-row">
              <div className="song-info">
                <span className="song-card-icon">{selectedSong.icon}</span>
                <div>
                  <div className="selected-title-group">
                    <h2>{selectedSong.title}</h2>
                    <span className={`format-badge ${selectedSong.format.toLowerCase()}`}>{selectedSong.format}</span>
                  </div>
                  <span className="composer">{selectedSong.composer}</span>
                </div>
              </div>
              <span className={`mode-badge ${activeMode}`}>
                {activeMode === 'listen' ? 'Mode Écoute passive' : 'Mode Entraînement interactif'}
              </span>
            </div>

            {/* ----------------- MODE ECOUTE ----------------- */}
            {activeMode === 'listen' && (
              <>
                {/* Note & Sound Visualizer */}
                <div className="note-visualizer-container">
                  <div className="note-monitor">
                    <span className="monitor-label">Note active</span>
                    <span className={`monitor-value ${isPlaying && currentNotePlaying !== '--' ? 'pulse' : ''}`}>
                      {isPlaying ? currentNotePlaying : '--'}
                    </span>
                  </div>

                  {/* Streaming Note Ribbon */}
                  <div className="note-ribbon">
                    {partitionData ? (
                      partitionData.events.slice(
                        Math.max(0, eventCursorRef.current - 2),
                        Math.min(partitionData.events.length, eventCursorRef.current + 8)
                      ).map((ev) => {
                        const isActive = ev.note === currentNotePlaying;
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
                      <div className="ribbon-placeholder">Chargement de la partition...</div>
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
                    >
                      {isPlaying ? '⏸ Pause' : '▶ Écouter'}
                    </button>

                    <button
                      type="button"
                      id="btn-stop"
                      className="btn-control btn-stop"
                      onClick={stopPlayback}
                      disabled={!partitionData || (currentTime === 0 && !isPlaying)}
                    >
                      ⏹ Recommencer
                    </button>
                  </div>

                  {/* Speed Controls */}
                  <div className="speed-control-group">
                    <span className="speed-label">Vitesse d'écoute :</span>
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
              </>
            )}

            {/* ----------------- MODE ENTRAINEMENT ----------------- */}
            {activeMode === 'training' && (
              <div className="training-dashboard">
                {/* Backing Track In Background Option Banner */}
                <div className="bg-track-banner">
                  <div className="bg-track-left">
                    <span className="bg-track-icon">🎶</span>
                    <div>
                      <strong>Morceau en arrière-plan</strong>
                      <p className="bg-track-desc">
                        {bgMusicPlaying
                          ? "Le morceau joue doucement en arrière-plan pour vous donner le tempo !"
                          : "Activez pour entendre la musique en fond sonore pendant que vous jouez."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn-toggle-bg ${bgMusicPlaying ? 'active' : ''}`}
                    onClick={toggleBgMusic}
                    disabled={!partitionData}
                  >
                    {bgMusicPlaying ? '🔊 Arrière-plan : ACTIF' : '🔈 Jouer en arrière-plan'}
                  </button>
                </div>

                {/* Progress bar */}
                <div className="training-progress-header">
                  <div className="progress-info">
                    <span className="progress-label">Progression de l'exercice :</span>
                    <span className="progress-value">
                      Note {Math.min(trainingIndex + 1, playableTrainingNotes.length)} / {playableTrainingNotes.length} ({trainingProgressPct}%)
                    </span>
                  </div>
                  <div className="training-score-chips">
                    <span className="chip correct">✓ Justes : {score.correct}</span>
                    <span className="chip combo">🔥 Combo : {score.combo}</span>
                  </div>
                </div>

                <div className="progress-bar-wrapper">
                  <div className="progress-bar-fill" style={{ width: `${trainingProgressPct}%` }}></div>
                </div>

                {/* Target Note Display Box */}
                <div className="target-note-banner">
                  <div className="target-box">
                    <span className="target-label">Note à reproduire :</span>
                    <span className="target-note-glow">{expectedNoteName || 'Bravo !'}</span>
                  </div>

                  <div className="training-actions">
                    <button
                      type="button"
                      className="btn-training-action"
                      onClick={handleHearExpectedNote}
                      disabled={!expectedNoteName}
                      title="Écouter comment sonne la note attendue"
                    >
                      🔊 Écouter la note
                    </button>
                    <button
                      type="button"
                      className="btn-training-action secondary"
                      onClick={handleSkipTrainingNote}
                      disabled={trainingIndex >= playableTrainingNotes.length - 1}
                      title="Passer à la note suivante"
                    >
                      ⏭ Passer
                    </button>
                    <button
                      type="button"
                      className="btn-training-action reset"
                      onClick={handleResetTraining}
                      title="Recommencer l'exercice depuis le début"
                    >
                      🔄 Recommencer
                    </button>
                  </div>
                </div>

                {/* Next upcoming notes queue */}
                <div className="upcoming-notes-row">
                  <span className="upcoming-label">À suivre :</span>
                  <div className="upcoming-chips">
                    {playableTrainingNotes.slice(trainingIndex + 1, trainingIndex + 8).map((n, i) => (
                      <span key={i} className="chip-upcoming">{n.note}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Virtual Piano for both keyboard & click play */}
            <VirtualPiano
              baseOctave={baseOctave}
              expectedNote={activeMode === 'training' ? expectedNoteName : null}
              onNotePress={handleUserPlayNote}
            />

            {/* Status / Metadata */}
            {isLoading && <p className="status-msg">Chargement du morceau...</p>}
            {error && <p className="status-msg error">❌ {error}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
