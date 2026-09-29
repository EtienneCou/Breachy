import './Transportcontrols.css';

const DEFAULT_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

const formatTime = (s) => {
  const total = Math.max(0, Math.floor(s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Contrôles purement présentationnels : ils branchent n'importe quelle
 * horloge (useTimeline aujourd'hui, lecteur MIDI demain).
 */
export default function TransportControls({
  playing,
  speed,
  time,
  duration,
  speeds = DEFAULT_SPEEDS,
  onPlay,
  onPause,
  onRestart,
  onSeek,
  onSpeedChange,
}) {
  return (
    <div className="transport">
      <button type="button" onClick={playing ? onPause : onPlay}>
        {playing ? 'Pause' : 'Lecture'}
      </button>
      <button type="button" onClick={onRestart}>
        Recommencer
      </button>

      <div className="transport__progress">
        <span>{formatTime(time)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={time}
          onChange={(e) => onSeek?.(Number(e.target.value))}
          aria-label="Progression du morceau"
        />
        <span>{formatTime(duration)}</span>
      </div>

      <div className="transport__speeds" role="group" aria-label="Vitesse">
        {speeds.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === speed}
            onClick={() => onSpeedChange?.(value)}
          >
            {value}x
          </button>
        ))}
      </div>
    </div>
  );
}