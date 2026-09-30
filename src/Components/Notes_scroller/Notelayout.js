// Mapping horizontal des notes. Tout est exprimé en fractions (0..1) de la
// largeur du scroller : aucun pixel, donc responsive par construction.
// Contrat : { x: centre de la note, width: largeur }.

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
const DEFAULT_WIDTH = 0.04;

/** "C4", "F#3", "Db5" -> numéro MIDI (C4 = 60). Accepte aussi un nombre MIDI. */
export function noteToMidi(name) {
  if (typeof name === 'number') return name;
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name ?? '');
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return 12 * (parseInt(octave, 10) + 1) + PITCH_CLASS[letter.toUpperCase()] + shift;
}

export function isAccidental(name) {
  const midi = noteToMidi(name);
  return midi !== null && BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

/**
 * Layout piano par défaut : touches blanches de largeur égale, touches noires
 * centrées à la frontière de deux touches blanches. Gère plusieurs octaves.
 * Retourne une fonction (nomDeNote) => { x, width } | null (hors plage).
 */
export function createPianoLayout({ from = 'C3', to = 'C6', blackKeyRatio = 0.6 } = {}) {
  const low = noteToMidi(from);
  const high = noteToMidi(to);
  const whiteIndex = new Map();
  let whiteCount = 0;
  for (let midi = low; midi <= high; midi += 1) {
    if (!BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12)) {
      whiteIndex.set(midi, whiteCount);
      whiteCount += 1;
    }
  }
  const whiteWidth = 1 / whiteCount;

  return (name) => {
    const midi = noteToMidi(name);
    if (midi === null || midi < low || midi > high) return null;
    if (whiteIndex.has(midi)) {
      return { x: (whiteIndex.get(midi) + 0.5) * whiteWidth, width: whiteWidth };
    }
    // Touche noire : la touche blanche juste en dessous est midi - 1.
    const below = whiteIndex.get(midi - 1) ?? -1;
    return { x: (below + 1) * whiteWidth, width: whiteWidth * blackKeyRatio };
  };
}

/**
 * Normalise la prop `noteLayout` du composant :
 *  - undefined  -> layout piano par défaut
 *  - fonction   -> (nom) => nombre (x) | { x, width } | null
 *  - objet      -> { C4: 0.1, D4: { x: 0.2, width: 0.05 }, ... }
 * Les résultats sont mis en cache par nom de note.
 */
export function resolveNoteLayout(source) {
  const raw =
    typeof source === 'function'
      ? source
      : source
        ? (name) => source[name]
        : createPianoLayout();
  const cache = new Map();

  return (name) => {
    if (cache.has(name)) return cache.get(name);
    const entry = raw(name);
    let result = null;
    if (typeof entry === 'number') {
      result = { x: entry, width: DEFAULT_WIDTH };
    } else if (entry && typeof entry.x === 'number') {
      result = { width: DEFAULT_WIDTH, ...entry };
    }
    if (result) result.accidental ??= isAccidental(name);
    cache.set(name, result);
    return result;
  };
}