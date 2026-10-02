import { useEffect, useEffectEvent, useRef } from "react";
import useSongPlayer from "../../hooks/useSongPlayer";
import { useLanguage } from "../../context/LanguageContext";
import "./PracticePlayer.css";

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function PracticePlayer({ onClose }) {
  const { t } = useLanguage();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    loop,
    error,
    pause,
    resume,
    seek,
    setVolume,
    setPlaybackRate,
    setLoop,
    restart,
    stop,
  } = useSongPlayer();

  const handleClose = () => {
    stop();
    if (onClose) onClose();
  };

  const barRef = useRef(null);
  const closeFromOutside = useEffectEvent((e) => {
    if (barRef.current && !barRef.current.contains(e.target)) handleClose();
  });
  useEffect(() => {
    const onPointerDown = (e) => closeFromOutside(e);
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (!currentSong) {
    return null;
  }

  const speeds = [0.5, 0.75, 1.0, 1.25];

  const handleTimelineChange = (e) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <aside ref={barRef} className="practice-player-bar" aria-label={t('practicePlayer.ariaLabel')}>
      {error && (
        <div className="practice-error-banner" role="alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="practice-player-top">
        {/* Infos sur le morceau d'entraînement */}
        <div className="practice-song-info">
          {currentSong.image && (
            <img
              src={currentSong.image}
              alt={currentSong.title || t('practicePlayer.defaultSong')}
              className="practice-song-cover"
            />
          )}
          <div className="practice-song-details">
            <span className="practice-badge">
              <span className={`practice-badge-dot ${!isPlaying ? "paused" : ""}`} />
              {t('practicePlayer.mode', isPlaying)}
            </span>
            <h3 className="practice-song-title">{currentSong.title || t('practicePlayer.defaultSong')}</h3>
            <p className="practice-song-artist">{currentSong.artist || t('practicePlayer.defaultArtist')}</p>
          </div>
        </div>

        {/* Contrôles audio de l'entraînement */}
        <div className="practice-center-controls">
          <button
            type="button"
            className="practice-btn"
            onClick={restart}
            title={t('practicePlayer.restartTitle')}
            aria-label={t('practicePlayer.restartTitle')}
          >
            {t('practicePlayer.start')}
          </button>

          <button
            type="button"
            className="practice-play-btn"
            onClick={isPlaying ? pause : resume}
            title={isPlaying ? t('practicePlayer.pauseTitle') : t('practicePlayer.playTitle')}
            aria-label={isPlaying ? t('practicePlayer.pauseTitle') : t('practicePlayer.playTitle')}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button
            type="button"
            className={`practice-btn ${loop ? "active" : ""}`}
            onClick={() => setLoop(!loop)}
            title={loop ? t('practicePlayer.loopActive') : t('practicePlayer.loopEnable')}
            aria-label={loop ? t('practicePlayer.loopActive') : t('practicePlayer.loopEnable')}
          >
            {loop ? t('practicePlayer.loopOn') : t('practicePlayer.loopOff')}
          </button>

          {/* Vitesse / Ralenti pour la pratique */}
          <div className="practice-speed-selector" title={t('practicePlayer.speedTitle')}>
            {speeds.map((rate) => (
              <button
                key={rate}
                type="button"
                className={`speed-option-btn ${playbackRate === rate ? "active" : ""}`}
                onClick={() => setPlaybackRate(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Fermeture */}
        <div className="practice-right-controls">
          <div className="practice-volume-box">
            <span title={t('practicePlayer.volumeTitle')} aria-hidden="true">
              {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="practice-volume-slider"
              title={`${t('transport.backingHeading')} : ${Math.round(volume * 100)}%`}
              aria-label={t('practicePlayer.volumeAria')}
            />
          </div>

          <button
            type="button"
            className="practice-close-btn"
            onClick={handleClose}
            title={t('practicePlayer.closeTitle')}
            aria-label={t('practicePlayer.closeAria')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Barre de progression / timeline */}
      <div className="practice-timeline-container">
        <span className="practice-time current">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleTimelineChange}
          className="practice-timeline-slider"
          aria-label={t('practicePlayer.positionAria')}
        />
        <span className="practice-time total">{formatTime(duration)}</span>
      </div>
    </aside>
  );
}
