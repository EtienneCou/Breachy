// Danses de Pollen Robotics (bibliothèque reachy_mini_dances_library), portées en JS.
// Chaque danse est une formule du temps en battements (`t`, +1 à chaque temps du morceau) :
// elle suit donc le tempo, quel qu'il soit. Mêmes réglages par défaut que chez Pollen.
// Retour : { x, y, z } en mm (décalage de la tête), { roll, pitch, yaw } en degrés
// (pitch positif = tête vers le bas), antennas [a, b] en degrés.
//
// Écarts volontaires avec l'original, pour éviter les à-coups :
// - les mouvements « ponctuels » (yeah_nod, neck_recoil, chicken_peck, petits sursauts de
//   jackson_square) retombaient d'un coup à zéro : ici ils redescendent aussi doucement
//   qu'ils sont montés ;
// - grid_snap (positions par paliers) et sharp_side_tilt (demi-tour sec à chaque côté)
//   sont laissés de côté.

const TAU = Math.PI * 2
const ease = (u) => {
  const c = Math.min(1, Math.max(0, u))
  return c * c * (3 - 2 * c)
}
const mod = (a, n) => ((a % n) + n) % n

/** Oscillation : `cycles` allers-retours par temps, décalée de `phase` (fraction de cycle). */
function osc(t, amp, cycles, phase = 0) {
  return amp * Math.sin(TAU * (cycles * t + phase))
}

/**
 * Petit mouvement qui revient tous les `every` temps (après `delay`) : il monte en douceur
 * sur `dur` temps puis redescend aussi doucement (au plus la moitié de l'intervalle chacun).
 */
function pulse(t, amp, dur, every, delay = 0) {
  const r = Math.min(dur, every / 2)
  const u = mod(t - delay, every)
  if (u < r) return amp * ease(u / r)
  if (u < 2 * r) return amp * (1 - ease((u - r) / r))
  return 0
}

// Antennes : 'wiggle' en opposition, 'both' ensemble.
const antennas = (style, value) => (style === 'both' ? [value, value] : [value, -value])

const pose = ({ x = 0, y = 0, z = 0, roll = 0, pitch = 0, yaw = 0, ant = [0, 0] } = {}) => ({
  x, y, z, roll, pitch, yaw, antennas: ant,
})

