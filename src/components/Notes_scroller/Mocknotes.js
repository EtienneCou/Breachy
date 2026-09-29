// Données mockées. Format cible du futur parser MIDI / .txt :
// { id, note, start, duration } avec start et duration en SECONDES.

/** [nom | null (silence), durée en beats][] -> notes avec start/duration en secondes. */
export function sequenceToNotes(sequence, { secondsPerBeat = 0.5, idPrefix = 'n' } = {}) {
  let beat = 0;
  const notes = [];
  sequence.forEach(([name, beats], index) => {
    if (name) {
      notes.push({
        id: `${idPrefix}-${index}`,
        note: name,
        start: beat * secondsPerBeat,
        duration: beats * secondsPerBeat,
      });
    }
    beat += beats;
  });
  return notes;
}

const melody = [
  ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
  ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['E4', 1.5], ['D4', 0.5], ['D4', 2],
  ['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1],
  ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['D4', 1.5], ['C4', 0.5], ['C4', 2],
  ['A#4', 1], ['C5', 3],
];

const bass = [
  ['C3', 4], ['G3', 4], ['C3', 4], ['G3', 4],
  ['C3', 4], ['G3', 4], ['C3', 4], ['G3', 4],
  ['C3', 4],
];

export const mockNotes = [
  ...sequenceToNotes(melody, { idPrefix: 'm' }),
  ...sequenceToNotes(bass, { idPrefix: 'b' }),
].sort((a, b) => a.start - b.start);

/** Grand morceau déterministe pour tester les performances (ex. 5000 notes). */
export function makeStressNotes(count = 5000) {
  const scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'C3', 'G3'];
  return Array.from({ length: count }, (_, i) => ({
    id: `s-${i}`,
    note: scale[(i * 7) % scale.length],
    start: i * 0.25,
    duration: 0.2 + (i % 3) * 0.2,
  }));
}