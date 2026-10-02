// Combien Reachy parle pendant le jeu : écart minimal entre deux paroles, au choix du joueur.
export const TALK_AMOUNTS = [
  { id: 'low', label: 'Peu', seconds: 21 },
  { id: 'medium', label: 'Moyen', seconds: 14 },
  { id: 'high', label: 'Beaucoup', seconds: 7 },
]

export const talkGapMs = (amount) => (TALK_AMOUNTS.find((a) => a.id === amount) ?? TALK_AMOUNTS[1]).seconds * 1000
