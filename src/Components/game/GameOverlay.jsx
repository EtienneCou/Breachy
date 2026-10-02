import FireLine from './FireLine.jsx'
import { useLanguage } from '../../context/LanguageContext'
import './GameOverlay.css'

const SPARKS = 10 // étincelles par note réussie

export default function GameOverlay({ time, playing, streak, milestone, bursts, pulseKey, heat = 0, multiplier = 1 }) {
  const { t } = useLanguage()

  return (
    <div className="game-overlay" aria-hidden="true">
      <FireLine level={heat} />
      <Countdown time={time} playing={playing} t={t} />

      {streak >= 2 && (
        <div className="game-overlay__combo">
          <div key={streak} className={`game-overlay__streak${streak >= 10 ? ' is-hot' : ''}`}>
            🔥 x{streak}
          </div>
          {multiplier > 1 && (
            <div key={`mult-${multiplier}`} className={`game-overlay__multiplier is-x${multiplier}`}>
              {t('pianoPage.multiplier', multiplier)}
            </div>
          )}
        </div>
      )}
      {milestone && (
        <div key={`milestone-${milestone}`} className="game-overlay__milestone">
          {t('pianoPage.streakCount', milestone)}
        </div>
      )}

      {bursts.map((b) => (
        <div key={b.id} className={`game-overlay__burst is-${b.tone}`} style={{ left: `${b.x * 100}%` }}>
          {b.sparks &&
            Array.from({ length: SPARKS }, (_, i) => (
              <span key={i} className="game-overlay__spark" style={{ '--angle': `${(360 / SPARKS) * i}deg` }} />
            ))}
          {b.text && (
            <span className="game-overlay__word" style={{ '--shift': `${wordShift(b.x)}%` }}>
              {b.text}
            </span>
          )}
        </div>
      ))}

      {pulseKey > 0 && <div key={pulseKey} className="game-overlay__pulse" />}
    </div>
  )
}

function wordShift(x) {
  if (x < 0.08) return 0
  if (x > 0.92) return -100
  return -50
}

function Countdown({ time, playing, t }) {
  if (!playing || time >= 0.8) return null
  const text = time < 0 ? Math.ceil(-time) : (t ? t('pianoPage.letsGo') : "C'est parti !")
  return (
    <div key={text} className={`game-overlay__countdown${time >= 0 ? ' is-go' : ''}`}>
      {text}
    </div>
  )
}