// Chaque danse : (t, réglages) → pose. `a` = amplitude des antennes, `style` = 'wiggle' | 'both'.
export const POLLEN_MOVES = {
  // Hochement continu de haut en bas.
  simple_nod: {
    params: { amp: 20, cycles: 1, phase: 0, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({ pitch: osc(t, p.amp, p.cycles, p.phase), ant: antennas(p.style, osc(t, p.a, p.cycles, p.phase)) }),
  },
  // Tête penchée d'une épaule à l'autre.
  head_tilt_roll: {
    params: { amp: 15, cycles: 0.5, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({ roll: osc(t, p.amp, p.cycles), ant: antennas(p.style, osc(t, p.a, p.cycles)) }),
  },
  // Toute la tête glisse d'un côté à l'autre.
  side_to_side_sway: {
    params: { mm: 40, cycles: 0.5, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({ y: osc(t, p.mm, p.cycles), ant: antennas(p.style, osc(t, p.a, p.cycles)) }),
  },
  // Tête qui tourne en rond, un peu étourdie.
  dizzy_spin: {
    params: { roll: 15, pitch: 15, cycles: 0.25, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({
      roll: osc(t, p.roll, p.cycles),
      pitch: osc(t, p.pitch, p.cycles, 0.25),
      ant: antennas(p.style, osc(t, p.a, p.cycles)),
    }),
  },
  // Il trébuche et se rattrape.
  stumble_and_recover: {
    params: { yaw: 25, pitch: 10, mm: 15, cycles: 0.25, a: 50, style: 'both' },
    fn: (t, p) => pose({
      yaw: osc(t, p.yaw, p.cycles),
      pitch: osc(t, p.pitch, p.cycles * 2),
      y: osc(t, p.mm, p.cycles, 0.5),
      ant: antennas(p.style, osc(t, p.a, p.cycles)),
    }),
  },
  // Gros hochement avec un rebond vertical.
  headbanger_combo: {
    params: { pitch: 30, mm: 15, cycles: 1, a: 40, style: 'both' },
    fn: (t, p) => pose({
      pitch: osc(t, p.pitch, p.cycles),
      z: osc(t, p.mm, p.cycles, 0.1),
      ant: antennas(p.style, osc(t, p.a, p.cycles)),
    }),
  },
  // Spirale sur trois axes à des vitesses différentes (sur 8 temps).
  interwoven_spirals: {
    params: { roll: 15, pitch: 20, yaw: 25, cycles: 0.125, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({
      roll: osc(t, p.roll, 0.125),
      pitch: osc(t, p.pitch, 0.25, 0.25),
      yaw: osc(t, p.yaw, 0.5, 0.5),
      ant: antennas(p.style, osc(t, p.a, p.cycles)),
    }),
  },
  // Coucou : il se cache, puis surgit d'un côté, puis de l'autre (sur 10 temps).
  side_peekaboo: {
    params: { z: 40, y: 30, pitch: 20, cycles: 0.5, a: 60, style: 'both' },
    fn: (t, p) => {
      const u = mod(t, 10)
      const nod = (k) => p.pitch * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI)
      let y = 0, z, pitch = 0
      if (u < 1) z = -p.z * ease(u)
      else if (u < 3) { const k = (u - 1) / 2; z = -p.z * (1 - ease(k)); y = p.y * ease(k); pitch = nod(k) }
      else if (u < 5) { const k = (u - 3) / 2; z = -p.z * ease(k); y = p.y * (1 - ease(k)) }
      else if (u < 7) { const k = (u - 5) / 2; z = -p.z * (1 - ease(k)); y = -p.y * ease(k); pitch = -nod(k) }
      else if (u < 9) { const k = (u - 7) / 2; z = -p.z * ease(k); y = -p.y * (1 - ease(k)) }
      else z = -p.z * (1 - ease(u - 9))
      return pose({ y, z, pitch, ant: antennas(p.style, osc(t, p.a, p.cycles)) })
    },
  },
  // « Ouais ! » : deux hochements par temps, le second plus petit.
  yeah_nod: {
    params: { amp: 15, cycles: 1, a: 20, style: 'both' },
    fn: (t, p) => {
      const every = 1 / p.cycles
      const pitch = pulse(t, p.amp, every * 0.4, every) + pulse(t, p.amp * 0.7, every * 0.3, every, every * 0.5)
      return pose({ pitch, ant: antennas(p.style, osc(t, p.a, p.cycles)) })
    },
  },
  // « Mmh mmh » : penche et hoche en même temps.
  uh_huh_tilt: {
    params: { amp: 15, cycles: 0.5, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({ roll: osc(t, p.amp, p.cycles), pitch: osc(t, p.amp, p.cycles), ant: antennas(p.style, osc(t, p.a, p.cycles)) }),
  },
  // Petit recul du cou.
  neck_recoil: {
    params: { mm: 15, cycles: 0.5, a: 45, style: 'wiggle' },
    fn: (t, p) => {
      const every = 1 / p.cycles
      return pose({ x: pulse(t, -p.mm, every * 0.3, every), ant: antennas(p.style, osc(t, p.a, p.cycles)) })
    },
  },
  // Il avance le menton.
  chin_lead: {
    params: { mm: 20, pitch: 15, cycles: 0.5, a: 45, style: 'wiggle' }, // 'wiggle' : comme Pollen en pratique (leur 'both' est écrasé)
    fn: (t, p) => pose({
      x: osc(t, p.mm, p.cycles),
      pitch: osc(t, p.pitch, p.cycles, -0.25),
      ant: antennas(p.style, osc(t, p.a, p.cycles)),
    }),
  },
  // Balancement de côté avec la tête qui suit.
  groovy_sway_and_roll: {
    params: { mm: 30, roll: 15, cycles: 0.5, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({
      y: osc(t, p.mm, p.cycles),
      roll: osc(t, p.roll, p.cycles, 0.25),
      ant: antennas(p.style, osc(t, p.a, p.cycles)),
    }),
  },
  // Coup de bec de poule, vers l'avant.
  chicken_peck: {
    params: { mm: 20, cycles: 1, a: 30, style: 'both' },
    fn: (t, p) => {
      const every = 1 / p.cycles
      const k = pulse(t, 1, every * 0.8, every)
      // Pollen : 20 mm vers l'avant et 0,1 rad (≈ 5,7°) de hochement pour 20 mm.
      return pose({ x: p.mm * k, pitch: p.mm * 0.286 * k, ant: antennas(p.style, osc(t, p.a, p.cycles)) })
    },
  },
  // Coup d'œil sur le côté, tenu, puis retour (sur 4 temps).
  side_glance_flick: {
    params: { yaw: 45, cycles: 0.25, a: 45, style: 'wiggle' },
    fn: (t, p) => {
      const period = 1 / p.cycles
      const u = mod(t, period)
      const yaw = u < 0.125 * period ? p.yaw * ease(u / (0.125 * period))
        : u < 0.375 * period ? p.yaw
          : p.yaw * (1 - ease((u - 0.375 * period) / (0.625 * period)))
      return pose({ yaw, ant: antennas(p.style, osc(t, p.a, p.cycles)) })
    },
  },
  // Balancement sur 3 temps et hochement sur 2 : polyrythmie.
  polyrhythm_combo: {
    params: { mm: 20, pitch: 10, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({ y: osc(t, p.mm, 1 / 3), pitch: osc(t, p.pitch, 1 / 2), ant: antennas(p.style, osc(t, p.a, 1)) }),
  },
  // Balancier lent, comme un pendule (sur 4 temps).
  pendulum_swing: {
    params: { amp: 25, cycles: 0.25, a: 45, style: 'wiggle' },
    fn: (t, p) => pose({ roll: osc(t, p.amp, p.cycles), ant: antennas(p.style, osc(t, p.a, p.cycles)) }),
  },
  // Dessine un rectangle avec la tête, avec un petit sursaut à chaque coin (sur 10 temps).
  jackson_square: {
    params: { y: 35, z: 25, twitch: 20, zOffset: -10, cycles: 0.2, a: 45, style: 'wiggle' },
    fn: (t, p) => {
      const leg = 2
      const points = [[0, p.zOffset], [p.y, p.z + p.zOffset], [-p.y, p.z + p.zOffset], [-p.y, -p.z + p.zOffset], [p.y, -p.z + p.zOffset]]
      const u = mod(t, 10)
      const i = Math.floor(u / leg)
      const [y0, z0] = points[i]
      const [y1, z1] = points[(i + 1) % points.length]
      const k = ease((u % leg) / leg)
      // Sursaut à l'arrivée sur chaque coin, alternativement à gauche et à droite.
      const delay = leg - 0.15
      const side = mod(Math.floor((t - delay) / leg), 2) === 0 ? 1 : -1
      const roll = side * pulse(t, p.twitch, 0.3, leg, delay)
      return pose({ y: y0 + (y1 - y0) * k, z: z0 + (z1 - z0) * k, roll, ant: antennas(p.style, osc(t, p.a, p.cycles)) })
    },
  },
}

/** Pose d'une danse Pollen au temps `t` (en battements), avec réglages éventuellement modifiés. */
export function pollenPose(name, t, overrides) {
  const move = POLLEN_MOVES[name]
  if (!move) return pose()
  return move.fn(t, overrides ? { ...move.params, ...overrides } : move.params)
}
