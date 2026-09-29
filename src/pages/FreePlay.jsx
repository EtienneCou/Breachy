import React, { useState, useEffect, useRef } from 'react';
import { noteToFrequency, SoundPlayerEngine } from '../utils/audioEngine';
import './FreePlay.css';

// 4-octave piano range: C2 to C6
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function FreePlay() {
  const [instrument, setInstrument] = useState('acoustic');
  const [tempo, setTempo] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [sustain, setSustain] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  const [activeNote, setActiveNote] = useState(null);
  const [detectedChord, setDetectedChord] = useState('Aucun accord');

  const [baseOctave, setBaseOctave] = useState(4);
  const [volume, setVolume] = useState(80);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState([]);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const soundEngineRef = useRef(null);
  const metronomeTimerRef = useRef(null);
  const recentNotesRef = useRef([]);

  useEffect(() => {
    soundEngineRef.current = new SoundPlayerEngine();
    return () => {
      if (soundEngineRef.current) soundEngineRef.current.stopAll();
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    };
  }, []);

  // Metronome tick
  useEffect(() => {
    if (metronomeActive) {
      const intervalMs = (60 / tempo) * 1000;
      metronomeTimerRef.current = setInterval(() => {
        if (soundEngineRef.current) {
          // Play a sharp high click (880Hz woodblock)
          soundEngineRef.current.playNote(880, 0.04, 0, 0.15);
        }
      }, intervalMs);
    } else {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    }

    return () => {
      if (metronomeTimerRef.current) clearInterval(metronomeTimerRef.current);
    };
  }, [metronomeActive, tempo]);

  // Generate 4-octave keys: from C2 to C6
  const octaves = [2, 3, 4, 5];
  const keys = [];
  octaves.forEach((oct) => {
    PITCH_NAMES.forEach((p) => {
      const isBlack = p.includes('#');
      keys.push({
        name: p,
        octave: oct,
        fullNote: `${p}${oct}`,
        isBlack
      });
    });
  });
  // Add final C6
  keys.push({ name: 'C', octave: 6, fullNote: 'C6', isBlack: false });

  // Play Note Function
  const playKey = (noteName) => {
    if (!soundEngineRef.current) return;
    const freq = noteToFrequency(noteName);
    if (!freq) return;

    const dur = sustain ? 1.2 : 0.45;
    const vol = (volume / 100) * 0.28;
    soundEngineRef.current.playNote(freq, dur, 0, vol);

    setActiveNote(noteName);

    // Track recently played notes to detect chords
    const now = Date.now();
    recentNotesRef.current.push({ note: noteName.replace(/\d+/, ''), time: now });
    // Keep notes from last 400ms
    recentNotesRef.current = recentNotesRef.current.filter((n) => now - n.time < 400);

    const pitchSet = Array.from(new Set(recentNotesRef.current.map((n) => n.note)));
    detectChordFromPitches(pitchSet);

    // Handle recording
    if (isRecording) {
      setRecordedNotes((prev) => [...prev, { note: noteName, time: now }]);
    }

    // Reset active note display after delay
    setTimeout(() => {
      setActiveNote((curr) => (curr === noteName ? null : curr));
    }, 400);
  };

  const detectChordFromPitches = (pitches) => {
    if (pitches.length < 2) {
      setDetectedChord('Aucun accord');
      return;
    }
    const joined = pitches.sort().join(' ');
    if (joined.includes('C') && joined.includes('E') && joined.includes('G')) {
      setDetectedChord('Do Majeur (C)');
    } else if (joined.includes('A') && joined.includes('C') && joined.includes('E')) {
      setDetectedChord('La Mineur (Am)');
    } else if (joined.includes('F') && joined.includes('A') && joined.includes('C')) {
      setDetectedChord('Fa Majeur (F)');
    } else if (joined.includes('G') && joined.includes('B') && joined.includes('D')) {
      setDetectedChord('Sol Majeur (G)');
    } else if (joined.includes('D') && joined.includes('F') && joined.includes('A')) {
      setDetectedChord('Ré Mineur (Dm)');
    } else if (joined.includes('E') && joined.includes('G') && joined.includes('B')) {
      setDetectedChord('Mi Mineur (Em)');
    } else {
      setDetectedChord(`Accord (${pitches.join('-')})`);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const keyMap = {
      q: `C${baseOctave}`,
      z: `C#${baseOctave}`,
      s: `D${baseOctave}`,
      e: `D#${baseOctave}`,
      d: `E${baseOctave}`,
      f: `F${baseOctave}`,
      t: `F#${baseOctave}`,
      g: `G${baseOctave}`,
      y: `G#${baseOctave}`,
      h: `A${baseOctave}`,
      u: `A#${baseOctave}`,
      j: `B${baseOctave}`,
      k: `C${baseOctave + 1}`
    };

    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const mapped = keyMap[e.key.toLowerCase()];
      if (mapped && !e.repeat) {
        e.preventDefault();
        playKey(mapped);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [baseOctave, sustain, volume, isRecording]);

  // Recording controls
  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setRecordedNotes([]);
      setIsRecording(true);
    }
  };

  const handlePlayRecording = () => {
    if (recordedNotes.length === 0 || isPlayingRecording) return;
    setIsPlayingRecording(true);
    const firstTime = recordedNotes[0].time;

    recordedNotes.forEach((item, idx) => {
      const delay = item.time - firstTime;
      setTimeout(() => {
        playKey(item.note);
        if (idx === recordedNotes.length - 1) {
          setIsPlayingRecording(false);
        }
      }, delay);
    });
  };

  const handleClearRecording = () => {
    setRecordedNotes([]);
    setIsRecording(false);
  };

  return (
    <div className="free-play-page">
      {/* Title */}
      <div className="free-play-header">
        <h1 className="free-play-title">Jeu libre</h1>
        <p className="free-play-subtitle">
          Joue librement au piano, explore les sons et laisse parler ta créativité !
        </p>
      </div>

      {/* Top Controls Toolbar Grid */}
      <div className="top-toolbar-grid">
        {/* Main Controls Card */}
        <div className="controls-card">
          {/* Instrument */}
          <div className="tool-item">
            <span className="tool-label">🎹 Instrument</span>
            <select
              className="select-instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            >
              <option value="acoustic">Piano acoustique</option>
              <option value="electric">Piano électrique</option>
              <option value="synth">Synthétiseur 8-bit</option>
              <option value="grand">Grand Piano Reachy</option>
            </select>
          </div>

          <div className="divider-vert"></div>

          {/* Tempo */}
          <div className="tool-item">
            <span className="tool-label">⏱ Tempo</span>
            <div className="tempo-control-row">
              <span className="bpm-number"><strong>{tempo}</strong> BPM</span>
              <div className="tempo-btn-group">
                <button
                  type="button"
                  className="btn-round"
                  onClick={() => setTempo((t) => Math.max(40, t - 5))}
                >
                  -
                </button>
                <input
                  type="range"
                  min="40"
                  max="220"
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value, 10))}
                  className="tempo-slider"
                />
                <button
                  type="button"
                  className="btn-round"
                  onClick={() => setTempo((t) => Math.min(220, t + 5))}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="divider-vert"></div>

          {/* Métronome */}
          <div className="tool-item switch-item">
            <span className="tool-label">🔔 Métronome</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={metronomeActive}
                onChange={(e) => setMetronomeActive(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="divider-vert"></div>

          {/* Sustain */}
          <div className="tool-item switch-item">
            <span className="tool-label">🎛 Sustain</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={sustain}
                onChange={(e) => setSustain(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="divider-vert"></div>

          {/* Afficher les notes */}
          <div className="tool-item switch-item">
            <span className="tool-label">🅰 Afficher les notes</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Right Status Cards */}
        <div className="status-cards-row">
          <div className="indicator-card">
            <div className="ind-header">
              <span className="ind-icon blue">🎵</span>
              <span className="ind-title">Note jouée</span>
            </div>
            <div className="ind-value">{activeNote || '—'}</div>
            <span className="ind-sub">{activeNote ? 'Détectée' : 'En attente'}</span>
          </div>

          <div className="indicator-card">
            <div className="ind-header">
              <span className="ind-icon purple">🎼</span>
              <span className="ind-title">Accord détecté</span>
            </div>
            <div className="ind-value chord">{detectedChord !== 'Aucun accord' ? detectedChord : '—'}</div>
            <span className="ind-sub">{detectedChord}</span>
          </div>
        </div>
      </div>

      {/* Realistic 4-Octave Piano Keyboard Card */}
      <div className="piano-chassis-card">
        <div className="piano-keys-bed">
          {keys.map((k) => {
            const isPlayingThis = activeNote === k.fullNote;
            const isCKey = k.name === 'C';

            return (
              <button
                key={k.fullNote}
                type="button"
                className={`piano-full-key ${k.isBlack ? 'black' : 'white'} ${isPlayingThis ? 'pressed' : ''}`}
                onClick={() => playKey(k.fullNote)}
              >
                {!k.isBlack && (
                  <span className={`white-key-label ${isCKey ? 'octave-marker' : ''}`}>
                    {isCKey ? k.fullNote : showNotes ? k.fullNote : ''}
                  </span>
                )}
                {k.isBlack && showNotes && (
                  <span className="black-key-label">{k.fullNote}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="bottom-toolbar-card">
        {/* Octave */}
        <div className="tool-group">
          <span className="tool-label">🎹 Octave</span>
          <div className="octave-stepper">
            <button
              type="button"
              className="btn-step"
              onClick={() => setBaseOctave((o) => Math.max(2, o - 1))}
            >
              -
            </button>
            <span className="octave-num">{baseOctave}</span>
            <button
              type="button"
              className="btn-step"
              onClick={() => setBaseOctave((o) => Math.min(5, o + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className="divider-vert"></div>

        {/* Enregistrement */}
        <div className="tool-group">
          <span className="tool-label">🔴 Enregistrement</span>
          <button
            type="button"
            className={`btn-bar ${isRecording ? 'recording' : ''}`}
            onClick={handleToggleRecord}
          >
            <span className="rec-dot"></span>
            {isRecording ? 'Arrêter' : 'Enregistrer'}
          </button>
        </div>

        {/* Lecture */}
        <div className="tool-group">
          <span className="tool-label">▶ Lecture</span>
          <button
            type="button"
            className="btn-bar"
            onClick={handlePlayRecording}
            disabled={recordedNotes.length === 0 || isPlayingRecording}
          >
            ▶ Lire {recordedNotes.length > 0 ? `(${recordedNotes.length})` : ''}
          </button>
        </div>

        {/* Effacer */}
        <div className="tool-group">
          <span className="tool-label">🗑 Effacer</span>
          <button
            type="button"
            className="btn-bar secondary"
            onClick={handleClearRecording}
            disabled={recordedNotes.length === 0}
          >
            🗑 Tout effacer
          </button>
        </div>

        <div className="divider-vert"></div>

        {/* Volume */}
        <div className="tool-group volume-group">
          <span className="tool-label">🔊 Volume</span>
          <div className="volume-slider-row">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="volume-slider"
            />
            <span className="vol-percent">{volume} %</span>
          </div>
        </div>
      </div>
    </div>
  );
}
