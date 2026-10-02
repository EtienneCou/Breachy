import './ReachyAvatar.css'
import { useCoachUi } from './coachUi.js'

/**
 * Reachy Mini dessiné : tête et grands yeux, deux antennes, socle.
 * `mood` l'anime ('idle', 'happy', 'cheer', 'dance', 'sad', 'think', 'attentive',
 * 'calm', 'proud', 'surprised', 'sleepy', 'asleep') ; `speaking` le fait « parler » (antennes et tête qui vibrent).
 * `groove` ({ level 0-3, period }) : il danse en rythme pendant le morceau, des antennes
 * seules (niveau 0) au rock star (niveau 3) ; une humeur passagère prend le dessus.
 * `evil` : sa seconde personnalité, diabolique (cornes, sourcils froncés, yeux rouges) ;
 * `transforming` : il tremble pendant la transformation.
 */
export default function ReachyAvatar({ mood = 'idle', speaking = false, groove = null, evil = false, transforming = false, size = 96, className = '' }) {
  const ui = useCoachUi()
  const dancing = groove && mood === 'idle'
  const state = dancing ? `groove reachy--groove-${groove.level}` : mood
  return (
    <svg
      className={`reachy reachy--${state}${speaking ? ' is-speaking' : ''}${evil ? ' reachy--evil' : ''}${transforming ? ' is-transforming' : ''} ${className}`}
      style={dancing ? { '--beat': `${groove.period}s` } : undefined}
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      role="img"
      aria-label={ui.avatar(evil, dancing ? ui.grooves[groove.level] : ui.moods[mood] ?? ui.moods.idle)}
    >
      {/* Socle */}
      <g className="reachy__body">
        <path d="M30 136 C30 112 40 100 60 100 C80 100 90 112 90 136 Z" className="reachy__shell" />
        <ellipse cx="60" cy="101" rx="16" ry="4" className="reachy__neck" />
      </g>

      {/* Tête : elle bouge avec l'humeur */}
      <g className="reachy__head">
        <g className="reachy__antenna reachy__antenna--left">
          <path d="M44 32 C40 22 34 14 30 6" />
          <circle cx="30" cy="6" r="3" />
        </g>
        <g className="reachy__antenna reachy__antenna--right">
          <path d="M76 32 C80 22 86 14 90 6" />
          <circle cx="90" cy="6" r="3" />
        </g>
        {/* Cornes du diabolique (cachées sinon) */}
        <g className="reachy__horns">
          <path d="M20 40 C14 30 12 22 14 13 C20 21 27 29 32 34 Z" />
          <path d="M100 40 C106 30 108 22 106 13 C100 21 93 29 88 34 Z" />
        </g>
        <rect x="16" y="28" width="88" height="62" rx="28" className="reachy__shell" />
        <rect x="25" y="39" width="70" height="40" rx="20" className="reachy__visor" />
        <g className="reachy__eyes">
          <g className="reachy__eye">
            <circle cx="45" cy="59" r="11" className="reachy__eye-ring" />
            <circle cx="45" cy="59" r="6" className="reachy__pupil" />
            <circle cx="42.5" cy="56" r="2" className="reachy__glint" />
          </g>
          <g className="reachy__eye">
            <circle cx="75" cy="59" r="11" className="reachy__eye-ring" />
            <circle cx="75" cy="59" r="6" className="reachy__pupil" />
            <circle cx="72.5" cy="56" r="2" className="reachy__glint" />
          </g>
        </g>
        {/* Sourcils froncés du diabolique (cachés sinon) */}
        <g className="reachy__brows">
          <path d="M33 44 L55 50" />
          <path d="M87 44 L65 50" />
        </g>
      </g>
    </svg>
  )
}
