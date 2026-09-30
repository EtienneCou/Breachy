import FireLine from './FireLine.jsx'
import './GameOverlay.css'

const SPARKS = 10 // étincelles par note réussie

/**
 * Effets de jeu posés sur la piste des notes (à placer dans <PianoStage>).
 * Composant sans état : il affiche ce que la page lui donne.
 *
 * - time       temps du morceau (négatif pendant le décompte)
 * - playing    le morceau est en cours de lecture
 * - streak     nombre de notes réussies d'affilée
 * - milestone  palier de série à fêter (10, 25, 50…) ou null
 * - bursts     [{ id, x, tone, sparks, text }] notes réussies à l'instant :
 *              x = position de la touche (0 à 1), tone = 'perfect' | 'good' | 'late',
 *              sparks = afficher les étincelles, text = mot à afficher (ou null)
 * - pulseKey   change à chaque note qui arrive sur le clavier (fait pulser la ligne)
 * - heat       niveau de feu du clavier, de 0 à 4 (voir streakTiers.js)
 * - multiplier multiplicateur de points en cours (1, 2, 3 ou 4)
 */
export default function GameOverlay({ time, playing, streak, milestone, bursts, pulseKey, heat = 0, multiplier = 1 }) {
  return (
    <div className="game-overlay" aria-hidden="true">
      <FireLine level={heat} />
      <Countdown time={time} playing={playing} />

      {streak >= 2 && (
        <div className="game-overlay__combo">
          <div key={streak} className={`game-overlay__streak${streak >= 10 ? ' is-hot' : ''}`}>
            🔥 x{streak}
          </div>
          {multiplier > 1 && (
            <div key={`mult-${multiplier}`} className={`game-overlay__multiplier is-x${multiplier}`}>
              Points ×{multiplier}
            </div>
          )}
        </div>
      )}
      {milestone && (
        <div key={`milestone-${milestone}`} className="game-overlay__milestone">
          Série de {milestone} !
        </div>
      )}

      {bursts.map((b) => (
        <div key={b.id} className={`game-overlay__burst is-${b.tone}`} style={{ left: `${b.x * 100}%` }}>
          {b.sparks &&
            Array.from({ length: SPARKS }, (_, i) => (
              <span key={i} className="game-overlay__spark" style={{ '--angle': `${(360 / SPARKS) * i}deg` }} />
            ))}
          {b.text && (
            // décalé vers l'intérieur sur les touches du bord pour rester entièrement visible
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

// Centré sur la touche, sauf près des bords où le mot est poussé vers l'intérieur.
function wordShift(x) {
  if (x < 0.08) return 0
  if (x > 0.92) return -100
  return -50
}

function Countdown({ time, playing }) {
  if (!playing || time >= 0.8) return null
  const text = time < 0 ? Math.ceil(-time) : "C'est parti !"
  return (
    <div key={text} className={`game-overlay__countdown${time >= 0 ? ' is-go' : ''}`}>
      {text}
    </div>
  )
}
