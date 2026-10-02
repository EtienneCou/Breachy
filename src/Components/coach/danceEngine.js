// Danse de Reachy pendant l'entraînement, calculée à chaque instant (50 fois par seconde).
// Il danse les chorégraphies de Pollen (pollenMoves.js), calées sur le tempo du morceau,
// de plus en plus énergiques quand le joueur réussit (4 niveaux de 2 danses). Dans un niveau,
// il alterne ses deux danses toutes les 4 mesures ; d'une danse à l'autre, il passe en fondu.
//
// Règles de la doc Reachy Mini pour des mouvements doux : une seule boucle envoie les
// positions, toujours des courbes continues, des amplitudes loin des limites et des
// changements progressifs.

import { pollenPose } from './pollenMoves.js'

// Danses de chaque niveau (une ou deux, qui alternent toutes les 4 mesures) et leur ampleur
// (1 = celle de Pollen), classées d'après l'énergie mesurée de chaque danse (vitesse
// moyenne de la tête). Les autres danses de pollenMoves.js restent disponibles.
export const DANCE_LEVELS = [
  // 0 · Calme : tête qui tourne en rond, balancier (lents, sur 4 temps)
  { moves: ['dizzy_spin', 'pendulum_swing'], amount: 0.4 },
  // 1 · Il se laisse porter : « mmh mmh », tête penchée
  { moves: ['uh_huh_tilt', 'head_tilt_roll'], amount: 0.9 },
  // 2 · Ça groove : spirales, chaloupé
  { moves: ['interwoven_spirals', 'groovy_sway_and_roll'], amount: 0.85 },
  // 3 · Rock star : headbang
  { moves: ['headbanger_combo'], amount: 1 },
]

// Autres façons de bouger en rythme, hors entraînement :
// metronome  il bat la mesure (jeu libre, Studio) : tête en bas pile sur chaque temps.
export const DANCE_STYLES = {
  metronome: { moves: ['simple_nod'], amount: 0.7, overrides: { phase: 0.25 } },
}

const IDLE = { moves: [], amount: 0 } // au repos : il respire seulement

const MOVE_BEATS = 16 // il change de danse toutes les 4 mesures
const CROSSFADE_S = 1.5 // fondu d'une danse à l'autre
const AMOUNT_S = 1.5 // l'ampleur glisse vers celle du niveau

// Petites réactions ajoutées à la danse : une bosse douce (sin²) sur `length` secondes.
// antennas : les deux antennes ; rightAntenna / leftAntenna : une seule (négatif = levée).
const IMPULSES = {
  nod: { length: 0.55, pitch: 7 },
  tilt: { length: 0.8, roll: 10, pitch: 3 },
  antennaFlick: { length: 0.6, antennas: 22 },
  perk: { length: 0.8, pitch: -5, antennas: -20 },
  // Décompte « 3, 2, 1, c'est parti ! » : une antenne, l'autre, les deux, puis un hochement.
  count3: { length: 0.8, rightAntenna: -32 },
  count2: { length: 0.8, leftAntenna: -32 },
  count1: { length: 0.8, antennas: -32, pitch: -5 },
  go: { length: 0.7, antennas: -26, pitch: 9 },
  // Changement de niveau de danse : antennes dressées, tête relevée (« yes ! ») quand on
  // monte ; antennes qui tombent, tête un peu basse (« oh… ») quand on descend.
  levelUp: { length: 0.8, antennas: -55, pitch: -6 },
  levelDown: { length: 1.1, antennas: 35, pitch: 5 },
}
export const impulseNames = Object.keys(IMPULSES)

const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2)
const lerp = (a, b, k) => a + (b - a) * k
const smooth = (k) => k * k * (3 - 2 * k)

/** Réglages d'une danse : niveau 0-3 de l'entraînement, style de DANCE_STYLES, ou null (repos). */
export function levelParams(level) {
  if (level == null) return IDLE
  if (typeof level === 'string') return DANCE_STYLES[level] ?? IDLE
  return DANCE_LEVELS[Math.max(0, Math.min(DANCE_LEVELS.length - 1, level))]
}

const pick = (moves, avoid) => {
  const choices = moves.length > 1 ? moves.filter((m) => m !== avoid) : moves
  return choices[Math.floor(Math.random() * choices.length)] ?? null
}

/**
 * Choix de la danse du moment : elle suit le niveau visé, change toutes les MOVE_BEATS,
 * et passe de l'une à l'autre en fondu. Un changement attend la fin du fondu en cours
 * (sinon la danse quittée disparaîtrait d'un coup). `state` : celui de l'instant précédent
 * (null au début) ; `target` : levelParams() ; `phase` : temps de la danse en battements.
 * Retourne { current, previous, mix 0→1, amount, target, changeAt } ; current et previous
 * sont { name, overrides } (chaque danse garde ses réglages jusqu'au bout).
 */
export function chooseMove(state, target, phase, dt) {
  const s = state ?? { current: null, previous: null, mix: 1, amount: 0, target: null, changeAt: 0 }
  const next = { ...s, target, mix: Math.min(1, s.mix + dt / CROSSFADE_S) }
  const { moves } = target
  if (next.mix >= 1 && moves.length) {
    const name = s.current?.name
    const change = !moves.includes(name) ? pick(moves) : moves.length > 1 && phase >= s.changeAt ? pick(moves, name) : null
    if (change) {
      next.previous = s.current
      next.current = { name: change, overrides: target.overrides ?? null }
      next.mix = 0
      next.changeAt = phase + MOVE_BEATS
    }
  }
  next.amount = lerp(s.amount, target.amount, Math.min(1, dt / AMOUNT_S))
  return next
}

const ZERO = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, antennas: [0, 0] }
const movePose = (move, t) => (move ? pollenPose(move.name, t, move.overrides) : ZERO)

