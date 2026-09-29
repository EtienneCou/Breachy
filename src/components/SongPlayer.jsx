import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { parsePartition, SoundPlayerEngine, noteToFrequency } from '../utils/audioEngine';
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
    description: 'Le thème culte et rythmé de Nintendo'
  },
  {
    id: 'pirate',
    title: 'Pirates des Caraïbes - He\'s a Pirate',
    composer: 'Klaus Badelt & Hans Zimmer',
    file: '/songs/pirate.txt',
    icon: '🏴‍☠️',
    defaultOctave: 4,
    difficulty: 'Débutant / Avancé',
    description: 'Une mélodie épique et entraînante'
  }
];

export default function SongPlayer() {
  const [selectedSong, setSelectedSong] = useState(AVAILABLE_SONGS[0]);
  const [partitionData, setPartitionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // App mode: 'listen' | 'training'
  const [activeMode, setActiveMode] = useState('listen');

  // --- Listen Mode States ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // --- Training Mode States ---
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingFeedback, setTrainingFeedback] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0, combo: 0 });
  const [baseOctave, setBaseOctave] = useState(selectedSong.defaultOctave);

  // Background song playback during training
  const [bgMusicEnabled, setBgMusicEnabled] = useState(false);
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);
  const [bgCurrentTime, setBgCurrentTime] = useState(0);

  // Audio Engine & Timers Ref
  const soundEngineRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const bgPlaybackTimerRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const speedRef = useRef(playbackSpeed);

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Sync base octave when selected song changes
  useEffect(() => {
    setBaseOctave(selectedSong.defaultOctave);
    setTrainingIndex(0);
    setScore({ correct: 0, total: 0, combo: 0 });
    setTrainingFeedback(null);
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

  // Filter playable notes for training (exclude rests)
  const playableTrainingNotes = useMemo(() => {
    if (!partitionData) return [];
    return partitionData.events.filter((ev) => !ev.isRest && ev.frequency > 0);
  }, [partitionData]);

  // Load partition when selected song changes
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
        const text = await response.text();
        if (isMounted) {
          const parsed = parsePartition(text);
          setPartitionData(parsed);
          setCurrentTime(0);
          setCurrentEventIndex(-1);
          setTrainingIndex(0);
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
      // Auto-start listen playback smoothly once loaded
      setTimeout(() => {
        startPlayback();
      }, 150);
    }
  };

  // -------------------------------------------------------------
  // LISTEN MODE CONTROLS
  // -------------------------------------------------------------
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
        setCurrentTime(partitionData.totalDuration);
        stopPlayback();
        return;
      }

      setCurrentTime(elapsedVirtualTime);

      const eventIndex = partitionData.events.findIndex(
        (ev) => elapsedVirtualTime >= ev.startTime && elapsedVirtualTime < ev.endTime
      );

      if (eventIndex !== -1 && eventIndex !== lastNoteIndex) {
        lastNoteIndex = eventIndex;
        setCurrentEventIndex(eventIndex);

        const currentEv = partitionData.events[eventIndex];
        if (!currentEv.isRest && currentEv.frequency > 0) {
          const effectiveDuration = currentEv.duration / speedRef.current;
          soundEngineRef.current.playNote(currentEv.frequency, effectiveDuration, 0, 0.22);
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

    const eventIndex = partitionData.events.findIndex(
      (ev) => newTime >= ev.startTime && newTime < ev.endTime
    );
    setCurrentEventIndex(eventIndex);

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
    let lastBgIndex = -1;

    const bgTick = () => {
      const now = performance.now();
      const elapsedVirtualTime = ((now - startTimestamp) / 1000) * speedRef.current;

      // Loop background music smoothly
      const loopTime = elapsedVirtualTime % partitionData.totalDuration;
      setBgCurrentTime(loopTime);

      const eventIndex = partitionData.events.findIndex(
        (ev) => loopTime >= ev.startTime && loopTime < ev.endTime
      );

      if (eventIndex !== -1 && eventIndex !== lastBgIndex) {
        lastBgIndex = eventIndex;
        const currentEv = partitionData.events[eventIndex];
        if (!currentEv.isRest && currentEv.frequency > 0) {
          const effectiveDuration = currentEv.duration / speedRef.current;
          // Play at soft volume (0.07) so the student's own notes remain prominent!
          soundEngineRef.current.playNote(currentEv.frequency, effectiveDuration, 0, 0.07);
        }
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
    setBgCurrentTime(0);
  };

  const toggleBgMusic = () => {
    if (bgMusicPlaying) {
      stopBgMusic();
      setBgMusicEnabled(false);
    } else {
      setBgMusicEnabled(true);
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

    // Play the user's note with clear front volume
    const freq = noteToFrequency(playedNote);
    if (freq > 0) {
      soundEngineRef.current.playNote(freq, 0.35, 0, 0.28);
    }

    if (activeMode !== 'training' || !expectedNoteName) return;

    const cleanExpected = expectedNoteName.trim().toUpperCase();
    const cleanPlayed = playedNote.trim().toUpperCase();

    // Check match
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
          message: '🎉 Morceau terminé avec brio ! Reachy est fier de toi !',
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
        `Pas d'inquiétude ! Reachy t'attend sur le ${cleanExpected}.`,
        `Oups ! Écoute bien le rythme : Reachy attend ${cleanExpected}. Réessaye !`
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

  const currentEvent = partitionData && currentEventIndex >= 0 ? partitionData.events[currentEventIndex] : null;
  const currentNoteDisplay = activeMode === 'listen'
    ? (currentEvent && !currentEvent.isRest ? currentEvent.note : 'Repos')
    : expectedNoteName;

  const trainingProgressPct = playableTrainingNotes.length > 0
    ? Math.round((trainingIndex / playableTrainingNotes.length) * 100)
    : 0;

  return (
    <div className="reachy-band-player">
      {/* Header Section */}
      <header className="player-header">
        <div className="logo-title">
          <span className="app-icon">🤖🎵</span>
          <div>
            <h1>REACHY BAND</h1>
            <p className="app-subtitle">Choisissez votre morceau : écoutez Reachy ou entraînez-vous avec lui !</p>
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
          SONG CATALOGUE & DUAL ACTION SELECTION
          L'utilisateur choisit pour chaque morceau entre Jouer ou S'entraîner
          ------------------------------------------------------------- */}
      <section className="song-catalogue-section">
        <h2 className="catalogue-title">Catalogue des Morceaux : Choisissez votre défi</h2>
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
                    <h3>{song.title}</h3>
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
                  <h2>{selectedSong.title}</h2>
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
                          : "Activez pour entendre la mélodie en fond sonore pendant que vous jouez."}
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
