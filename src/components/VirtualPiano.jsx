import React, { useEffect } from 'react';
import './VirtualPiano.css';

// Musical notes in an octave with French solfege
const OCTAVE_NOTES = [
  { name: 'C', solfege: 'Do', isBlack: false, azertyWhite: 'Q', azertyBlack: null },
  { name: 'C#', solfege: 'Do#', isBlack: true, azertyWhite: null, azertyBlack: 'Z' },
  { name: 'D', solfege: 'Ré', isBlack: false, azertyWhite: 'S', azertyBlack: null },
  { name: 'D#', solfege: 'Ré#', isBlack: true, azertyWhite: null, azertyBlack: 'E' },
  { name: 'E', solfege: 'Mi', isBlack: false, azertyWhite: 'D', azertyBlack: null },
  { name: 'F', solfege: 'Fa', isBlack: false, azertyWhite: 'F', azertyBlack: null },
  { name: 'F#', solfege: 'Fa#', isBlack: true, azertyWhite: null, azertyBlack: 'T' },
  { name: 'G', solfege: 'Sol', isBlack: false, azertyWhite: 'G', azertyBlack: null },
  { name: 'G#', solfege: 'Sol#', isBlack: true, azertyWhite: null, azertyBlack: 'Y' },
  { name: 'A', solfege: 'La', isBlack: false, azertyWhite: 'H', azertyBlack: null },
  { name: 'A#', solfege: 'La#', isBlack: true, azertyWhite: null, azertyBlack: 'U' },
  { name: 'B', solfege: 'Si', isBlack: false, azertyWhite: 'J', azertyBlack: null },
];

const OCTAVE_NOTES_UPPER = [
  { name: 'C', solfege: 'Do', isBlack: false, azertyWhite: 'K', azertyBlack: null },
  { name: 'C#', solfege: 'Do#', isBlack: true, azertyWhite: null, azertyBlack: 'O' },
  { name: 'D', solfege: 'Ré', isBlack: false, azertyWhite: 'L', azertyBlack: null },
  { name: 'D#', solfege: 'Ré#', isBlack: true, azertyWhite: null, azertyBlack: 'P' },
  { name: 'E', solfege: 'Mi', isBlack: false, azertyWhite: 'M', azertyBlack: null },
  { name: 'F', solfege: 'Fa', isBlack: false, azertyWhite: 'W', azertyBlack: null },
  { name: 'F#', solfege: 'Fa#', isBlack: true, azertyWhite: null, azertyBlack: 'B' },
  { name: 'G', solfege: 'Sol', isBlack: false, azertyWhite: 'X', azertyBlack: null },
  { name: 'G#', solfege: 'Sol#', isBlack: true, azertyWhite: null, azertyBlack: 'N' },
  { name: 'A', solfege: 'La', isBlack: false, azertyWhite: 'C', azertyBlack: null },
  { name: 'A#', solfege: 'La#', isBlack: true, azertyWhite: null, azertyBlack: null },
  { name: 'B', solfege: 'Si', isBlack: false, azertyWhite: 'V', azertyBlack: null },
];

export default function VirtualPiano({
  baseOctave = 4,
  expectedNote = null,
  onNotePress,
  disabled = false
}) {
  // Generate keys for two octaves: baseOctave and baseOctave + 1
  const keys = [
    ...OCTAVE_NOTES.map((n) => ({
      ...n,
      octave: baseOctave,
      fullNote: `${n.name}${baseOctave}`,
      keyShortcut: n.isBlack ? n.azertyBlack : n.azertyWhite
    })),
    ...OCTAVE_NOTES_UPPER.map((n) => ({
      ...n,
      octave: baseOctave + 1,
      fullNote: `${n.name}${baseOctave + 1}`,
      keyShortcut: n.isBlack ? n.azertyBlack : n.azertyWhite
    }))
  ];

  // Listen to physical keyboard events (AZERTY)
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e) => {
      // Ignore when typing in inputs/textareas
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const pressedKey = e.key.toUpperCase();
      const matched = keys.find((k) => k.keyShortcut === pressedKey);

      if (matched && !e.repeat) {
        e.preventDefault();
        onNotePress(matched.fullNote, matched);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keys, disabled, onNotePress]);

  // Clean expected note check (handles case variations and octave tolerance)
  const isKeyExpected = (keyFullNote, keyBaseNote) => {
    if (!expectedNote || expectedNote === 'Repos') return false;
    const cleanExpected = expectedNote.trim().toUpperCase();
    const cleanFull = keyFullNote.toUpperCase();
    if (cleanExpected === cleanFull) return true;

    // Fallback: if exact note octave isn't in current view, highlight the pitch letter
    const exactExists = keys.some((k) => k.fullNote.toUpperCase() === cleanExpected);
    if (!exactExists) {
      const expectedLetter = cleanExpected.replace(/\d+/, '');
      const keyLetter = keyBaseNote.toUpperCase();
      return expectedLetter === keyLetter;
    }
    return false;
  };

  return (
    <div className="virtual-piano-wrapper">
      <div className="piano-header-info">
        <span className="piano-badge">🎹 Clavier Virtuel Français (AZERTY)</span>
        <span className="octave-indicator">Octaves : {baseOctave} - {baseOctave + 1}</span>
      </div>

      <div className="piano-keyboard">
        {keys.map((k) => {
          const expected = isKeyExpected(k.fullNote, k.name);
          return (
            <button
              key={k.fullNote}
              type="button"
              className={`piano-key ${k.isBlack ? 'black-key' : 'white-key'} ${expected ? 'target-note' : ''}`}
              onClick={() => onNotePress(k.fullNote, k)}
              disabled={disabled}
              title={`${k.fullNote} (${k.solfege}) - Touche ${k.keyShortcut}`}
            >
              <div className="key-labels">
                <span className="key-note-name">{k.fullNote}</span>
                {k.keyShortcut && (
                  <span className="key-shortcut-tag">{k.keyShortcut}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="keyboard-tip">
        💡 <strong>Astuce :</strong> Vous pouvez jouer directement avec les touches de votre clavier d'ordinateur (touches affichées sur les touches du piano) ou en cliquant dessus !
      </p>
    </div>
  );
}
