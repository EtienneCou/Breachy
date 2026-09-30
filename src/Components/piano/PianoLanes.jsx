import { useMemo } from 'react'
import { getKeyboardLayout } from './notes.js'
import './Piano.css'

const NO_NOTES = new Set()

/**
 * Piste verticale posée au-dessus de <Piano> : une colonne par touche,
 * alignée au pixel près. Les notes qui tombent seront rendues en `children`,
 * positionnées avec getKeyboardLayout(from, to) (left / width en %).
 */
export default function PianoLanes({ from, to, activeNotes = NO_NOTES, children, className = '' }) {
  const keys = useMemo(() => getKeyboardLayout(from, to), [from, to])

  return (
    <div className={`piano-lanes ${className}`}>
      {keys.map((k) => (
        <div
          key={k.midi}
          aria-hidden="true"
          className={`piano-lanes__lane ${k.black ? 'is-black' : 'is-white'}${activeNotes.has(k.midi) ? ' is-active' : ''}`}
          style={{ left: `${k.left}%`, width: `${k.width}%` }}
        />
      ))}
      <div className="piano-lanes__notes">{children}</div>
    </div>
  )
}
