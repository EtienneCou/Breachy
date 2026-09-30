// Notes, raccourcis clavier et géométrie des touches.
// La géométrie est partagée entre <Piano> et <PianoLanes> pour que les notes
// qui tombent du haut de l'écran arrivent exactement au-dessus de leur touche.

export const SOLFEGE = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si']
export const LETTERS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

export const isBlack = (midi) => BLACK_PITCH_CLASSES.has(midi % 12)
export const octaveOf = (midi) => Math.floor(midi / 12) - 1
export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12)
export const noteName = (midi) => SOLFEGE[midi % 12] + octaveOf(midi)
export const scientificName = (midi) => LETTERS[midi % 12] + octaveOf(midi)
// 'C#4' (dièse ASCII) : format attendu par le Notes_scroller et les fichiers de morceaux
const ASCII_LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const asciiName = (midi) => ASCII_LETTERS[midi % 12] + octaveOf(midi)

// Parse un nom de note ("C4", "D#5", "Eb3") en numéro midi.
export function noteToMidi(name) {
  const match = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/.exec(name.trim())
  if (!match) throw new Error(`Note invalide : ${name}`)
  const [, letter, accidental, oct] = match
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter.toUpperCase()]
  const shift = accidental === '#' || accidental === '♯' ? 1 : accidental === 'b' || accidental === '♭' ? -1 : 0
  return 12 * (Number(oct) + 1) + base + shift
}

