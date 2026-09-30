// Choix de la partie à jouer dans un morceau.
// Un fichier MIDI contient plusieurs pistes (batterie, basse, cordes…) : on n'en
// joue qu'une au piano. Les notes viennent de loadMusic() (data/musicData.js) :
// { id, note, start, duration, track?, channel?, instrument? }.

const DRUM_CHANNEL = 9 // canal MIDI réservé à la batterie
const CHORD_GAP = 0.02 // deux notes à moins de 20 ms d'écart = un accord
const COVERAGE_STEP = 4 // secondes : découpage du morceau pour mesurer où une piste joue

// Mélodies vérifiées à la main (id du morceau -> pistes MIDI de la mélodie), quand le
// calcul automatique se trompe. Une mélodie peut réunir plusieurs pistes (ex. un chant
// réparti entre deux instruments).
export const MELODY_TRACKS = {
  abicycle: [4], // flûte de Pan (le basson, choisi sinon, est un contrechant)
  'take-on-me': [9], // cuivres synthé (le clavecin, choisi sinon, est un arpège)
  'bohemian-rhapsody': [1, 3], // cor + saxophone alto se partagent le chant
}

// Pistes jouables d'un morceau (batterie exclue). Vide pour un morceau à une seule partie.
export function getParts(notes) {
  const songDuration = Math.max(0, ...notes.map((n) => n.start + n.duration))
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
      score: melodyScore(trackNotes, songDuration),
    }
  })
}

// Partie proposée par défaut : la plus mélodique (une note à la fois, présente dans
// tout le morceau, étendue de voix, pas trop grave). C'est une estimation.
export function pickDefaultPart(parts) {
  return parts.reduce((best, p) => (!best || p.score > best.score ? p : best), null)
}

/**
 * Pistes de la mélodie d'un morceau : celles vérifiées à la main (MELODY_TRACKS) si
 * elles existent dans le fichier, sinon la piste estimée. null = morceau à une partie.
 * Retourne { ids: ['4'] ou null, label: 'Pan flute' }.
 */
export function melodyFor(musicId, notes) {
  const parts = getParts(notes)
  const known = (MELODY_TRACKS[musicId] ?? []).map(String).filter((id) => parts.some((p) => p.id === id))
  const chosen = known.length ? parts.filter((p) => known.includes(p.id)) : [pickDefaultPart(parts)].filter(Boolean)
  if (!chosen.length) return { ids: null, label: null }
  return { ids: chosen.map((p) => p.id), label: chosen.map((p) => p.label).join(' + ') }
}

/**
 * Sépare le morceau en deux :
 * - melody   : la partie que le joueur joue au piano (pistes `partIds`, ou tout le
 *              morceau s'il n'a qu'une partie)
 * - backing  : tout le reste (autres instruments et batterie), joué automatiquement
 * Les deux sont décalés ensemble pour que la mélodie commence après `intro`
 * secondes d'accompagnement, au lieu d'attendre toute l'introduction du fichier.
 */
export function splitSong(notes, partIds, { intro = 2, leadIn = 2 } = {}) {
  const isMelody = (n) => (partIds == null ? n.channel !== DRUM_CHANNEL : partIds.includes(String(n.track)))
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

function melodyScore(trackNotes, songDuration) {
  let chordNotes = 0
  let pitchSum = 0
  let low = Infinity
  let high = -Infinity
  const steps = new Set()
  trackNotes.forEach((n, i) => {
    if (i > 0 && n.start - trackNotes[i - 1].start < CHORD_GAP) chordNotes++
    const pitch = noteNumber(n.note)
    pitchSum += pitch
    low = Math.min(low, pitch)
    high = Math.max(high, pitch)
    steps.add(Math.floor(n.start / COVERAGE_STEP))
  })
  // Une ligne de chant : une note à la fois (accords très pénalisés), présente tout au
  // long du morceau, sur une étendue de voix (au-delà de 2 octaves : arpège ou contrechant).
  const singleNoteRatio = 1 - chordNotes / trackNotes.length
  const coverage = steps.size / Math.max(1, Math.ceil(songDuration / COVERAGE_STEP))
  const range = high - low
  const rangeFactor = range <= 24 ? 1 : 24 / range
  const averagePitch = pitchSum / trackNotes.length
  const score = singleNoteRatio ** 3 * coverage * rangeFactor
  return averagePitch < 48 ? score * 0.2 : score // sous le Do3 : basse probable
}

const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function noteNumber(name) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name ?? '')
  if (!m) return 60
  return 12 * (Number(m[3]) + 1) + PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
