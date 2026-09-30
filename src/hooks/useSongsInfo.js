import { useEffect, useState } from 'react'
import { getSongInfo } from '../utils/songInfo.js'

/**
 * Infos calculées (difficulté, durée, mélodie, nombre de notes) de plusieurs morceaux.
 * Retourne { [musicId]: info | null } ; un id absent veut dire « en cours de calcul ».
 * Les ids null ou vides sont ignorés (morceaux sans partition).
 */
export function useSongsInfo(musicIds) {
  const [infos, setInfos] = useState({})
  const key = musicIds.filter(Boolean).join('|')

  useEffect(() => {
    let cancelled = false
    for (const id of key ? key.split('|') : []) {
      getSongInfo(id).then((info) => {
        if (!cancelled) setInfos((prev) => (id in prev ? prev : { ...prev, [id]: info }))
      })
    }
    return () => {
      cancelled = true
    }
  }, [key])

  return infos
}
