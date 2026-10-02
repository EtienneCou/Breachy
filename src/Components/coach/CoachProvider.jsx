import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_REACHY_URL, createReachyClient } from '../../services/reachy/reachyClient.js'
import { forgetRobotSounds, playCoachSound, speak, stopSpeaking } from './coachAudio.js'
import { prepareLines, prepareRobotVoice } from './robotVoice.js'
import { LINES, SLEEP_RULES } from './coachRules.js'
import { PLAYER_ACTIVITY, backingSynth } from '../piano'
import { talkGapMs } from './talkAmounts.js'
import { ROBOT_INTENSITY } from './danceEngine.js'
import { EMOTION_MOVES, UNKNOWN_EMOTION_LENGTH } from './emotionMoves.js'

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

// Sommeil : sans personne qui joue, il s'ennuie puis s'endort (en ms).
const BORED_AFTER = 40000
const SLEEP_AFTER = 60000
// Position de sommeil (degrés) : tête basse, antennes repliées en arrière, comme dans
// l'émotion « sleep1 » de Pollen. Il y glisse lentement, puis respire doucement.
// (L'émotion elle-même dure 20 s et se termine par un réveil : on ne s'en sert pas.)
const SLEEP_POSE = { head: { roll: 0, pitch: 22, yaw: 0 }, antennas: [-140, 140], body: 0 }
const FALL_ASLEEP_S = 3 // durée de la glissade vers la position de sommeil
const BREATH_S = 4 // une inspiration ou une expiration
const BREATH_DEG = 3 // amplitude de la respiration (tête)
// Réveil : il revient doucement à sa position neutre (le « wake_up » du daemon finit par
// un coup de tête de 20° en 0,2 s, trop sec).
const NEUTRAL = { head: { roll: 0, pitch: 0, yaw: 0 }, antennas: [0, 0], body: 0 }
const WAKE_S = 1.5 // après son sommeil
const CONNECT_S = 2 // à la connexion (il peut partir de la position de repos du daemon, plus loin)
const RELEASE_S = 0.8 // retour au neutre quand on arrête une émotion hors danse

// Regard : part du suivi de visage (caméra du robot) mélangée à ses mouvements quand il
// ne danse pas (accueil, pause, bilan). Pendant la danse et le sommeil, le suivi est en pause.
const TRACKING_WEIGHT = 0.7
// Le daemon applique le poids d'un coup (la tête sauterait vers le visage, ou en revenant) :
// on le fait varier par petits pas.
const TRACKING_FADE_MS = 800
const TRACKING_FADE_STEPS = 10

