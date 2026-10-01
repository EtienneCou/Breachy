import { useEffect, useState } from 'react'
import { loadMusic, musicCatalog } from '../data/musicData'
import songsCatalog from '../resources/catalog'
import { getMidiSong } from '../Services/MidiDatabase'

// Préfixe des morceaux ajoutés par l'utilisateur (fichiers MIDI enregistrés dans le navigateur).
export const USER_SONG_PREFIX = 'user:'

/**
 * Charge les notes d'un morceau pour le jeu, à partir de son id :
 * - un morceau du catalogue de l'accueil (resources/catalog.js) qui a une partition (`musicItem`)
 * - un morceau de data/musicData.js
 * - `user:<id>` : un fichier MIDI ajouté par l'utilisateur (Services/MidiDatabase)
 * Retourne { music: { id, label, tempo }, notes, status: 'loading' | 'ready' | 'error' | 'unknown' }.
 * `tempo` : { bpm, signature } pour un enregistrement calé sur le métronome, sinon null.
 * `practiceTrack` : partie à jouer d'un morceau du Studio ({ track, label }, ou null s'il
 * n'a pas de piste piano), undefined pour les autres morceaux (voir utils/songParts.js).
 */
export function useMusic(musicId) {
  const [loaded, setLoaded] = useState({ id: null, music: null, notes: [], status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const finish = (result) => !cancelled && setLoaded({ id: musicId, ...result })

    resolveMusic(musicId)
      .then(async (found) => {
        if (!found) return finish({ music: null, notes: [], status: 'unknown' })
        try {
          const notes = await loadMusic(found.item)
          finish({
            music: { id: musicId, label: found.label, tempo: found.tempo ?? null, practiceTrack: found.practiceTrack },
            notes,
            status: 'ready',
          })
        } catch {
          finish({ music: { id: musicId, label: found.label }, notes: [], status: 'error' })
        } finally {
          found.cleanup?.()
        }
      })
      .catch(() => finish({ music: null, notes: [], status: 'error' }))

    return () => {
      cancelled = true
    }
  }, [musicId])

  if (loaded.id !== musicId) return { music: null, notes: [], status: 'loading' }
  return { music: loaded.music, notes: loaded.notes, status: loaded.status }
}

/**
 * Charge les notes d'un morceau à partir de son id (mêmes sources que useMusic).
 * Retourne { label, notes, practiceTrack } ou null si le morceau est inconnu ou sans partition.
 */
export async function loadSongNotes(musicId) {
  const found = await resolveMusic(musicId)
  if (!found) return null
  try {
    return { label: found.label, notes: await loadMusic(found.item), practiceTrack: found.practiceTrack }
  } finally {
    found.cleanup?.()
  }
}

// Trouve de quoi charger le morceau : { item (format loadMusic), label, tempo?, practiceTrack?, cleanup? } ou null.
async function resolveMusic(id) {
  if (!id) return null

  if (id.startsWith(USER_SONG_PREFIX)) {
    const song = await getMidiSong(id.slice(USER_SONG_PREFIX.length))
    if (!song?.file) return null
    const url = URL.createObjectURL(song.file)
    return {
      item: { id, label: song.title, type: 'midi', url },
      label: song.title,
      tempo: song.tempo, // enregistrements calés sur le métronome
      practiceTrack: song.practiceTrack, // morceaux du Studio : partie à jouer (ou null)
      cleanup: () => URL.revokeObjectURL(url),
    }
  }

  const song = songsCatalog.find((s) => s.id === id)
  if (song?.musicItem) return { item: song.musicItem, label: song.title }

  const music = musicCatalog.find((m) => m.id === id)
  if (music) return { item: music, label: music.label }

  return null // inconnu, ou morceau sans partition (audio seulement)
}
