// Choix de la partie à jouer dans un morceau.
// Un fichier MIDI contient plusieurs pistes (batterie, basse, cordes…) : on n'en
// joue qu'une au piano. Les notes viennent de loadMusic() (data/musicData.js) :
// { id, note, start, duration, track?, channel?, instrument? }.

const DRUM_CHANNEL = 9 // canal MIDI réservé à la batterie
const CHORD_GAP = 0.02 // deux notes à moins de 20 ms d'écart = un accord

// Pistes jouables d'un morceau (batterie exclue). Vide pour un morceau à une seule partie.
export function getParts(notes) {
  const byTrack = new Map()
  for (const n of notes) {
    if (n.track === undefined || n.channel === DRUM_CHANNEL) continue
    if (!byTrack.has(n.track)) byTrack.set(n.track, [])
    byTrack.get(n.track).push(n)
  }
  if (byTrack.size < 2) return []

  const labels = new Map()
  return [...byTrack.entries()].map(([track, trackNotes]) => {
    const base = capitalize(trackNotes[0].instrument || `Piste ${track + 1}`)
    const seen = (labels.get(base) ?? 0) + 1
    labels.set(base, seen)
    return {
      id: String(track),
      label: seen > 1 ? `${base} ${seen}` : base,
      count: trackNotes.length,
      score: melodyScore(trackNotes),
    }
  })
}

// Partie proposée par défaut : la plus mélodique (une note à la fois, pas trop grave).
// C'est une estimation : le joueur peut changer d'instrument dans la page.
export function pickDefaultPart(parts) {
  return parts.reduce((best, p) => (!best || p.score > best.score ? p : best), null)
}

/**
 * Sépare le morceau en deux :
 * - melody   : la partie que le joueur joue au piano (piste `partId`, ou tout le
 *              morceau s'il n'a qu'une partie)
 * - backing  : tout le reste (autres instruments et batterie), joué automatiquement
 * Les deux sont décalés ensemble pour que la mélodie commence après `intro`
 * secondes d'accompagnement, au lieu d'attendre toute l'introduction du fichier.
 */
export function splitSong(notes, partId, { intro = 2, leadIn = 2 } = {}) {
  const isMelody = (n) => (partId == null ? n.channel !== DRUM_CHANNEL : String(n.track) === partId)
  const melody = notes.filter(isMelody)
  if (!melody.length) return { melody, backing: [] }
  const offset = Math.max(0, melody[0].start - intro)
  const shift = (n) => (offset > 0 ? { ...n, start: n.start - offset } : n)
  return {
    melody: melody.map(shift),
    // on garde ce qui tombe pendant le décompte (temps négatif), pas avant
    backing: notes.filter((n) => !isMelody(n)).map(shift).filter((n) => n.start >= -leadIn),
  }
}

function melodyScore(trackNotes) {
  let chordNotes = 0
  let pitchSum = 0
  trackNotes.forEach((n, i) => {
    if (i > 0 && n.start - trackNotes[i - 1].start < CHORD_GAP) chordNotes++
    pitchSum += noteNumber(n.note)
  })
  // Une ligne mélodique se joue une note à la fois : les accords sont fortement pénalisés.
  const singleNoteRatio = 1 - chordNotes / trackNotes.length
  const averagePitch = pitchSum / trackNotes.length
  const score = trackNotes.length * singleNoteRatio ** 3
  return averagePitch < 48 ? score * 0.2 : score // sous le Do3 : basse probable
}

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function noteNumber(name) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name ?? '')
  if (!m) return 60
  return 12 * (Number(m[3]) + 1) + PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
