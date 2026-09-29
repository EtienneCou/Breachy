import { useEffect, useMemo, useRef } from 'react';
import Note from './note';
import { resolveNoteLayout } from './Notelayout';
import { EPS, getNotesStartingBetween, getVisibleNotes, prepareNotes } from './Timeline';
import './notescroller.css';

// Au-delà de ce saut (secondes), on considère un seek : pas de rafale d'événements.
const MAX_JUMP = 1;
// Marge de rendu autour de la zone visible (secondes).
const RENDER_MARGIN = 0.25;

function getScanStart(prev, time) {
  if (prev === null) return time > MAX_JUMP ? time : -EPS; // premier rendu
  if (time < prev) return time - EPS; // retour arrière / restart
  if (time - prev > MAX_JUMP) return time; // saut en avant
  return prev;
}

function getStatus(note, time, override, markMissed) {
  if (override) return override; // 'hit' | 'missed' | 'wrong' fournis par le parent
  if (time < note.start) return 'upcoming';
  if (time <= note.start + note.duration) return 'active';
  return markMissed ? 'missed' : 'past';
}

/**
 * Zone de défilement des notes.
 *
 * Props
 *  - notes            [{ id, note, start, duration }] en secondes
 *  - currentTime      temps musical courant (secondes) — la seule source de vérité
 *  - playing          optionnel : sert à ne pas émettre onNoteReached en pause
 *  - lookahead        secondes visibles entre le haut et la hit line (défaut 4)
 *  - hitLinePosition  position de la hit line, 0..1 depuis le haut (défaut 0.92)
 *  - noteLayout       fonction ou objet nom -> { x, width } (fractions 0..1).
 *                     À stabiliser (useMemo / constante de module).
 *  - noteStates       { [id]: 'hit' | 'missed' | 'wrong' } décidé par le parent
 *  - markMissed       marque 'missed' les notes passées sans état (défaut false)
 *  - showLabels       affiche le nom de la note dans la barre
 *  - onNoteReached    (note) => void, appelé quand note.start est atteint
 *
 * Le composant a besoin d'une hauteur définie (ex. flex: 1 dans son parent).
 */
export default function NoteScroller({
  notes,
  currentTime = 0,
  playing,
  lookahead = 4,
  hitLinePosition = 0.92,
  noteLayout,
  noteStates,
  markMissed = false,
  showLabels = false,
  onNoteReached,
  className = '',
  style,
}) {
  const prepared = useMemo(() => prepareNotes(notes), [notes]);
  const layoutOf = useMemo(() => resolveNoteLayout(noteLayout), [noteLayout]);

  const hitLine = Math.min(1, Math.max(0.1, hitLinePosition));
  // % de hauteur par seconde : position = (start - currentTime) * unit
  const unit = (hitLine * 100) / lookahead;
  const lookbehind = (lookahead * (1 - hitLine)) / hitLine;

  // --- Événement : note atteinte -------------------------------------------
  const prevTimeRef = useRef(null);
  const onReachedRef = useRef(onNoteReached);
  useEffect(() => {
    onReachedRef.current = onNoteReached;
  }, [onNoteReached]);

  useEffect(() => {
    const prev = prevTimeRef.current;
    if (playing === false) {
      // En pause à 0, on repart de "premier rendu" pour ne pas rater la note à 0.
      prevTimeRef.current = currentTime > 0 ? currentTime : null;
      return;
    }
    prevTimeRef.current = currentTime;
    const from = getScanStart(prev, currentTime);
    for (const note of getNotesStartingBetween(prepared, from, currentTime)) {
      onReachedRef.current?.(note);
    }
  }, [currentTime, playing, prepared]);

  // --- Rendu : uniquement la fenêtre visible -------------------------------
  const visible = getVisibleNotes(
    prepared,
    currentTime - lookbehind - RENDER_MARGIN,
    currentTime + lookahead + RENDER_MARGIN,
  );

  return (
    <div
      className={`note-scroller ${className}`.trim()}
      style={{ '--ns-hit-line': `${hitLine * 100}%`, ...style }}
      data-playing={playing}
    >
      <div className="note-scroller__track" style={{ transform: `translate3d(0, ${currentTime * unit}%, 0)` }}>
        {visible.map((note) => {
          const layout = layoutOf(note.note);
          if (!layout) return null; // note hors du mapping fourni
          return (
            <Note
              key={note.id}
              label={showLabels ? note.note : undefined}
              status={getStatus(note, currentTime, noteStates?.[note.id], markMissed)}
              accidental={layout.accidental}
              x={layout.x}
              width={layout.width}
              start={note.start}
              duration={note.duration}
              unit={unit}
            />
          );
        })}
      </div>
      <div className="note-scroller__hit-line" aria-hidden="true" />
    </div>
  );
}