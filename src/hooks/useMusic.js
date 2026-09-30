import { useEffect, useState } from 'react'
import { loadMusic, musicCatalog } from '../data/musicData'

/**
 * Charge les notes d'un morceau du catalogue (data/musicData.js).
 * Retourne { music, notes, status: 'idle' | 'loading' | 'ready' | 'error' }.
 * Sans `musicId`, rien n'est chargé (jeu libre).
 */
export function useMusic(musicId) {
  const [loaded, setLoaded] = useState({ id: null, notes: [], error: false })
  const music = musicCatalog.find((m) => m.id === musicId) ?? null

  useEffect(() => {
    if (!music) return
    let cancelled = false
    loadMusic(music)
      .then((notes) => !cancelled && setLoaded({ id: music.id, notes, error: false }))
      .catch(() => !cancelled && setLoaded({ id: music.id, notes: [], error: true }))
    return () => {
      cancelled = true
    }
  }, [music])

  if (!music) return { music: null, notes: [], status: 'idle' }
  if (loaded.id !== music.id) return { music, notes: [], status: 'loading' }
  return { music, notes: loaded.notes, status: loaded.error ? 'error' : 'ready' }
}
