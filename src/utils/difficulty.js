import { noteToMidi } from '../Components/piano/notes.js'
import { planKeyWindows } from './keyWindow.js'
import { melodyFor, splitSong } from './songParts.js'

// Difficulté d'un morceau, calculée à partir de ses notes : elle marche donc aussi
// pour les morceaux ajoutés par l'utilisateur. Elle est mesurée sur ce que le joueur
// joue vraiment dans le jeu (la mélodie, sur le clavier de 10 touches).

// Les 4 niveaux, du plus facile au plus dur. `min` : score minimal du niveau.
export const DIFFICULTIES = [
  { id: 'facile', label: 'Facile', min: 0, color: '#16a34a', background: '#dcfce7' },
  { id: 'normal', label: 'Normal', min: 30, color: '#2563eb', background: '#dbeafe' },
  { id: 'difficile', label: 'Difficile', min: 50, color: '#ea580c', background: '#ffedd5' },
  { id: 'extreme', label: 'Extrême', min: 75, color: '#dc2626', background: '#fee2e2' },
]

const CHORD_GAP = 0.02 // deux notes à moins de 20 ms d'écart = un accord
const FAST_GAP = 0.2 // note jouée moins de 0,2 s après la précédente = note rapide
const PAUSE_GAP = 2 // au-delà, c'est un silence : il ne compte pas dans le temps de jeu

/**
 * Difficulté d'un morceau à partir de toutes ses notes (format de data/musicData.js).
 * Retourne { level, score, details } ou null si le morceau n'a pas de notes à jouer.
 */
export function computeDifficulty(musicId, notes) {
  const { melody } = splitSong(notes, melodyFor(musicId, notes).ids)
  const midis = melody.map((n) => safeMidi(n.note))
  const playable = melody.filter((_, i) => midis[i] !== null)
  if (playable.length < 2) return null

  const plan = planKeyWindows(playable.map((n) => ({ ...n, midi: safeMidi(n.note) })))
  const gaps = playable.slice(1).map((n, i) => n.start - playable[i].start)
  const playingTime = gaps.filter((g) => g < PAUSE_GAP).reduce((sum, g) => sum + g, 0) || 1

  const details = {
    notesPerSecond: playable.length / playingTime, // vitesse
    fastRatio: gaps.filter((g) => g >= CHORD_GAP && g < FAST_GAP).length / playable.length, // notes enchaînées
    chordRatio: gaps.filter((g) => g < CHORD_GAP).length / playable.length, // plusieurs notes en même temps
    blackKeyRatio: midis.filter((m) => m !== null && [1, 3, 6, 8, 10].includes(m % 12)).length / playable.length,
    keysUsed: new Set(plan.notes.map((n) => n.slot)).size, // touches différentes à connaître
    octaveChanges: plan.switches, // changements d'octave du clavier pendant le morceau
  }

  const score =
    Math.min(40, details.notesPerSecond * 10) +
    details.fastRatio * 30 +
    details.chordRatio * 60 +
    details.blackKeyRatio * 20 +
    Math.max(0, details.keysUsed - 10) * 2 +
    details.octaveChanges * 2

  const level = [...DIFFICULTIES].reverse().find((d) => score >= d.min)
  return { level, score: Math.round(score), details }
}

function safeMidi(name) {
  try {
    return noteToMidi(name)
  } catch {
    return null
  }
}
