import { DIFFICULTIES } from '../../utils/difficulty.js'
import './DifficultyFilter.css'

/**
 * Filtre par difficulté : un bouton par niveau, à sa couleur.
 * - value     id du niveau choisi ('facile', 'normal'…) ou null pour tous
 * - onChange  (id | null) ; recliquer sur le niveau choisi le désélectionne
 */
export default function DifficultyFilter({ value, onChange }) {
  return (
    <div className="difficulty-filter" role="group" aria-label="Filtrer par difficulté">
      <span className="difficulty-filter__label">Difficulté</span>
      {DIFFICULTIES.map((d) => (
        <button
          key={d.id}
          type="button"
          className={`difficulty-filter__btn${value === d.id ? ' is-active' : ''}`}
          style={{ '--difficulty-color': d.color, '--difficulty-bg': d.background }}
          aria-pressed={value === d.id}
          onClick={() => onChange(value === d.id ? null : d.id)}
        >
          <span className="difficulty-filter__dot" aria-hidden="true" />
          {d.label}
        </button>
      ))}
    </div>
  )
}
