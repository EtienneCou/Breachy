// Paliers de la jauge de feu, du plus bas au plus haut.
export const FLAME_TIERS = [
  { min: 0, id: 'embers', label: 'Quelques étincelles' },
  { min: 25, id: 'sparks', label: 'Ça pétille !' },
  { min: 50, id: 'warm', label: 'Ça chauffe !' },
  { min: 75, id: 'fire', label: 'En feu !' },
  { min: 100, id: 'blue', label: 'Flamme bleue légendaire !' },
]

// Toujours un palier, même pour une valeur hors limites (négative ou NaN).
export const tierFor = (percent) => [...FLAME_TIERS].reverse().find((tier) => percent >= tier.min) ?? FLAME_TIERS[0]
