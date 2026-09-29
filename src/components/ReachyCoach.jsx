import React from 'react';
import './ReachyCoach.css';

export default function ReachyCoach({
  mode = 'listen', // 'listen' | 'training'
  isPlaying = false,
  currentNote = null,
  playbackRate = 1.0,
  trainingFeedback = null, // { type: 'success' | 'mistake' | 'hint' | 'complete', message: string, keyHint?: string }
  score = { correct: 0, total: 0, combo: 0 }
}) {
  // Determine Reachy's coach mood & status
  let mood = "Prêt à t'accompagner !";
  let moodType = "idle";
  let eyeColor = "#0284c7";

  if (mode === 'training') {
    if (trainingFeedback) {
      mood = trainingFeedback.message;
      moodType = trainingFeedback.type;
      if (trainingFeedback.type === 'success') {
        eyeColor = '#10b981'; // Green happy
      } else if (trainingFeedback.type === 'mistake') {
        eyeColor = '#f59e0b'; // Amber encouraging
      } else if (trainingFeedback.type === 'complete') {
        eyeColor = '#ec4899'; // Pink festive
      }
    } else if (currentNote && currentNote !== 'Repos') {
      mood = `Joue la note : ${currentNote}`;
      moodType = "waiting";
      eyeColor = '#38bdf8';
    } else {
      mood = "C'est parti pour l'entraînement !";
    }
  } else {
    // Listen Mode
    if (isPlaying) {
      if (currentNote && currentNote !== 'Repos') {
        mood = `Note en cours : ${currentNote}`;
        moodType = "active";
        eyeColor = '#a855f7';
      } else {
        mood = "Écoute attentive...";
        moodType = "listening";
        eyeColor = '#6366f1';
      }
    }
  }

  const isGrooving = (mode === 'listen' && isPlaying) || (mode === 'training' && moodType === 'success');

  return (
    <div className={`reachy-coach-container ${isGrooving ? 'is-playing' : ''} mood-${moodType}`}>
      <div className="reachy-bubble">
        <div className="coach-badge-row">
          <span className="coach-badge">🤖 Coach Reachy</span>
          {mode === 'training' && score.combo > 1 && (
            <span className="combo-pill">🔥 Combo x{score.combo}</span>
          )}
        </div>
        <p className="coach-mood">{mood}</p>
        
        {mode === 'training' && trainingFeedback?.keyHint && (
          <div className="reachy-hint-box">
            Touche AZERTY : <kbd>{trainingFeedback.keyHint}</kbd>
          </div>
        )}

        {mode === 'listen' && isPlaying && playbackRate < 1 && (
          <span className="speed-tag">Mode ralenti ({playbackRate}x)</span>
        )}
      </div>

      <div className="reachy-avatar">
        {/* Animated Antennas */}
        <div className="reachy-antennas">
          <div className={`antenna left ${moodType === 'success' ? 'bounce' : ''}`}>
            <div className="antenna-stem"></div>
            <div className="antenna-orb" style={{ background: eyeColor, boxShadow: `0 0 12px ${eyeColor}` }}></div>
          </div>
          <div className={`antenna right ${moodType === 'success' ? 'bounce' : ''}`}>
            <div className="antenna-stem"></div>
            <div className="antenna-orb" style={{ background: eyeColor, boxShadow: `0 0 12px ${eyeColor}` }}></div>
          </div>
        </div>

        {/* Head */}
        <div className={`reachy-head ${isGrooving ? 'grooving' : ''} ${moodType === 'mistake' ? 'tilt' : ''}`}>
          {/* Eyes / Visor */}
          <div className="reachy-face">
            <div className="eye left" style={{ background: eyeColor, boxShadow: `0 0 10px ${eyeColor}` }}>
              <div className={`pupil ${moodType === 'success' ? 'happy-eye' : ''}`}></div>
            </div>
            <div className="eye right" style={{ background: eyeColor, boxShadow: `0 0 10px ${eyeColor}` }}>
              <div className={`pupil ${moodType === 'success' ? 'happy-eye' : ''}`}></div>
            </div>
          </div>
          {/* Mouth / LED Indicator */}
          <div className={`reachy-mouth ${isGrooving ? 'speaking' : ''} ${moodType === 'success' ? 'smile' : ''}`}></div>
        </div>

        {/* Neck and Torso */}
        <div className="reachy-neck"></div>
        <div className="reachy-torso">
          <div
            className="heartbeat-led"
            style={{
              background: moodType === 'mistake' ? '#f59e0b' : moodType === 'success' ? '#10b981' : '#38bdf8',
              boxShadow: `0 0 8px ${moodType === 'mistake' ? '#f59e0b' : moodType === 'success' ? '#10b981' : '#38bdf8'}`
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
