import { useEffect, useMemo, useRef, useState } from 'react'
import { computeGameStats } from '../../utils/gameStats'
import { useLanguage } from '../../context/LanguageContext'
import FlameGauge from './FlameGauge.jsx'
import ResultsDetails from './ResultsDetails.jsx'
import './ResultsModal.css'

/**
 * Popup de fin de morceau.
 */
const SLOW_DOWN_BELOW = 50 // % de réussite en dessous duquel on propose de ralentir

export default function ResultsModal({ results, onRestart, onQuit, slowerSpeed = null, onRestartSlower }) {
  const { t } = useLanguage()
  const stats = useMemo(() => computeGameStats(results), [results])
  const [showDetails, setShowDetails] = useState(false)
  const focusRef = useRef(null)
  const suggestSlower = stats.successPercent < SLOW_DOWN_BELOW && slowerSpeed != null && onRestartSlower != null

  // Le bouton principal reçoit le focus : Entrée relance tout de suite.
  useEffect(() => {
    focusRef.current?.focus()
  }, [])

  const kidStats = [
    { id: 'tempo', icon: '🎯', value: stats.inTempo, label: t('results.inTempo'), tone: 'perfect' },
    { id: 'offbeat', icon: '⏰', value: stats.counts.offbeat, label: t('results.offbeat'), tone: 'offbeat' },
    { id: 'wrong', icon: '❌', value: stats.wrongNotes, label: t('results.wrong'), tone: 'wrong' },
    { id: 'missed', icon: '💤', value: stats.missedNotes, label: t('results.missed'), tone: 'missed' },
  ]

  const message = kidMessage(stats, t)

  return (
    <div className="results-modal">
      <div className="results-modal__backdrop" aria-hidden="true" />
      <section className="results-modal__panel" role="dialog" aria-modal="true" aria-labelledby="results-modal-title">
        <div className="results-modal__main">
          <header className="results-modal__head">
            <span className="results-modal__eyebrow">{t('results.songFinished')}</span>
            <h2 id="results-modal-title" className="results-modal__title">{results.song.title}</h2>
            <Stars count={stats.stars} t={t} />
            {results.score != null && (
              <p className="results-modal__points">
                {results.score.toLocaleString()} {t('results.points')}
                {results.bestStreak > 0 && <span>{t('results.bestStreak', results.bestStreak)}</span>}
              </p>
            )}
            <p className="results-modal__message">{message}</p>
          </header>

          <FlameGauge percent={stats.successPercent} />
        </div>

        <div className="results-modal__side">
          <ul className="results-modal__stats">
            {kidStats.map((s) => (
              <li key={s.id} className={`results-modal__stat results-modal__stat--${s.tone}`}>
                <span className="results-modal__stat-icon" aria-hidden="true">{s.icon}</span>
                <span className="results-modal__stat-value">{s.value}</span>
                <span className="results-modal__stat-label">{s.label}</span>
              </li>
            ))}
          </ul>

          {suggestSlower && (
            <div className="results-modal__slower">
              <p className="results-modal__slower-text">{t('results.suggestSlower')}</p>
              <button ref={focusRef} type="button" className="results-modal__btn results-modal__btn--primary" onClick={onRestartSlower}>
                {t('results.restartSlower', Math.round(slowerSpeed * 100))}
              </button>
            </div>
          )}

          <div className="results-modal__actions">
            <button
              ref={suggestSlower ? null : focusRef}
              type="button"
              className={`results-modal__btn${suggestSlower ? '' : ' results-modal__btn--primary'}`}
              onClick={onRestart}
            >
              {t('results.restart')}
            </button>
            <button type="button" className="results-modal__btn" onClick={onQuit}>
              {t('results.quit')}
            </button>
          </div>

          <button
            type="button"
            className="results-modal__details-toggle"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? t('results.hideDetails') : t('results.showDetails')}
            <span className="results-modal__chevron" aria-hidden="true">▾</span>
          </button>
        </div>

        {showDetails && (
          <div className="results-modal__details">
            <ResultsDetails stats={stats} songTitle={results.song.title} />
          </div>
        )}
      </section>
    </div>
  )
}

function Stars({ count, t }) {
  return (
    <div className="results-modal__stars" role="img" aria-label={t ? t('results.starsAria', count) : `${count}/3`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="36" height="36" className={i < count ? 'is-on' : ''} style={{ animationDelay: `${0.6 + i * 0.25}s` }}>
          <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </div>
  )
}

function kidMessage(stats, t) {
  if (stats.successPercent === 100) return t('results.messages.perfect')
  const key = `results.messages.stars${Math.min(3, Math.max(0, stats.stars))}`
  return t(key)
}
