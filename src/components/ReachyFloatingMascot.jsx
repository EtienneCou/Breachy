import React, { useState } from 'react';
import './ReachyFloatingMascot.css';

export default function ReachyFloatingMascot({ message = "À toi de jouer !", subtitle = "Reachy mini ✨" }) {
  const [isWaving, setIsWaving] = useState(false);

  const handleClick = () => {
    setIsWaving(true);
    setTimeout(() => setIsWaving(false), 1200);
  };

  return (
    <div className="reachy-floating-widget" onClick={handleClick} title="Reachy Mini - Votre coach">
      {/* Speech Bubble */}
      <div className="mascot-speech-bubble">
        <span className="mascot-title">{subtitle}</span>
        <p className="mascot-msg">{message}</p>
      </div>

      {/* Reachy Mini 3D-styled Avatar */}
      <div className={`mascot-avatar ${isWaving ? 'waving' : ''}`}>
        {/* Antennas */}
        <div className="mascot-antennas">
          <div className="m-antenna left">
            <div className="m-orb"></div>
            <div className="m-stem"></div>
          </div>
          <div className="m-antenna right">
            <div className="m-orb"></div>
            <div className="m-stem"></div>
          </div>
        </div>

        {/* Head */}
        <div className="mascot-head">
          <div className="mascot-visor">
            <div className="m-eye left"><div className="m-pupil"></div></div>
            <div className="m-eye right"><div className="m-pupil"></div></div>
          </div>
          <div className="mascot-smile"></div>
        </div>

        {/* Torso & Waving Hand */}
        <div className="mascot-body-wrapper">
          <div className="m-arm left-arm">
            <div className="m-hand">👋</div>
          </div>
          <div className="mascot-torso">
            <span className="torso-logo">🎵</span>
          </div>
          <div className="m-arm right-arm"></div>
        </div>

        <span className="mascot-caption">Reachy mini</span>
      </div>
    </div>
  );
}
