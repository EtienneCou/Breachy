import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import {
  KEY_LABELS, MAX_OCTAVE, MIN_OCTAVE, OCTAVE_DOWN, OCTAVE_UP, SUSTAIN, keymapForNotes, keymapForOctave, keymapForWindow,
} from './notes.js'
import { pianoSynth } from './synth.js'

/** Événement envoyé sur `window` à chaque note jouée (le coach Reachy l'écoute). */
export const PLAYER_ACTIVITY = 'breachy:note'

/**
 * Gère le jeu au clavier d'ordinateur, le son et l'état des touches enfoncées.
 *
 * Options :
 * - windowBase         note midi (blanche) où commence la fenêtre de 10 touches
 *                      blanches du jeu. Prioritaire sur `notes` ; la changer fait
 *                      changer le clavier d'octave. Désactive le changement d'octave manuel.
 * - notes              notes midi du morceau choisi. Si fourni, le clavier
 *                      s'adapte tout seul pour couvrir toutes ces notes et le
 *                      changement d'octave est désactivé (plage fixe pour le jeu).
 * - initialOctave      octave de départ en jeu libre (4 = Do central)
 * - allowOctaveShift   autorise les touches d'octave en jeu libre
 * - sound              joue le son (true par défaut)
 * - enabled            écoute le clavier (true par défaut)
 * - onNoteOn(midi, { time, source })   time = performance.now(), pour juger la précision
 * - onNoteOff(midi, { time, source })
 */
export function usePiano({
  windowBase,
  notes,
  initialOctave = 4,
  allowOctaveShift = true,
  sound = true,
  enabled = true,
  onNoteOn,
  onNoteOff,
} = {}) {
  const [octave, setOctaveState] = useState(initialOctave)
  const [activeNotes, setActiveNotes] = useState(() => new Set())
  const [sustain, setSustain] = useState(false)

  // Clé stable pour ne recalculer le clavier que si les notes changent vraiment.
  const notesKey = notes ? [...new Set(notes)].sort((a, b) => a - b).join(',') : null
  const keymap = useMemo(() => {
    if (windowBase != null) return keymapForWindow(windowBase)
    if (notesKey === null) return keymapForOctave(octave)
    return keymapForNotes(notesKey ? notesKey.split(',').map(Number) : [])
  }, [windowBase, notesKey, octave])
  const canShiftOctave = allowOctaveShift && notesKey === null && windowBase == null

  // touche physique -> note midi jouée (pour relâcher la bonne note même si l'octave a changé)
  const pressedCodes = useRef(new Map())

  // Dernières options, lues par noteOn / noteOff sans les recréer.
  const options = useRef({ sound, onNoteOn, onNoteOff })
  useEffect(() => {
    options.current = { sound, onNoteOn, onNoteOff }
  })

  const noteOn = useCallback((midi, source) => {
    if (options.current.sound) pianoSynth.noteOn(midi)
    setActiveNotes((prev) => new Set(prev).add(midi))
    options.current.onNoteOn?.(midi, { time: performance.now(), source })
    // Quelqu'un joue (clavier, souris, MIDI…) : le coach Reachy reste éveillé.
    window.dispatchEvent(new Event(PLAYER_ACTIVITY))
  }, [])

  const noteOff = useCallback((midi, source) => {
    if (options.current.sound) pianoSynth.noteOff(midi)
    setActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(midi)
      return next
    })
    options.current.onNoteOff?.(midi, { time: performance.now(), source })
  }, [])

  const releaseAllKeys = useEffectEvent(() => {
    for (const midi of pressedCodes.current.values()) noteOff(midi, 'keyboard')
    pressedCodes.current.clear()
  })

  const setOctave = useCallback((value) => {
    setOctaveState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      return Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, next))
    })
  }, [])

  const toggleSustain = useEffectEvent((on) => {
    pianoSynth.setSustain(on)
    setSustain(on)
  })

  const handleKeyDown = useEffectEvent((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    // Saisie de texte (ex. nom d'un enregistrement) : le clavier écrit, il ne joue pas.
    if (e.target instanceof HTMLElement && e.target.closest('textarea, input[type="text"], input[type="search"]')) return
    const inField = e.target instanceof HTMLElement && e.target.closest('input, select, textarea')
    if (inField && !(e.code in keymap.bindings)) return

    if (e.code === SUSTAIN) {
      e.preventDefault()
      if (!e.repeat) toggleSustain(true)
      return
    }
    if (canShiftOctave && (e.code === OCTAVE_DOWN || e.code === OCTAVE_UP)) {
      e.preventDefault()
      if (!e.repeat) {
        releaseAllKeys()
        setOctave((o) => o + (e.code === OCTAVE_UP ? 1 : -1))
      }
      return
    }
    if (e.code in keymap.bindings) {
      e.preventDefault()
      if (e.repeat || pressedCodes.current.has(e.code)) return
      const midi = keymap.bindings[e.code]
      pressedCodes.current.set(e.code, midi)
      noteOn(midi, 'keyboard')
    }
  })

  const handleKeyUp = useEffectEvent((e) => {
    if (e.code === SUSTAIN) {
      toggleSustain(false)
      return
    }
    const midi = pressedCodes.current.get(e.code)
    if (midi !== undefined) {
      pressedCodes.current.delete(e.code)
      noteOff(midi, 'keyboard')
    }
  })

  const handleBlur = useEffectEvent(() => {
    releaseAllKeys()
    toggleSustain(false)
  })

  useEffect(() => {
    if (!enabled) return
    const down = (e) => handleKeyDown(e)
    const up = (e) => handleKeyUp(e)
    const blur = () => handleBlur()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      blur()
    }
  }, [enabled])

  // Changement de morceau : on relâche ce qui était enfoncé.
  useEffect(() => {
    releaseAllKeys()
  }, [notesKey])

  // note midi -> caractère imprimé sur la touche du clavier d'ordinateur
  const labels = useMemo(() => {
    const map = {}
    for (const [code, midi] of Object.entries(keymap.bindings)) map[midi] = KEY_LABELS[code]
    return map
  }, [keymap])

  // Pour le jeu à la souris / au doigt depuis <Piano>
  const pressNote = useCallback((midi) => noteOn(midi, 'pointer'), [noteOn])
  const releaseNote = useCallback((midi) => noteOff(midi, 'pointer'), [noteOff])

  return {
    activeNotes,
    octave,
    setOctave,
    canShiftOctave,
    canGoLower: octave > MIN_OCTAVE,
    canGoHigher: octave < MAX_OCTAVE,
    range: { from: keymap.from, to: keymap.to },
    missingNotes: keymap.missing,
    sustain,
    labels,
    octaveKeys: { down: KEY_LABELS[OCTAVE_DOWN], up: KEY_LABELS[OCTAVE_UP] },
    pressNote,
    releaseNote,
  }
}
