import { useEffect, useState } from 'react'
import { loadSongNotes } from '../../hooks/useMusic.js'
import { computeDifficulty } from '../../utils/difficulty.js'
import './DifficultyBadge.css'

// Difficultés déjà calculées (id du morceau -> résultat), pour ne pas recharger
// les notes à chaque affichage de la page d'accueil.
const cache = new Map()

function difficultyOf(musicId) {
  if (!cache.has(musicId)) {
    cache.set(
      musicId,
      loadSongNotes(musicId)
        .then((song) => (song ? computeDifficulty(musicId, song.notes) : null))
        .catch(() => null),
    )
  }
  return cache.get(musicId)
}

/**
 * Pastille de difficulté d'un morceau (Facile, Normal, Difficile, Extrême), calculée
 * à partir de ses notes. `musicId` : id du catalogue, ou `user:<id>` pour un morceau
 * ajouté. N'affiche rien pour un morceau sans partition (écoute seulement).
 */
export default function DifficultyBadge({ musicId }) {
  const [result, setResult] = useState({ id: null, difficulty: null })

  useEffect(() => {
    let cancelled = false
    difficultyOf(musicId).then((difficulty) => {
      if (!cancelled) setResult({ id: musicId, difficulty })
    })
    return () => {
      cancelled = true
    }
  }, [musicId])

  const difficulty = result.id === musicId ? result.difficulty : null
  if (!difficulty) return null
  const { level } = difficulty
  return (
    <span
      className="difficulty-badge"
      style={{ '--difficulty-color': level.color, '--difficulty-bg': level.background }}
      title={`Difficulté : ${level.label}`}
    >
      <span className="difficulty-badge__dot" aria-hidden="true" />
      {level.label}
    </span>
  )
}
