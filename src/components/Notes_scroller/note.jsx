import { memo } from 'react';

/**
 * Une note = une barre. Sa position est statique dans le repère de la piste
 * (origine = hit line) : c'est la piste qui bouge, donc Note ne se re-rend
 * que lorsque son statut change.
 *
 * Le bas de la barre correspond au début de la note (transform: translateY(-100%)
 * dans le CSS), la hauteur représente la durée.
 */
function Note({ label, status, accidental, x, width, start, duration, unit }) {
  const displayWidth = Math.max(width, 0.035);
  const style = {
    left: `${(x - displayWidth / 2) * 100}%`,
    width: `${displayWidth * 100}%`,
    top: `${-start * unit}%`,
    height: `${duration * unit}%`,
  };
  const className = `note note--${status}${accidental ? ' note--accidental' : ''}`;

  return (
    <div className={className} style={style} data-note={label}>
      {label ? <span className="note__label">{label}</span> : null}
    </div>
  );
}

export default memo(Note);