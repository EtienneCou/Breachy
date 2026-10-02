import { useState } from 'react'
import { useCoach } from './CoachProvider.jsx'
import { TALK_AMOUNTS } from './talkAmounts.js'
import { useCoachUi } from './coachUi.js'
import ReachyAvatar from './ReachyAvatar.jsx'
import { DEFAULT_REACHY_URL } from '../../services/reachy/reachyClient.js'
import './CoachPanel.css'

/**
 * Reachy à l'écran : l'avatar, sa bulle, l'état du robot et ses réglages.
 * Quand le robot est connecté (simulation ou USB), c'est lui qui bouge : l'avatar
 * dessiné s'efface et seule la bulle reste, pour lire ce que dit Reachy.
 * - layout     'compact' (colonne de l'entraînement) ou 'wide' (carte de l'accueil)
 * - children   actions dans la bulle, sous le texte (ex. bouton « S'entraîner »)
 * - title      petit titre au-dessus de la bulle (par défaut « Reachy, ton coach », dans la langue du site)
 * - talkToggle affiche l'interrupteur des encouragements parlés (entraînement)
 */
export default function CoachPanel({ layout = 'compact', title: titleProp, idleText, talkToggle = false, children, className = '' }) {
  const coach = useCoach()
  const ui = useCoachUi()
  const title = titleProp ?? ui.title
  const [open, setOpen] = useState(false)
  const { settings, updateSettings, robotStatus, bubble, mood, speaking, groove, simulation, voiceOutput, evil, transforming, pokeAvatar, listening } = coach
  const text = bubble?.text ?? idleText
  const robotOn = robotStatus === 'connected'

  return (
    <section className={`coach coach--${layout}${robotOn ? ' coach--robot' : ''}${evil ? ' coach--evil' : ''} ${className}`} aria-label={title}>
      {!robotOn && (
        // Clics répétés sur l'avatar : easter egg (voir CoachProvider). Pas un vrai bouton :
        // il ne se remarque pas au clavier, il faut le chercher.
        <div className="coach__avatar" onClick={pokeAvatar}>
          <ReachyAvatar mood={mood} speaking={speaking} groove={groove} evil={evil} transforming={transforming} size={layout === 'wide' ? 104 : 72} />
        </div>
      )}

      <div className="coach__content">
        <div className="coach__top">
          <span className="coach__title">
            {robotOn ? `🤖 ${title} · ${ui.robotKind(simulation)}` : title}
          </span>
          <button
            type="button"
            className={`coach__status coach__status--${robotStatus}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title={ui.settingsTitle}
          >
            <span className="coach__status-dot" aria-hidden="true" />
            {ui.status[robotStatus]}
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
            title={settings.talk ? ui.talkOnTitle : ui.talkOffTitle}
          >
            <span className="coach__talk-track" aria-hidden="true"><span /></span>
            {settings.talk ? ui.talkOn : ui.talkOff}
          </button>
        )}
        {talkToggle && settings.talk && <TalkAmount ui={ui} value={settings.talkAmount} onChange={(talkAmount) => updateSettings({ talkAmount })} />}

        {/* Jauge de danse : le joueur voit que c'est son jeu qui fait danser Reachy */}
        {groove && <DanceMeter ui={ui} level={groove.level} change={groove.change} />}

        {/* Bulle de BD, reliée à Reachy par sa pointe */}
        {(text || children) && (
          <div className={`coach__bubble${bubble ? ' is-live' : ''}`} key={bubble?.id ?? 'idle'}>
            {text && <p className="coach__text" aria-live="polite">{text}</p>}
            {children && <div className="coach__actions">{children}</div>}
          </div>
        )}

        {open && (
          <div className="coach__settings" role="group" aria-label={ui.settingsLabel}>
            <label className="coach__check">
              <input type="checkbox" checked={settings.robot} onChange={(e) => updateSettings({ robot: e.target.checked })} />
              {ui.useRobot}
            </label>
            {settings.robot && (
              <label className="coach__field">
                <span>{ui.robotUrl}</span>
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
                {ui.robotHelp[0]}<code>reachy-mini-daemon --sim</code>{ui.robotHelp[1]}
                <code>reachy-mini-daemon</code>{ui.robotHelp[2]}
              </p>
            )}
            <label className="coach__check">
              <input type="checkbox" checked={settings.voice} onChange={(e) => updateSettings({ voice: e.target.checked })} />
              {ui.voice}
            </label>
            <p className="coach__help">{ui.voiceOutput[voiceOutput]}</p>
            <label className="coach__check">
              <input type="checkbox" checked={settings.talk} onChange={(e) => updateSettings({ talk: e.target.checked })} />
              {ui.talk}
            </label>
            {settings.talk && <TalkAmount ui={ui} value={settings.talkAmount} onChange={(talkAmount) => updateSettings({ talkAmount })} />}
            <label className="coach__check">
              <input type="checkbox" checked={settings.sounds} onChange={(e) => updateSettings({ sounds: e.target.checked })} />
              {ui.sounds}
            </label>
            {settings.robot && (
              <label className="coach__check">
                <input type="checkbox" checked={settings.gaze} onChange={(e) => updateSettings({ gaze: e.target.checked })} />
                {ui.gaze}
              </label>
            )}
            {LISTEN_SUPPORTED && (
              <label className="coach__check">
                <input type="checkbox" checked={settings.listen} onChange={(e) => updateSettings({ listen: e.target.checked })} />
                {ui.listen}
              </label>
            )}
            {settings.listen && LISTEN_SUPPORTED && <p className="coach__help">{listenText(ui, listening ?? { state: 'starting' })}</p>}
          </div>
        )}
      </div>
    </section>
  )
}

// Reconnaissance vocale du navigateur (Chrome, Edge) : sans elle, pas d'option d'écoute.
const LISTEN_SUPPORTED = typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)

// Ce que fait l'écoute (démo), en clair
function listenText(ui, { state, heard, error }) {
  if (state === 'error') return `⚠️ ${ui.listenErrors[error] ?? ui.listenFailed(error)}`
  if (state === 'starting') return ui.listenStarting
  return heard ? ui.listenHeard(heard) : ui.listenWaiting
}

// Jauge à 4 crans (niveaux de DANCE_LEVELS, danceEngine.js) : elle s'allume quand la danse
// monte, s'éteint d'un cran quand elle descend.
function DanceMeter({ ui, level, change }) {
  const DANCE_NAMES = ui.danceNames
  return (
    <div
      key={level}
      className={`coach__meter coach__meter--${level}${change ? ` is-${change}` : ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={DANCE_NAMES.length - 1}
      aria-valuenow={level}
      aria-valuetext={DANCE_NAMES[level]}
      aria-label={ui.meter}
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
function TalkAmount({ ui, value, onChange }) {
  return (
    <div className="coach__amount" role="radiogroup" aria-label={ui.talkAmount}>
      {TALK_AMOUNTS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={value === a.id}
          className={`coach__amount-btn${value === a.id ? ' is-active' : ''}`}
          title={ui.talkAmountTitle(a.seconds)}
          onClick={(e) => {
            onChange(a.id)
            e.currentTarget.blur() // Entrée reste le raccourci Jouer / Pause
          }}
        >
          {ui.talkAmounts[a.id] ?? a.label}
        </button>
      ))}
    </div>
  )
}
