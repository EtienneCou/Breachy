// Son du métronome, commun au jeu libre (useMetronome) et à l'entraînement (useSongMetronome).

export const SIGNATURES = {
  // nombre de temps, et temps accentués (le 1er fort, les autres « mi-forts »)
  '2/4': { beats: 2, strong: [0], medium: [] },
  '3/4': { beats: 3, strong: [0], medium: [] },
  '4/4': { beats: 4, strong: [0], medium: [] },
  '6/8': { beats: 6, strong: [0], medium: [3] },
}

export const signatureOf = (name) => SIGNATURES[name] ?? SIGNATURES['4/4']

/** Force du temps `position` de la mesure : 'strong' | 'medium' | 'weak'. */
export function beatLevel(sig, position, accent = true) {
  if (!accent) return 'weak'
  if (sig.strong.includes(position)) return 'strong'
  if (sig.medium.includes(position)) return 'medium'
  return 'weak'
}

/** Programme un clic à l'instant audio `when`, vers `destination`. */
export function playClick(ctx, destination, when, level) {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = level === 'strong' ? 1760 : level === 'medium' ? 1320 : 990
  const peak = level === 'strong' ? 0.5 : level === 'medium' ? 0.38 : 0.28
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(peak, when + 0.001)
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
  osc.connect(env).connect(destination)
  osc.start(when)
  osc.stop(when + 0.06)
  return osc
}

/**
 * Bip du décompte « 3, 2, 1 » (enregistrement sans métronome) : plus doux et plus
 * rond que le clic du métronome, pour ne pas faire croire à un tempo.
 */
export function playCue(ctx, destination, when, last = false) {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = last ? 1046.5 : 784 // do aigu pour « 1 », sol avant
  env.gain.setValueAtTime(0, when)
  env.gain.linearRampToValueAtTime(0.3, when + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.25)
  osc.connect(env).connect(destination)
  osc.start(when)
  osc.stop(when + 0.3)
  return osc
}
