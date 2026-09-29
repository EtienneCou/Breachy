import { useEffect, useMemo, useRef, useState } from 'react'
import { computeGameStats } from '../../utils/gameStats'
import FlameGauge from './FlameGauge.jsx'
import ResultsDetails from './ResultsDetails.jsx'
import './ResultsModal.css'

/**
 * Popup de fin de morceau.
 *
 * - results    résultats de la partie (format décrit dans utils/gameStats.js)
 * - onRestart  bouton « Recommencer »
 * - onQuit     bouton « Quitter »
 */
export default function ResultsModal({ results, onRestart, onQuit }) {
  const stats = useMemo(() => computeGameStats(results), [results])
  const [showDetails, setShowDetails] = useState(false)
  const restartRef = useRef(null)

  // Le bouton « Recommencer » reçoit le focus : Entrée relance tout de suite.
  useEffect(() => {
    restartRef.current?.focus()
  }, [])

  const kidStats = [
    { id: 'tempo', icon: '🎯', value: stats.inTempo, label: 'Au bon moment', tone: 'perfect' },
    { id: 'offbeat', icon: '⏰', value: stats.counts.offbeat, label: 'Trop tôt ou trop tard', tone: 'offbeat' },
    { id: 'wrong', icon: '❌', value: stats.wrongNotes, label: 'Fausses notes', tone: 'wrong' },
    { id: 'missed', icon: '💤', value: stats.missedNotes, label: 'Notes oubliées', tone: 'missed' },
  ]

  return (
    <div className="results-modal">
      <div className="results-modal__backdrop" aria-hidden="true" />
      <section className="results-modal__panel" role="dialog" aria-modal="true" aria-labelledby="results-modal-title">
        <header className="results-modal__head">
          <span className="results-modal__eyebrow">Morceau terminé !</span>
          <h2 id="results-modal-title" className="results-modal__title">{results.song.title}</h2>
          <Stars count={stats.stars} />
          <p className="results-modal__message">{kidMessage(stats)}</p>
        </header>

        <FlameGauge percent={stats.successPercent} />

        <ul className="results-modal__stats">
          {kidStats.map((s) => (
            <li key={s.id} className={`results-modal__stat results-modal__stat--${s.tone}`}>
              <span className="results-modal__stat-icon" aria-hidden="true">{s.icon}</span>
              <span className="results-modal__stat-value">{s.value}</span>
              <span className="results-modal__stat-label">{s.label}</span>
            </li>
          ))}
        </ul>

        <div className="results-modal__actions">
          <button ref={restartRef} type="button" className="results-modal__btn results-modal__btn--primary" onClick={onRestart}>
            Recommencer
          </button>
          <button type="button" className="results-modal__btn" onClick={onQuit}>
            Quitter
          </button>
        </div>

        <button
          type="button"
          className="results-modal__details-toggle"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? 'Masquer le détail' : 'Voir le détail'}
          <span className="results-modal__chevron" aria-hidden="true">▾</span>
        </button>
        {showDetails && <ResultsDetails stats={stats} songTitle={results.song.title} />}
      </section>
    </div>
  )
}

function Stars({ count }) {
  return (
    <div className="results-modal__stars" role="img" aria-label={`${count} étoile${count > 1 ? 's' : ''} sur 3`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="36" height="36" className={i < count ? 'is-on' : ''} style={{ animationDelay: `${0.6 + i * 0.25}s` }}>
          <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </div>
  )
}

function kidMessage(stats) {
  if (stats.successPercent === 100) return 'Sans aucune erreur ! Tu es un vrai pianiste !'
  return [
    'Bravo d’avoir essayé ! On recommence ensemble ?',
    'Bon début ! Encore un peu d’entraînement et ça va chauffer.',
    'Très bien joué ! Tu y es presque.',
    'Magnifique ! Encore un effort pour la flamme bleue !',
  ][stats.stars]
}
