// Nombre de fois où chaque morceau a été lancé (« Écouter » ou « S'entraîner »),
// gardé dans le navigateur. Sert à la section « Favoris » et au filtre « Les plus joués ».
// Clé : id du catalogue, ou `user:<id>` pour un morceau ajouté.

const STORAGE_KEY = 'breachy:play-counts'

/** { [clé du morceau]: nombre de lancements } */
export function getPlayCounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

/** Compte un lancement du morceau et retourne les compteurs à jour. */
export function recordPlay(key) {
  const previous = getPlayCounts()
  const counts = { ...previous, [key]: (previous[key] ?? 0) + 1 }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
  } catch {
    // stockage indisponible (navigation privée…) : le compteur n'est pas gardé
  }
  return counts
}

/** Réinitialise le compteur d'écoutes d'un morceau et retourne les compteurs à jour. */
export function resetPlayCount(key) {
  const counts = getPlayCounts()
  delete counts[key]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
  } catch {
    // Le compteur n'est réinitialisé qu'en mémoire si le stockage est indisponible.
  }
  return counts
}
