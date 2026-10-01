// Danse de Reachy pendant l'entraînement, calculée à chaque instant (50 fois par seconde).
// Elle suit le tempo du morceau et s'améliore avec le jeu du joueur, en 4 danses :
// 0 les antennes seules, 1 + la tête qui se penche lentement sur les côtés,
// 2 côtés et hochement plus rapides, 3 rock star.
//
// Règles de la doc Reachy Mini pour des mouvements doux : une seule boucle envoie les
// positions, toujours des courbes continues (sinus), des amplitudes loin des limites
// (tête ±40°, écart tête/corps 65° max), et des changements de niveau progressifs.

const TAU = Math.PI * 2

// Réglages de chaque danse (degrés). Tous sont des nombres : on glisse d'une danse à l'autre.
// - tempo     fraction du tempo du morceau      - lag      retard sur le temps (fraction de temps)
// - bob       hochement de tête vers l'avant sur chaque temps, façon concert de rock
// - accent    hochement plus fort sur le 1er temps de chaque mesure (0 = aucun, 0,3 = +30 %)
// - droop     tête basse (+) ou relevée (-)
// - sway      tête penchée d'un côté puis de l'autre
// - swayFast  0 = très lentement (un aller-retour sur 8 temps), 1 = plus vite (sur 2 temps)
// - look      regarde à gauche et à droite, sur 4 temps        - body   rotation du corps, sur 4 temps
// - antennas  battement des antennes            - antennaDroop  antennes tombantes (+) ou levées (-)
// - antFast   0 = un battement tous les 2 temps, 1 = un battement par temps
// - antSync   0 = antennes en miroir, 1 = ensemble (les « bras en l'air »)
// - wobble    maladresse (dérive irrégulière)
export const DANCE_LEVELS = [
  // 0 · Les antennes seules : la tête ne bouge pas
  { tempo: 1, lag: 0, bob: 0, accent: 0, droop: 0, sway: 0, swayFast: 0, look: 0, body: 0, antennas: 16, antennaDroop: 0, antFast: 0, antSync: 0, wobble: 0 },
  // 1 · Antennes + la tête qui se penche sur les côtés, très lentement
  { tempo: 1, lag: 0, bob: 0, accent: 0, droop: 0, sway: 12, swayFast: 0, look: 0, body: 0, antennas: 20, antennaDroop: 0, antFast: 0, antSync: 0, wobble: 0 },
  // 2 · Côtés et hochement vers l'avant, plus rapides
  { tempo: 1, lag: 0, bob: 16, accent: 0.1, droop: 0, sway: 12, swayFast: 1, look: 3, body: 5, antennas: 24, antennaDroop: 0, antFast: 0, antSync: 0, wobble: 0 },
  // 3 · Rock star : gros headbang marqué sur la mesure, antennes ensemble en l'air, corps qui tourne
  { tempo: 1, lag: 0, bob: 30, accent: 0.3, droop: -4, sway: 7, swayFast: 1, look: 12, body: 14, antennas: 34, antennaDroop: -12, antFast: 1, antSync: 1, wobble: 0 },
]

// Autres façons de bouger en rythme, hors entraînement :
// metronome  il bat la mesure (jeu libre, Studio) : la tête hoche sur chaque temps,
//            les antennes battent, rien d'autre ne bouge.
export const DANCE_STYLES = {
  metronome: { tempo: 1, lag: 0, bob: 14, accent: 0, droop: 0, sway: 0, swayFast: 0, look: 0, body: 0, antennas: 16, antennaDroop: 0, antFast: 1, antSync: 0, wobble: 0 },
}

// Respiration au repos : à peine visible, pour qu'il reste « vivant ».
const IDLE = { tempo: 1, lag: 0, bob: 0, accent: 0, droop: 0, sway: 0, swayFast: 0, look: 0, body: 0, antennas: 0, antennaDroop: 0, antFast: 0, antSync: 0, wobble: 0 }

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

/** Réglages d'une danse : niveau 0-3 de l'entraînement, style de DANCE_STYLES, ou null (repos). */
export function levelParams(level) {
  if (level == null) return IDLE
  if (typeof level === 'string') return DANCE_STYLES[level] ?? IDLE
  return DANCE_LEVELS[Math.max(0, Math.min(DANCE_LEVELS.length - 1, level))]
}

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

  // Hoche la tête sur chaque temps : en bas pile sur le temps, coup vers le bas plus franc
  // que la remontée (courbe au carré, toujours continue). Plus fort sur le 1er temps de la mesure.
  const bang = ((1 + Math.cos(TAU * phase)) / 2) ** 2
  const downbeat = ((1 + Math.cos((TAU * phase) / 4)) / 2) ** 4
  let pitch = p.droop + p.bob * bang * (1 + p.accent * downbeat) + breathe
  // Tête penchée d'un côté puis de l'autre : mélange du lent (8 temps) et du rapide (2 temps).
  const side = (1 - p.swayFast) * Math.sin((Math.PI * phase) / 4) + p.swayFast * Math.sin(Math.PI * phase)
  let roll = p.sway * side + wobbleRoll
  let yaw = p.look * Math.sin((Math.PI * phase) / 2) + wobbleYaw // regarde autour de lui sur 4 temps
  const body = p.body * Math.sin((Math.PI * phase) / 2)
  // Antennes : mélange d'un battement tous les 2 temps et d'un battement par temps (sans saut
  // quand on change de danse), en miroir ou ensemble.
  const swing = p.antennas * ((1 - p.antFast) * Math.sin(Math.PI * phase) + p.antFast * Math.sin(TAU * phase))
  let right = swing + p.antennaDroop
  let left = -swing * (1 - 2 * p.antSync) - p.antennaDroop

  for (const { name, start } of impulses) {
    const imp = IMPULSES[name]
    if (!imp) continue
    const b = bump((t - start) / imp.length)
    pitch += (imp.pitch ?? 0) * b
    roll += (imp.roll ?? 0) * b
    right += ((imp.antennas ?? 0) + (imp.rightAntenna ?? 0)) * b
    left -= ((imp.antennas ?? 0) + (imp.leftAntenna ?? 0)) * b
  }

  const e = envelope
  return {
    head: { roll: clamp(roll * e, 15), pitch: clamp(pitch * e, 38), yaw: clamp(yaw * e, 15) }, // tête : ±40° max (doc)
    antennas: [clamp(right * e, 45), clamp(left * e, 45)],
    body: clamp(body * e, 15),
  }
}

const clamp = (v, max) => Math.max(-max, Math.min(max, v))

// Intensité des mouvements du vrai robot (danse et petits gestes), réglée par l'équipe
// pendant les tests sur le Reachy Mini (pas par le joueur) : 1 = amplitudes ci-dessus,
// en dessous tout est réduit d'autant. Les niveaux de danse gardent leurs écarts entre eux.
// Prudente pour les premiers essais (0,3 au départ) ; on l'ajuste au vu des mouvements.
export const ROBOT_INTENSITY = 0.5

/** Position réduite à l'intensité `k` (0-1), autour de la position neutre. */
export function scalePose({ head, antennas, body }, k) {
  return {
    head: { roll: head.roll * k, pitch: head.pitch * k, yaw: head.yaw * k },
    antennas: antennas.map((a) => a * k),
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
