// Meilleur résultat du joueur sur chaque morceau, gardé dans le navigateur.
// Enregistré à la fin d'une partie (PianoPage), affiché sur les cartes de l'accueil.

const STORAGE_KEY = 'breachy:best-scores'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

/** Meilleur résultat d'un morceau : { successPercent, stars, score, playedAt } ou null. */
export function getBestScore(musicId) {
  return readAll()[musicId] ?? null
}

/**
 * Enregistre le résultat d'une partie s'il bat le précédent
 * (meilleur pourcentage de réussite, puis meilleur score en points).
 */
export function saveResult(musicId, { successPercent, stars, score }) {
  const all = readAll()
  const best = all[musicId]
  const better = !best || successPercent > best.successPercent || (successPercent === best.successPercent && score > best.score)
  if (!better) return
  all[musicId] = { successPercent, stars, score, playedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // stockage indisponible (navigation privée…) : le meilleur score n'est simplement pas gardé
  }
}
