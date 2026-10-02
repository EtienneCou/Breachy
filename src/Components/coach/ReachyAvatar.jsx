import './ReachyAvatar.css'

/**
 * Reachy Mini dessiné : tête et grands yeux, deux antennes, socle.
 * `mood` l'anime ('idle', 'happy', 'cheer', 'dance', 'sad', 'think', 'attentive',
 * 'calm', 'proud', 'surprised', 'sleepy', 'asleep') ; `speaking` le fait « parler » (antennes et tête qui vibrent).
 * `groove` ({ level 0-3, period }) : il danse en rythme pendant le morceau, des antennes
 * seules (niveau 0) au rock star (niveau 3) ; une humeur passagère prend le dessus.
 */
export default function ReachyAvatar({ mood = 'idle', speaking = false, groove = null, size = 96, className = '' }) {
  const dancing = groove && mood === 'idle'
  const state = dancing ? `groove reachy--groove-${groove.level}` : mood
  return (
    <svg
      className={`reachy reachy--${state}${speaking ? ' is-speaking' : ''} ${className}`}
      style={dancing ? { '--beat': `${groove.period}s` } : undefined}
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      role="img"
      aria-label={`Reachy, ton coach (${dancing ? GROOVE_LABELS[groove.level] : MOOD_LABELS[mood] ?? 'calme'})`}
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
      </g>
    </svg>
  )
}

const GROOVE_LABELS = ['il bouge les antennes', 'il se balance doucement', 'il danse', 'il danse comme une rock star']

const MOOD_LABELS = {
  idle: 'calme',
  happy: 'content',
  cheer: 'il fête ta série',
  dance: 'il danse',
  sad: 'déçu pour toi',
  think: 'il réfléchit',
  attentive: 'attentif',
  calm: 'rassurant',
  proud: 'fier de toi',
  surprised: 'surpris',
  sleepy: 'il s\'ennuie',
  asleep: 'il dort',
}