// ---------- Correspondance clavier d'ordinateur -> notes ----------
//
// Un « manuel » = une rangée de touches pour les blanches, et la rangée du
// dessus pour les noires (slots[i] se trouve entre whites[i] et whites[i + 1]).
// Un slot en plus à la fin sert de liaison avec le manuel suivant.
// Un manuel peut commencer sur n'importe quelle note blanche.
const MANUALS = {
  // rangée du milieu (Q S D F… en AZERTY), noires sur la rangée du haut
  home: {
    whites: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
    slots: ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft'],
  },
  // rangée du bas (W X C V… en AZERTY), noires sur la rangée du milieu ;
  // Quote (Ù) fait la liaison avec le manuel du haut
  low: {
    whites: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
    slots: ['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  },
  // rangée du haut (A Z E R… en AZERTY), noires sur les chiffres
  high: {
    whites: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
    slots: ['Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  },
}

// Du plus confortable au plus étendu : 11 blanches, puis 22 blanches (≈ 3 octaves).
const PLANS = [['home'], ['low', 'high']]
const capacity = (plan) => plan.reduce((n, name) => n + MANUALS[name].whites.length, 0)
export const MAX_WHITE_KEYS = capacity(PLANS[PLANS.length - 1])

export const OCTAVE_DOWN = 'KeyZ'
export const OCTAVE_UP = 'KeyX'
export const SUSTAIN = 'Space'
export const MIN_OCTAVE = 1
export const MAX_OCTAVE = 6

const nextWhite = (midi) => (isBlack(midi + 1) ? midi + 2 : midi + 1)
const toWhiteBelow = (midi) => (isBlack(midi) ? midi - 1 : midi)
const toWhiteAbove = (midi) => (isBlack(midi) ? midi + 1 : midi)
const countWhites = (from, to) => {
  let n = 0
  for (let m = from; m <= to; m++) if (!isBlack(m)) n++
  return n
}

// Place les manuels du plan les uns après les autres à partir de `start` (blanche).
function buildKeymap(plan, start) {
  const bindings = {} // code -> midi
  let midi = start
  let last = start
  for (const name of plan) {
    const { whites, slots } = MANUALS[name]
    whites.forEach((code, i) => {
      bindings[code] = midi
      last = midi
      const next = nextWhite(midi)
      if (slots[i] && next - midi === 2) bindings[slots[i]] = midi + 1
      midi = next
    })
  }
  return { from: start, to: last, bindings }
}

// ---------- Fenêtre de 10 touches blanches ----------
// Le clavier du jeu : toujours les 10 mêmes touches blanches de la rangée du milieu
// (Q S D F G H J K L M en AZERTY) et les noires au-dessus. Seules les notes changent
// quand la fenêtre change d'octave.
export const WINDOW_WHITE_KEYS = 10
MANUALS.window = {
  whites: MANUALS.home.whites.slice(0, WINDOW_WHITE_KEYS),
  slots: MANUALS.home.slots.slice(0, WINDOW_WHITE_KEYS - 1),
}

// Plus haute note d'une fenêtre qui commence sur la touche blanche `base`.
export function windowTop(base) {
  let midi = base
  for (let whites = 1; whites < WINDOW_WHITE_KEYS; ) {
    midi++
    if (!isBlack(midi)) whites++
  }
  return midi
}

/** Clavier de 10 touches blanches à partir de la note blanche `base`. */
export function keymapForWindow(base) {
  return { ...buildKeymap(['window'], base), missing: [] }
}

/**
 * Clavier pour le jeu libre : un manuel à partir du Do de l'octave choisie.
 * Retourne { from, to, bindings: { code: midi }, missing: [] }.
 */
export function keymapForOctave(octave) {
  return { ...buildKeymap(PLANS[0], 12 * (octave + 1)), missing: [] }
}

/**
 * Clavier adapté à un morceau : choisit le plus petit plan qui couvre toutes
 * ses notes, commence sur un Do quand c'est possible, et remplit le reste des
 * touches disponibles. `missing` liste les notes qui n'ont pas pu être placées
 * (morceau plus étendu que MAX_WHITE_KEYS touches blanches).
 */
export function keymapForNotes(notes) {
  if (!notes.length) return keymapForOctave(4)
  const low = toWhiteBelow(Math.min(...notes))
  const high = toWhiteAbove(Math.max(...notes))
  const needed = countWhites(low, high)
  const plan = PLANS.find((p) => capacity(p) >= needed) ?? PLANS[PLANS.length - 1]

  // Commencer sur le Do en dessous si tout tient encore, sinon sur la note la plus grave.
  const c = low - (low % 12)
  const start = countWhites(c, high) <= capacity(plan) ? c : low
  const keymap = buildKeymap(plan, start)
  const mapped = new Set(Object.values(keymap.bindings))
  return { ...keymap, missing: [...new Set(notes)].filter((m) => !mapped.has(m)).sort((a, b) => a - b) }
}

// Ce qui est imprimé sur chaque touche physique d'un clavier AZERTY.
const LETTER_CODES = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => [`Key${l}`, l]))
const DIGIT_CODES = Object.fromEntries('0123456789'.split('').map((d) => [`Digit${d}`, d]))
export const KEY_LABELS = {
  ...LETTER_CODES, ...DIGIT_CODES,
  KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ',',
  Semicolon: 'M', Quote: 'Ù', BracketLeft: '^', BracketRight: '$',
  Comma: ';', Period: ':', Slash: '!', Minus: ')', Equal: '=',
}

// Position horizontale (en %) de chaque touche entre `from` et `to` inclus.
// `from` et `to` doivent être des touches blanches.
export function getKeyboardLayout(from, to) {
  let whiteCount = 0
  for (let m = from; m <= to; m++) if (!isBlack(m)) whiteCount++
  const whiteWidth = 100 / whiteCount
  const blackWidth = whiteWidth * 0.6

  const keys = []
  let whiteIndex = 0
  for (let m = from; m <= to; m++) {
    if (isBlack(m)) {
      keys.push({ midi: m, black: true, left: whiteIndex * whiteWidth - blackWidth / 2, width: blackWidth })
    } else {
      keys.push({ midi: m, black: false, left: whiteIndex * whiteWidth, width: whiteWidth })
      whiteIndex++
    }
  }
  return keys
}

/**
 * Position des notes pour le Notes_scroller, calée sur les touches du piano :
 * (nom de note, ex. 'C#4') -> { x: centre, width } en fractions de 0 à 1, ou null
 * si la note est hors du clavier. À passer en `noteLayout` au NoteScroller.
 */
export function createScrollerLayout(from, to, { fill = 0.86 } = {}) {
  const byMidi = new Map(getKeyboardLayout(from, to).map((key) => [key.midi, key]))
  return (name) => {
    let midi
    try {
      midi = noteToMidi(name)
    } catch {
      return null
    }
    const key = byMidi.get(midi)
    if (!key) return null
    return { x: (key.left + key.width / 2) / 100, width: (key.width * fill) / 100, accidental: key.black }
  }
}
