import { DIFFICULTIES } from '../../utils/difficulty.js'
import './DifficultyFilter.css'

/**
 * Filtre par difficulté via un menu déroulant.
 * - value     id du niveau choisi ('facile', 'normal'…) ou null pour tous
 * - onChange  (id | null) ; recliquer sur le niveau choisi le désélectionne
 */
export default function DifficultyFilter({ value, onChange }) {
  return (
    <label className="difficulty-filter">
      <span className="difficulty-filter__label">Difficulté</span>
      <select
        className="difficulty-filter__select"
        aria-label="Filtrer par difficulté"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Tous les niveaux</option>
        {DIFFICULTIES.map((difficulty) => (
          <option key={difficulty.id} value={difficulty.id}>{difficulty.label}</option>
        ))}
      </select>
    </label>
  )
}
