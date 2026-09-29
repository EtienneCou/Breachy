// Logique temporelle pure, indépendante de React et du rendu.
// Unité de temps : secondes.

import { noteToMidi } from './Notelayout';

export const EPS = 1e-6;

/** Trie une fois les notes et calcule les bornes utiles aux recherches. */
export function prepareNotes(notes = []) {
  const sorted = [...notes].sort((a, b) => a.start - b.start);
  let maxDuration = 0;
  let duration = 0;
  for (const note of sorted) {
    maxDuration = Math.max(maxDuration, note.duration);
    duration = Math.max(duration, note.start + note.duration);
  }
  return { sorted, maxDuration, duration };
}

export const getSongDuration = (notes) => prepareNotes(notes).duration;

// Premier index dont start >= t
function lowerBound(sorted, t) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].start < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Premier index dont start > t
function upperBound(sorted, t) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].start <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Notes dont l'intervalle [start, start + duration] croise [tMin, tMax]. */
export function getVisibleNotes({ sorted, maxDuration }, tMin, tMax) {
  const visible = [];
  for (let i = lowerBound(sorted, tMin - maxDuration); i < sorted.length; i += 1) {
    const note = sorted[i];
    if (note.start > tMax) break;
    if (note.start + note.duration >= tMin) visible.push(note);
  }
  return visible;
}

/** Notes dont le début tombe dans l'intervalle ]from, to]. */
export function getNotesStartingBetween({ sorted }, from, to) {
  const reached = [];
  for (let i = upperBound(sorted, from); i < sorted.length; i += 1) {
    if (sorted[i].start > to) break;
    reached.push(sorted[i]);
  }
  return reached;
}

/**
 * Note attendue correspondant à une touche jouée (comparaison par hauteur MIDI,
 * donc C#4 === Db4). Retourne la note la plus proche de `time`, ou null.
 * `filter` permet d'exclure les notes déjà traitées.
 */
export function findNoteToHit(prepared, noteName, time, { tolerance = 0.15, filter } = {}) {
  const midi = noteToMidi(noteName);
  let best = null;
  let bestGap = Infinity;
  for (const note of getVisibleNotes(prepared, time - tolerance, time + tolerance)) {
    if (noteToMidi(note.note) !== midi) continue;
    if (filter && !filter(note)) continue;
    const gap = Math.abs(note.start - time);
    if (gap <= tolerance && gap < bestGap) {
      best = note;
      bestGap = gap;
    }
  }
  return best;
}