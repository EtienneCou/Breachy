import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_REACHY_URL, createReachyClient } from '../../services/reachy/reachyClient.js'
import { forgetRobotSounds, playCoachSound, speak, stopSpeaking } from './coachAudio.js'
import { prepareLines, prepareRobotVoice } from './robotVoice.js'
import { LINES } from './coachRules.js'
import { backingSynth } from '../piano'
import { talkGapMs } from './talkAmounts.js'
import { ROBOT_INTENSITY } from './danceEngine.js'

// Le coach Reachy, partagé par toute l'application : l'avatar à l'écran (humeur +
// bulle), la voix, les petits sons, et le vrai robot quand il est connecté
// (simulation ou Reachy Mini Lite en USB, par son serveur local).
// Les pages lui envoient des réactions (voir coachRules.js) avec react().

const CoachContext = createContext(null)

const SETTINGS_KEY = 'breachy.coach'
// talk : encouragements parlés pendant le jeu (le joueur peut les couper : Reachy danse seulement)
// talkAmount : combien il parle ('low', 'medium', 'high')
const DEFAULT_SETTINGS = { robot: true, url: DEFAULT_REACHY_URL, voice: true, sounds: true, talk: true, talkAmount: 'medium' }

const DUCK = 0.55 // l'accompagnement baisse à 55 % pendant que Reachy parle
const POLL_MS = 4000
const MOOD_MS = 1600 // durée d'une humeur passagère, avant de revenir au calme
const BUBBLE_MS = 2600 // durée d'une bulle courte

// Durée estimée des mouvements du robot, pour ne pas en lancer un autre par-dessus.
const ROBOT_BUSY = { gesture: 1.3, emotion: 3.5, dance: 4.5 }

