/*
 * Statistiques de fin de partie.
 *
 * Le jeu fournit, à la fin du morceau, un objet `results` :
 * {
 *   song: { title, artist, level },
 *   playedAt: '2026-09-30T18:42:00',   // date de la partie
 *   speed: 1,                          // vitesse de lecture choisie (1 = normale)
 *   duration: 38.4,                    // durée du morceau en secondes
 *   notes: [
 *     {
 *       time: 1.2,          // moment prévu de la note, en secondes
 *       expected: 'C4',     // note attendue
 *       played: 'C4',       // note jouée, ou null si rien n'a été joué
 *       offsetMs: 35,       // écart avec le moment prévu (négatif = en avance, positif = en retard)
 *     },
 *     ...
 *   ],
 * }
 *
 * computeGameStats(results) en tire tout ce qu'affiche la page de résultats.
 */

// Fenêtres de timing, en millisecondes autour du moment prévu.
export const TIMING = {
  perfectMs: 60, // pile dans le temps
  goodMs: 150, // léger décalage, encore dans le tempo
}

// Les 5 issues possibles d'une note, de la meilleure à la moins bonne.
// `points` : part de réussite de la note. Une note juste et dans le tempo
// (parfaite ou bien) vaut 100 %, donc tout jouer au bon tempo donne 100 %.
export const OUTCOMES = [
  { id: 'perfect', label: 'Parfait', hint: 'Bonne note, pile dans le temps', points: 100 },
  { id: 'good', label: 'Bien', hint: 'Bonne note, léger décalage', points: 100 },
  { id: 'offbeat', label: 'Hors tempo', hint: 'Bonne note, mais trop tôt ou trop tard', points: 50 },
  { id: 'wrong', label: 'Fausse note', hint: 'Une autre touche a été jouée', points: 0 },
  { id: 'missed', label: 'Manquée', hint: "Aucune touche n'a été jouée", points: 0 },
]

const POINTS = Object.fromEntries(OUTCOMES.map((o) => [o.id, o.points]))
const IN_TEMPO = new Set(['perfect', 'good'])
const RIGHT_NOTE = new Set(['perfect', 'good', 'offbeat'])

export function classifyNote(note, timing = TIMING) {
  if (note.played == null) return 'missed'
  if (note.played !== note.expected) return 'wrong'
  const offset = Math.abs(note.offsetMs ?? 0)
  if (offset <= timing.perfectMs) return 'perfect'
  if (offset <= timing.goodMs) return 'good'
  return 'offbeat'
}

export function computeGameStats(results, timing = TIMING) {
  const notes = results.notes.map((note, index) => ({ ...note, index, outcome: classifyNote(note, timing) }))
  const total = notes.length
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o.id, 0]))
  for (const note of notes) counts[note.outcome]++

  const rightNotes = counts.perfect + counts.good + counts.offbeat
  const inTempo = counts.perfect + counts.good
  const offbeatNotes = notes.filter((n) => n.outcome === 'offbeat')
  const early = offbeatNotes.filter((n) => n.offsetMs < 0).length
  const late = offbeatNotes.length - early

  // Meilleure série : notes justes et dans le tempo, d'affilée.
  let bestStreak = 0
  let streak = 0
  for (const note of notes) {
    streak = IN_TEMPO.has(note.outcome) ? streak + 1 : 0
    bestStreak = Math.max(bestStreak, streak)
  }

  // Tendance rythmique, sur les bonnes notes uniquement.
  const offsets = notes.filter((n) => RIGHT_NOTE.has(n.outcome)).map((n) => n.offsetMs ?? 0)
  const averageOffsetMs = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : 0
  const tendency = averageOffsetMs < -20 ? 'early' : averageOffsetMs > 20 ? 'late' : 'steady'

  // Pourcentage de réussite du morceau : 100 % = toutes les notes justes et dans le tempo.
  // Arrondi vers le bas pour que 100 % ne s'affiche que pour un sans-faute.
  const successPercent = total ? Math.floor(notes.reduce((sum, n) => sum + POINTS[n.outcome], 0) / total) : 0
  const stars = successPercent >= 90 ? 3 : successPercent >= 70 ? 2 : successPercent >= 40 ? 1 : 0

  // Notes les plus difficiles : celles qui ont le plus d'erreurs (fausse, manquée, hors tempo).
  const byNote = new Map()
  for (const note of notes) {
    const entry = byNote.get(note.expected) ?? { note: note.expected, attempts: 0, errors: 0, wrong: 0, missed: 0, offbeat: 0 }
    entry.attempts++
    if (!IN_TEMPO.has(note.outcome)) {
      entry.errors++
      entry[note.outcome]++
    }
    byNote.set(note.expected, entry)
  }
  const troubleNotes = [...byNote.values()]
    .filter((e) => e.errors > 0)
    .sort((a, b) => b.errors / b.attempts - a.errors / a.attempts || b.errors - a.errors)
    .slice(0, 3)

  return {
    notes,
    total,
    counts,
    rightNotes,
    wrongNotes: counts.wrong,
    missedNotes: counts.missed,
    inTempo,
    early,
    late,
    noteAccuracy: total ? rightNotes / total : 0,
    tempoAccuracy: rightNotes ? inTempo / rightNotes : 0,
    bestStreak,
    offsets,
    averageOffsetMs,
    tendency,
    successPercent,
    stars,
    troubleNotes,
  }
}
