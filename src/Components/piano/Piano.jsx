import { useMemo, useRef } from 'react'
import { getKeyboardLayout, noteName } from './notes.js'
import './Piano.css'

const NO_NOTES = new Set()
const NO_LABELS = {}
const NO_HINTS = {}

/**
 * Clavier de piano, purement visuel : il affiche l'état qu'on lui donne et
 * signale les appuis souris / tactiles. À brancher sur usePiano().
 *
 * - from, to        plage midi affichée (touches blanches aux deux bouts)
 * - activeNotes     Set des notes enfoncées
 * - labels          { midi: 'Q' } caractère du clavier d'ordinateur à afficher
 * - hints           { midi: 'target' | 'hit' | 'miss' } retour visuel pour le jeu
 * - showNoteNames   affiche Do4, Ré4… sur les touches blanches
 * - names           { midi: 'Caisse claire' } nom à afficher à la place de la note
 *                   (sur toutes les touches, noires comprises : percussions du Studio)
 * - onNoteOn(midi), onNoteOff(midi)   appuis souris / tactiles (glissando compris)
 */
export default function Piano({
  from,
  to,
  activeNotes = NO_NOTES,
  labels = NO_LABELS,
  hints = NO_HINTS,
  showNoteNames = true,
  names,
  onNoteOn,
  onNoteOff,
  className = '',
}) {
  const keys = useMemo(() => getKeyboardLayout(from, to), [from, to])
  const pointers = useRef(new Map()) // pointerId -> midi

  const midiAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-midi]')
    return el ? Number(el.dataset.midi) : null
  }

  const handlePointerDown = (e) => {
    const midi = midiAt(e.clientX, e.clientY)
    if (midi === null) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, midi)
    onNoteOn?.(midi)
  }

  const handlePointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)
    const midi = midiAt(e.clientX, e.clientY)
    if (midi === prev) return
    if (prev !== null) onNoteOff?.(prev)
    pointers.current.set(e.pointerId, midi)
    if (midi !== null) onNoteOn?.(midi)
  }

  const handlePointerEnd = (e) => {
    const midi = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)
    if (midi != null) onNoteOff?.(midi)
  }

  return (
    <div className={`piano ${className}`}>
      {/* Ligne de frappe : là où les notes qui tombent doivent être jouées */}
      <div className="piano__hitline" aria-hidden="true">
        {keys.map((k) => (
          <span
            key={k.midi}
            className={keyClass('piano__fret', k, activeNotes, hints)}
            style={{ left: `${k.left}%`, width: `${k.width}%` }}
          />
        ))}
      </div>

      <div
        className="piano__keys"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {keys.map((k) => (
          <div
            key={k.midi}
            data-midi={k.midi}
            role="button"
            aria-label={names?.[k.midi] ?? noteName(k.midi)}
            aria-pressed={activeNotes.has(k.midi)}
            className={keyClass('piano__key', k, activeNotes, hints)}
            style={{ left: `${k.left}%`, width: `${k.width}%` }}
          >
            {names
              ? names[k.midi] && <span className="piano__name piano__name--custom">{names[k.midi]}</span>
              : showNoteNames && !k.black && <span className="piano__name">{noteName(k.midi)}</span>}
            {labels[k.midi] && <kbd className="piano__cap">{labels[k.midi]}</kbd>}
          </div>
        ))}
      </div>
    </div>
  )
}

function keyClass(base, key, activeNotes, hints) {
  let cls = `${base} ${key.black ? 'is-black' : 'is-white'}`
  if (activeNotes.has(key.midi)) cls += ' is-active'
  if (hints[key.midi]) cls += ` is-${hints[key.midi]}`
  return cls
}
