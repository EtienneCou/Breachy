// Récompenses des séries de notes réussies d'affilée (réglages à ajuster ici).

// Niveau de feu du clavier et d'ambiance de la scène, selon la série en cours.
// 0 : rien, 1 : étincelles, 2 : petites flammes, 3 : grandes flammes, 4 : flammes bleues
const HEAT_STEPS = [5, 15, 30, 50]
export const heatLevel = (streak) => HEAT_STEPS.filter((min) => streak >= min).length

// Multiplicateur de points selon la série (la note qui fait passer le palier en profite).
const MULTIPLIERS = [
  { min: 50, value: 4 },
  { min: 25, value: 3 },
  { min: 10, value: 2 },
]
export const multiplierFor = (streak) => MULTIPLIERS.find((m) => streak >= m.min)?.value ?? 1

// Points de base d'une note réussie, selon sa précision.
export const NOTE_POINTS = { perfect: 100, good: 70, late: 40 }