// Durée estimée des mouvements du robot, pour ne pas en lancer un autre par-dessus
// (les émotions ont leur durée réelle : voir emotionMoves.js).
const ROBOT_BUSY = { gesture: 1.3, dance: 4.5 }
const APPROACH_S = 0.6 // trajet doux vers la position de départ d'une émotion

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
  const [media, setMedia] = useState(false) // le robot a sa caméra et son haut-parleur (pas la simulation)
  const [asleep, setAsleep] = useState(false)
  const [dancing, setDancing] = useState(false) // une boucle de danse suit un rythme (morceau, métronome)

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
        robot.current.busyUntil = performance.now() + CONNECT_S * 1000 + 200
        client.goto({ ...NEUTRAL, duration: CONNECT_S }).catch(() => {})
        // Sa voix : sur son haut-parleur s'il en a un, sinon (simulation) jouée par l'ordinateur.
        forgetRobotSounds()
        const speaker = await client.mediaAvailable()
        if (cancelled) return
        setMedia(speaker)
        if (speaker) client.setWobbling(true).catch(() => {})
        const output = speaker ? 'robot' : status.simulation_enabled ? 'preview' : 'browser'
        setVoiceOutput(output)
        // Voix prête : les encouragements du jeu sont fabriqués à l'avance, pour partir sans délai.
        if (output !== 'browser') prepareRobotVoice().then(() => prepareLines(Object.values(LINES).flat()))
      } else if (!isConnected && wasConnected) {
        setVoiceOutput('browser')
        setMedia(false)
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
      setMedia(false)
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

  // On reprend la main sur une émotion en cours (pas plus importante que `priority`, et
  // jamais sur le sommeil) : elle s'arrête là où elle en est, puis la danse revient
  // d'elle-même en douceur au neutre, ou, sans danse, un retour doux au neutre.
  const releaseRobot = useCallback((priority) => {
    const r = robot.current
    const now = performance.now()
    if (now >= r.busyUntil || priority < r.priority || r.priority === Infinity) return
    for (const t of r.timers) clearTimeout(t)
    r.timers = []
    if (r.uuid) client.stop(r.uuid).catch(() => {})
    r.uuid = null
    r.priority = 0
    if (dance.current) {
      r.busyUntil = now
    } else {
      r.busyUntil = now + RELEASE_S * 1000
      client.goto({ ...NEUTRAL, duration: RELEASE_S }).catch(() => {})
    }
  }, [client])

  const runRobot = useCallback((action, priority) => {
    if (!action || live.current.robotStatus !== 'connected') return
    if (action.gesture && dance.current) {
      // Une émotion moins importante s'arrête : le geste s'ajoute à la danse qui reprend.
      releaseRobot(priority)
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
    r.priority = priority
    const fail = () => {} // robot indisponible un instant : l'avatar a déjà réagi
    if (action.emotion) {
      // Il rejoint en douceur la position de départ de l'émotion, puis la joue en entier.
      const move = EMOTION_MOVES[action.emotion]
      const approach = move ? APPROACH_S : 0
      r.busyUntil = now + (approach + (move?.length ?? UNKNOWN_EMOTION_LENGTH)) * 1000
      if (move) client.goto({ head: move.head, antennas: move.antennas, body: 0, duration: approach }).then(remember, fail)
      r.timers.push(setTimeout(() => client.playEmotion(action.emotion).then(remember, fail), approach * 1000))
    } else if (action.dance) {
      r.busyUntil = now + ROBOT_BUSY.dance * 1000
      client.playDance(action.dance).then(remember, fail)
    }
    else {
      r.busyUntil = now + ROBOT_BUSY.gesture * 1000
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
  }, [client, releaseRobot])

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

  // ---------- Sommeil ----------
  // Personne ne joue (ni touche, ni souris, ni note, ni musique en cours) : au bout de
  // BORED_AFTER il s'ennuie, au bout de SLEEP_AFTER il s'endort. Le premier appui le réveille.

  const idle = useRef({ last: 0, bored: false, asleep: false, holds: 0, timer: 0 })

  const fallAsleep = useCallback(() => {
    const i = idle.current
    i.asleep = true
    setAsleep(true)
    stopSpeaking()
    if (live.current.robotStatus !== 'connected') return
    // Le robot lui appartient : la danse se met en retrait jusqu'au réveil.
    const r = robot.current
    for (const t of r.timers) clearTimeout(t)
    r.timers = []
    r.busyUntil = Infinity
    r.priority = Infinity
    // Il glisse lentement vers sa position de sommeil (après avoir arrêté tout autre
    // mouvement), puis respire doucement.
    client.stopAll().catch(() => {}).then(() => {
      if (i.asleep) client.goto({ ...SLEEP_POSE, duration: FALL_ASLEEP_S }).catch(() => {})
    })
    let inhale = true
    const breathe = () => {
      const pitch = SLEEP_POSE.head.pitch - (inhale ? BREATH_DEG : 0)
      // un peu plus court que l'intervalle : deux respirations ne se chevauchent jamais
      client.goto({ ...SLEEP_POSE, head: { ...SLEEP_POSE.head, pitch }, duration: BREATH_S - 0.3 }).catch(() => {})
      inhale = !inhale
      i.timer = setTimeout(breathe, BREATH_S * 1000)
    }
    i.timer = setTimeout(breathe, FALL_ASLEEP_S * 1000)
  }, [client])

  const wake = useCallback(() => {
    const i = idle.current
    i.asleep = false
    i.bored = false
    clearTimeout(i.timer)
    setAsleep(false)
    if (live.current.robotStatus === 'connected') {
      robot.current.busyUntil = performance.now() + WAKE_S * 1000 + 200 // le temps de se réveiller
      robot.current.priority = 0
      client.stopAll().catch(() => {}).then(() => client.goto({ ...NEUTRAL, duration: WAKE_S })).catch(() => {})
    }
    react('wake', SLEEP_RULES.wake())
  }, [client, react])

  // Quelqu'un joue : il reste éveillé, ou se réveille.
  const wakeRef = useRef(wake)
  useEffect(() => {
    wakeRef.current = wake
  })
  useEffect(() => {
    const i = idle.current
    i.last = performance.now()
    const onActivity = () => {
      i.last = performance.now()
      // Il s'ennuyait (émotion de 15 s) : il arrête et revient au jeu.
      if (i.bored) releaseRobot(SLEEP_RULES.bored().priority)
      i.bored = false
      if (i.asleep) wakeRef.current()
    }
    const events = ['keydown', 'pointerdown', PLAYER_ACTIVITY]
    for (const e of events) window.addEventListener(e, onActivity)
    const id = setInterval(() => {
      const now = performance.now()
      if (i.holds > 0) i.last = now // de la musique joue : personne ne s'endort
      const quiet = now - i.last
      if (!i.asleep && quiet >= SLEEP_AFTER) fallAsleep()
      else if (!i.asleep && !i.bored && quiet >= BORED_AFTER) {
        i.bored = true
        react('bored', SLEEP_RULES.bored())
      }
    }, 1000)
    return () => {
      for (const e of events) window.removeEventListener(e, onActivity)
      clearInterval(id)
      clearTimeout(i.timer)
    }
  }, [fallAsleep, react, releaseRobot])

  /** Une page garde Reachy éveillé tant que de la musique joue (voir useCoachAwake). */
  const holdAwake = useCallback(() => {
    idle.current.holds++
    idle.current.last = performance.now()
    return () => {
      idle.current.holds--
      idle.current.last = performance.now()
    }
  }, [])

  // ---------- Regard ----------
  // Avec la caméra du vrai robot : il te suit du regard quand il ne danse pas.
  const robotOn = robotStatus === 'connected' && media
  const trackingWeight = useRef(0)
  useEffect(() => {
    if (!robotOn) return
    const from = trackingWeight.current
    const target = asleep || dancing ? 0 : TRACKING_WEIGHT
    let step = 0
    const id = setInterval(() => {
      step++
      const w = step >= TRACKING_FADE_STEPS ? target : from + ((target - from) * step) / TRACKING_FADE_STEPS
      trackingWeight.current = w
      client.setTracking(w).catch(() => {})
      if (step >= TRACKING_FADE_STEPS) clearInterval(id)
    }, TRACKING_FADE_MS / TRACKING_FADE_STEPS)
    return () => clearInterval(id)
  }, [robotOn, asleep, dancing, client])
  useEffect(() => {
    if (!robotOn) return
    return () => {
      trackingWeight.current = 0
      client.setTracking(null).catch(() => {})
    }
  }, [robotOn, client])

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [])

  const value = useMemo(
    () => ({
      settings, updateSettings, robotStatus, speaking, react, dismiss,
      client, groove, setGroove, registerDance, robotBusyUntil, simulation, voiceOutput,
      // Endormi : il ferme les yeux et rêve, quoi qu'il se passe.
      asleep,
      mood: asleep ? 'asleep' : mood,
      bubble: asleep ? { text: 'Zzz…', id: 'sleep' } : bubble,
      holdAwake,
      setDancing,
    }),
    [settings, updateSettings, robotStatus, mood, bubble, speaking, react, dismiss, client, groove, registerDance, robotBusyUntil, simulation, voiceOutput, asleep, holdAwake],
  )
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCoach() {
  const coach = useContext(CoachContext)
  if (!coach) throw new Error('useCoach doit être utilisé sous <CoachProvider>')
  return coach
}
