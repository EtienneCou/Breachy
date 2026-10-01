// Danse de Reachy pendant l'entraînement, calculée à chaque instant (50 fois par seconde).
// Elle suit le tempo du morceau et s'améliore avec le jeu du joueur :
// niveau 0 = danse « nulle » (lente, en retard, tête basse, antennes tombantes),
// niveau 4 = danse au top (en rythme, balancements, antennes qui battent la mesure).
//
// Règles de la doc Reachy Mini pour des mouvements doux : une seule boucle envoie les
// positions, toujours des courbes continues (sinus), des amplitudes loin des limites
// (tête ±40°, écart tête/corps 65° max), et des changements de niveau progressifs.

const TAU = Math.PI * 2

// Réglages de chaque niveau (degrés). tempo : fraction du tempo du morceau.
// lag : retard sur le temps (fraction de temps), wobble : maladresse (dérive irrégulière).
export const DANCE_LEVELS = [
  { tempo: 0.5, lag: 0.3, bob: 2.5, droop: 9, sway: 2, look: 0, body: 0, antennas: 6, antennaDroop: 30, wobble: 1 },
  { tempo: 1, lag: 0.12, bob: 4, droop: 3, sway: 2, look: 0, body: 0, antennas: 10, antennaDroop: 10, wobble: 0.4 },
  { tempo: 1, lag: 0, bob: 5.5, droop: 0, sway: 5, look: 3, body: 3, antennas: 18, antennaDroop: 0, wobble: 0 },
  { tempo: 1, lag: 0, bob: 7, droop: -2, sway: 8, look: 6, body: 6, antennas: 24, antennaDroop: 0, wobble: 0 },
  { tempo: 1, lag: 0, bob: 8, droop: -3, sway: 11, look: 9, body: 9, antennas: 28, antennaDroop: 0, wobble: 0 },
]

// Respiration au repos : à peine visible, pour qu'il reste « vivant ».
const IDLE = { tempo: 1, lag: 0, bob: 0, droop: 0, sway: 0, look: 0, body: 0, antennas: 0, antennaDroop: 0, wobble: 0 }

// Petites réactions ajoutées à la danse : une bosse douce (sin²) sur `length` secondes.
const IMPULSES = {
  nod: { length: 0.55, pitch: 7 },
  tilt: { length: 0.8, roll: 10, pitch: 3 },
  antennaFlick: { length: 0.6, antennas: 22 },
  perk: { length: 0.8, pitch: -5, antennas: -20 },
}
export const impulseNames = Object.keys(IMPULSES)

const bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2)
const lerp = (a, b, k) => a + (b - a) * k

/** Réglages qui glissent vers ceux du niveau visé (changement de niveau sans à-coup). */
export function blendParams(current, target, dt, seconds = 1.5) {
  const k = Math.min(1, dt / seconds)
  const next = {}
  for (const key of Object.keys(target)) next[key] = lerp(current[key] ?? target[key], target[key], k)
  return next
}

export const levelParams = (level) => (level == null ? IDLE : DANCE_LEVELS[Math.max(0, Math.min(DANCE_LEVELS.length - 1, level))])

/**
 * Position de Reachy (degrés) à l'instant `t` (secondes, horloge continue).
 * - phase      position dans la mesure, en temps (continue : voir advancePhase)
 * - p          réglages du moment (blendParams)
 * - envelope   0 → 1 : montée progressive au démarrage ou après une émotion
 * - impulses   [{ name, start }] petites réactions en cours (start sur l'horloge `t`)
 * Retourne { head: { roll, pitch, yaw }, antennas: [droite, gauche], body }.
 */
export function dancePose(t, { phase = 0, p, envelope = 1, impulses = [] }) {
  const breathe = 1.5 * Math.sin(TAU * 0.2 * t)
  const wobbleRoll = p.wobble * 3 * Math.sin(TAU * 0.37 * t)
  const wobbleYaw = p.wobble * 4 * Math.sin(TAU * 0.23 * t + 1)

  let pitch = p.droop + p.bob * (0.5 - 0.5 * Math.cos(TAU * phase)) + breathe // hoche la tête sur les temps
  let roll = p.sway * Math.sin(Math.PI * phase) + wobbleRoll // balance d'un côté à l'autre tous les 2 temps
  let yaw = p.look * Math.sin((Math.PI * phase) / 2) + wobbleYaw // regarde autour de lui sur 4 temps
  const body = p.body * Math.sin((Math.PI * phase) / 2)
  const swing = p.antennas * Math.sin(Math.PI * phase) // antennes : un battement tous les 2 temps
  let right = swing + p.antennaDroop
  let left = -swing - p.antennaDroop

  for (const { name, start } of impulses) {
    const imp = IMPULSES[name]
    if (!imp) continue
    const b = bump((t - start) / imp.length)
    pitch += (imp.pitch ?? 0) * b
    roll += (imp.roll ?? 0) * b
    right += (imp.antennas ?? 0) * b
    left -= (imp.antennas ?? 0) * b
  }

  const e = envelope
  return {
    head: { roll: clamp(roll * e, 15), pitch: clamp(pitch * e, 15), yaw: clamp(yaw * e, 15) },
    antennas: [clamp(right * e, 45), clamp(left * e, 45)],
    body: clamp(body * e, 12),
  }
}

const clamp = (v, max) => Math.max(-max, Math.min(max, v))

const MAX_CORRECTION = 0.25 // temps par seconde : recalage maximal sur le rythme du morceau

/**
 * Fait avancer la cadence de la danse sans jamais sauter : elle avance avec le temps
 * du morceau, et se recale doucement sur ses temps (après « Recommencer », un saut en
 * arrière, un changement de niveau…). Un saut de cadence ferait un geste brusque.
 * - state  { phase, songTime } de l'instant précédent (null au tout début)
 * - beat   { time, period } du morceau, ou null (pause : la cadence ne bouge plus)
 * Retourne le nouvel état { phase, songTime }.
 */
export function advancePhase(state, beat, p, dt) {
  if (!beat) return state
  const target = (beat.time / beat.period) * p.tempo - p.lag
  if (!state) return { phase: target, songTime: beat.time }
  let phase = state.phase
  const songDelta = beat.time - state.songTime
  if (songDelta > 0 && songDelta < 0.25) phase += (songDelta / beat.period) * p.tempo
  const diff = ((((target - phase) % 4) + 6) % 4) - 2 // écart ramené à ±2 temps (la danse se répète tous les 4 temps)
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
