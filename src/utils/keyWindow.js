import { windowTop } from '../Components/piano/notes.js'

// Planification des changements d'octave du clavier de jeu.
//
// Le joueur n'a que 10 touches blanches (+ les noires entre elles). Le clavier
// reste dessiné au même endroit, mais la fenêtre de notes qu'il joue monte ou
// descend d'une octave quand la mélodie le demande. On ne la déplace que par
// octaves entières pour que le dessin des touches noires ne change jamais.

const LOOKAHEAD_NOTES = 48 // notes examinées pour choisir la meilleure fenêtre
const MIN_RUN = 6 // en dessous, on ramène la note à l'octave au lieu de changer de fenêtre
const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11] // do ré mi fa sol la si

const fits = (base, midi) => midi >= base && midi <= windowTop(base)

// Nombre de notes consécutives, à partir de `i`, qui tiennent dans la fenêtre `base`.
function runLength(notes, i, base) {
  let n = 0
  while (i + n < notes.length && n < LOOKAHEAD_NOTES && fits(base, notes[i + n].midi)) n++
  return n
}

// Fenêtres (de la classe `pc`) qui contiennent la note, de la plus basse à la plus haute.
function basesContaining(midi, pc) {
  const bases = []
  for (let base = midi - ((((midi - pc) % 12) + 12) % 12) - 12; base <= midi; base += 12) {
    if (fits(base, midi)) bases.push(base)
  }
  return bases
}

// La note ramenée à l'octave la plus proche dans la fenêtre, ou null si impossible.
function foldInto(base, midi) {
  let best = null
  for (let m = midi - 48; m <= midi + 48; m += 12) {
    if (fits(base, m) && (best === null || Math.abs(m - midi) < Math.abs(best - midi))) best = m
  }
  return best
}

function planForClass(notes, pc) {
  let current = null
  const segments = []
  let folds = 0
  const placed = notes.map((note, i) => {
    let play = note.midi
    if (current === null || !fits(current, note.midi)) {
      // Meilleure fenêtre pour la suite : celle qui garde le plus longtemps les notes à venir.
      const candidates = basesContaining(note.midi, pc)
      const best = candidates.reduce((a, b) => {
        const ra = runLength(notes, i, a)
        const rb = runLength(notes, i, b)
        if (rb !== ra) return rb > ra ? b : a
        return current !== null && Math.abs(b - current) < Math.abs(a - current) ? b : a
      })
      const folded = current === null ? null : foldInto(current, note.midi)
      if (folded !== null && runLength(notes, i, best) < MIN_RUN) {
        play = folded // passage court hors fenêtre : on ne bouge pas le clavier
        folds++
      } else {
        const previous = notes[i - 1]
        // le clavier change juste après la note précédente, avant que celle-ci n'arrive
        const at = previous ? previous.start + Math.min(0.15, (note.start - previous.start) / 2) : -Infinity
        current = best
        segments.push({ at, base: best })
      }
    }
    return { ...note, playMidi: play, base: current, slot: play - current }
  })
  return { segments, notes: placed, folds, switches: segments.length - 1 }
}

/**
 * Planifie le clavier pour une mélodie.
 * - melody : [{ ...note, start, midi }] triées par début
 * Retourne :
 * - segments : [{ at, base }] — à partir du temps `at`, la fenêtre commence sur `base`
 * - notes    : la mélodie avec, pour chaque note, `playMidi` (la note à jouer, parfois
 *              ramenée d'une octave), `base` (sa fenêtre) et `slot` (position dans la
 *              fenêtre, en demi-tons depuis sa première touche : c'est la touche à frapper)
 * - folds, switches : nombre de notes ramenées d'octave et de changements de fenêtre
 */
export function planKeyWindows(melody) {
  const notes = melody.filter((n) => n.midi != null)
  if (!notes.length) return { segments: [], notes: [], folds: 0, switches: 0 }
  // On essaie chaque note blanche de départ et on garde le plan le plus simple à jouer.
  let best = null
  for (const pc of WHITE_PITCH_CLASSES) {
    const plan = planForClass(notes, pc)
    const cost = plan.switches + plan.folds * 0.5
    if (!best || cost < best.cost) best = { ...plan, cost }
  }
  return best
}

// Fenêtre active au temps `time` (segments triés par `at`).
export function windowAt(segments, time) {
  let base = segments[0]?.base ?? null
  for (const segment of segments) {
    if (segment.at > time) break
    base = segment.base
  }
  return base
}
