// Paliers de la jauge de feu, du plus bas au plus haut.
// `label` : titre de musicien affiché à côté du pourcentage.
export const FLAME_TIERS = [
  { min: 0, id: 'embers', label: 'Tu viens d’accorder le piano !' },
  { min: 25, id: 'sparks', label: 'Ça commence à jouer !' },
  { min: 50, id: 'warm', label: 'Le piano commence à te respecter !' },
  { min: 75, id: 'fire', label: 'Tu es un virtuose !' },
  { min: 100, id: 'blue', label: 'C’est Mozart qui joue de ce piano !' },
]

// Toujours un palier, même pour une valeur hors limites (négative ou NaN).
export const tierFor = (percent) => [...FLAME_TIERS].reverse().find((tier) => percent >= tier.min) ?? FLAME_TIERS[0]
