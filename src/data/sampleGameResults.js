// Parties d'exemple, pour le développement uniquement : elles ne sont affichées nulle part.
// Elles servent à régler le popup de fin de morceau sans jouer tout un morceau, par exemple
// en rendant temporairement <ResultsModal results={SAMPLE_RUNS[0].results} ... />.
// Même format que celui produit par le jeu (voir utils/gameStats.js).

const MELODY = [
  // Au clair de la lune : [note, durée en temps]
  ['C4', 1], ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 2], ['D4', 2],
  ['C4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 4],
  ['C4', 1], ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 2], ['D4', 2],
  ['C4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 4],
  ['D4', 1], ['D4', 1], ['D4', 1], ['D4', 1], ['A3', 2], ['A3', 2],
  ['D4', 1], ['C4', 1], ['B3', 1], ['A3', 1], ['G3', 4],
  ['C4', 1], ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 2], ['D4', 2],
  ['C4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 4],
]
const SECONDS_PER_BEAT = 0.6
const SONG = { title: 'Au clair de la lune', artist: 'Traditionnel', level: 'Débutant' }

/*
 * Construit une partie à partir de ce qui a été joué pour chaque note :
 * - un nombre : bonne note, avec cet écart en ms (négatif = en avance)
 * - [ms, 'F4'] : fausse note (F4 jouée à la place)
 * - null : note oubliée
 */
function buildRun(played) {
  let beat = 0
  return {
    song: SONG,
    playedAt: '2026-09-30T18:42:00',
    speed: 1,
    duration: MELODY.reduce((sum, [, beats]) => sum + beats, 0) * SECONDS_PER_BEAT,
    notes: MELODY.map(([expected, beats], i) => {
      const p = played(i, expected)
      const note = { time: +(beat * SECONDS_PER_BEAT).toFixed(2), expected }
      beat += beats
      if (p === null) return { ...note, played: null, offsetMs: null }
      if (Array.isArray(p)) return { ...note, played: p[1], offsetMs: p[0] }
      return { ...note, played: expected, offsetMs: p }
    }),
  }
}

const otherNote = (expected) => (expected === 'F4' ? 'E4' : 'F4')

const GOOD_RUN = [
  12, -8, 25, 40, -15, 30,
  18, 55, -20, 10, 5,
  -30, 22, 8, 64, 35, -12,
  40, 70, 15, -5, 28,
  95, 140, [60, 'E4'], 180, 210, null,
  120, [40, 'D4'], 165, -190, 45,
  10, -25, 18, 30, [20, 'F4'], 8,
  -10, 35, 12, null, 20,
]

// Une partie par palier de la jauge de feu.
export const SAMPLE_RUNS = [
  { id: 'perfect', label: 'Sans-faute (100 %, flammes bleues)', results: buildRun((i) => [12, -18, 25, -6][i % 4]) },
  { id: 'good', label: 'Très bien (84 %, en feu)', results: buildRun((i) => GOOD_RUN[i]) },
  {
    id: 'medium',
    label: 'Moyen (61 %, ça chauffe)',
    results: buildRun((i, expected) => (i % 5 === 0 ? [30, otherNote(expected)] : i % 3 === 1 ? 190 : i % 11 === 7 ? null : 45)),
  },
  {
    id: 'beginner',
    label: 'Débutant (31 %, ça pétille)',
    results: buildRun((i, expected) => (i % 3 === 0 ? [50, otherNote(expected)] : i % 4 === 1 ? null : i % 2 === 0 ? 230 : 110)),
  },
]
