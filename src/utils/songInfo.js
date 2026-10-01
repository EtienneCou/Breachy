import { loadSongNotes } from '../hooks/useMusic.js'
import { computeDifficulty } from './difficulty.js'
import { melodyFor, splitSong } from './songParts.js'

// Informations calculées à partir des notes d'un morceau, pour les cartes de
// l'accueil : difficulté, durée exacte, mélodie jouée et nombre de notes.
// Calculées une seule fois par morceau (le résultat est gardé en mémoire).

const cache = new Map() // id du morceau -> Promise<info | null>

/**
 * Infos d'un morceau (id du catalogue, ou `user:<id>` pour un morceau ajouté) :
 * { difficulty, duration (s), melodyLabel, noteCount }, ou null s'il n'a pas de partition.
 */
export function getSongInfo(musicId) {
  if (!cache.has(musicId)) {
    cache.set(
      musicId,
      loadSongNotes(musicId)
        .then((song) => (song ? describe(musicId, song.notes) : null))
        .catch(() => null),
    )
  }
  return cache.get(musicId)
}

function describe(musicId, notes) {
  if (!notes.length) return null
  const melodyPart = melodyFor(musicId, notes)
  const { melody } = splitSong(notes, melodyPart.ids)
  return {
    difficulty: computeDifficulty(musicId, notes),
    duration: Math.max(...notes.map((n) => n.start + n.duration)),
    melodyLabel: melodyPart.label ?? 'Piano',
    noteCount: melody.length,
  }
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
