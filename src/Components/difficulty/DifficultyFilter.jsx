import { DIFFICULTIES } from '../../utils/difficulty.js'
import { useLanguage } from '../../context/LanguageContext'
import './DifficultyFilter.css'

/**
 * Filtre par difficulté via un menu déroulant.
 * - value     id du niveau choisi ('facile', 'normal'…) ou null pour tous
 * - onChange  (id | null) ; recliquer sur le niveau choisi le désélectionne
 */
export default function DifficultyFilter({ value, onChange }) {
  const { t } = useLanguage()

  return (
    <label className="difficulty-filter">
      <span className="difficulty-filter__label">{t('difficulty.label')}</span>
      <select
        className="difficulty-filter__select"
        aria-label={t('difficulty.label')}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{t('difficulty.all')}</option>
        {DIFFICULTIES.map((difficulty) => (
          <option key={difficulty.id} value={difficulty.id}>{t('difficulty.' + difficulty.id)}</option>
        ))}
      </select>
    </label>
  )
}

