import { useState } from 'react'
import { useCoach } from './CoachProvider.jsx'
import { TALK_AMOUNTS } from './talkAmounts.js'
import ReachyAvatar from './ReachyAvatar.jsx'
import { DEFAULT_REACHY_URL } from '../../services/reachy/reachyClient.js'
import './CoachPanel.css'

// Où sort la voix du coach (voir CoachProvider).
const VOICE_LABELS = {
  robot: '🔊 Il parle par le haut-parleur du robot.',
  preview: '🔊 Voix du robot, jouée par l\'ordinateur (la simulation n\'a pas de haut-parleur).',
  browser: '🔊 Il parle par l\'ordinateur.',
}

const STATUS_LABELS = {
  off: 'Robot désactivé',
  searching: 'Robot non connecté',
  connected: 'Robot connecté',
}

/**
 * Reachy à l'écran : l'avatar, sa bulle, l'état du robot et ses réglages.
 * Quand le robot est connecté (simulation ou USB), c'est lui qui bouge : l'avatar
 * dessiné s'efface et seule la bulle reste, pour lire ce que dit Reachy.
 * - layout     'compact' (colonne de l'entraînement) ou 'wide' (carte de l'accueil)
 * - children   actions dans la bulle, sous le texte (ex. bouton « S'entraîner »)
 * - title      petit titre au-dessus de la bulle quand elle est vide
 * - talkToggle affiche l'interrupteur des encouragements parlés (entraînement)
 */
export default function CoachPanel({ layout = 'compact', title = 'Reachy, ton coach', idleText, talkToggle = false, children, className = '' }) {
  const coach = useCoach()
  const [open, setOpen] = useState(false)
  const { settings, updateSettings, robotStatus, bubble, mood, speaking, groove, simulation, voiceOutput } = coach
  const text = bubble?.text ?? idleText
  const robotOn = robotStatus === 'connected'

  return (
    <section className={`coach coach--${layout}${robotOn ? ' coach--robot' : ''} ${className}`} aria-label="Reachy, ton coach">
      {!robotOn && (
        <div className="coach__avatar">
          <ReachyAvatar mood={mood} speaking={speaking} groove={groove} size={layout === 'wide' ? 104 : 72} />
        </div>
      )}

      <div className="coach__content">
        <div className="coach__top">
          <span className="coach__title">
            {robotOn ? `🤖 ${title} · ${simulation ? 'simulation' : 'robot'}` : title}
          </span>
          <button
            type="button"
            className={`coach__status coach__status--${robotStatus}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title="Réglages du coach et du robot"
          >
            <span className="coach__status-dot" aria-hidden="true" />
            {STATUS_LABELS[robotStatus]}
            <span aria-hidden="true">⚙</span>
          </button>
        </div>

        {/* Encouragements parlés : on peut le faire taire, il danse alors seulement */}
        {talkToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={settings.talk}
            className={`coach__talk${settings.talk ? ' is-on' : ''}`}
            onClick={(e) => {
              updateSettings({ talk: !settings.talk })
              e.currentTarget.blur() // Entrée reste le raccourci Jouer / Pause
            }}
            title={settings.talk ? 'Il t\'encourage à voix haute pendant le morceau' : 'Il danse sans parler'}
          >
            <span className="coach__talk-track" aria-hidden="true"><span /></span>
            {settings.talk ? '🗣 Il t\'encourage' : '🤫 Il danse seulement'}
          </button>
        )}
        {talkToggle && settings.talk && <TalkAmount value={settings.talkAmount} onChange={(talkAmount) => updateSettings({ talkAmount })} />}

        {/* Jauge de danse : le joueur voit que c'est son jeu qui fait danser Reachy */}
        {groove && <DanceMeter level={groove.level} change={groove.change} />}

        {/* Bulle de BD, reliée à Reachy par sa pointe */}
        {(text || children) && (
          <div className={`coach__bubble${bubble ? ' is-live' : ''}`} key={bubble?.id ?? 'idle'}>
            {text && <p className="coach__text" aria-live="polite">{text}</p>}
            {children && <div className="coach__actions">{children}</div>}
          </div>
        )}

        {open && (
          <div className="coach__settings" role="group" aria-label="Réglages du coach">
            <label className="coach__check">
              <input type="checkbox" checked={settings.robot} onChange={(e) => updateSettings({ robot: e.target.checked })} />
              Utiliser le robot Reachy Mini (simulation ou USB)
            </label>
            {settings.robot && (
              <label className="coach__field">
                <span>Adresse du robot</span>
                <input
                  id="coach-robot-url"
                  type="text"
                  value={settings.url}
                  onChange={(e) => updateSettings({ url: e.target.value.trim() || DEFAULT_REACHY_URL })}
                  spellCheck={false}
                />
              </label>
            )}
            {settings.robot && robotStatus === 'searching' && (
              <p className="coach__help">
                Lance le serveur du robot : <code>reachy-mini-daemon --sim</code> pour la simulation, ou{' '}
                <code>reachy-mini-daemon</code> avec le Reachy Mini Lite branché en USB.
              </p>
            )}
            <label className="coach__check">
              <input type="checkbox" checked={settings.voice} onChange={(e) => updateSettings({ voice: e.target.checked })} />
              Voix (accueil, décompte et bilan)
            </label>
            <p className="coach__help">{VOICE_LABELS[voiceOutput]}</p>
            <label className="coach__check">
              <input type="checkbox" checked={settings.talk} onChange={(e) => updateSettings({ talk: e.target.checked })} />
              Encouragements parlés pendant le jeu
            </label>
            {settings.talk && <TalkAmount value={settings.talkAmount} onChange={(talkAmount) => updateSettings({ talkAmount })} />}
            <label className="coach__check">
              <input type="checkbox" checked={settings.sounds} onChange={(e) => updateSettings({ sounds: e.target.checked })} />
              Petits sons pendant le jeu
            </label>
          </div>
        )}
      </div>
    </section>
  )
}

// Niveaux de danse (voir DANCE_LEVELS dans danceEngine.js)
const DANCE_NAMES = ['Calme', 'Il se laisse porter', 'Ça groove', 'Rock star !']

// Jauge à 4 crans : elle s'allume quand la danse monte, s'éteint d'un cran quand elle descend.
function DanceMeter({ level, change }) {
  return (
    <div
      key={level}
      className={`coach__meter coach__meter--${level}${change ? ` is-${change}` : ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={DANCE_NAMES.length - 1}
      aria-valuenow={level}
      aria-valuetext={DANCE_NAMES[level]}
      aria-label="Danse de Reachy"
    >
      <span className="coach__meter-steps" aria-hidden="true">
        {DANCE_NAMES.map((name, i) => (
          <span key={name} className={i <= level ? 'is-on' : ''} />
        ))}
      </span>
      <span className="coach__meter-name">{DANCE_NAMES[level]}</span>
    </div>
  )
}

// Combien Reachy parle pendant le jeu : Peu (toutes les 21 s au plus), Moyen (14 s), Beaucoup (7 s).
function TalkAmount({ value, onChange }) {
  return (
    <div className="coach__amount" role="radiogroup" aria-label="Combien Reachy parle pendant le jeu">
      {TALK_AMOUNTS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          className={`coach__amount-btn${value === a.id ? ' is-active' : ''}`}
          title={`Une parole toutes les ${a.seconds} secondes au plus`}
          onClick={(e) => {
            onChange(a.id)
            e.currentTarget.blur() // Entrée reste le raccourci Jouer / Pause
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
