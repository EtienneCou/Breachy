import { DIFFICULTIES } from '../../utils/difficulty.js'
import { getBestScore } from '../../utils/bestScores.js'

/**
 * Morceau que Reachy propose à l'accueil, adapté au niveau du joueur :
 * - niveau du joueur = le plus difficile où il a obtenu au moins 2 étoiles (Facile au départ) ;
 *   s'il y a déjà 3 étoiles à ce niveau, on vise le niveau au-dessus ;
 * - parmi les morceaux de ce niveau pas encore maîtrisés, on préfère ceux jamais joués.
 * Le choix change chaque jour (`day`), pour ne pas toujours proposer le même.
 *
 * items : [{ key, title, info }] (info = useSongsInfo) ; retourne { key, title, levelId, levelLabel } ou null.
 */
export function suggestSong(items, day = 0) {
  const rated = items
    .map((item) => ({ ...item, level: DIFFICULTIES.findIndex((d) => d.id === item.info?.difficulty?.level.id), best: getBestScore(item.key) }))
    .filter((item) => item.level >= 0)
  if (!rated.length) return null

  const levelOf = (minStars) => Math.max(-1, ...rated.filter((i) => (i.best?.stars ?? 0) >= minStars).map((i) => i.level))
  let target = Math.max(0, levelOf(2))
  if (levelOf(3) >= target) target = Math.min(DIFFICULTIES.length - 1, target + 1)

  // Niveau visé, ou le plus proche qui a encore des morceaux à travailler.
  const toWork = rated.filter((i) => (i.best?.stars ?? 0) < 3)
  const pool = toWork.length ? toWork : rated
  const distance = (i) => Math.abs(i.level - target)
  const closest = Math.min(...pool.map(distance))
  const candidates = pool
    .filter((i) => distance(i) === closest)
    .sort((a, b) => (a.best ? 1 : 0) - (b.best ? 1 : 0) || a.title.localeCompare(b.title))
  const fresh = candidates.filter((i) => !i.best)
  const list = fresh.length ? fresh : candidates
  const chosen = list[day % list.length]
  return { key: chosen.key, title: chosen.title, levelId: DIFFICULTIES[chosen.level].id, levelLabel: DIFFICULTIES[chosen.level].label }
}
