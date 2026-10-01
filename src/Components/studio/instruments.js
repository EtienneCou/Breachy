// Instruments du Studio : un numéro d'instrument General MIDI (banque GeneralUser GS),
// ou un kit de batterie pour les percussions.

export const STUDIO_INSTRUMENTS = [
  { id: 'piano', label: 'Piano', icon: '🎹', color: '#1f7bff', octave: 4, variants: [{ id: 'grand', label: 'Piano à queue', program: 0 }] },
  {
    id: 'guitar',
    label: 'Guitare électrique',
    icon: '🎸',
    color: '#ef4444',
    octave: 3,
    // Saturé par défaut : c'est le son le plus reconnaissable au clavier.
    variants: [
      { id: 'overdrive', label: 'Saturé', program: 29 },
      { id: 'distortion', label: 'Distorsion', program: 30 },
      { id: 'muted', label: 'Étouffé (riffs)', program: 28 },
      { id: 'clean', label: 'Son clair', program: 27 },
      { id: 'jazz', label: 'Jazz', program: 26 },
    ],
  },
  {
    id: 'bass',
    label: 'Basse',
    icon: '🎵',
    color: '#8b5cf6',
    octave: 2,
    variants: [
      { id: 'electric', label: 'Électrique', program: 33 },
      { id: 'synth', label: 'Synthé', program: 38 },
    ],
  },
  { id: 'drums', label: 'Batterie', icon: '🥁', color: '#f59e0b', drums: true, variants: [{ id: 'standard', label: 'Kit acoustique', program: 0 }] },
  {
    id: 'drum-machine',
    label: 'Boîte à rythme',
    icon: '🎛️',
    color: '#ec4899',
    drums: true,
    variants: [
      { id: '808', label: 'TR-808 / 909', program: 25 },
      { id: 'electronic', label: 'Électronique', program: 24 },
    ],
  },
  { id: 'organ', label: 'Orgue', icon: '⛪', color: '#14b8a6', octave: 4, variants: [{ id: 'drawbar', label: 'Orgue électrique', program: 16 }, { id: 'rock', label: 'Orgue rock', program: 18 }] },
  { id: 'strings', label: 'Cordes', icon: '🎻', color: '#22c55e', octave: 4, variants: [{ id: 'ensemble', label: 'Ensemble de cordes', program: 48 }] },
  { id: 'lead', label: 'Synthé lead', icon: '🔊', color: '#06b6d4', octave: 4, variants: [{ id: 'saw', label: 'Dent de scie', program: 81 }, { id: 'square', label: 'Carré', program: 80 }] },
  { id: 'brass', label: 'Cuivres', icon: '🎺', color: '#f97316', octave: 4, variants: [{ id: 'section', label: 'Section de cuivres', program: 61 }] },
]

export const instrumentById = (id) => STUDIO_INSTRUMENTS.find((i) => i.id === id) ?? STUDIO_INSTRUMENTS[0]

export function variantOf(instrument, variantId) {
  return instrument.variants.find((v) => v.id === variantId) ?? instrument.variants[0]
}

// ---------- Percussions sur le clavier ----------
// Le clavier des percussions est fixé sur l'octave 4 (Do4 = 60). Chaque touche joue
// un son du kit (numéros de notes de la batterie General MIDI) et affiche son nom.
export const DRUM_OCTAVE = 4

// Touches blanches de gauche à droite (Q S D F G H J K L M Ù en AZERTY).
const WHITE_PADS = [
  [36, 'Grosse caisse'],
  [38, 'Caisse claire'],
  [39, 'Clap'],
  [42, 'Charley fermé'],
  [46, 'Charley ouvert'],
  [45, 'Tom grave'],
  [47, 'Tom médium'],
  [50, 'Tom aigu'],
  [49, 'Crash'],
  [51, 'Ride'],
  [56, 'Cloche'],
]
// Touches noires de gauche à droite (Z E T Y U O P en AZERTY).
const BLACK_PADS = [
  [37, 'Rimshot'],
  [44, 'Charley pied'],
  [54, 'Tambourin'],
  [70, 'Maracas'],
  [75, 'Claves'],
  [62, 'Conga'],
  [69, 'Cabasa'],
]

const isBlack = (midi) => [1, 3, 6, 8, 10].includes(midi % 12)

/**
 * Clavier des percussions : touche (note midi affichée) -> { note de batterie, nom },
 * pour les touches de `from` à `to`.
 */
export function drumPads(from, to) {
  const pads = {}
  let white = 0
  let black = 0
  for (let key = from; key <= to; key++) {
    const pad = isBlack(key) ? BLACK_PADS[black++] : WHITE_PADS[white++]
    if (pad) pads[key] = { note: pad[0], name: pad[1] }
  }
  return pads
}

// Nom d'un son de batterie, d'après sa note (pour l'affichage des pistes).
const DRUM_NAMES = Object.fromEntries([...WHITE_PADS, ...BLACK_PADS])
export const drumName = (note) => DRUM_NAMES[note] ?? `Son ${note}`
