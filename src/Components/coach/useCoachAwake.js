import { useEffect } from 'react'
import { useCoach } from './CoachProvider.jsx'

/**
 * Garde Reachy éveillé tant que `active` est vrai : une page l'appelle quand de la
 * musique joue sans que personne ne touche au clavier (morceau, réécoute, boucles…).
 */
export function useCoachAwake(active) {
  const { holdAwake } = useCoach()
  useEffect(() => (active ? holdAwake() : undefined), [active, holdAwake])
}
