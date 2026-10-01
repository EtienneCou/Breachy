import { useEffect, useState } from 'react'
import { getSongInfo } from '../../utils/songInfo.js'
import './DifficultyBadge.css'

/**
 * Pastille de difficulté d'un morceau (Facile, Normal, Difficile, Extrême).
 * - level    niveau déjà calculé (voir utils/difficulty.js) : affiché directement
 * - musicId  sinon, id du morceau (catalogue ou `user:<id>`) : le niveau est calculé
 *            à partir de ses notes. Rien n'est affiché pour un morceau sans partition.
 */
export default function DifficultyBadge({ level, musicId }) {
  const [loaded, setLoaded] = useState({ id: null, level: null })

  useEffect(() => {
    if (level || !musicId) return
    let cancelled = false
    getSongInfo(musicId).then((info) => {
      if (!cancelled) setLoaded({ id: musicId, level: info?.difficulty?.level ?? null })
    })
    return () => {
      cancelled = true
    }
  }, [level, musicId])

  const shown = level ?? (loaded.id === musicId ? loaded.level : null)
  if (!shown) return null
  return (
    <span
      className="difficulty-badge"
      style={{ '--difficulty-color': shown.color, '--difficulty-bg': shown.background }}
      title={`Difficulté : ${shown.label}`}
    >
      <span className="difficulty-badge__dot" aria-hidden="true" />
      {shown.label}
    </span>
  )
}
