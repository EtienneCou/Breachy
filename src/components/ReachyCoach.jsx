import React from 'react';
import './ReachyCoach.css';

export default function ReachyCoach({ isPlaying, currentNote, playbackRate }) {
  // Determine Reachy's coach mood
  let mood = "Prêt à écouter !";
  let moodClass = "idle";

  if (isPlaying) {
    if (currentNote && currentNote !== 'Repos') {
      mood = `Note en cours : ${currentNote}`;
      moodClass = "active";
    } else {
      mood = "Écoute attentive...";
      moodClass = "listening";
    }
  }

  return (
    <div className={`reachy-coach-container ${isPlaying ? 'is-playing' : ''}`}>
      <div className="reachy-bubble">
        <span className="coach-badge">🤖 Coach Reachy</span>
        <p className="coach-mood">{mood}</p>
        {isPlaying && playbackRate < 1 && (
          <span className="speed-tag">Mode ralenti ({playbackRate}x)</span>
        )}
      </div>

      <div className="reachy-avatar">
        {/* Animated Antennas */}
        <div className="reachy-antennas">
          <div className="antenna left">
            <div className="antenna-stem"></div>
            <div className="antenna-orb"></div>
          </div>
          <div className="antenna right">
            <div className="antenna-stem"></div>
            <div className="antenna-orb"></div>
          </div>
        </div>

        {/* Head */}
        <div className={`reachy-head ${isPlaying ? 'grooving' : ''}`}>
          {/* Eyes / Visor */}
          <div className="reachy-face">
            <div className="eye left">
              <div className="pupil"></div>
            </div>
            <div className="eye right">
              <div className="pupil"></div>
            </div>
          </div>
          {/* Mouth / LED Indicator */}
          <div className={`reachy-mouth ${isPlaying ? 'speaking' : ''}`}></div>
        </div>

        {/* Neck and Torso */}
        <div className="reachy-neck"></div>
        <div className="reachy-torso">
          <div className="heartbeat-led"></div>
        </div>
      </div>
    </div>
  );
}