// Petits gestes hors danse : une suite de positions (degrés), chacune atteinte en
// `t` secondes avec l'interpolation douce du robot. La doc demande au moins 0,5 s
// par geste pour éviter les mouvements brusques.
const GESTURES = {
  nod: [{ head: { pitch: 8 }, t: 0.5 }, { head: { pitch: 0 }, t: 0.6 }],
  tilt: [{ head: { roll: 12, pitch: 4 }, t: 0.6 }, { head: { roll: 0, pitch: 0 }, t: 0.6 }],
  antennaFlick: [{ antennas: [30, -30], t: 0.5 }, { antennas: [0, 0], t: 0.5 }],
  perk: [{ antennas: [-25, 25], head: { pitch: -5 }, t: 0.6 }, { antennas: [0, 0], head: { pitch: 0 }, t: 0.6 }],
  count3: [{ antennas: [-30, 0], t: 0.5 }, { antennas: [0, 0], t: 0.4 }],
  count2: [{ antennas: [0, 30], t: 0.5 }, { antennas: [0, 0], t: 0.4 }],
  count1: [{ antennas: [-30, 30], head: { pitch: -5 }, t: 0.5 }, { antennas: [0, 0], head: { pitch: 0 }, t: 0.4 }],
  go: [{ antennas: [-25, 25], head: { pitch: 8 }, t: 0.5 }, { antennas: [0, 0], head: { pitch: 0 }, t: 0.5 }],
}

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function CoachProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)
  const [connected, setConnected] = useState(false) // le daemon du robot répond
  const [simulation, setSimulation] = useState(false) // le robot connecté est la simulation
  const [mood, setMood] = useState('idle')
  const [bubble, setBubble] = useState(null) // { text, id }
  const [speaking, setSpeaking] = useState(false)
  const [groove, setGroove] = useState(null) // danse en cours : { level 0-3, period (s) } ou null
  // Où parle le coach : 'robot' (haut-parleur du robot), 'preview' (voix du robot jouée par
  // l'ordinateur : la simulation n'a pas de haut-parleur) ou 'browser' (voix du navigateur).
  const [voiceOutput, setVoiceOutput] = useState('browser')

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // stockage indisponible : réglages non retenus
    }
  }, [settings])

  const robotStatus = !settings.robot ? 'off' : connected ? 'connected' : 'searching'
  const live = useRef({})
  useEffect(() => {
    live.current = { settings, robotStatus, voiceOutput }
  })

  // ---------- Robot ----------

  const client = useMemo(() => createReachyClient(settings.url), [settings.url])
  const robot = useRef({ busyUntil: 0, priority: 0, timers: [], uuid: null })

  // Connexion : on interroge le daemon régulièrement ; à la connexion, le robot se réveille.
  useEffect(() => {
    if (!settings.robot) return
    let cancelled = false
    let wasConnected = false
    const check = async () => {
      const status = await client.status()
      if (cancelled) return
      const isConnected = Boolean(status)
      setConnected(isConnected)
      setSimulation(Boolean(status?.simulation_enabled))
      if (isConnected && !wasConnected) {
        client.wakeUp().catch(() => {})
        robot.current.busyUntil = performance.now() + 3000
        // Sa voix : sur son haut-parleur s'il en a un, sinon (simulation) jouée par l'ordinateur.
        forgetRobotSounds()
        const speaker = await client.mediaAvailable()
        if (cancelled) return
        if (speaker) client.setWobbling(true).catch(() => {})
        const output = speaker ? 'robot' : status.simulation_enabled ? 'preview' : 'browser'
        setVoiceOutput(output)
        // Voix prête : les encouragements du jeu sont fabriqués à l'avance, pour partir sans délai.
        if (output !== 'browser') prepareRobotVoice().then(() => prepareLines(Object.values(LINES).flat()))
      } else if (!isConnected && wasConnected) {
        setVoiceOutput('browser')
      }
      wasConnected = isConnected
    }
    check()
    const id = setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
      setConnected(false)
      setVoiceOutput('browser')
    }
  }, [settings.robot, client])

  // Boucle de danse active (entraînement) : elle reçoit les petits gestes et les
  // ajoute à la danse, au lieu de lancer des mouvements séparés (une seule source de positions).
  const dance = useRef(null)
  const registerDance = useCallback((handler) => {
    dance.current = handler
    return () => {
      if (dance.current === handler) dance.current = null
    }
  }, [])
  const robotBusyUntil = useCallback(() => robot.current.busyUntil, [])

  const runRobot = useCallback((action, priority) => {
    if (!action || live.current.robotStatus !== 'connected') return
    if (action.gesture && dance.current) {
      dance.current.impulse(action.gesture)
      return
    }
    const r = robot.current
    const now = performance.now()
    // Un mouvement est en cours : on ne le coupe que pour plus important.
    if (now < r.busyUntil && priority <= r.priority) return
    for (const t of r.timers) clearTimeout(t)
    r.timers = []
    if (now < r.busyUntil && r.uuid) client.stop(r.uuid).catch(() => {})
    r.uuid = null
    const remember = (move) => {
      if (move?.uuid) r.uuid = move.uuid
    }
    const kind = action.gesture ? 'gesture' : action.dance ? 'dance' : 'emotion'
    r.busyUntil = now + ROBOT_BUSY[kind] * 1000
    r.priority = priority
    const fail = () => {} // robot indisponible un instant : l'avatar a déjà réagi
    if (action.emotion) client.playEmotion(action.emotion).then(remember, fail)
    else if (action.dance) client.playDance(action.dance).then(remember, fail)
    else {
      // Petits gestes réduits comme la danse ; les émotions et danses enregistrées restent telles quelles.
      const k = ROBOT_INTENSITY
      let delay = 0
      for (const step of GESTURES[action.gesture] ?? []) {
        const head = step.head && { roll: (step.head.roll ?? 0) * k, pitch: (step.head.pitch ?? 0) * k, yaw: (step.head.yaw ?? 0) * k }
        const antennas = step.antennas?.map((a) => a * k)
        r.timers.push(setTimeout(() => client.goto({ head, antennas, duration: step.t }).then(remember, fail), delay))
        delay += step.t * 1000
      }
    }
  }, [client])

  // ---------- Avatar, bulle, voix ----------

  const timers = useRef({ mood: 0, bubble: 0 })
  const cooldowns = useRef({})
  const current = useRef({ priority: 0, until: 0 })
  const talk = useRef({ next: 0, busy: false }) // garde-fou des paroles pendant le jeu

  // Dit une phrase : l'accompagnement baisse le temps de la phrase.
  const say = useCallback((text, { quick, keepBubble }) => {
    const id = (talk.current.id ?? 0) + 1
    talk.current.id = id
    talk.current.busy = true
    setSpeaking(true)
    const { voiceOutput: output } = live.current
    speak(text, {
      quick,
      robot: output === 'robot' ? { kind: 'robot', client } : output === 'preview' ? { kind: 'preview' } : null,
      onStart: () => backingSynth.duck(DUCK),
      onEnd: () => {
        // Une phrase coupée par une nouvelle se termine aussi : on ne touche à rien.
        if (talk.current.id !== id) return
        talk.current.busy = false
        backingSynth.duck(1)
        setSpeaking(false)
        if (!keepBubble) setBubble(null)
      },
    })
  }, [client])

  /**
   * Fait réagir Reachy. `key` identifie le type de réaction pour son temps de repos
   * (cooldown) ; `reaction` vient de coachRules.js.
   */
  const react = useCallback((key, reaction) => {
    if (!reaction) return
    const now = performance.now()
    const { priority = 1, cooldown = 0 } = reaction
    if (cooldowns.current[key] > now) return
    // Une réaction importante encore à l'écran (bilan, accueil) n'est pas écrasée par un détail.
    if (now < current.current.until && priority < current.current.priority) return
    if (cooldown) cooldowns.current[key] = now + cooldown * 1000
    const { settings: s } = live.current

    const hold = reaction.holdMs ?? (reaction.speech ? 0 : BUBBLE_MS)
    current.current = { priority, until: now + Math.max(hold, MOOD_MS) }

    if (reaction.mood) {
      setMood(reaction.mood)
      clearTimeout(timers.current.mood)
      timers.current.mood = setTimeout(() => setMood('idle'), Math.max(MOOD_MS, reaction.holdMs ?? 0))
    }
    // Encouragement pendant le jeu : jamais par-dessus une phrase, jamais trop souvent.
    const sayNow = Boolean(reaction.say) && !(reaction.speech && s.voice) && s.talk && !talk.current.busy && now >= talk.current.next
    // Une parole sautée n'apparaît pas non plus dans la bulle : pas de texte sans voix.
    const bubbleText = reaction.say && s.talk && !sayNow && reaction.bubble === reaction.say ? null : reaction.bubble
    if (bubbleText) {
      const id = now
      setBubble({ text: bubbleText, id })
      clearTimeout(timers.current.bubble)
      if (hold) timers.current.bubble = setTimeout(() => setBubble((b) => (b?.id === id ? null : b)), hold)
    }
    if (reaction.sound && s.sounds) playCoachSound(reaction.sound)
    if (reaction.speech && s.voice) {
      talk.current.next = now + talkGapMs(s.talkAmount)
      say(reaction.speech, { quick: reaction.quick, keepBubble: Boolean(reaction.holdMs) })
    } else if (sayNow) {
      talk.current.next = now + talkGapMs(s.talkAmount)
      say(reaction.say, { quick: true, keepBubble: true })
    }
    if (s.robot) runRobot(reaction.robot, priority)
  }, [runRobot, say])

  const dismiss = useCallback(() => {
    stopSpeaking()
    backingSynth.duck(1)
    talk.current.busy = false
    setSpeaking(false)
    setBubble(null)
    setMood('idle')
    current.current = { priority: 0, until: 0 }
  }, [])

  useEffect(() => () => stopSpeaking(), [])

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])

  const value = useMemo(
    () => ({
      settings, updateSettings, robotStatus, mood, bubble, speaking, react, dismiss,
      client, groove, setGroove, registerDance, robotBusyUntil, simulation, voiceOutput,
    }),
    [settings, updateSettings, robotStatus, mood, bubble, speaking, react, dismiss, client, groove, registerDance, robotBusyUntil, simulation, voiceOutput],
  )
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCoach() {
  const coach = useContext(CoachContext)
  if (!coach) throw new Error('useCoach doit être utilisé sous <CoachProvider>')
  return coach
}