/**
 * Position de Reachy à l'instant `t` (secondes, horloge continue).
 * - phase      temps de la danse, en battements (continu : voir advancePhase)
 * - choice     danse du moment (chooseMove)
 * - envelope   0 → 1 : montée progressive au démarrage ou après une émotion
 * - impulses   [{ name, start }] petites réactions en cours (start sur l'horloge `t`)
 * Retourne { head: { x, y, z (mm), roll, pitch, yaw (degrés) }, antennas: [droite, gauche], body }.
 */
export function dancePose(t, { phase = 0, choice, envelope = 1, impulses = [] }) {
  const k = smooth(choice?.mix ?? 1)
  const a = movePose(choice?.previous, phase)
  const b = movePose(choice?.current, phase)
  const amount = choice?.amount ?? 0
  const mixed = (key) => lerp(a[key], b[key], k) * amount
  const breathe = 1.5 * Math.sin(Math.PI * 2 * 0.2 * t)

  let pitch = mixed('pitch') + breathe
  let roll = mixed('roll')
  let right = lerp(a.antennas[0], b.antennas[0], k) * amount
  let left = lerp(a.antennas[1], b.antennas[1], k) * amount

  for (const { name, start } of impulses) {
    const imp = IMPULSES[name]
    if (!imp) continue
    const v = bump((t - start) / imp.length)
    pitch += (imp.pitch ?? 0) * v
    roll += (imp.roll ?? 0) * v
    right += ((imp.antennas ?? 0) + (imp.rightAntenna ?? 0)) * v
    left -= ((imp.antennas ?? 0) + (imp.leftAntenna ?? 0)) * v
  }

  const e = envelope
  return {
    head: { x: mixed('x') * e, y: mixed('y') * e, z: mixed('z') * e, roll: roll * e, pitch: pitch * e, yaw: mixed('yaw') * e },
    antennas: [right * e, left * e],
    body: 0,
  }
}

// Intensité des mouvements du vrai robot (danse et petits gestes), réglée par l'équipe
// pendant les tests sur le Reachy Mini (pas par le joueur) : 1 = amplitudes de Pollen,
// en dessous tout est réduit d'autant. Les niveaux de danse gardent leurs écarts entre eux.
export const ROBOT_INTENSITY = 0.3

// Limites de sécurité, appliquées en douceur (une coupure nette ferait un angle dans le
// mouvement) : la doc donne ±40° pour la tête.
const LIMITS = { x: 30, y: 40, z: 40, roll: 30, pitch: 35, yaw: 35, antennas: 60 }

/** Limite douce : linéaire jusqu'à 70 % de `max`, puis s'en approche sans jamais l'atteindre. */
function softLimit(v, max) {
  const knee = 0.7 * max
  const a = Math.abs(v)
  if (a <= knee) return v
  return Math.sign(v) * (knee + (max - knee) * Math.tanh((a - knee) / (max - knee)))
}

/** Position réduite à l'intensité `k` (0-1) autour de la position neutre, puis limitée. */
export function scalePose({ head, antennas, body }, k) {
  const h = (key) => softLimit((head[key] ?? 0) * k, LIMITS[key])
  return {
    head: { x: h('x'), y: h('y'), z: h('z'), roll: h('roll'), pitch: h('pitch'), yaw: h('yaw') },
    antennas: antennas.map((a) => softLimit(a * k, LIMITS.antennas)),
    body: body * k,
  }
}

const MAX_CORRECTION = 0.25 // temps par seconde : recalage maximal sur le rythme du morceau

/**
 * Fait avancer la cadence de la danse sans jamais sauter : elle avance avec le temps
 * du morceau, et se recale doucement sur ses temps (après « Recommencer », un saut en
 * arrière, un changement de niveau…). Un saut de cadence ferait un geste brusque.
 * - state  { phase, songTime } de l'instant précédent (null au tout début)
 * - beat   { time, period } du morceau, ou null (pause : la cadence ne bouge plus)
 * Retourne le nouvel état { phase, songTime }.
 */
export function advancePhase(state, beat, dt) {
  if (!beat) return state
  const target = beat.time / beat.period
  if (!state) return { phase: target, songTime: beat.time }
  let phase = state.phase
  const songDelta = beat.time - state.songTime
  if (songDelta > 0 && songDelta < 0.25) phase += songDelta / beat.period
  const diff = ((((target - phase) % 4) + 6) % 4) - 2 // écart ramené à ±2 temps (on se recale sur la mesure)
  phase += Math.max(-MAX_CORRECTION * dt, Math.min(MAX_CORRECTION * dt, diff))
  return { phase, songTime: beat.time }
}

/** Fin des petites réactions : on garde celles encore en cours à l'instant `t`. */
export const liveImpulses = (impulses, t) => impulses.filter(({ name, start }) => t - start < (IMPULSES[name]?.length ?? 0))

/**
 * Durée d'un temps (s) estimée à partir des notes de la mélodie (écart médian entre
 * deux départs de notes), ramenée entre 0,45 et 0,95 s pour une danse confortable.
 */
export function beatPeriodOf(notes, bpm) {
  if (bpm) return fold(60 / bpm)
  const starts = [...new Set(notes.map((n) => Math.round(n.start * 100) / 100))].sort((a, b) => a - b)
  const gaps = starts.slice(1).map((s, i) => s - starts[i]).filter((g) => g > 0.08 && g < 2)
  if (!gaps.length) return 0.6
  gaps.sort((a, b) => a - b)
  return fold(gaps[Math.floor(gaps.length / 2)])
}

function fold(period) {
  let p = period
  while (p < 0.45) p *= 2
  while (p > 0.95) p /= 2
  return p
}
